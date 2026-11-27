import { beforeEach, describe, expect, it, vi } from "vitest";
let S;
beforeEach(async () => {
  localStorage.clear(); vi.resetModules();
  S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData(); S.setOwnerView(false);
});
const ids = (l) => new Set(l.map((x) => x.id));
describe("men and women content stay separate; owner sees everything", () => {
  it("male and unset gender see no women-only programs or exercises", () => {
    for (const g of [null, "male"]) {
      if (g) S.setGender(g);
      expect(S.getPrograms().every((p) => p.only !== "female")).toBe(true);
      expect(S.getExercises().every((e) => e.custom || e.only !== "female")).toBe(true);
    }
  });
  it("female sees only women programs and women exercises", () => {
    S.setGender("female");
    expect(S.getPrograms().length).toBeGreaterThan(0);
    expect(S.getPrograms().every((p) => p.only === "female")).toBe(true);
    expect(S.getExercises().every((e) => e.custom || S.isWomenExercise(e))).toBe(true);
  });
  it("owner view sees both sets whatever the owner's own gender", () => {
    S.setGender("male");
    const maleProgs = ids(S.getPrograms()), maleEx = ids(S.getExercises());
    S.setOwnerView(true);
    const all = ids(S.getPrograms()), allEx = ids(S.getExercises());
    for (const i of maleProgs) expect(all.has(i)).toBe(true);
    expect([...all].some((i) => !maleProgs.has(i))).toBe(true);
    expect(allEx.size).toBeGreaterThan(maleEx.size);
    S.setGender("female");
    const femAll = ids(S.getPrograms());
    expect(femAll.size).toBe(all.size);
  });
  it("owner view is off by default and can be turned off again", () => {
    expect(S.isOwnerView()).toBe(false);
    S.setOwnerView(true); expect(S.isOwnerView()).toBe(true);
    S.setOwnerView(false); expect(S.canSeeWomenContent()).toBe(false);
  });
  it("a program from the other gender cannot be activated or resolved", () => {
    S.setGender("male");
    const women = S.getAllPrograms().find((p) => p.only === "female");
    expect(women).toBeTruthy();
    expect(S.getProgramDays(women.id)).toEqual([]);
  });
});
