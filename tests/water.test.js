import { describe, it, expect, beforeEach } from "vitest";
import { addWater, getWater, setWaterGoal, lastDays, dayKey, DEFAULT_GOAL } from "../src/lib/water/water";

describe("water tracking", () => {
  beforeEach(() => localStorage.clear());
  it("starts at zero with default goal", () => { expect(getWater()).toEqual({ ml: 0, goal: DEFAULT_GOAL }); });
  it("adds, never below 0, caps at 10000", () => {
    addWater(250); addWater(500); expect(getWater().ml).toBe(750);
    addWater(-5000); expect(getWater().ml).toBe(0);
    addWater(99999); expect(getWater().ml).toBe(10000);
  });
  it("validates goal", () => {
    expect(setWaterGoal(3000)).toBe(true); expect(getWater().goal).toBe(3000);
    expect(setWaterGoal(10)).toBe(false); expect(setWaterGoal("abc")).toBe(false); expect(getWater().goal).toBe(3000);
  });
  it("lastDays returns n days ending today", () => {
    addWater(250);
    const d = lastDays(7); expect(d).toHaveLength(7); expect(d[6].date).toBe(dayKey()); expect(d[6].ml).toBe(250);
  });
  it("survives corrupt storage", () => { localStorage.setItem("gymak_water_v1", "{bad"); expect(getWater().ml).toBe(0); });
});
