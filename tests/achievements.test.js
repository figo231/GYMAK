import { beforeEach, describe, expect, it, vi } from "vitest";
let S;
beforeEach(async () => {
  localStorage.clear(); vi.resetModules();
  S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData();
});
describe("achievements", () => {
  it("starts all locked with progress targets", () => {
    const a = S.getAchievements();
    expect(a.length).toBeGreaterThanOrEqual(15);
    expect(a.every((x) => !x.unlocked)).toBe(true);
    expect(a.find((x) => x.id === "weigh7")).toMatchObject({ progress: 0, target: 7 });
  });
  it("unlocks weigh-in tiers from real data", () => {
    S.addWeight(80);
    const a = S.getAchievements();
    expect(a.find((x) => x.id === "weigh7").progress).toBe(1);
    expect(new Set(a.map((x) => x.id)).size).toBe(a.length);
  });
});
