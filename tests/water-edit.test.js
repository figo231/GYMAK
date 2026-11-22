import { describe, it, expect, beforeEach } from "vitest";
import { getWater, addWater, setWaterTotal } from "../src/lib/water/water";
beforeEach(() => localStorage.clear());
describe("water total edit", () => {
  it("sets and validates", () => {
    addWater(500); expect(setWaterTotal(1250)).toBe(true); expect(getWater().ml).toBe(1250);
    expect(setWaterTotal(-1)).toBe(false); expect(setWaterTotal(10001)).toBe(false); expect(getWater().ml).toBe(1250);
    expect(setWaterTotal(0)).toBe(true); expect(getWater().ml).toBe(0);
  });
});
