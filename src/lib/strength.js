// One-rep-max estimates and working-weight suggestions. All weights in kg.
// Epley is used up to 10 reps, Brzycki above, both are rough beyond 12 reps.
export function estimate1RM(weight, reps) {
  const w = Number(weight), r = Math.floor(Number(reps));
  if (!(w > 0) || !(r >= 1) || r > 30) return null;
  if (r === 1) return w;
  const v = r <= 10 ? w * (1 + r / 30) : w * (36 / (37 - r));
  return Math.round(v * 10) / 10;
}

export const ZONES = [
  { pct: 95, reps: "2", goal: "قوة قصوى" },
  { pct: 90, reps: "3-4", goal: "قوة" },
  { pct: 85, reps: "5-6", goal: "قوة" },
  { pct: 80, reps: "7-8", goal: "قوة وعضل" },
  { pct: 75, reps: "9-10", goal: "تضخيم" },
  { pct: 70, reps: "11-12", goal: "تضخيم" },
  { pct: 65, reps: "13-15", goal: "تحمل عضلي" },
  { pct: 60, reps: "15-20", goal: "تحمل عضلي" },
];

// Round to the nearest plate step (2.5 kg by default, never below one step).
export function roundToStep(kg, step = 2.5) {
  if (!(kg > 0)) return 0;
  return Math.max(step, Math.round(kg / step) * step);
}

export function workingWeights(oneRm, step = 2.5) {
  if (!(oneRm > 0)) return [];
  return ZONES.map((z) => ({ ...z, kg: roundToStep(oneRm * z.pct / 100, step) }));
}

// Heaviest weight per exercise from the logs, with the estimated 1RM of that set.
// Weightless entries and timed exercises (isTimed) are skipped. Ties keep the earlier date.
export function personalRecords(exerciseLogs, nameOf, isTimed = () => false) {
  const rows = [];
  for (const id of Object.keys(exerciseLogs || {})) {
    if (isTimed(id)) continue;
    let best = null;
    for (const l of exerciseLogs[id] || []) {
      const w = Number(l.weight);
      if (!(w > 0)) continue;
      if (!best || w > best.weight) best = { exerciseId: id, weight: w, reps: Number(l.reps) || 1, date: l.date };
    }
    if (best) rows.push({ ...best, name: nameOf(id), e1rm: estimate1RM(best.weight, best.reps) });
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
