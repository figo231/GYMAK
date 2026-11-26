import { Workbox } from "workbox-window";
import { hasActiveWorkout } from "./workoutUpdateGuard";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const MANUAL_CHECK_GRACE_MS = 1500;
let updateSWFn = null;
let registrationRef = null;
let pendingUpdate = false;
let reloadPending = false;
let notifyUpdate = () => {};
let registrationReady = Promise.resolve();

function reloadWhenSafe() {
  reloadPending = true;
  if (hasActiveWorkout()) return;
  let last = 0;
  try { last = Number(sessionStorage.getItem("gymak_sw_reload") || 0); } catch { /* storage may be unavailable */ }
  if (Date.now() - last < 30000) return;
  try { sessionStorage.setItem("gymak_sw_reload", String(Date.now())); } catch { /* reload still works without storage */ }
  reloadPending = false;
  window.location.reload();
}
function foundWaiting() {
  const first = !pendingUpdate;
  pendingUpdate = true;
  if (first) notifyUpdate({ type: "available" });
  setTimeout(() => pwaUpdateStrategy.applyUpdate(), 1200);
}
function inspectWaiting() {
  if (registrationRef?.waiting) foundWaiting();
}
function observeInstalling(worker) {
  if (!worker) return;
  worker.addEventListener("statechange", () => {
    if (worker.state === "installed") inspectWaiting();
  });
}

export const pwaUpdateStrategy = {
  init(notify) {
    if (updateSWFn || !navigator.serviceWorker) return;
    notifyUpdate = notify;
    const worker = new Workbox(import.meta.env.BASE_URL + "sw.js");
    // Unlike the generated auto-update helper, this callback really asks a
    // waiting worker to activate. Never activate or reload during a workout.
    updateSWFn = () => worker.messageSkipWaiting();
    worker.addEventListener("waiting", foundWaiting);
    worker.addEventListener("externalwaiting", foundWaiting);
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController) reloadWhenSafe();
      hadController = true;
    });
    const retry = setInterval(() => {
      if (hasActiveWorkout()) return;
      if (reloadPending) reloadWhenSafe();
      else if (pendingUpdate) pwaUpdateStrategy.applyUpdate();
    }, 5000);
    registrationReady = worker.register({ immediate: true }).then(registration => {
      if (!registration) return;
      registrationRef = registration;
      inspectWaiting(); // Includes a worker left waiting by a prior app session.
      observeInstalling(registration.installing);
      const onFound = () => observeInstalling(registration.installing);
      registration.addEventListener("updatefound", onFound);
      const check = () => registration.update().then(inspectWaiting).catch(() => {});
      check(); // Do not leave an already-open PWA stale until the next hour.
      const interval = setInterval(check, UPDATE_CHECK_INTERVAL_MS);
      const onVisible = () => { if (document.visibilityState === "visible") check(); };
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("online", check);
      pwaUpdateStrategy.__cleanup = () => {
        clearInterval(retry);
        clearInterval(interval);
        registration.removeEventListener("updatefound", onFound);
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("online", check);
      };
    }).catch(error => notify({ type: "error", error }));
  },
  async checkForUpdate(notify) {
    await registrationReady;
    if (!registrationRef) { notify({ type: "error" }); return false; }
    try { await registrationRef.update(); } catch (error) {
      notify({ type: "error", error }); return false;
    }
    inspectWaiting();
    if (!pendingUpdate) await new Promise(resolve => setTimeout(resolve, MANUAL_CHECK_GRACE_MS));
    inspectWaiting();
    if (pendingUpdate || registrationRef.waiting) {
      notify({ type: "available" }); return true;
    }
    // An installing worker is not proof of "no update". Keep the state honest
    // while large offline assets finish downloading; completion is observed above.
    if (registrationRef.installing) { notify({ type: "checking" }); return false; }
    notify({ type: "none" }); return false;
  },
  applyUpdate() {
    if (hasActiveWorkout() || !pendingUpdate || !updateSWFn) return false;
    // Keep pending until controllerchange. A failed message can then be retried.
    Promise.resolve(updateSWFn()).catch(() => {});
    return true;
  },
};
