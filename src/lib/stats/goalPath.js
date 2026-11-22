// Weight-goal trajectory: draws the straight path from the latest weigh-in to
// (deadline, goal weight) and tells the user whether their recent rate keeps
// them on that path. Pure functions; all weights in kg, dates ISO.
import { localISO } from "../dateKey";

function days(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}

/** {from, to} endpoints for the goal line, or null when there is nothing to draw. */
export function goalTrajectory(history, goal, deadline) {
  if (goal == null || !deadline || !history || !history.length) return null;
  const last = history[history.length - 1];
  if (deadline <= last.date) return null;
  return { from: { date: last.date, weight: last.weight }, to: { date: deadline, weight: goal } };
}

/**
 * On-track verdict.
 * Returns { status, remaining, daysLeft, requiredPerWeek, actualPerWeek } or null.
 * status: "done" | "missed" | "ahead" | "on" | "behind" | "no-data"
 */
export function goalProgress(history, goal, deadline, todayKey = localISO()) {
  if (goal == null || !history || !history.length) return null;
  const last = history[history.length - 1];
  const remaining = +(goal - last.weight).toFixed(1);
  if (Math.abs(remaining) < 0.3) {
    return { status: "done", remaining: 0, daysLeft: deadline ? days(todayKey, deadline) : null, requiredPerWeek: 0, actualPerWeek: 0 };
  }
  const dir = Math.sign(remaining); // +1 need to gain, -1 need to lose
  const daysLeft = deadline ? days(todayKey, deadline) : null;
  if (daysLeft != null && daysLeft < 0) {
    return { status: "missed", remaining, daysLeft, requiredPerWeek: null, actualPerWeek: null };
  }
  const requiredPerWeek = daysLeft && daysLeft > 0 ? +((remaining / daysLeft) * 7).toFixed(2) : null;

  // Recent rate: first vs last weigh-in over up to the last 28 days.
  const ref = history.find((h) => days(h.date, last.date) <= 28 && days(h.date, last.date) >= 3) || null;
  let actualPerWeek = null;
  if (ref && ref !== last) actualPerWeek = +(((last.weight - ref.weight) / days(ref.date, last.date)) * 7).toFixed(2);

  let status = "no-data";
  if (actualPerWeek != null && requiredPerWeek != null && requiredPerWeek !== 0) {
    const tolerance = Math.max(0.15, Math.abs(requiredPerWeek) * 0.25);
    const eff = actualPerWeek * dir; // progress in the needed direction, + = moving toward goal
    const req = requiredPerWeek * dir;
    if (eff >= req - tolerance) status = "on";
    else if (eff > 0) status = "behind";
    else status = "behind"; // moving away from the goal
    if (eff >= req + tolerance) status = "ahead";
  }
  return { status, remaining, daysLeft, requiredPerWeek, actualPerWeek };
}

export const GOAL_STATUS_LABEL = {
  done: "وصلت لهدفك 🎉",
  missed: "المعاد عدّى — جدّد الهدف بتاريخ جديد",
  ahead: "ماشي أسرع من الخطة 🔥",
  on: "ماشي صح على الخطة ✅",
  behind: "تحتاج تزود الإيقاع عشان تلحق المعاد",
  "no-data": "سجّل وزنك كام مرة عشان نعرف إنت ماشي صح ولا لأ",
};
