import { Capacitor } from "@capacitor/core";
import { supabase } from "../supabaseClient";
import pkg from "../../../package.json";

/**
 * Push notification token lifecycle — Phase 1 scope only.
 *
 * Handles: requesting the Android 13+ notification permission, generating
 * an FCM token via the @capacitor-firebase/messaging plugin, keeping it fresh
 * on rotation, persisting it to Supabase (public.push_tokens), and removing
 * it on logout.
 *
 * Explicitly NOT handled here (Phase 3 scope, not yet implemented):
 * foreground/background/killed-app notification presentation customization,
 * tap handling, deep linking, topic subscribe/unsubscribe, offline queueing.
 * Note: Android's FCM SDK already delivers notifications to the system
 * tray automatically when the app is backgrounded or killed — that base
 * "receiving" behavior requires no JS code at all and works today, purely
 * from `FirebaseMessaging.getToken()` having been called successfully.
 * Phase 3's "receiving" work is about *customizing* that behavior
 * (foreground in-app presentation, tap → deep link), not enabling it.
 *
 * Architectural boundary (hard rule, not just a style preference): this
 * app NEVER sends a notification and NEVER will. Sending is the exclusive
 * responsibility of a future, completely separate Admin Dashboard web app,
 * which reads push_tokens via a service_role key and calls FCM directly.
 * If a future change to this file ever needs to call FCM's send API, that
 * is a sign the change belongs in the Admin Dashboard instead.
 *
 * Firebase-configured guard (critical — do not remove): calling
 * FirebaseMessaging.getToken() when Firebase hasn't actually been set up
 * (no google-services.json at build time) crashes the app natively —
 * FirebaseMessaging throws IllegalStateException("Default FirebaseApp is
 * not initialized") deep inside the plugin's native code, on a thread this
 * file's JS try/catch cannot reach, since it's not a rejected JS promise.
 * There is no reliable way to detect "is google-services.json present" from
 * JS at runtime (JS has no build-time filesystem visibility into the native
 * APK), so this is gated by an explicit build-time flag instead —
 * VITE_PUSH_ENABLED — that a developer sets to "true" only once they have
 * actually added google-services.json and configured the Firebase project.
 * This mirrors the exact same pattern already used for Supabase in
 * supabaseClient.js (silently no-op until genuinely configured, rather
 * than guessing).
 *
 * Analytics forward-compatibility: push_tokens.id is a stable uuid from
 * row creation onward (see 0004_push_tokens.sql). That's the only
 * prerequisite for a future notification_events table (received / opened /
 * click-through / campaign performance) to reference this table via
 * token_id — see the design notes in 0005_push_tokens_hardening.sql.
 * Nothing in this file needs to change for that integration to happen.
 *
 * Modularity note: this file only WRITES to push_tokens as the signed-in
 * user. It never reads other users' tokens and has no concept of "send a
 * notification" — that responsibility belongs entirely to the future,
 * separate Admin Dashboard web app, which will use a service_role key from
 * a secure backend context to read this table and call FCM directly. No
 * change here is required for that future app to work.
 */

/** True only when a developer has explicitly set VITE_PUSH_ENABLED=true in
    .env — meant to be flipped on only after google-services.json has
    actually been added and Firebase is genuinely configured for this
    build. Defaults to disabled so a build without Firebase configured
    (the common case up through Phase 1) never attempts to touch FCM at
    all, which is what prevents the native crash at its source rather than
    trying to catch it after the fact. */
const PUSH_ENABLED = import.meta.env.VITE_PUSH_ENABLED !== "false";

/** FCM topic every signed-in device joins. Must match the topic name used by
    supabase/functions/send-notification ("everyone" audience). */
/** Loaded lazily so the web/PWA bundle never pulls in the Firebase SDK. */
async function getMessaging() {
  const mod = await import("@capacitor-firebase/messaging");
  // NEVER return the plugin proxy itself from an async function: awaiting it calls
  // proxy.then(), which Capacitor treats as a native method call; it rejects and the
  // promise never resolves (this silently killed every Firebase call before).
  return { FM: mod.FirebaseMessaging };
}

const BROADCAST_TOPIC = "all_users";

