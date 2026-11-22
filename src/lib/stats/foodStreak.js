// Nutrition adherence streak: consecutive days the user logged food AND kept
// calories in a sensible band around the daily target (60%..115%). Without a
// target (no weight logged yet), any logged day counts. Cheat days bridge the
// streak without counting, exactly like the workout streak.
import { localISO, shiftISO } from "../dateKey";

export function isAdherentDay(day, target) {
  if (!day || !day.totalKcal) return false;
  if (!target) return day.totalKcal > 0;
  return day.totalKcal >= target * 0.6 && day.totalKcal <= target * 1.15;
}

export function foodStreak(foodLog, cheatDays = [], target = null, todayKey = localISO()) {
  const byDate = new Map((foodLog || []).map((d) => [d.date, d]));
  const cheat = new Set(cheatDays || []);
  let streak = 0;
  let cursor = todayKey;
  if (!isAdherentDay(byDate.get(cursor), target)) cursor = shiftISO(cursor, -1);
  let guard = 0;
  while (guard++ < 3700) {
    const day = byDate.get(cursor);
    if (isAdherentDay(day, target)) streak++;
    else if (!cheat.has(cursor)) break;
    cursor = shiftISO(cursor, -1);
  }
  return streak;
}

/** Last 7 days (oldest first) with adherence flags, for the week dots. */
export function foodWeek(foodLog, target = null, todayKey = localISO()) {
  const byDate = new Map((foodLog || []).map((d) => [d.date, d]));
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftISO(todayKey, i - 6);
    return { date, done: isAdherentDay(byDate.get(date), target) };
  });
}
