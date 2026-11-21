/* Body measurements (cm). Device-local, separate key (not part of synced store state). */
const KEY = "gymak_measure_v1";
export const FIELDS = [
  ["waist", "الوسط"], ["chest", "الصدر"], ["hips", "الأرداف"], ["arm", "الذراع"], ["thigh", "الفخذ"], ["neck", "الرقبة"],
];
const todayKey = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

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
