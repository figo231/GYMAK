import { beforeEach, describe, expect, it, vi } from "vitest";
import { ramadanTips } from "../src/lib/ramadan";
let S;
beforeEach(async () => { localStorage.clear(); vi.resetModules(); S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData(); });
describe("ramadan", () => {
  it("off by default, toggles, persists, does not touch targets", () => {
    S.addWeight?.(80);
    const before = S.getDailyCalorieTarget();
    expect(S.getRamadan()).toBe(false);
    expect(S.setRamadan(true)).toBe(true);
    expect(S.getRamadan()).toBe(true);
    expect(S.getDailyCalorieTarget()).toBe(before);
    expect(S.setRamadan(false)).toBe(false);
  });
  it("tips exist for both kinds", () => { expect(ramadanTips("food").length).toBeGreaterThan(2); expect(ramadanTips("train").length).toBeGreaterThan(1); });
});
