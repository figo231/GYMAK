import { describe, expect, it } from "vitest";
import { deterministicId } from "../src/lib/sync/deterministicId.js";
import { validateWeightLog, validateExerciseLog, validateWorkoutDay } from "../src/lib/sync/validate.js";

describe("deterministicId", () => {
  it("is stable and uuid-shaped", () => {
    const a = deterministicId("exercise_log", "u1", "bench", "2026-01-01", 60, 3, 10);
    expect(a).toBe(deterministicId("exercise_log", "u1", "bench", "2026-01-01", 60, 3, 10));
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
  it("differs when any part differs", () => {
    expect(deterministicId("w", "u", "2026-01-01")).not.toBe(deterministicId("w", "u", "2026-01-02"));
  });
});

describe("validators", () => {
  it("accepts a good weight log and rejects bad ones", () => {
    expect(validateWeightLog({ date: "2026-01-01", weight: 80 })).toBe(true);
    expect(validateWeightLog({ date: "nope", weight: 80 })).toBe(false);
    expect(validateWeightLog({ date: "2026-01-01", weight: -1 })).toBe(false);
    expect(validateWeightLog({ date: "2026-01-01", weight: 5000 })).toBe(false);
  });
  it("validates exercise logs and workout days", () => {
    expect(validateExerciseLog({ exerciseId: "x", date: "2026-01-01", weight: 60, sets: 3, reps: 10 })).toBe(true);
    expect(validateExerciseLog({ exerciseId: "x", date: "2026-01-01", weight: 60, sets: 0, reps: 10 })).toBe(false);
    expect(validateWorkoutDay("2026-01-01")).toBe(true);
    expect(validateWorkoutDay("x")).toBe(false);
  });
});
