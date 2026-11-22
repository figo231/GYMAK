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

import { validateMeasures, restoreMeasure, latestByField } from "../src/lib/measure/measure";
describe("measurements v2", () => {
  beforeEach(() => localStorage.clear());
  it("flags out-of-range values per field instead of dropping them", () => {
    const r = validateMeasures({ waist: "9", chest: "100", arm: "" });
    expect(r.ok).toBe(false); expect(Object.keys(r.errors)).toEqual(["waist"]);
    expect(validateMeasures({ chest: "100.5" })).toMatchObject({ ok: true, count: 1 });
    expect(validateMeasures({}).ok).toBe(false);
  });
  it("restores a deleted entry", () => {
    const e = saveMeasure({ waist: 90 }, "2026-10-01");
    deleteMeasure("2026-10-01"); expect(loadMeasures()).toHaveLength(0);
    expect(restoreMeasure(e)).toBe(true); expect(loadMeasures()[0].waist).toBe(90);
    expect(restoreMeasure(null)).toBe(false);
  });
  it("gives latest value, change vs previous and a series", () => {
    saveMeasure({ waist: 92 }, "2026-10-01"); saveMeasure({ chest: 100 }, "2026-10-10"); saveMeasure({ waist: 90.5 }, "2026-11-01");
    const l = latestByField();
    expect(l.waist).toMatchObject({ value: 90.5, delta: -1.5, series: [92, 90.5] });
    expect(l.chest).toMatchObject({ value: 100, delta: null });
    expect(l.neck).toBeUndefined();
  });
});
