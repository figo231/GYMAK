// In-app update for the Android app. The installed build number (versionCode)
// is the CI run number; every CI build publishes a GitHub Release tagged
// apk-<run number>. We compare the latest tag with the installed build and,
// when newer, offer a one-tap download of the public APK link.
const LATEST_API = "https://api.github.com/repos/figo231/GYMAK/releases/latest";
export const APK_URL = "https://github.com/figo231/GYMAK/releases/latest/download/GYMAK.apk";
const SEEN_KEY = "gymak_apk_seen";
const PENDING_KEY = "gymak_apk_pending";

let latest = null; // { build, name }

async function installedBuild() {
  const mod = await import("@capacitor/app");
  const info = await mod.App.getInfo(); // never return the plugin proxy from async
  return Number(info.build) || 0;
}

async function fetchLatest() {
  const res = await fetch(LATEST_API, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
  if (!res.ok) throw new Error("release check failed");
  const data = await res.json();
  const m = /apk-(\d+)/.exec(data.tag_name || "");
  if (!m) throw new Error("bad tag");
  return { build: Number(m[1]), name: data.name || data.tag_name };
}

async function check() {
  const [mine, remote] = await Promise.all([installedBuild(), fetchLatest()]);
  if (remote.build > mine) {
    latest = remote;
    localStorage.setItem(PENDING_KEY, String(remote.build));
    return true;
  }
  latest = null;
  localStorage.removeItem(PENDING_KEY);
  return false;
}

export const apkUpdateStrategy = {
  init(notify) {
    check()
      .then((found) => {
        if (!found) return;
        // Auto prompt once per version; the settings dot stays until updated.
        if (localStorage.getItem(SEEN_KEY) !== String(latest.build)) {
          localStorage.setItem(SEEN_KEY, String(latest.build));
          notify({ type: "apk-available", auto: true });
        }
      })
      .catch(() => {});
  },

  async checkForUpdate(notify) {
    try {
      const found = await check();
      if (found) notify({ type: "apk-available" });
      else notify({ type: "none" });
      return found;
    } catch (error) {
      notify({ type: "error", error });
      return false;
    }
  },

  async applyUpdate() {
    const mod = await import("@capacitor/browser");
    const B = mod.Browser;
    await B.open({ url: APK_URL });
  },

  hasPending() {
    return !!localStorage.getItem(PENDING_KEY);
  },
};
