// Pure helpers for logging a set on the exercise detail page.
export const LIMITS = { weightKg: 1000, sets: 50, reps: 1000 };

export function isBodyweight(ex) {
  return !!ex && (ex.equipment === "وزن الجسم" || ex.unit === "sec");
}

// Starting values: last session first, then the exercise defaults, then a sane blank.
export function initialForm(ex, last, toDisplay) {
  if (last) return { weight: String(toDisplay(last.weight)), sets: String(last.sets), reps: String(last.reps) };
  return {
    weight: isBodyweight(ex) ? "0" : "",
    sets: String(ex && ex.sets ? ex.sets : 3),
    reps: String(ex && ex.reps ? ex.reps : 10),
  };
}

// Validates what the user typed. weightKg is converted already. Zero weight is fine (body weight / holds).
export function parseLogForm({ weight, sets, reps }, fromDisplay) {
  const w = parseFloat(weight);
  if (!Number.isFinite(w) || w < 0) return { ok: false, field: "weight", error: "اكتب الوزن (0 لو بوزن الجسم)." };
  const kg = fromDisplay(w);
  if (kg > LIMITS.weightKg) return { ok: false, field: "weight", error: "الوزن كبير أوي، راجعه." };
  const s = parseInt(sets, 10);
  if (!(s >= 1) || s > LIMITS.sets) return { ok: false, field: "sets", error: `عدد المجموعات لازم يكون من 1 لـ ${LIMITS.sets}.` };
  const r = parseInt(reps, 10);
  if (!(r >= 1) || r > LIMITS.reps) return { ok: false, field: "reps", error: "اكتب عدد التكرارات (1 على الأقل)." };
  return { ok: true, kg, sets: s, reps: r };
}

// Step size for the +/- buttons.
export function stepFor(field, unitLabel) {
  if (field === "weight") return unitLabel === "lb" ? 5 : 2.5;
  return 1;
}
export function stepValue(current, dir, field, unitLabel) {
  const cur = parseFloat(current);
  const base = Number.isFinite(cur) ? cur : 0;
  const next = Math.max(field === "weight" ? 0 : 1, base + dir * stepFor(field, unitLabel));
  return String(Math.round(next * 100) / 100);
}

// Logs of one exercise with their index in the stored array (needed for delete / undo).
export function logsWithIndex(logs) { return (logs || []).map((l, i) => ({ ...l, i })); }
export function logsOnDate(logs, date) { return logsWithIndex(logs).filter((l) => l.date === date); }
export function bestWeight(logs) { return (logs || []).reduce((m, l) => Math.max(m, l.weight || 0), 0); }
// Most recent session before `date` (all sets of the latest earlier day).
export function previousSession(logs, date) {
  const before = logsWithIndex(logs).filter((l) => l.date < date);
  if (!before.length) return null;
  const day = before.reduce((m, l) => (l.date > m ? l.date : m), "");
  return { date: day, sets: before.filter((l) => l.date === day) };
}
export function volume(sets) { return (sets || []).reduce((t, l) => t + (l.weight || 0) * l.sets * l.reps, 0); }
