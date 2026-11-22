// تحدي الـ30 يوم: join once, then every day with a logged workout inside the
// 30-day window counts. Complete at 30 days (a workout every day). Cheat days
// bridge like the streak. Device-local, nothing synced.
import { localISO, shiftISO } from "./dateKey";

const KEY = "gymak_challenge30_v1";
export const CHALLENGE_DAYS = 30;

export function loadChallenge() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    return c && typeof c.start === "string" ? c : null;
  } catch { return null; }
}

export function joinChallenge(todayKey = localISO()) {
  const c = { start: todayKey };
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* quota */ }
  return c;
}

export function leaveChallenge() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/**
 * status: null when not joined, else
 * { start, end, day, done, left, complete, failed }
 * day = which challenge day today is (1..30); done = workout days so far in
 * the window (cheat days count as done — rest is part of commitment).
 */
export function challengeStatus(workoutDays = [], cheatDays = [], todayKey = localISO()) {
  const c = loadChallenge();
  if (!c) return null;
  const end = shiftISO(c.start, CHALLENGE_DAYS - 1);
  const doneSet = new Set([...(workoutDays || []), ...(cheatDays || [])]);
  let done = 0;
  for (let i = 0; i < CHALLENGE_DAYS; i++) {
    if (doneSet.has(shiftISO(c.start, i))) done++;
  }
  const day = todayKey < c.start ? 0 : Math.min(CHALLENGE_DAYS, Math.floor((new Date(todayKey) - new Date(c.start)) / 86400000) + 1);
  const complete = done >= CHALLENGE_DAYS;
  const failed = todayKey > end && !complete;
  return { start: c.start, end, day, done, left: CHALLENGE_DAYS - done, complete, failed };
}

/** For the achievements list: 1 when the challenge was completed. */
export function challenge30Complete(workoutDays = [], cheatDays = [], todayKey = localISO()) {
  const st = challengeStatus(workoutDays, cheatDays, todayKey);
  return st && st.complete ? 1 : 0;
}
