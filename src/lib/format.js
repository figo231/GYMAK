export function fmt(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString("en-US", { maximumFractionDigits: 1 }) : "0";
}
