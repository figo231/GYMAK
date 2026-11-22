/* Body measurements (cm). Device-local, separate key (not part of synced store state). */
import { localISO } from "../dateKey";
const KEY = "gymak_measure_v1";
export const FIELDS = [
  ["waist", "الوسط"], ["chest", "الصدر"], ["hips", "الأرداف"], ["arm", "الذراع"], ["thigh", "الفخذ"], ["neck", "الرقبة"],
];
const todayKey = () => localISO();

export function loadMeasures() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(a) ? a.filter((e) => e && typeof e.date === "string").sort((x, y) => (x.date < y.date ? -1 : 1)) : [];
  } catch { return []; }
}
function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* quota */ } }

/** Adds/updates today's entry; ignores invalid or empty values. Returns the saved entry or null. */
export function saveMeasure(values, date = todayKey()) {
  const clean = {};
  for (const [k] of FIELDS) {
    const n = parseFloat(values[k]);
    if (Number.isFinite(n) && n >= 10 && n <= 300) clean[k] = Math.round(n * 10) / 10;
  }
  if (!Object.keys(clean).length) return null;
  const all = loadMeasures();
  const i = all.findIndex((e) => e.date === date);
  const entry = { ...(i >= 0 ? all[i] : {}), ...clean, date };
  if (i >= 0) all[i] = entry; else all.push(entry);
  save(all.sort((x, y) => (x.date < y.date ? -1 : 1)));
  return entry;
}
export function deleteMeasure(date) { save(loadMeasures().filter((e) => e.date !== date)); }

/** Change per field between the first and the latest entry that has that field. */
export function measureDeltas(entries = loadMeasures()) {
  const out = {};
  for (const [k] of FIELDS) {
    const withK = entries.filter((e) => typeof e[k] === "number");
    if (withK.length >= 2) out[k] = Math.round((withK[withK.length - 1][k] - withK[0][k]) * 10) / 10;
  }
  return out;
}

export const RANGE_CM = [10, 300];
/** Per-field validation for the form. Blank fields are skipped; a typed value outside the range is an error. */
export function validateMeasures(values) {
  const errors = {}; let count = 0;
  for (const [k, label] of FIELDS) {
    const raw = values[k];
    if (raw === "" || raw == null) continue;
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n < RANGE_CM[0] || n > RANGE_CM[1]) errors[k] = `${label}: اكتب رقم بين ${RANGE_CM[0]} و ${RANGE_CM[1]} سم.`;
    else count++;
  }
  return { errors, count, ok: count > 0 && Object.keys(errors).length === 0 };
}

/** Put a whole entry back (used by undo). Replaces any entry on the same date. */
export function restoreMeasure(entry) {
  if (!entry || typeof entry.date !== "string") return false;
  const all = loadMeasures().filter((e) => e.date !== entry.date);
  all.push(entry);
  save(all.sort((x, y) => (x.date < y.date ? -1 : 1)));
  return true;
}

/** Latest value per field with the change versus the previous reading and a short series (oldest first). */
export function latestByField(entries = loadMeasures()) {
  const out = {};
  for (const [k] of FIELDS) {
    const withK = entries.filter((e) => typeof e[k] === "number");
    if (!withK.length) continue;
    const last = withK[withK.length - 1], prev = withK.length > 1 ? withK[withK.length - 2] : null;
    out[k] = { value: last[k], date: last.date, delta: prev ? Math.round((last[k] - prev[k]) * 10) / 10 : null, series: withK.slice(-8).map((e) => e[k]) };
  }
  return out;
}
