import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { supabase } from "../supabaseClient";
import pkg from "../../../package.json";

/**
 * Push notification token lifecycle — Phase 1 scope only.
 *
 * Handles: requesting the Android 13+ notification permission, generating
 * an FCM token via Capacitor's PushNotifications plugin, keeping it fresh
 * on rotation, persisting it to Supabase (public.push_tokens), and removing
 * it on logout.
 *
 * Explicitly NOT handled here (Phase 3 scope, not yet implemented):
 * foreground/background/killed-app notification presentation customization,
 * tap handling, deep linking, topic subscribe/unsubscribe, offline queueing.
 * Note: Android's FCM SDK already delivers notifications to the system
 * tray automatically when the app is backgrounded or killed — that base
 * "receiving" behavior requires no JS code at all and works today, purely
 * from `PushNotifications.register()` having been called successfully.
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
 * PushNotifications.register() when Firebase hasn't actually been set up
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
 * Call once after sign-in (mirrors syncManager.start()'s call site in
 * useAuth.jsx). No-op on web/PWA builds (no FCM path there yet) and when
 * Supabase isn't configured — matches the app's existing "silently degrade
 * to local-only behavior" convention rather than throwing.
 */
export async function registerForPush(userId) {
  if (!PUSH_ENABLED || !Capacitor.isNativePlatform() || !supabase) return;
  currentUserId = userId;

  try {
    const status = await PushNotifications.checkPermissions();
    let granted = status.receive === "granted";
    if (!granted && status.receive !== "denied") {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === "granted";
    }
    if (!granted) return; // user declined — nothing else to do this session

    if (!listenersRegistered) {
      listenersRegistered = true;
      PushNotifications.addListener("registration", (token) => {
        saveToken(token.value);
      });
      PushNotifications.addListener("registrationError", (err) => {
        // eslint-disable-next-line no-console
        console.error("[gymak push] registration error", err);
      });
    }

    await PushNotifications.register();
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
    await supabase.from("push_tokens").delete().eq("device_id", getDeviceId());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[gymak push] failed to remove token on logout", err);
  }
}
