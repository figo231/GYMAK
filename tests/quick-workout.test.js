import { describe, it, expect, beforeEach, vi } from "vitest";
import { pickQuickWorkout, quickWorkoutMinutes } from "../src/lib/quickWorkout";
let S;
beforeEach(async () => {
  localStorage.clear(); vi.resetModules();
  S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData();
});
describe("quick workout", () => {
  it("picks 6 exercises across muscle groups, preferring bodyweight", () => {
    const picked = pickQuickWorkout(S.getExercises(), "2026-11-22");
    expect(picked).toHaveLength(6);
    const muscles = picked.map((e) => e.muscle);
    expect(new Set(muscles).size).toBe(6);
    expect(picked.filter((e) => e.equipment === "وزن الجسم").length).toBeGreaterThanOrEqual(3);
    expect(quickWorkoutMinutes(picked)).toBe(18);
  });
  it("is deterministic per day and rotates across days", () => {
    const a = pickQuickWorkout(S.getExercises(), "2026-11-22").map((e) => e.id);
    expect(a).toEqual(pickQuickWorkout(S.getExercises(), "2026-11-22").map((e) => e.id));
    const b = pickQuickWorkout(S.getExercises(), "2026-11-23").map((e) => e.id);
    expect(b.join()).not.toBe(a.join());
  });
  it("handles an empty library", () => {
    expect(pickQuickWorkout([], "2026-11-22")).toEqual([]);
    expect(quickWorkoutMinutes([])).toBe(0);
  });
});