/* ---- in-app inbox of server (FCM) notifications ---- */
const INBOX_KEY = "gymak_inbox_v1";
export function getInbox() {
  try { return JSON.parse(localStorage.getItem(INBOX_KEY) || "[]"); } catch { return []; }
}
const DISMISSED_KEY = "gymak_inbox_dismissed_v1";
function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}
function dismiss(ids) {
  const set = new Set([...getDismissed(), ...ids]);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set].slice(-300)));
}
function notifyInbox() { try { window.dispatchEvent(new Event("gymak-inbox")); } catch { /* ignore */ } }
/** Delete one notification from the inbox (it will not come back on re-import). */
export function deleteInboxItem(id) {
  dismiss([id]);
  localStorage.setItem(INBOX_KEY, JSON.stringify(getInbox().filter((x) => x.id !== id)));
  notifyInbox();
}
/** Clear the whole inbox. */
export function clearInbox() {
  dismiss(getInbox().map((x) => x.id));
  localStorage.setItem(INBOX_KEY, "[]");
  notifyInbox();
}
function addInbox(n) {
  if (!n || (!n.title && !n.body)) return;
  const list = getInbox();
  const id = n.id || `${n.title || ""}|${n.body || ""}`;
  if (list.some((x) => x.id === id)) return;
  if (getDismissed().includes(id)) return;
  list.unshift({ id, title: n.title || "", body: n.body || "", ts: Date.now() });
  localStorage.setItem(INBOX_KEY, JSON.stringify(list.slice(0, 50)));
  try { window.dispatchEvent(new Event("gymak-inbox")); } catch { /* ignore */ }
}
export async function importDelivered() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { FM: FirebaseMessaging } = await getMessaging();
    const { notifications } = await FirebaseMessaging.getDeliveredNotifications();
    (notifications || []).forEach((n) => addInbox({ id: n.id, title: n.title, body: n.body }));
  } catch { /* ignore */ }
}

/** Web/PWA: ask for the browser notification permission once, on first launch. */
export function requestWebPermissionOnce() {
  try {
    if (Capacitor.isNativePlatform() || !("Notification" in window)) return;
    if (Notification.permission !== "default" || localStorage.getItem("gymak_notif_asked_v1")) return;
    localStorage.setItem("gymak_notif_asked_v1", "1");
    setTimeout(() => { Notification.requestPermission().catch(() => {}); }, 2500);
  } catch { /* ignore */ }
}

const DEVICE_ID_KEY = "gymak_device_id_v1";

/** Stable per-install id, independent of the FCM token itself (which
    rotates over time) — so a token refresh updates the same row instead of
    creating a new one. */
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

let listenersRegistered = false;
let currentUserId = null;

async function saveToken(token) {
  if (!supabase || !currentUserId) return;
  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: currentUserId,
      device_id: getDeviceId(),
      platform: "android",
      app_version: pkg.version,
      token,
      language: (navigator.language || "ar").slice(0, 2),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      is_active: true,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "device_id" }
  );
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[gymak push] failed to save token", error);
  }
}

/**
 * Runs on every app start in the native shell, signed in or not: asks for the
 * notification permission (Android 13+ POST_NOTIFICATIONS), subscribes the
 * device to the broadcast topic, and keeps the token fresh. Before this, push
 * only started after sign-in, so a device that never logged in never got a
 * permission prompt and never joined "all_users".
 */
let broadcastStarted = false;
function logPushErr(where, err) {
  try { localStorage.setItem("gymak_push_err", `${where}: ${(err && err.message) || err}`); } catch { /* ignore */ }
  // eslint-disable-next-line no-console
  console.error("[gymak push]", where, err);
}
/** Step 1, independent of Firebase: ask the OS for the notification permission
    (Android 13+ POST_NOTIFICATIONS) through the local-notifications plugin, which
    is known to work in this app. Safe no-op on Android < 13 (nothing to ask). */
