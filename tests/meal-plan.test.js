import { beforeEach, describe, expect, it, vi } from "vitest";
import { POOLS, buildPlan, shoppingList, fmtGrams } from "../src/lib/mealPlan";
let S, lookup;
beforeEach(async () => { localStorage.clear(); vi.resetModules(); S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData();
  lookup = (n, g) => { const it = S.parseFood(`${n} ${g} جم`); return it && it.length === 1 ? { kcal: it[0].kcal, protein: it[0].protein } : null; }; });
describe("meal plan", () => {
  it("every pool food resolves to exactly one known food", () => {
    const bad = [];
    for (const pool of Object.values(POOLS)) for (const meal of pool) for (const [n, g] of meal) { const m = lookup(n, g); if (!m || !(m.kcal > 0)) bad.push(n); }
    expect(bad).toEqual([]);
  });
  it("hits the calorie target within 12% for 7 days", () => {
    for (const target of [1800, 2300, 2800]) {
      const plan = buildPlan(target, lookup);
      expect(plan.length).toBe(7);
      for (const d of plan) expect(Math.abs(d.kcal - target) / target).toBeLessThan(0.12);
    }
  });
  it("shopping list sums grams and formats", () => {
    const plan = buildPlan(2200, lookup); const list = shoppingList(plan);
    const total = plan.flatMap((d) => d.meals).flatMap((m) => m.items).reduce((a, x) => a + x.grams, 0);
    expect(list.reduce((a, x) => a + x.grams, 0)).toBe(total);
    expect(fmtGrams(1500)).toBe("1.5 كجم"); expect(fmtGrams(250)).toBe("250 جم");
  });
  it("bad target falls back", () => { expect(buildPlan(NaN, lookup).length).toBe(7); });
});
