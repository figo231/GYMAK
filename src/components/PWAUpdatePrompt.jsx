import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { useI18n } from "../hooks/useI18n";

// How often to actively ask the browser to re-check sw.js for changes.
// Installed/home-screen PWAs are almost never "navigated to" again after
// the first launch, so the browser's own passive update check (which only
// runs on navigation) can go untriggered for days. Polling + a foreground
// (visibilitychange) check are what actually get a deployed update in
// front of an already-open mobile session.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
// If the user doesn't tap "Update now", reload on their behalf after this
// long so stale builds can't linger indefinitely.
const AUTO_RELOAD_AFTER_MS = 10 * 1000;

export default function PWAUpdatePrompt() {
  const { lang } = useI18n();
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSWRef = useRef(null);

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onRegisteredSW(swUrl, registration) {
        if (!registration) return;
        // Force a fresh-from-network check for a new sw.js on an interval...
        const interval = setInterval(() => {
          registration.update().catch(() => {});
        }, UPDATE_CHECK_INTERVAL_MS);
        // ...and immediately whenever the app is brought back to the
        // foreground, which is the common re-entry point for an installed PWA.
        const onVisible = () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => {});
          }
        };
        document.addEventListener("visibilitychange", onVisible);
        // Stash cleanup on the ref so it can run if this ever unmounts
        // (it won't in practice — this component lives for the app's lifetime).
        updateSWRef.current = updateSW;
        updateSWRef.current.__cleanup = () => {
          clearInterval(interval);
          document.removeEventListener("visibilitychange", onVisible);
        };
      },
      onRegisterError(error) {
        // eslint-disable-next-line no-console
        console.error("[gymak] service worker registration failed:", error);
      },
    });
    updateSWRef.current = updateSW;

    return () => updateSWRef.current?.__cleanup?.();
  }, []);

  useEffect(() => {
    if (!needRefresh) return undefined;
    // Guaranteed convergence even if the user never taps the button.
    const timer = setTimeout(() => applyUpdate(), AUTO_RELOAD_AFTER_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRefresh]);

  function applyUpdate() {
    updateSWRef.current?.(true); // true = reload the page once the new SW takes control
  }

  if (!needRefresh) return null;

  const text = lang === "en"
    ? { title: "New version available", action: "Update now" }
    : { title: "في نسخة جديدة للتطبيق", action: "تحديث الآن" };

  return (
    <div className="pwa-update-toast" role="status" aria-live="polite">
      <span className="pwa-update-msg">{text.title}</span>
      <button type="button" className="pwa-update-btn" onClick={applyUpdate}>
        {text.action}
      </button>
    </div>
  );
}
