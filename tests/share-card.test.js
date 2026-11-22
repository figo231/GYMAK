import { describe, it, expect } from "vitest";
import { weightCardData, prCardData } from "../src/lib/share/shareCard";
describe("share card data", () => {
  it("weight loss card", () => {
    const d = weightCardData([{ date: "2026-10-01", weight: 90 }, { date: "2026-11-01", weight: 85.5 }]);
    expect(d.title).toBe("نزّلت من وزني"); expect(d.big).toContain("4.5"); expect(d.sub).toContain("31 يوم");
  });
  it("needs two entries", () => { expect(weightCardData([{ date: "2026-10-01", weight: 90 }])).toBeNull(); });
  it("pr card", () => {
    const d = prCardData({ exerciseName: "بنش", weight: 100, prevWeight: 95 });
    expect(d.big).toBe("100"); expect(d.unit).toBe("كجم"); expect(d.sub).toContain("كان 95"); expect(prCardData(null)).toBeNull();
  });
});
import { drawBeforeAfter, drawCard } from "../src/lib/share/shareCard";
describe("card drawing is exported", () => { it("exports draw fns", () => { expect(typeof drawBeforeAfter).toBe("function"); expect(typeof drawCard).toBe("function"); }); });
