import { describe, expect, it } from "vitest";
import { dayLabel, groupWorkoutsByDay, weightRowsWithDelta } from "../src/lib/historyLogic";
describe("history logic", () => {
  it("labels days", () => {
    expect(dayLabel("2026-11-22", "2026-11-22")).toBe("النهارده");
    expect(dayLabel("2026-11-21", "2026-11-22")).toBe("امبارح");
    expect(dayLabel("2026-11-19", "2026-11-22")).toBe("الخميس 19 نوفمبر");
    expect(dayLabel("2025-12-31", "2026-11-22")).toBe("الأربعاء 31 ديسمبر 2025");
    expect(dayLabel("bad", "2026-11-22")).toBe("bad");
  });
  it("groups workouts by day with totals", () => {
    const g = groupWorkoutsByDay([
      { date: "2026-11-20", exerciseId: "a", weight: 50, sets: 3, reps: 10, i: 1 },
      { date: "2026-11-21", exerciseId: "b", weight: 0, sets: 2, reps: 15, i: 0 },
      { date: "2026-11-20", exerciseId: "b", weight: 20, sets: 2, reps: 10, i: 2 },
    ]);
    expect(g.map((d) => d.date)).toEqual(["2026-11-21", "2026-11-20"]);
    expect(g[1]).toMatchObject({ sets: 5, volume: 1500 + 400, exercises: 2 });
  });
  it("computes weight deltas against the previous entry", () => {
    const r = weightRowsWithDelta([{ date: "2026-11-01", weight: 80 }, { date: "2026-11-10", weight: 79.2 }, { date: "2026-11-05", weight: 80.5 }]);
    expect(r.map((x) => x.date)).toEqual(["2026-11-10", "2026-11-05", "2026-11-01"]);
    expect(r.map((x) => x.delta)).toEqual([-1.3, 0.5, null]);
  });
});
