import { describe, it, expect } from "vitest";
import { TIPS, tipOfTheDay } from "../src/lib/content/tips";
describe("tip of the day", () => {
  it("is deterministic per day and changes across days", () => {
    expect(tipOfTheDay("2026-11-22")).toBe(tipOfTheDay("2026-11-22"));
    const distinct = new Set(["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23"].map(tipOfTheDay));
    expect(distinct.size).toBeGreaterThan(1);
  });
  it("always returns a non-empty Arabic tip and wraps around the month", () => {
    for (let d = 1; d <= 31; d++) {
      const t = tipOfTheDay(`2026-11-${String(d).padStart(2, "0")}`);
      expect(typeof t).toBe("string");
      expect(t.length).toBeGreaterThan(20);
    }
    expect(TIPS.length).toBeGreaterThanOrEqual(28);
  });
});
