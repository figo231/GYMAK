import { describe, expect, it } from "vitest";
import { parseLogForm, initialForm, stepValue, logsOnDate, bestWeight, previousSession, volume, isBodyweight } from "../src/lib/logLogic";

const id = (x) => x;
describe("parseLogForm", () => {
  it("accepts a normal set and zero weight", () => {
    expect(parseLogForm({ weight: "80", sets: "4", reps: "8" }, id)).toMatchObject({ ok: true, kg: 80, sets: 4, reps: 8 });
    expect(parseLogForm({ weight: "0", sets: "3", reps: "12" }, id).ok).toBe(true);
  });
  it("rejects blanks, negatives and absurd values with the right field", () => {
    expect(parseLogForm({ weight: "", sets: "3", reps: "8" }, id)).toMatchObject({ ok: false, field: "weight" });
    expect(parseLogForm({ weight: "-5", sets: "3", reps: "8" }, id).field).toBe("weight");
    expect(parseLogForm({ weight: "5000", sets: "3", reps: "8" }, id).ok).toBe(false);
    expect(parseLogForm({ weight: "50", sets: "0", reps: "8" }, id).field).toBe("sets");
    expect(parseLogForm({ weight: "50", sets: "3", reps: "" }, id).field).toBe("reps");
  });
  it("converts from the display unit", () => {
    expect(parseLogForm({ weight: "220", sets: "3", reps: "5" }, (v) => v / 2.2).kg).toBeCloseTo(100, 0);
  });
});
describe("form helpers", () => {
  it("starts bodyweight exercises at 0 and uses the last session otherwise", () => {
    expect(initialForm({ equipment: "وزن الجسم", sets: 3, reps: 12 }, null, id).weight).toBe("0");
    expect(initialForm({ equipment: "بار" }, null, id).weight).toBe("");
    expect(initialForm({}, { weight: 60, sets: 4, reps: 6 }, id)).toEqual({ weight: "60", sets: "4", reps: "6" });
    expect(isBodyweight({ unit: "sec" })).toBe(true);
  });
  it("steps and never goes below the floor", () => {
    expect(stepValue("80", 1, "weight", "kg")).toBe("82.5");
    expect(stepValue("1", -1, "weight", "kg")).toBe("0");
    expect(stepValue("1", -1, "reps", "kg")).toBe("1");
    expect(stepValue("", 1, "sets", "kg")).toBe("1");
  });
  it("summarises logs", () => {
    const logs = [{ date: "2026-01-01", weight: 50, sets: 3, reps: 10 }, { date: "2026-01-03", weight: 60, sets: 3, reps: 8 }, { date: "2026-01-03", weight: 55, sets: 2, reps: 8 }];
    expect(logsOnDate(logs, "2026-01-03").map((l) => l.i)).toEqual([1, 2]);
    expect(bestWeight(logs)).toBe(60);
    expect(previousSession(logs, "2026-01-03").date).toBe("2026-01-01");
    expect(previousSession(logs, "2026-01-01")).toBe(null);
    expect(volume(logs.slice(1))).toBe(60 * 24 + 55 * 16);
  });
});

import { estimate1RM, best1RM, percentTable } from "../src/lib/logLogic";
describe("1RM", () => {
  it("estimates sensibly", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 5)).toBeCloseTo(112.5, 1);
    expect(estimate1RM(100, 10)).toBeCloseTo(133.3, 1);
    expect(estimate1RM(100, 30)).toBeCloseTo(estimate1RM(100, 12), 5);
    expect(estimate1RM(0, 8)).toBe(0);
    expect(estimate1RM(80, 0)).toBe(0);
  });
  it("finds the best set and builds a plate-friendly table", () => {
    const b = best1RM([{ weight: 60, reps: 10 }, { weight: 80, reps: 5 }, { weight: 0, reps: 20 }]);
    expect(b.from.weight).toBe(80);
    expect(best1RM([{ weight: 0, reps: 20 }])).toBe(null);
    const t = percentTable(100);
    expect(t[0]).toMatchObject({ percent: 95, weight: 95 });
    expect(t.find((x) => x.percent === 85).weight).toBe(85);
    expect(percentTable(0)).toEqual([]);
  });
});
