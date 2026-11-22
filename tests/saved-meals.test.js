import { beforeEach, describe, expect, it, vi } from "vitest";
let S;
beforeEach(async () => { localStorage.clear(); vi.resetModules(); S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData(); });
describe("saved meals", () => {
  it("save, log, delete", () => {
    const items = S.parseFood("عيش بلدي وفراخ مشوية");
    const m = S.saveMeal("فطاري", items);
    expect(m.name).toBe("فطاري"); expect(S.getSavedMeals().length).toBe(1);
    S.logSavedMeal(m.id); S.logSavedMeal(m.id);
    expect(S.getTodayFoodLog().items.length).toBe(items.length * 2);
    expect(S.getTodayFoodLog().totalKcal).toBe(2 * items.reduce((a, x) => a + x.kcal, 0));
    expect(S.deleteSavedMeal(m.id).id).toBe(m.id); expect(S.getSavedMeals().length).toBe(0);
  });
  it("rejects empty name/items and survives reload", async () => {
    expect(S.saveMeal("", [{ name: "x", grams: 1, kcal: 1 }])).toBeNull();
    expect(S.saveMeal("x", [])).toBeNull();
    S.saveMeal("a", S.parseFood("بيض"));
    vi.resetModules(); const S2 = (await import("../src/lib/store/gymakStore.js")).default;
    expect(S2.getSavedMeals().length).toBe(1);
  });
});
describe("update food item", () => {
  it("edits every field, recalculates the day, validates", () => {
    S.logFoodEntries(S.parseFood("عيش بلدي وفراخ مشوية"));
    const d = S.getTodayFoodLog(); const n = d.items.length;
    const snap = S.updateFoodItem(d.date, 0, { name: "أكلة بيتي", grams: 250, kcal: 400, protein: 20, carbs: 30, fat: 10 });
    expect(snap.kind).toBe("food-edit");
    const after = S.getTodayFoodLog();
    expect(after.items[0]).toMatchObject({ name: "أكلة بيتي", grams: 250, kcal: 400, protein: 20 });
    expect(after.totalKcal).toBe(after.items.reduce((a, x) => a + x.kcal, 0));
    expect(S.updateFoodItem(d.date, 0, { name: "", grams: 1, kcal: 1 })).toBeNull();
    expect(S.updateFoodItem(d.date, 0, { name: "x", grams: 0, kcal: 1 })).toBeNull();
    expect(S.updateFoodItem(d.date, 0, { name: "x", grams: 1, kcal: -5 })).toBeNull();
    S.restore(snap);
    expect(S.getTodayFoodLog().items[0].name).not.toBe("أكلة بيتي"); expect(S.getTodayFoodLog().items.length).toBe(n);
  });
});
