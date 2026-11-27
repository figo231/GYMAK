import {queueOwnerReceipt,flushOwnerReceipts,collectNativeOwnerTaps} from './ownerReceipts';
import { Capacitor } from "@capacitor/core";
import { supabase } from "../supabaseClient";
import { createPushListenerRegistrar } from "./registerListeners";
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
const PUSH_ENABLED = import.meta.env.VITE_PUSH_ENABLED === "true";

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
const inboxKey=()=>INBOX_KEY+":"+(currentUserId||"signed-out");
export function getInbox() {
  try { return JSON.parse(localStorage.getItem(inboxKey()) || "[]"); } catch { return []; }
}
const DISMISSED_KEY = "gymak_inbox_dismissed_v1";
const dismissedKey=()=>DISMISSED_KEY+":"+(currentUserId||"signed-out");
function getDismissed() {
  try { return JSON.parse(localStorage.getItem(dismissedKey()) || "[]"); } catch { return []; }
}
function dismiss(ids) {
  const set = new Set([...getDismissed(), ...ids]);
  localStorage.setItem(dismissedKey(), JSON.stringify([...set].slice(-300)));
}
function notifyInbox() { try { window.dispatchEvent(new Event("gymak-inbox")); } catch { /* ignore */ } }
/** Delete one notification from the inbox (it will not come back on re-import). */
export function deleteInboxItem(id) {
  dismiss([id]);
  localStorage.setItem(inboxKey(), JSON.stringify(getInbox().filter((x) => x.id !== id)));
  notifyInbox();
}
/** Clear the whole inbox. */
export function clearInbox() {
  dismiss(getInbox().map((x) => x.id));
  localStorage.setItem(inboxKey(), "[]");
  notifyInbox();
}
function addInbox(n) {
  if (!currentUserId || !n || (!n.title && !n.body)) return;
  const list = getInbox();
  const id = n.id || `${n.title || ""}|${n.body || ""}`;
  if (list.some((x) => x.id === id)) return;
  if (getDismissed().includes(id)) return;
  list.unshift({ id, title: n.title || "", body: n.body || "", ts: Date.now() });
  localStorage.setItem(inboxKey(), JSON.stringify(list.slice(0, 50)));
  try { window.dispatchEvent(new Event("gymak-inbox")); } catch { /* ignore */ }
}
export async function importDelivered() {
  if (!PUSH_ENABLED || !Capacitor.isNativePlatform()) return;
  try {
    const { FM: FirebaseMessaging } = await getMessaging();
    const { notifications } = await FirebaseMessaging.getDeliveredNotifications();
    // System tray may contain another signed-out account's previews. Only
    // import entries whose authenticated delivery metadata names this account.
    (notifications || []).filter(n=>n.data?.owner_user_id===currentUserId).forEach((n) => addInbox({ id: n.id, title: n.title, body: n.body }));
  } catch { /* ignore */ }
}

/** Web/PWA: ask for the browser notification permission once, on first launch. */
export function requestWebPermissionOnce() {
  // Browser permission must be requested from the explicit settings button.
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

const registerListeners = createPushListenerRegistrar();
function ensurePushListeners(plugin) {
  const receive = event => {
    const n = event?.notification || {};
    addInbox({ id: n.id, title: n.title, body: n.body });
  };
  return registerListeners(plugin, {
    tokenReceived: event => { saveToken(event.token).catch(err=>logPushErr("token",err)); },
    notificationReceived: event => {
      receive(event);
      queueOwnerReceipt(event?.notification,'received');if(currentUserId)flushOwnerReceipts(currentUserId,getDeviceId()).catch(()=>{});
      const n=event?.notification || {};
      window.dispatchEvent(new CustomEvent("gymak-foreground-push",{detail:{title:n.title,body:n.body}}));
    },
    notificationActionPerformed: event=>{receive(event);queueOwnerReceipt(event?.notification,'opened');if(currentUserId)flushOwnerReceipts(currentUserId,getDeviceId()).catch(()=>{});},
  });
}
let currentUserId = null;
let tokenGeneration = 0;
let tokenWrites = Promise.resolve();
let ownerReceiptWakeInstalled=false;

let pendingToken = null;
let wasRegistered = false;
async function saveToken(token) {
  if (!token) return;
  if (!supabase || !currentUserId) { pendingToken = token; return; } // flushed after auth
  const owner=currentUserId,generation=tokenGeneration;
  pendingToken = null;
  const write=async()=>{
  if(generation!==tokenGeneration||owner!==currentUserId)return;
  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: owner,
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
  if(generation!==tokenGeneration||owner!==currentUserId)return;
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[gymak push] failed to save token", error);
    pendingToken = token; // retried on next foreground/online
  } else { wasRegistered = true; }
  };
  tokenWrites=tokenWrites.catch(()=>{}).then(write);
  await tokenWrites;
}

/** Re-read the FCM token and upsert it. Cheap; called on foreground and reconnect. */
export async function refreshPushToken() {
  if (!PUSH_ENABLED || !Capacitor.isNativePlatform() || !supabase || !currentUserId) return;
  const generation=tokenGeneration,owner=currentUserId;
  try {
    const { FM } = await getMessaging();
    let status = await FM.checkPermissions();
    if (status.receive !== "granted") return;
    const { token } = await FM.getToken();
    if(generation!==tokenGeneration||owner!==currentUserId)return;
    await saveToken(token);
  } catch (err) { logPushErr("refresh", err); }
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
    await ensurePushListeners(FirebaseMessaging);
    await FirebaseMessaging.subscribeToTopic({ topic: BROADCAST_TOPIC });
    importDelivered();
  } catch (err) {
    broadcastStarted = false;
    logPushErr("subscribe", err);
  }
}

