import { tx, txf } from "./i18n/tx";
/* Egyptian weekly meal plan + shopping list. Pure: caller passes `lookup(name, grams)` -> {kcal, protein} | null. */
export const POOLS = {
  breakfast: [
    [[tx("فول مدمس"), 200], [tx("عيش بلدي"), 90], [tx("بيضة مسلوقة"), 100]],
    [[tx("بيضة مسلوقة"), 150], [tx("جبنة قريش"), 100], [tx("عيش بلدي"), 90]],
    [[tx("زبادي"), 200], [tx("شوفان"), 50], [tx("موز"), 100]],
    [[tx("طعمية"), 100], [tx("عيش بلدي"), 90], [tx("جبنة قريش"), 80]],
  ],
  lunch: [
    [[tx("فراخ مشوية"), 200], [tx("أرز"), 200]],
    [[tx("لحمة مفرومة"), 150], [tx("أرز"), 200]],
    [[tx("سمك مشوي"), 200], [tx("أرز"), 200]],
    [[tx("كشري مصري"), 350]],
    [[tx("ملوخية بالفراخ"), 300], [tx("أرز"), 180]],
    [[tx("بامية باللحمة"), 300], [tx("أرز"), 180]],
    [[tx("مكرونة"), 250], [tx("فراخ مشوية"), 150]],
  ],
  dinner: [
    [[tx("زبادي"), 200], [tx("تونة"), 100], [tx("عيش بلدي"), 45]],
    [[tx("جبنة قريش"), 150], [tx("عيش بلدي"), 90]],
    [[tx("بيضة مسلوقة"), 100], [tx("عيش بلدي"), 90]],
    [[tx("تونة"), 120], [tx("عيش بلدي"), 90]],
  ],
  snack: [
    [[tx("موز"), 120]],
    [[tx("لبن"), 250]],
    [[tx("زبادي"), 150]],
  ],
};
const SLOTS = ["breakfast", "lunch", "dinner", "snack"];
export const SLOT_LABEL = { breakfast: tx("فطار"), lunch: tx("غدا"), dinner: tx("عشا"), snack: tx("سناك") };

const round10 = (n) => Math.max(10, Math.round(n / 10) * 10);

export function buildPlan(target, lookup, seed = 0) {
  const t = Number.isFinite(target) && target > 0 ? target : 2200;
  const days = [];
  for (let d = 0; d < 7; d++) {
    const picks = SLOTS.map((slot, si) => {
      const pool = POOLS[slot];
      return pool[(d + seed * (si + 1) + si * 2) % pool.length];
    });
    const measure = (factor) => picks.map((items) => items.map(([n, g]) => {
      const grams = round10(g * factor);
      const m = lookup(n, grams) || { kcal: 0, protein: 0 };
      return { name: n, grams, kcal: Math.round(m.kcal), protein: Math.round(m.protein) };
    }));
    const raw = measure(1).flat().reduce((a, x) => a + x.kcal, 0) || 1;
    let factor = Math.min(2, Math.max(0.5, t / raw));
    for (let i = 0; i < 3; i++) {
      const got = measure(factor).flat().reduce((a, x) => a + x.kcal, 0) || 1;
      factor = Math.min(2, Math.max(0.5, factor * (t / got)));
    }
    const meals = measure(factor).map((items, i) => ({ slot: SLOTS[i], label: SLOT_LABEL[SLOTS[i]], items, kcal: items.reduce((a, x) => a + x.kcal, 0) }));
    days.push({ meals, kcal: meals.reduce((a, m) => a + m.kcal, 0), protein: meals.flatMap((m) => m.items).reduce((a, x) => a + x.protein, 0) });
  }
  return days;
}

export function shoppingList(days) {
  const map = new Map();
  for (const d of days) for (const m of d.meals) for (const it of m.items) map.set(it.name, (map.get(it.name) || 0) + it.grams);
  return [...map.entries()].map(([name, grams]) => ({ name, grams })).sort((a, b) => b.grams - a.grams);
}
export const fmtGrams = (g) => (g >= 1000 ? txf(`{0} كجم`, [(Math.round(g / 100) / 10).toString()]) : txf(`{0} جم`, [g]));
export function listText(list) { return "قائمة التسوق (GYMAK)\n" + list.map((x) => `- ${x.name}: ${fmtGrams(x.grams)}`).join("\n"); }
