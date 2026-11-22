// Light haptic tick. Silently ignored where unsupported (iOS Safari, desktop).
export function buzz(ms = 10) {
  try { if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(ms); } catch { /* ignore */ }
}
