/**
 * Crash / error reporting abstraction.
 *
 * NOT wired to any real provider yet (no Firebase Crashlytics, no Sentry —
 * intentionally, per Sprint 6 scope: prepare the architecture, don't
 * integrate a real SDK). This file exists so every place in the app that
 * currently needs to "report" an unexpected error calls ONE function
 * instead of scattering ad hoc console.error calls that would each need
 * to be found and rewired later.
 *
 * ----- Future integration point -----
 * When a real crash reporter is added:
 *   1. Initialize its SDK once, in src/main.jsx, before the app renders
 *      (e.g. `import { init } from "some-sdk"; init({ dsn: ... });`).
 *   2. Replace the body of reportError() below with the real call (e.g.
 *      `Sentry.captureException(error, { extra: context })` or
 *      `crashlytics().recordError(error)`).
 * Nothing else in the codebase needs to change — every call site already
 * goes through this one function.
 *
 * Current call sites: src/components/ErrorBoundary.jsx (render errors).
 * Not wired into gymakStore.js or syncManager.js in this Sprint — Sprint 6
 * explicitly scopes out any change to Store/Sync internals.
 */
const BUFFER_KEY = "gymak_crash_buffer_v1";
const MAX_ENTRIES = 20;
const clip = (v, n) => String(v ?? "").slice(0, n);

/**
 * Local-only crash buffer: the last 20 errors are kept on this device so a person
 * can look at them or copy them by hand. Nothing is sent anywhere. Messages and
 * stacks are clipped, and the app never stores request bodies or user data here.
 */
export function readCrashBuffer(storage = typeof localStorage !== "undefined" ? localStorage : null) {
  try {
    const list = JSON.parse(storage?.getItem(BUFFER_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}
export function clearCrashBuffer(storage = typeof localStorage !== "undefined" ? localStorage : null) {
  try { storage?.removeItem(BUFFER_KEY); return true; } catch { return false; }
}
function pushToBuffer(error, context, storage) {
  try {
    if (!storage) return;
    const entry = {
      at: Date.now(),
      source: clip(context?.source || "app", 40),
      message: clip(error?.message ?? error, 300),
      stack: clip(error?.stack, 800),
    };
    const next = [...readCrashBuffer(storage), entry].slice(-MAX_ENTRIES);
    storage.setItem(BUFFER_KEY, JSON.stringify(next));
  } catch { /* storage full or blocked: reporting must never throw */ }
}
export function installGlobalErrorBuffer(target = typeof window !== "undefined" ? window : null) {
  if (!target || target.__gymakErrBuf) return false;
  target.__gymakErrBuf = true;
  target.addEventListener("error", (e) => reportError(e?.error || e?.message || "error", { source: "window.error" }));
  target.addEventListener("unhandledrejection", (e) => reportError(e?.reason || "unhandledrejection", { source: "unhandledrejection" }));
  return true;
}

export function reportError(error, context = {}) {
  pushToBuffer(error, context, typeof localStorage !== "undefined" ? localStorage : null);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error("[gymak:error]", error, context);
  }
}
