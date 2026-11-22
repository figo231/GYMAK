// Pure presentation helpers for the Stats tab.
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export function arDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return iso || "";
  return `${+m[3]} ${MONTHS[+m[2] - 1]}`;
}

export function fmtVolume(value, unit = "كجم") {
  const n = Math.round(value || 0);
  if (unit === "كجم" && n >= 10000) return `${(n / 1000).toFixed(1)} طن`;
  return `${n.toLocaleString("en-US")} ${unit}`;
}

export function signed(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return "—";
  const v = +Number(n).toFixed(digits);
  return (v > 0 ? "+" : "") + v;
}

export function capPct(pct, cap = 500) {
  return `${pct > 0 ? "+" : ""}${Math.min(pct, cap)}%${pct > cap ? "+" : ""}`;
}

// "good" | "bad" | "neutral" for a weight change, relative to the user's goal.
export function weightTone(diff, startWeight, goal) {
  if (!diff || goal == null || startWeight == null) return "neutral";
  const gap = goal - startWeight;
  if (Math.abs(gap) <= 1) return Math.abs(diff) <= 1 ? "good" : "bad";
  return Math.sign(diff) === Math.sign(gap) ? "good" : "bad";
}

export const PERIODS = [
  { days: 7, label: "أسبوع", long: "آخر 7 أيام" },
  { days: 30, label: "شهر", long: "آخر 30 يوم" },
  { days: 90, label: "3 شهور", long: "آخر 3 شهور" },
  { days: 365, label: "سنة", long: "آخر سنة" },
];

// Time-proportional x positions (0..1). Equal spacing when all dates match.
export function timeFractions(dates) {
  const t = dates.map((d) => Date.UTC(...d.split("-").map((v, i) => (i === 1 ? +v - 1 : +v))));
  const span = t[t.length - 1] - t[0];
  return t.map((x, i) => (span > 0 ? (x - t[0]) / span : dates.length > 1 ? i / (dates.length - 1) : 0));
}
