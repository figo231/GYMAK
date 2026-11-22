// Web/PWA builds update through their service worker; native builds check
// public GitHub release metadata and ask the person to install a newer APK.
import { pwaUpdateStrategy } from "./pwaUpdateStrategy";
import { apkUpdateStrategy } from "./apkUpdateStrategy";

function isNativeApp() {
  return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
}

function isTWA() {
  // Android's Trusted Web Activity wrapper (what PWABuilder produces)
  // launches the app with this referrer — the standard way to distinguish
  // "running as the wrapped APK" from "running as a browser tab / installed PWA".
  return typeof document !== "undefined" && document.referrer.startsWith("android-app://");
}

function getStrategy() {
  return isNativeApp() || isTWA() ? apkUpdateStrategy : pwaUpdateStrategy;
}

const listeners = new Set();
let initialized = false;

function notify(event) {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      /* one bad listener shouldn't break the others */
    }
  });
}

const UpdateService = {
  /** Call once at app startup. Wires the active strategy's automatic (background) detection. */
  init() {
    if (initialized) return;
    initialized = true;
    getStrategy().init(notify);
  },

  /**
   * Subscribe to update lifecycle events:
   *   { type: "checking" }  — a check just started
   *   { type: "available" } — a new version was found (auto or manual)
   *   { type: "none" }      — manual check found nothing new
   *   { type: "error" }     — the check itself failed
   * Returns an unsubscribe function.
   */
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Manually trigger a check, e.g. from the Settings row. Resolves true if an update was found. */
  async checkForUpdate() {
    notify({ type: "checking" });
    return getStrategy().checkForUpdate(notify);
  },

  /** Download+activate a pending update and reload into it. */
  applyUpdate() {
    return getStrategy().applyUpdate();
  },

  /** Android app only: is a newer build known and not installed yet (drives the settings dot). */
  hasPendingApk() {
    return isNativeApp() && !!apkUpdateStrategy.hasPending?.();
  },

  /** Which strategy is active — exposed in case UI ever needs to label things differently per platform. */
  platform() {
    return isNativeApp() || isTWA() ? "apk" : "pwa";
  },
};

export default UpdateService;
