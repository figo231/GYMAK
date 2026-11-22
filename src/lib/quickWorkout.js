// Quick workout: one tap builds a balanced 15-20 minute session (one exercise
// per muscle group, 6 total), rotating deterministically by day so busy-day
// users get variety without thinking. Pure picker; the caller adds the ids to
// today's plan.
import { localISO } from "./dateKey";

const GROUPS = ["legs", "chest", "back", "core", "shoulders", "arms"];

export function pickQuickWorkout(exercises, dateISO = localISO(), size = 6) {
  if (!Array.isArray(exercises) || !exercises.length) return [];
  const [y, m, d] = dateISO.split("-").map(Number);
  const seed = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  // Prefer bodyweight and beginner/intermediate moves — busy days need no setup.
  const score = (ex) => (ex.equipment === "وزن الجسم" ? 0 : ex.equipment === "دمبل" ? 1 : 2) * 10
    + (ex.difficulty === "مبتدئ" ? 0 : ex.difficulty === "متوسط" ? 1 : 2);
  const picked = [];
  const used = new Set();
  GROUPS.forEach((g, gi) => {
    const pool = exercises
      .filter((ex) => ex.muscle === g && !used.has(ex.id))
      .sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id));
    if (!pool.length) return;
    // rotate inside the best-scoring band so consecutive days differ
    const best = score(pool[0]);
    const band = pool.filter((ex) => score(ex) === best);
    const ex = band[(seed + gi) % band.length];
    used.add(ex.id);
    picked.push(ex);
  });
  return picked.slice(0, size);
}

export function quickWorkoutMinutes(picked) {
  // ~3 minutes per exercise (3 sets x 40s + rests) — honest 15-20 for 6.
  return picked.length * 3;
}
