import { describe, it, expect } from "vitest";
import { WARMUP, STRETCH, routineMinutes } from "../src/lib/warmup";
describe("warmup", () => {
  it("has content for every group", () => { expect(WARMUP.length).toBeGreaterThan(4); for (const g of Object.values(STRETCH)) { expect(g.items.length).toBeGreaterThan(0); for (const i of g.items) expect(i.name && i.tip && i.sec > 0).toBeTruthy(); } });
  it("minutes", () => { expect(routineMinutes([{ sec: 30 }])).toBe(1); expect(routineMinutes(WARMUP)).toBeGreaterThanOrEqual(5); });
});
