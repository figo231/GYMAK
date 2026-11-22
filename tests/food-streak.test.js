import { describe, it, expect } from "vitest";
import { isAdherentDay, foodStreak, foodWeek } from "../src/lib/stats/foodStreak";

const log = (...specs) => specs.map(([date, kcal]) => ({ date, totalKcal: kcal }));

describe("nutrition adherence", () => {
  it("a day is adherent within 60-115% of target, any log without a target", () => {
    expect(isAdherentDay({ totalKcal: 2000 }, 2000)).toBe(true);
    expect(isAdherentDay({ totalKcal: 1150 }, 2000)).toBe(false); // 57% — underlogged
    expect(isAdherentDay({ totalKcal: 2400 }, 2000)).toBe(false); // 120% — over
    expect(isAdherentDay({ totalKcal: 500 }, null)).toBe(true);
    expect(isAdherentDay({ totalKcal: 0 }, null)).toBe(false);
    expect(isAdherentDay(null, 2000)).toBe(false);
  });

  it("counts consecutive adherent days, today optional, cheat days bridge", () => {
    const fl = log(["2026-11-20", 2000], ["2026-11-21", 2100], ["2026-11-22", 0]);
    // today (22nd) not adherent yet — streak counts to yesterday
    expect(foodStreak(fl, [], 2000, "2026-11-22")).toBe(2);
    // yesterday breaks it when not adherent and not a cheat day
    expect(foodStreak(log(["2026-11-20", 2000], ["2026-11-21", 3000]), [], 2000, "2026-11-22")).toBe(0);
    // cheat day bridges without counting
    expect(foodStreak(log(["2026-11-20", 2000]), ["2026-11-21"], 2000, "2026-11-22")).toBe(1);
    // today counts when adherent
    expect(foodStreak(log(["2026-11-21", 2000], ["2026-11-22", 1900]), [], 2000, "2026-11-22")).toBe(2);
  });

  it("foodWeek returns the last 7 days oldest-first", () => {
    const w = foodWeek(log(["2026-11-21", 2000]), 2000, "2026-11-22");
    expect(w).toHaveLength(7);
    expect(w.at(-1).date).toBe("2026-11-22");
    expect(w.find((d) => d.date === "2026-11-21").done).toBe(true);
    expect(w.find((d) => d.date === "2026-11-22").done).toBe(false);
  });
});
