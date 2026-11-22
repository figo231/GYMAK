import { beforeEach, describe, expect, it, vi } from "vitest";
import { isHomeExercise, HOME_EQUIPMENT } from "../src/lib/exerciseMeta";
let S;
beforeEach(async () => {
  localStorage.clear(); vi.resetModules();
  S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData();
});
describe("home-workout filter", () => {
  it("matches only bodyweight-tagged exercises", () => {
    expect(isHomeExercise({ equipment: "وزن الجسم" })).toBe(true);
    expect(isHomeExercise({ equipment: "دمبل" })).toBe(false);
    expect(isHomeExercise({})).toBe(false);
    expect(isHomeExercise(null)).toBe(false);
    expect(HOME_EQUIPMENT).toBe("وزن الجسم");
  });
  it("the built-in library offers a real home workout selection", () => {
    const home = S.getExercises().filter(isHomeExercise);
    expect(home.length).toBeGreaterThanOrEqual(15);
    // covers more than one muscle group, so a home filter is genuinely useful
    expect(new Set(home.map((e) => e.muscle)).size).toBeGreaterThanOrEqual(4);
  });
});
