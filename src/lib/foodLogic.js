// Pure helpers for the Food page.
export function remaining(target, eaten) {
  if (!target) return null;
  return Math.round(target - (eaten || 0));
}
export function pct(eaten, target) {
  if (!target || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((eaten || 0) / target) * 100)));
}
export function macroSplit(day) {
  const p = Number(day?.totalProtein) || 0, c = Number(day?.totalCarbs) || 0, f = Number(day?.totalFat) || 0;
  return { p, c, f };
}
