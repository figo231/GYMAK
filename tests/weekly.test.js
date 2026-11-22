import { describe, it, expect } from "vitest";
import { buildWeekly, headline, pctChange, weeklyCardData } from "../src/lib/stats/weekly";

const mk = (o = {}) => ({
  getWorkoutDaysInRange: (n) => (n === 6 ? 4 : 6),
  getSetsInRange: (n) => (n === 6 ? 40 : 70),
  getTonnage: (n) => (n === 6 ? 12000 : 20000),
  getRecentPRs: () => [{ date: "2999-01-01" }, { date: "2000-01-01" }],
  getWeightDiffOverDays: () => ({ from: 80, to: 79.4 }),
  getStreak: () => 3,
  ...o,
});

describe("weekly summary", () => {
  it("compares this week with the previous 7 days", () => {
    const w = buildWeekly(mk(), [{ ml: 2000, goal: 2000 }, { ml: 1000, goal: 2000 }, { ml: 0, goal: 2000 }]);
    expect(w.days).toBe(4); expect(w.prev.days).toBe(2); expect(w.daysDelta).toBe(2);
    expect(w.prev.tonnage).toBe(8000); expect(w.tonnageDelta).toBe(50);
    expect(w.prs).toBe(1); expect(w.weightDiff).toBe(-0.6);
    expect(w.waterAvg).toBe(1500); expect(w.waterGoalDays).toBe(1); expect(w.streak).toBe(3);
    expect(w.empty).toBe(false);
  });
  it("handles an empty week and missing weight", () => {
    const w = buildWeekly(mk({ getWorkoutDaysInRange: () => 0, getSetsInRange: () => 0, getTonnage: () => 0, getWeightDiffOverDays: () => null, getRecentPRs: () => [] }));
    expect(w.empty).toBe(true); expect(w.weightDiff).toBeNull(); expect(weeklyCardData(w)).toBeNull();
    expect(headline(w)).toMatch(/فاضي/);
  });
  it("pctChange has no divide by zero", () => { expect(pctChange(5, 0)).toBeNull(); expect(pctChange(0, 0)).toBe(0); expect(pctChange(15, 10)).toBe(50); });
  it("card data and headline", () => {
    const w = buildWeekly(mk());
    expect(weeklyCardData(w).big).toBe("4"); expect(headline(w)).toMatch(/قياسي/);
  });
});
