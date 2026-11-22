// Month grid for the workout calendar. Week starts on Saturday (Egypt).
const pad = (n) => String(n).padStart(2, "0");
export const WEEK_HEADS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"]; // Sat..Fri
export const MONTH_NAMES = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

// month is 0-based. Returns weeks: arrays of 7 cells, each null or { day, iso }.
export function monthGrid(year, month) {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0=Sun
  const offset = (first + 1) % 7; // Sat=0
  const dim = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push({ day: d, iso: `${year}-${pad(month + 1)}-${pad(d)}` });
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
export function shiftMonth(year, month, delta) {
  const t = year * 12 + month + delta;
  return { year: Math.floor(t / 12), month: ((t % 12) + 12) % 12 };
}
