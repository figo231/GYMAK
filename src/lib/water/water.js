/* Water tracking: device-local (separate key, not part of synced store state). Amounts in ml. */
const KEY = "gymak_water_v1";
export const DEFAULT_GOAL = 2500;
export const STEP = 250;

export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { goal: Number(v.goal) > 0 ? Number(v.goal) : DEFAULT_GOAL, days: v.days && typeof v.days === "object" ? v.days : {} };
  } catch { return { goal: DEFAULT_GOAL, days: {} }; }
}
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota: ignore */ } }

export function getWater(date = dayKey()) { const s = load(); return { ml: Number(s.days[date]) || 0, goal: s.goal }; }
export function addWater(delta, date = dayKey()) {
  const s = load();
  s.days[date] = Math.max(0, Math.min(10000, (Number(s.days[date]) || 0) + delta));
  const keys = Object.keys(s.days).sort();
  while (keys.length > 120) delete s.days[keys.shift()];
  save(s);
  return { ml: s.days[date], goal: s.goal };
}
export function setWaterGoal(goal) {
  const g = Math.round(Number(goal));
  if (!(g >= 500 && g <= 10000)) return false;
  const s = load(); s.goal = g; save(s); return true;
}
export function lastDays(n = 7, now = new Date()) {
  const s = load();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (n - 1 - i));
    const k = dayKey(d);
    return { date: k, ml: Number(s.days[k]) || 0, goal: s.goal };
  });
}
