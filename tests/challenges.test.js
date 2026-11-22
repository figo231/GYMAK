import { describe, it, expect } from "vitest";
import { weekStart, weeklyChallenge, monthlyBadges } from "../src/lib/challenges";
describe("challenges", () => {
  it("week starts Saturday", () => {
    expect(weekStart("2026-11-22")).toBe("2026-11-21"); // Sunday -> Sat 21
    expect(weekStart("2026-11-21")).toBe("2026-11-21");
    expect(weekStart("2026-11-27")).toBe("2026-11-21"); // Friday
    expect(weekStart("2026-11-28")).toBe("2026-11-28");
  });
  it("target clamps and counts this week", () => {
    const c = weeklyChallenge(["2026-11-21", "2026-11-22"], "2026-11-22");
    expect(c.done).toBe(2); expect(c.target).toBe(3); expect(c.left).toBe(1); expect(c.complete).toBe(false); expect(c.daysLeft).toBe(5);
    expect(weeklyChallenge(["2026-11-21", "2026-11-22", "2026-11-23"], "2026-11-23").complete).toBe(true);
  });
  it("monthly tiers", () => {
    const days = Array.from({ length: 12 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
    const m = monthlyBadges(days, "2026-11-22");
    expect(m.earned.map((t) => t.id)).toEqual(["bronze", "silver"]); expect(m.next.id).toBe("gold"); expect(m.toNext).toBe(8);
    expect(monthlyBadges(["2026-10-30"], "2026-11-22").days).toBe(0);
  });
});
