import { localISO, shiftISO } from "./dateKey";
/* Weekly challenge + monthly badges, computed from workout days. Pure, nothing stored. Egypt week starts Saturday. */
export function weekStart(todayKey = localISO()) {
  const [y, m, d] = todayKey.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun .. 6 Sat
  const sinceSat = (dow + 1) % 7;
  return shiftISO(todayKey, -sinceSat);
}
const inRange = (days, a, b) => days.filter((d) => d >= a && d <= b).length;

export function weeklyChallenge(workoutDays = [], todayKey = localISO()) {
  const start = weekStart(todayKey), end = shiftISO(start, 6);
  const done = inRange(workoutDays, start, end);
  // Target: last 4 full weeks' average + 1, clamped to 3..5
  let total = 0;
  for (let i = 1; i <= 4; i++) { const s = shiftISO(start, -7 * i); total += inRange(workoutDays, s, shiftISO(s, 6)); }
  const target = Math.min(5, Math.max(3, Math.round(total / 4) + 1));
  const left = Math.max(0, target - done);
  const daysLeft = Math.max(0, 6 - Math.round((new Date(todayKey) - new Date(start)) / 86400000));
  return { start, end, done, target, left, complete: done >= target, daysLeft, pct: Math.min(100, Math.round((done / target) * 100)) };
}

export const MONTH_TIERS = [
  { id: "bronze", label: "برونز", days: 8 },
  { id: "silver", label: "فضة", days: 12 },
  { id: "gold", label: "ذهب", days: 20 },
];
export function monthlyBadges(workoutDays = [], todayKey = localISO()) {
  const key = todayKey.slice(0, 7);
  const days = workoutDays.filter((d) => d.startsWith(key)).length;
  const earned = MONTH_TIERS.filter((t) => days >= t.days);
  const next = MONTH_TIERS.find((t) => days < t.days) || null;
  return { month: key, days, earned, next, toNext: next ? next.days - days : 0 };
}
