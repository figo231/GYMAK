import { describe, it, expect } from "vitest";
import { monthGrid, shiftMonth } from "../src/lib/calendarGrid";
describe("calendarGrid", () => {
  it("Nov 2026 starts Sunday -> second column (Sat-first)", () => {
    const w = monthGrid(2026, 10);
    expect(w[0][0]).toBeNull();
    expect(w[0][1]).toMatchObject({ day: 1, iso: "2026-11-01" });
    expect(w.every((r) => r.length === 7)).toBe(true);
    expect(w.flat().filter(Boolean).length).toBe(30);
  });
  it("Feb 2026 starts Sunday, 28 days; Aug 2026 starts Saturday", () => {
    expect(monthGrid(2026, 1).flat().filter(Boolean).length).toBe(28);
    expect(monthGrid(2026, 7)[0][0]).toMatchObject({ day: 1 });
  });
  it("shiftMonth wraps years", () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});
