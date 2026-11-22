import { beforeEach, describe, expect, it, vi } from "vitest";
let S;
beforeEach(async () => {
  localStorage.clear(); vi.resetModules();
  S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData();
});
describe("gender program", () => {
  it("female gets glutes-tone, and it exists", () => {
    S.setGender("female");
    const id = S.getRecommendedProgramId();
    expect(id).toBe("glutes-tone");
    expect(S.getPrograms().find((x) => x.id === id)).toBeTruthy();
  });
  it("male gets ppl", () => { S.setGender("male"); expect(S.getRecommendedProgramId()).toBe("push-pull-legs"); });
});
describe("goal chips by gender", () => {
  it("female-only modes hidden for others, usable when set", () => {
    expect(Object.keys(S.getGoalModes())).not.toContain("tone");
    S.setGender("female");
    expect(Object.keys(S.getGoalModes())).toEqual(expect.arrayContaining(["tone", "glutes", "bulk", "cut", "recomp"]));
    expect(S.setGoalMode("glutes")).toBe("glutes");
    S.setGender("male");
    expect(Object.keys(S.getGoalModes())).not.toContain("glutes");
  });
});
describe("goal mode after gender change", () => {
  it("falls back when the mode is no longer allowed", () => {
    S.setGender("female"); S.setGoalMode("tone"); expect(S.getGoalMode()).toBe("tone");
    S.setGender("male"); expect(S.getGoalMode()).toBeNull();
  });
});
