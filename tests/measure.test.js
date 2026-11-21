import { describe, it, expect, beforeEach } from "vitest";
import { saveMeasure, loadMeasures, measureDeltas, deleteMeasure } from "../src/lib/measure/measure";
describe("measurements", () => {
  beforeEach(() => localStorage.clear());
  it("rejects empty/invalid", () => { expect(saveMeasure({})).toBeNull(); expect(saveMeasure({ waist: "abc", chest: 5 })).toBeNull(); });
  it("saves, merges same-day, computes deltas, deletes", () => {
    saveMeasure({ waist: 90 }, "2026-10-01");
    saveMeasure({ chest: 100 }, "2026-10-01");
    expect(loadMeasures()).toHaveLength(1); expect(loadMeasures()[0]).toMatchObject({ waist: 90, chest: 100 });
    saveMeasure({ waist: 86.5 }, "2026-11-01");
    expect(measureDeltas()).toEqual({ waist: -3.5 });
    deleteMeasure("2026-10-01"); expect(loadMeasures()).toHaveLength(1);
  });
  it("survives corrupt storage", () => { localStorage.setItem("gymak_measure_v1", "{x"); expect(loadMeasures()).toEqual([]); });
});
