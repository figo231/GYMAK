/* Rest timer settings + helpers. Setting lives in localStorage (device-local). */
const KEY = "gymak_rest_v1";
export const REST_OPTIONS = [45, 60, 90, 120, 180];

export function getRestSettings() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    const sec = REST_OPTIONS.includes(v.sec) ? v.sec : 90;
    return { enabled: v.enabled !== false, sec };
  } catch { return { enabled: true, sec: 90 }; }
}
export function setRestSettings(patch) {
  const next = { ...getRestSettings(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
export function fmtClock(total) {
  const t = Math.max(0, Math.round(total));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
/** Remaining seconds from an absolute end timestamp (robust to tab throttling). */
export function remaining(endAt, now = Date.now()) {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}
export function startRest(sec) {
  const s = getRestSettings();
  if (!s.enabled) return;
  window.dispatchEvent(new CustomEvent("gymak-rest-start", { detail: { sec: sec || s.sec } }));
}