/** Current notification permission for the settings screen ("granted" | "denied" | "prompt" | "unsupported"). */
export async function getPushPermission() {
  if (!PUSH_ENABLED || !Capacitor.isNativePlatform()) return "unsupported";
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
  if (!supabase) return;
  if (!Capacitor.isNativePlatform()) {
    if(localStorage.getItem('gymak_web_push_enabled_v1')==='1') {
      const {registerWebPush}=await import('./webPush');
      try { await registerWebPush(userId); } catch { /* settings shows actionable setup errors */ }
    }
    return;
  }
  if(!PUSH_ENABLED)return;
  await retryPendingPushRevoke();
  const generation=++tokenGeneration;
  currentUserId = userId;notifyInbox();
  collectNativeOwnerTaps().then(()=>flushOwnerReceipts(userId,getDeviceId())).catch(()=>{});
  if(!ownerReceiptWakeInstalled){ownerReceiptWakeInstalled=true;const resume=()=>{if(currentUserId)refreshPushToken();if(currentUserId)collectNativeOwnerTaps().then(()=>flushOwnerReceipts(currentUserId,getDeviceId())).catch(()=>{});};window.addEventListener('online',resume);document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume();});}

  try {
    const { FM: FirebaseMessaging } = await getMessaging();
    const status = await FirebaseMessaging.checkPermissions();
    let granted = status.receive === "granted";
    if (!granted && status.receive !== "denied") {
      const req = await FirebaseMessaging.requestPermissions();
      granted = req.receive === "granted";
    }
    if (!granted) {
      logPushErr("register", "notification permission not granted");
      try { window.dispatchEvent(new CustomEvent("gymak-push-permission-missing")); } catch { /* ignore */ }
      return;
    }

    if(generation!==tokenGeneration||currentUserId!==userId)return;
    await ensurePushListeners(FirebaseMessaging);
    const { token } = await FirebaseMessaging.getToken();
    if(generation!==tokenGeneration||currentUserId!==userId)return;
    await saveToken(token);
    if (pendingToken) await saveToken(pendingToken);

    if(generation!==tokenGeneration||currentUserId!==userId)return;
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
// A provider call that never answers (offline) must not block sign-out or the next sign-in.
const REVOKE_TIMEOUT_MS=6000;
const revokeWithTimeout=(FM)=>Promise.race([FM.deleteToken(),new Promise((_,rej)=>setTimeout(()=>rej(new Error("push_revoke_timeout")),REVOKE_TIMEOUT_MS))]);
const REVOKE_PENDING_KEY="gymak_push_revoke_pending_v1";
function setRevokePending(on){try{if(on)localStorage.setItem(REVOKE_PENDING_KEY,getDeviceId());else localStorage.removeItem(REVOKE_PENDING_KEY);}catch{ /* storage unavailable */ }}
export function hasPendingPushRevoke(){try{return !!localStorage.getItem(REVOKE_PENDING_KEY);}catch{return false;}}

/** Retry a provider-token revoke that failed during sign-out (offline, etc.).
    Safe to call any time; does nothing when nothing is queued. Never throws. */
let retryInFlight=null;
export function retryPendingPushRevoke() {
  if(!Capacitor.isNativePlatform()||!PUSH_ENABLED||!hasPendingPushRevoke())return Promise.resolve(false);
  if(retryInFlight)return retryInFlight;
  retryInFlight=(async()=>{
    try {
      const {FM}=await getMessaging();
      await revokeWithTimeout(FM);
      setRevokePending(false);
      broadcastStarted=false;
      wasRegistered=false;
      if(supabase){const {error}=await supabase.from("push_tokens").delete().eq("device_id",getDeviceId());if(error)logPushErr("remove-row-retry",error);}
      return true;
    } catch(error) { logPushErr("remove-token-retry",error); return false; }
    finally { retryInFlight=null; }
  })();
  return retryInFlight;
}

/** Call once on sign-out (mirrors syncManager.stop()'s call site). Removes
    this device's row so a signed-out device stops receiving pushes meant
    for the account. With {explicit:true} (user pressed sign out) a failed
    revoke does not block sign-out: it is queued for retry and the result
    says {deferred:true}. */
export async function removePushToken({explicit=false}={}) {
  if(!Capacitor.isNativePlatform()) return {deferred:false};
  ++tokenGeneration;currentUserId=null;pendingToken=null;notifyInbox();
  if (!PUSH_ENABLED || !supabase || (!explicit&&!wasRegistered)) return {deferred:false};
  // Wait for writes started by the previous session before deleting its row.
  await tokenWrites.catch(()=>{});
  try {
    const {FM}=await getMessaging();
    // Revoking the provider token is necessary when the network is offline or
    // the server session has already expired. A stale database row cannot deliver.
    await revokeWithTimeout(FM);
    broadcastStarted=false;
    wasRegistered=false;
    setRevokePending(false);
    const {error}=await supabase.from("push_tokens").delete().eq("device_id",getDeviceId());
    if(error)logPushErr("remove-row",error);
    return {deferred:false};
  } catch(error) {
    logPushErr("remove-token",error);
    if(explicit){setRevokePending(true);return {deferred:true};}
    return {deferred:false};
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

/** Enroll default-on only after notice, never request OS permission here. */
export async function enrollDefaultEncouragementDevice(userId) {
 if(await getPushPermission()!=='granted')return false;
 await prepareEncouragementDevice(userId);
 return true;
}
