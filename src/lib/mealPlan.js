/* Egyptian weekly meal plan + shopping list. Pure: caller passes `lookup(name, grams)` -> {kcal, protein} | null. */
export const POOLS = {
  breakfast: [
    [["فول مدمس", 200], ["عيش بلدي", 90], ["بيضة مسلوقة", 100]],
    [["بيضة مسلوقة", 150], ["جبنة قريش", 100], ["عيش بلدي", 90]],
    [["زبادي", 200], ["شوفان", 50], ["موز", 100]],
    [["طعمية", 100], ["عيش بلدي", 90], ["جبنة قريش", 80]],
  ],
  lunch: [
    [["فراخ مشوية", 200], ["أرز", 200]],
    [["لحمة مفرومة", 150], ["أرز", 200]],
    [["سمك مشوي", 200], ["أرز", 200]],
    [["كشري مصري", 350]],
    [["ملوخية بالفراخ", 300], ["أرز", 180]],
    [["بامية باللحمة", 300], ["أرز", 180]],
    [["مكرونة", 250], ["فراخ مشوية", 150]],
  ],
  dinner: [
    [["زبادي", 200], ["تونة", 100], ["عيش بلدي", 45]],
    [["جبنة قريش", 150], ["عيش بلدي", 90]],
    [["بيضة مسلوقة", 100], ["عيش بلدي", 90]],
    [["تونة", 120], ["عيش بلدي", 90]],
  ],
  snack: [
    [["موز", 120]],
    [["لبن", 250]],
    [["زبادي", 150]],
  ],
};
const SLOTS = ["breakfast", "lunch", "dinner", "snack"];
export const SLOT_LABEL = { breakfast: "فطار", lunch: "غدا", dinner: "عشا", snack: "سناك" };

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
export const fmtGrams = (g) => (g >= 1000 ? `${(Math.round(g / 100) / 10).toString()} كجم` : `${g} جم`);
export function listText(list) { return "قائمة التسوق (GYMAK)\n" + list.map((x) => `- ${x.name}: ${fmtGrams(x.grams)}`).join("\n"); }