async function askOsPermission() {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const st = await LocalNotifications.checkPermissions();
    if (st.display === "granted") return true;
    if (st.display === "denied") return false;
    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch (err) { logPushErr("os-permission", err); return false; }
}
export async function initBroadcastPush() {
  requestWebPermissionOnce();
  if (!PUSH_ENABLED || !Capacitor.isNativePlatform()) return;
  // Re-ask whenever the app comes back to the foreground until it is answered.
  if (!initBroadcastPush._vis) {
    initBroadcastPush._vis = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !broadcastStarted) initBroadcastPush();
    });
  }
  if (broadcastStarted) return;
  const osGranted = await askOsPermission();
  if (!osGranted) {
    // Prompt not answered yet or denied: Firebase step below may still work on older Android.
  }
  try {
    const { FM: FirebaseMessaging } = await getMessaging();
    const status = await FirebaseMessaging.checkPermissions();
    let granted = status.receive === "granted";
    if (!granted && status.receive !== "denied") {
      const req = await FirebaseMessaging.requestPermissions();
      granted = req.receive === "granted";
    }
    if (!granted && !osGranted) return;
  } catch (err) { logPushErr("firebase-permission", err); }
  broadcastStarted = true;
  try {
    const { FM: FirebaseMessaging } = await getMessaging();
    if (!listenersRegistered) {
      listenersRegistered = true;
      FirebaseMessaging.addListener("tokenReceived", (event) => { saveToken(event.token); });
      FirebaseMessaging.addListener("notificationReceived", (event) => {
        const n = event.notification || {};
        addInbox({ id: n.id, title: n.title, body: n.body });
      });
      FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
        const n = (event && event.notification) || {};
        addInbox({ id: n.id, title: n.title, body: n.body });
      });
    }
    await FirebaseMessaging.subscribeToTopic({ topic: BROADCAST_TOPIC });
    importDelivered();
  } catch (err) {
    broadcastStarted = false;
    logPushErr("subscribe", err);
  }
}

/** Current notification permission for the settings screen ("granted" | "denied" | "prompt" | "unsupported"). */
export async function getPushPermission() {
  if (!Capacitor.isNativePlatform()) return "unsupported";
  try {
    const { FM: FirebaseMessaging } = await getMessaging();
    return (await FirebaseMessaging.checkPermissions()).receive;
  } catch { return "unsupported"; }
}

/**
 * Call once after sign-in (mirrors syncManager.start()'s call site in
 * useAuth.jsx). No-op on web/PWA builds (no FCM path there yet) and when
 * Supabase isn't configured — matches the app's existing "silently degrade
 * to local-only behavior" convention rather than throwing.
 */
export async function registerForPush(userId) {
  if (!PUSH_ENABLED || !Capacitor.isNativePlatform() || !supabase) return;
  currentUserId = userId;

  try {
    const { FM: FirebaseMessaging } = await getMessaging();
    const status = await FirebaseMessaging.checkPermissions();
    let granted = status.receive === "granted";
    if (!granted && status.receive !== "denied") {
      const req = await FirebaseMessaging.requestPermissions();
      granted = req.receive === "granted";
    }
    if (!granted) return; // user declined — nothing else to do this session

    if (!listenersRegistered) {
      listenersRegistered = true;
      // Fires when FCM rotates the token. Keep the saved row fresh.
      FirebaseMessaging.addListener("tokenReceived", (event) => {
        saveToken(event.token);
      });
    }

    const { token } = await FirebaseMessaging.getToken();
    await saveToken(token);

    // Broadcast topic: lets the admin send to every user (Firebase Console or the
    // send-notification function, which targets this same topic name).
    await FirebaseMessaging.subscribeToTopic({ topic: BROADCAST_TOPIC });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[gymak push] setup failed", err);
  }
}

/** Call once on sign-out (mirrors syncManager.stop()'s call site). Removes
    this device's row so a signed-out device stops receiving pushes meant
    for the account. */
export async function removePushToken() {
  currentUserId = null;
  if (!PUSH_ENABLED || !Capacitor.isNativePlatform() || !supabase) return;
  try {
    // Only the per-account token row is removed. The device stays on the
    // broadcast topic (announcements are not account-specific).
    await supabase.from("push_tokens").delete().eq("device_id", getDeviceId());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[gymak push] failed to remove token on logout", err);
  }
}

/** Explicit opt-in only. This path does not subscribe to any topic. */
export async function prepareEncouragementDevice(userId) {
  if (!PUSH_ENABLED || !Capacitor.isNativePlatform() || !supabase) throw new Error("android_required");
  const { FM } = await getMessaging();
  let permission = await FM.checkPermissions();
  if (permission.receive !== "granted") permission = await FM.requestPermissions();
  if (permission.receive !== "granted") throw new Error("permission_required");
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || data?.user?.id !== userId) throw new Error("session_changed");
  const { token } = await FM.getToken();
  const deviceId = getDeviceId();
  const { error } = await supabase.from("push_tokens").upsert({user_id:userId,device_id:deviceId,token,platform:"android",app_version:pkg.version,is_active:true,last_seen:new Date().toISOString()},{onConflict:"device_id"});
  if (error) throw error;
  return deviceId;
}
