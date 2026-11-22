// Barcode lookup through Open Food Facts (free, no key). Values are per 100 g.
export function validBarcode(code) {
  const c = String(code || "").replace(/\s+/g, "");
  if (!/^\d{8}$|^\d{12,14}$/.test(c)) return null;
  const d = c.split("").map(Number);
  const check = d.pop();
  let sum = 0;
  d.reverse().forEach((x, i) => { sum += x * (i % 2 === 0 ? 3 : 1); });
  return (10 - (sum % 10)) % 10 === check ? c : null;
}
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };
const r1 = (n) => Math.round(n * 10) / 10;

export function parseProduct(json) {
  if (!json || json.status !== 1 || !json.product) return null;
  const p = json.product, n = p.nutriments || {};
  let kcal = num(n["energy-kcal_100g"]);
  if (kcal == null) { const kj = num(n["energy_100g"]); if (kj != null) kcal = kj / 4.184; }
  if (kcal == null) return null;
  const name = String(p.product_name_ar || p.product_name || p.generic_name || "").trim().slice(0, 60);
  if (!name) return null;
  const serving = num(p.serving_quantity);
  return {
    name,
    brand: String(p.brands || "").split(",")[0].trim().slice(0, 40),
    per100: { kcal: Math.round(kcal), protein: r1(num(n.proteins_100g) ?? 0), carbs: r1(num(n.carbohydrates_100g) ?? 0), fat: r1(num(n.fat_100g) ?? 0) },
    serving: serving && serving > 0 && serving <= 2000 ? serving : null,
  };
}
export function itemFor(prod, grams) {
  const g = Number(grams);
  if (!prod || !(g > 0) || g > 5000) return null;
  const k = g / 100;
  return { name: prod.brand ? `${prod.name} (${prod.brand})` : prod.name, grams: Math.round(g), kcal: Math.round(prod.per100.kcal * k), protein: r1(prod.per100.protein * k), carbs: r1(prod.per100.carbs * k), fat: r1(prod.per100.fat * k) };
}
export async function lookupBarcode(code, fetchImpl = fetch) {
  const c = validBarcode(code);
  if (!c) return { ok: false, error: "invalid" };
  try {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), 8000) : null;
    const res = await fetchImpl(`https://world.openfoodfacts.org/api/v2/product/${c}.json?fields=product_name,product_name_ar,generic_name,brands,nutriments,serving_quantity`, ctl ? { signal: ctl.signal } : undefined);
    if (t) clearTimeout(t);
    if (!res.ok) return { ok: false, error: "network" };
    const prod = parseProduct(await res.json());
    return prod ? { ok: true, product: prod, code: c } : { ok: false, error: "notfound" };
  } catch { return { ok: false, error: "network" }; }
}
export const cameraScanSupported = () => typeof window !== "undefined" && "BarcodeDetector" in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
