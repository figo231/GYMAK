import { beforeEach, describe, expect, it, vi } from "vitest";
let S;
beforeEach(async () => { localStorage.clear(); vi.resetModules(); S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData(); });
describe("goal mode", () => {
  it("adjusts calories and protein", () => {
    S.saveWeight(80);
    const base = S.getDailyCalorieTarget();
    expect(base).toBe(2560);
    S.setGoalMode("bulk"); expect(S.getDailyCalorieTarget()).toBe(base + 300); expect(S.getProteinTarget()).toBe(144);
    S.setGoalMode("cut"); expect(S.getDailyCalorieTarget()).toBe(base - 400); expect(S.getProteinTarget()).toBe(160);
    S.setGoalMode("bad"); expect(S.getGoalMode()).toBe("cut");
    S.setGoalMode(null); expect(S.getDailyCalorieTarget()).toBe(base);
  });
});
