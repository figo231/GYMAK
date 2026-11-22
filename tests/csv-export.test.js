import { describe, it, expect } from "vitest";
import { buildCsv } from "../src/lib/profileLogic";
describe("buildCsv", () => {
  it("has BOM and rows", () => {
    const c = buildCsv({ weightLogs: [{ date: "2026-01-01", weight: 80 }], foodLog: [{ date: "2026-01-01", items: [{ name: "فول, عيش", grams: 100, kcal: 200, protein: 10, carbs: 20 }] }], exerciseLogs: { bench: [{ date: "2026-01-01", weight: 60, sets: 3, reps: 8 }] } });
    expect(c.charCodeAt(0)).toBe(0xfeff);
    expect(c).toContain('"فول, عيش"');
    expect(c.split("\r\n").length).toBe(4);
  });
  it("blocks formula injection and handles empty", () => {
    expect(buildCsv({ foodLog: [{ date: "d", items: [{ name: "=HYPERLINK(1)" }] }] })).toContain("'=HYPERLINK");
    expect(buildCsv(null).split("\r\n").length).toBe(1);
  });
});
