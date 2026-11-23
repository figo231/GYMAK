import { App } from "@capacitor/app";
// A native APK has a fixed bundle. Public GitHub release metadata is only
// checked online; Android always asks the person before installing an update.
const LATEST_API = "https://api.github.com/repos/figo231/GYMAK/releases/latest";
export const APK_URL = "https://gymak-eight.vercel.app/download/GYMAK.apk";
const SEEN_KEY = "gymak_apk_seen";
const PENDING_KEY = "gymak_apk_pending";
const MIN_CHECK_GAP = 60_000;
const CHECK_TIMEOUT = 8000;
let latest = null;
let initialized = false;
let lastAttempt = 0;
let inFlight = null;
const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;

async function installedInfo() {
  const info = await App.getInfo();
  return { build: Number(info.build) || 0, version: String(info.version || "") };
}

async function fetchLatest() {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const res = await fetch(LATEST_API, {
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store", ...(controller ? { signal: controller.signal } : {}),
        });
        if (!res.ok) throw new Error("release-check-failed");
        const data = await res.json();
        const match = /^apk-(\d+)$/.exec(data.tag_name || "");
        if (!match || data.draft || data.prerelease) throw new Error("invalid-release");
        return { build: Number(match[1]) };
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => { controller?.abort(); reject(new Error("update-timeout")); }, CHECK_TIMEOUT);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

async function check() {
  if (offline()) throw new Error("offline");
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const me = await installedInfo();
    // A Play build must only update through Play, not a differently signed APK.
    if (import.meta.env.VITE_DISTRIBUTION_CHANNEL === "play" || /play/i.test(me.version)) { latest = null; localStorage.removeItem(PENDING_KEY); return false; }
    const remote = await fetchLatest();
    if (remote.build > me.build) {
      latest = remote;
      localStorage.setItem(PENDING_KEY, String(remote.build));
      return true;
    }
    latest = null;
    localStorage.removeItem(PENDING_KEY);
    return false;
  })();
  try { return await inFlight; } finally { inFlight = null; }
}

export const apkUpdateStrategy = {
  init(notify) {
    if (initialized) return;
    initialized = true;
    const automatic = () => {
      if (offline() || (lastAttempt && Date.now() - lastAttempt < MIN_CHECK_GAP)) return;
      lastAttempt = Date.now();
      check().then((found) => {
        if (found && localStorage.getItem(SEEN_KEY) !== String(latest.build)) {
          localStorage.setItem(SEEN_KEY, String(latest.build));
          notify({ type: "apk-available", auto: true });
        }
      }).catch(() => {}); // Startup and offline workout screens never wait on this.
    };
    automatic();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") automatic();
    });
    window.addEventListener("online", automatic);
    App.addListener("appStateChange", ({ isActive }) => { if (isActive) automatic(); }).catch(() => {});
  },
  async checkForUpdate(notify) {
    try {
      const found = await check();
      notify({ type: found ? "apk-available" : "none" });
      return found;
    } catch (error) {
      notify({ type: "error", error });
      // The caller must not misreport a failed/offline check as "up to date".
      throw error;
    }
  },
  async applyUpdate() {
    if (offline()) throw new Error("offline");
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: APK_URL });
  },
  hasPending() { return !!localStorage.getItem(PENDING_KEY); },
};
