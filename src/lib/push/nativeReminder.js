import { Capacitor } from "@capacitor/core";

/* Daily workout reminder for the Android app. The browser Notification API does
   not exist inside the Android WebView, so the old reminder could never work
   there. This uses the native local-notifications plugin (a repeating daily
   alarm that survives the app being closed). */
const REMINDER_ID = 4101;

async function plugin() {
  const mod = await import("@capacitor/local-notifications");
  return { LN: mod.LocalNotifications }; // never return the plugin proxy from async (awaiting it hangs)
}

export const isNative = () => Capacitor.isNativePlatform();

/* Notification permission helpers for the first-open ask. Native uses the
   local-notifications plugin that APK 28 already ships (with the
   POST_NOTIFICATIONS permission), so no new APK is needed. Nothing is
   scheduled here: this only asks the system for permission. */
export async function getNotificationPermission() {
  try {
    if (Capacitor.isNativePlatform()) {
      const { LN } = await plugin();
      const r = (await LN.checkPermissions()).display;
      return r === "granted" ? "granted" : r === "denied" ? "denied" : "prompt";
    }
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission === "default" ? "prompt" : Notification.permission;
  } catch { return "unsupported"; }
}

export async function requestNotificationPermission() {
  try {
    if (Capacitor.isNativePlatform()) {
      const { LN } = await plugin();
      const r = (await LN.requestPermissions()).display;
      return r === "granted" ? "granted" : "denied";
    }
    if (typeof Notification === "undefined") return "unsupported";
    const r = await Notification.requestPermission();
    return r === "granted" ? "granted" : "denied";
  } catch { return "unsupported"; }
}

export async function enableNativeReminder(time, lang = "ar", {requestPermission=true}={}) {
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time)))throw Error("invalid_reminder_time");
  const { LN } = await plugin();
  let perm = await LN.checkPermissions();
  if (perm.display !== "granted" && requestPermission) perm = await LN.requestPermissions();
  if (perm.display !== "granted") return false;
  const [hour, minute] = String(time || "19:00").split(":").map(Number);
  await LN.cancel({ notifications: [{ id: REMINDER_ID }] });
  await LN.schedule({
    notifications: [{
      id: REMINDER_ID,
      isExactNotification: false,
      title: lang === "en" ? "GYMAK — workout time 💪" : "GYMAK — وقت التمرين 💪",
      body: lang === "en" ? "Don't forget to log today's workout." : "متنساش تسجل تمرينك النهاردة.",
      schedule: { on: { hour, minute }, allowWhileIdle: true },
    }],
  });
  return true;
}

export async function disableNativeReminder() {
  try {
    const { LN } = await plugin();
    await LN.cancel({ notifications: [{ id: REMINDER_ID }] });
  } catch (e) { /* plugin unavailable */ }
}

import { ALL_IDS, buildNotifications, missedNotification } from "./reminders";

export async function applyExtraReminders(prefs,{requestPermission=true}={}) {
  const { LN } = await plugin();
  const list = buildNotifications(prefs);
  if (list.length) {
    let perm = await LN.checkPermissions();
    if (perm.display !== "granted" && requestPermission) perm = await LN.requestPermissions();
    if (perm.display !== "granted") return false;
  }
  await LN.cancel({ notifications: ALL_IDS.filter((i) => i !== 4120).map((id) => ({ id })) });
  if (list.length) await LN.schedule({ notifications: list });
  return true;
}

// Called when the app goes to the background / comes back.
export async function syncMissedReminder(prefs, trainedToday, appVisible) {
  try {
    const { LN } = await plugin();
    await LN.cancel({ notifications: [{ id: 4120 }] });
    if (appVisible) return;
    const n = missedNotification(prefs, new Date(), trainedToday);
    if (!n) return;
    const perm = await LN.checkPermissions();
    if (perm.display === "granted") await LN.schedule({ notifications: [n] });
  } catch { /* plugin unavailable */ }
}

export async function cancelAllAppReminders() {
  if (!isNative()) return;
  const {LN}=await plugin();
  await LN.cancel({notifications:[4101,...ALL_IDS,...Array.from({length:7},(_,i)=>4200+i)].map(id=>({id}))});
}
