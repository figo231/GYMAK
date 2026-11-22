import { localISO, shiftISO } from "./dateKey";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

// "النهارده" / "امبارح" / "الخميس 19 نوفمبر" (adds the year when it is not this year). Latin digits.
export function dayLabel(iso, today = localISO()) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
  if (iso === today) return "النهارده";
  if (iso === shiftISO(today, -1)) return "امبارح";
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const base = `${DAYS[wd]} ${d} ${MONTHS[m - 1]}`;
  return String(y) === today.slice(0, 4) ? base : `${base} ${y}`;
}

// Newest day first. Within a day: newest set first (higher index = logged later).
export function groupWorkoutsByDay(entries) {
  const map = new Map();
  entries.forEach((e) => { if (!map.has(e.date)) map.set(e.date, []); map.get(e.date).push(e); });
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({
      date, items,
      sets: items.reduce((t, l) => t + (Number(l.sets) || 0), 0),
      volume: items.reduce((t, l) => t + (l.weight || 0) * (l.sets || 0) * (l.reps || 0), 0),
      exercises: new Set(items.map((l) => l.exerciseId)).size,
    }));
}

// Weight rows newest first with the change versus the previous (older) entry, in kg.
export function weightRowsWithDelta(entries) {
  const asc = [...entries].sort((a, b) => (a.date > b.date ? 1 : -1));
  return asc.map((w, i) => ({ ...w, delta: i > 0 ? +(w.weight - asc[i - 1].weight).toFixed(2) : null })).reverse();
}
