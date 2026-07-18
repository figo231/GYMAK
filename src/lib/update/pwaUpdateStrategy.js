import { registerSW } from "virtual:pwa-register";

// Same cadence as before: an installed/home-screen PWA is almost never
// "navigated to" again after first launch, so the browser's own passive
// update check (which only fires on navigation) can go untriggered for
// days. Polling + a foreground (visibilitychange) check are what actually
// get a deployed update in front of an already-open mobile session.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// How long we give the browser to report back after registration.update().
// There is no return value on that call that says "yes, a new SW was
// found" — the only signal is workbox's onNeedRefresh firing (or not)
// shortly after. This is a heuristic wait, not a guarantee; if a deploy is
// still propagating through a CDN edge node this could rarely report "no
// update" a few seconds early. The hourly/visibility background checks
// will still catch it on the next pass.
const MANUAL_CHECK_GRACE_MS = 1500;

let updateSWFn = null;
let registrationRef = null;
let pendingUpdate = false;

export const pwaUpdateStrategy = {
  init(notify) {
    if (updateSWFn) return; // already initialized — app-lifetime singleton

    updateSWFn = registerSW({
      immediate: true,
      onNeedRefresh() {
        pendingUpdate = true;
        notify({ type: "available" });
      },
      onRegisteredSW(swUrl, registration) {
        if (!registration) return;
        registrationRef = registration;

        const interval = setInterval(() => {
          registration.update().catch(() => {});
        }, UPDATE_CHECK_INTERVAL_MS);

        const onVisible = () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => {});
          }
        };
        document.addEventListener("visibilitychange", onVisible);

        // This component/service lives for the app's entire lifetime in
        // practice (never unmounted), so we don't bother tearing these
        // down — but keep references in case that ever changes.
        pwaUpdateStrategy.__cleanup = () => {
          clearInterval(interval);
          document.removeEventListener("visibilitychange", onVisible);
        };
      },
      onRegisterError(error) {
        // eslint-disable-next-line no-console
        console.error("[gymak] service worker registration failed:", error);
        notify({ type: "error", error });
      },
    });
  },

  async checkForUpdate(notify) {
    if (!registrationRef) {
      notify({ type: "error" });
      return false;
    }
    try {
      await registrationRef.update();
    } catch (error) {
      notify({ type: "error", error });
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, MANUAL_CHECK_GRACE_MS));

    if (pendingUpdate) {
      notify({ type: "available" });
      return true;
    }
    notify({ type: "none" });
    return false;
  },

  applyUpdate() {
    pendingUpdate = false;
    updateSWFn?.(true); // true = reload the page once the new SW takes control
  },
};
