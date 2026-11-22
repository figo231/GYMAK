// Local-calendar date keys. toISOString() is UTC, which in UTC+ zones (Cairo)
// makes "today" wrong after midnight and shifted dates skip a day.
const p = (n) => String(n).padStart(2, "0");
export function localISO(d = new Date()) {
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function shiftISO(iso, delta) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}
// First day of a window that includes today and the previous days-1 days.
export function windowStart(todayKey, days) {
  return shiftISO(todayKey, -(Math.max(1, days) - 1));
}
