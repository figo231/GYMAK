export function fmt(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 1 });
}
