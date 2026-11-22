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
