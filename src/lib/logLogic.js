import { tx, txf } from "./i18n/tx";
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
export function parseLogForm({ weight, sets, reps }, fromDisplay, timed = false) {
  const w = parseFloat(weight);
  if (!Number.isFinite(w) || w < 0) return { ok: false, field: "weight", error: tx("اكتب الوزن (0 لو بوزن الجسم).") };
  const kg = fromDisplay(w);
  if (kg > LIMITS.weightKg) return { ok: false, field: "weight", error: tx("الوزن كبير أوي، راجعه.") };
  const s = parseInt(sets, 10);
  if (!(s >= 1) || s > LIMITS.sets) return { ok: false, field: "sets", error: txf(`عدد المجموعات لازم يكون من 1 لـ {0}.`, [LIMITS.sets]) };
  const r = parseInt(reps, 10);
  if (!(r >= 1) || r > (timed ? 3600 : LIMITS.reps)) return { ok: false, field: "reps", error: timed ? (tx("ثواني") + ": 1-3600") : tx("اكتب عدد التكرارات (1 على الأقل).") };
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

// ---- 1RM estimate (Epley, with Brzycki for low reps). Only trustworthy up to about 12 reps. ----
export function estimate1RM(weight, reps) {
  const w = Number(weight), r = Math.round(Number(reps));
  if (!(w > 0) || !(r >= 1)) return 0;
  if (r === 1) return w;
  const rr = Math.min(r, 12);
  return rr <= 5 ? w * (36 / (37 - rr)) : w * (1 + rr / 30);
}
// Best estimate across logs. Returns { value, from } where from is the set it came from, or null.
export function best1RM(logs) {
  let best = null;
  (logs || []).forEach((l) => {
    const v = estimate1RM(l.weight, l.reps);
    if (v > 0 && (!best || v > best.value)) best = { value: v, from: l };
  });
  return best;
}
// Working weights at common percentages of a 1RM. `step` rounds to loadable plates (2.5 kg / 5 lb).
export const PERCENTS = [95, 90, 85, 80, 75, 70, 60];
export function percentTable(oneRM, step = 2.5) {
  if (!(oneRM > 0)) return [];
  const repsAt = { 95: 2, 90: 4, 85: 6, 80: 8, 75: 10, 70: 12, 60: 15 };
  return PERCENTS.map((p) => ({ percent: p, weight: Math.round((oneRM * p / 100) / step) * step, reps: repsAt[p] }));
}
