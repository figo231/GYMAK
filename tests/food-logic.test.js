import { describe, it, expect } from "vitest";
import { remaining, pct, macroSplit } from "../src/lib/foodLogic";
describe("foodLogic", () => {
  it("remaining and pct", () => {
    expect(remaining(2000, 500)).toBe(1500);
    expect(remaining(null, 500)).toBe(null);
    expect(remaining(2000, 2300)).toBe(-300);
    expect(pct(500, 2000)).toBe(25);
    expect(pct(3000, 2000)).toBe(100);
    expect(pct(10, 0)).toBe(0);
  });
  it("macroSplit tolerates empty", () => { expect(macroSplit(undefined)).toEqual({ p: 0, c: 0, f: 0 }); });
});
