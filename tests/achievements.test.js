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

describe("programs by goal", () => {
  it("every program has a goal and a template with valid exercises", () => {
    const progs = S.getPrograms();
    expect(progs.length).toBe(7);
    for (const p of progs) {
      expect(["bulk", "cut", "strength", "fitness"]).toContain(p.goal);
      const days = S.getProgramDays(p.id);
      expect(days.length).toBeGreaterThan(0);
      for (const d of days) { expect(d.exercises.length).toBeGreaterThan(0); expect(d.exercises.every(Boolean)).toBe(true); }
    }
  });
  it("applying fat-loss adds its exercises to the library", () => {
    S.applyProgram("fat-loss");
    expect(S.getActiveProgram().id).toBe("fat-loss");
  });
});
