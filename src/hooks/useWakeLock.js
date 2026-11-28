import { useEffect } from "react";

// Keeps the screen awake while `active` is true. Feature-detected: does nothing
// where the Screen Wake Lock API is missing. Re-acquires when the app returns to the foreground.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.wakeLock?.request) return undefined;
    let lock = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (cancelled || document.visibilityState !== "visible") return;
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) { lock.release?.().catch?.(() => {}); lock = null; }
      } catch { /* denied (battery saver etc.): ignore */ }
    };
    const onVisible = () => { if (document.visibilityState === "visible" && (!lock || lock.released)) acquire(); };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      try { lock?.release?.().catch?.(() => {}); } catch { /* ignore */ }
      lock = null;
    };
  }, [active]);
}
