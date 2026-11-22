import { describe, it, expect } from "vitest";
import { estimate1RM, workingWeights, roundToStep, personalRecords } from "../src/lib/strength";
import { SUPPLEMENTS, MYTHS } from "../src/lib/supplements";

describe("strength", () => {
  it("estimates 1RM", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 10)).toBeCloseTo(133.3, 1);
    expect(estimate1RM(60, 15)).toBeCloseTo(60 * 36 / 22, 1);
  });
  it("rejects bad input", () => {
    expect(estimate1RM(0, 5)).toBeNull();
    expect(estimate1RM(80, 0)).toBeNull();
    expect(estimate1RM(80, 31)).toBeNull();
    expect(estimate1RM("x", 5)).toBeNull();
  });
  it("rounds to plate steps", () => {
    expect(roundToStep(101)).toBe(100);
    expect(roundToStep(1)).toBe(2.5);
    expect(workingWeights(100)[3]).toMatchObject({ pct: 80, kg: 80 });
    expect(workingWeights(0)).toEqual([]);
  });
  it("finds the heaviest set per exercise, skipping timed and weightless", () => {
    const logs = {
      bench: [{ date: "2026-01-01", weight: 60, reps: 8 }, { date: "2026-01-09", weight: 70, reps: 5 }, { date: "2026-01-12", weight: 65, reps: 8 }],
      plank: [{ date: "2026-01-01", weight: 0, reps: 60 }],
      run: [{ date: "2026-01-02", weight: 20, reps: 1 }],
    };
    const r = personalRecords(logs, (id) => id.toUpperCase(), (id) => id === "run");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ exerciseId: "bench", weight: 70, reps: 5, date: "2026-01-09", name: "BENCH" });
  });
  it("supplement content is complete", () => {
    for (const s of SUPPLEMENTS) { expect(s.dose && s.timing && s.what).toBeTruthy(); }
    expect(MYTHS.length).toBeGreaterThan(3);
  });
});
