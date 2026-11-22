import { describe, it, expect } from "vitest";
import { attention, summarize, sortTrainees, filterTrainees, activityStrip, weightTrend, daysSince } from "../src/lib/coach/dashboard";

const now = new Date("2026-11-22T10:00:00Z");
const rep = (last7, lastWorkout, name = "") => ({ last7, lastWorkout, name });

describe("coach dashboard helpers", () => {
  it("daysSince", () => { expect(daysSince("2026-11-22", now)).toBe(0); expect(daysSince("2026-11-19", now)).toBe(3); expect(daysSince(null, now)).toBeNull(); });
  it("attention levels", () => {
    expect(attention(rep(5, "2026-11-22"), now)).toBe("ok");
    expect(attention(rep(2, "2026-11-21"), now)).toBe("ok");
    expect(attention(rep(1, "2026-11-20"), now)).toBe("watch");
    expect(attention(rep(0, "2026-11-10"), now)).toBe("risk");
    expect(attention(rep(0, null), now)).toBe("risk");
    expect(attention(undefined, now)).toBe("unknown");
    expect(attention({ errors: true }, now)).toBe("unknown");
  });
  const links = [
    { id: "a", status: "active", trainee_id: "u1", trainee_email: "a@x.com" },
    { id: "b", status: "active", trainee_id: "u2", trainee_email: "b@x.com" },
    { id: "c", status: "pending", trainee_id: null, trainee_email: "c@x.com" },
    { id: "d", status: "active", trainee_id: "u4", trainee_email: "d@x.com" },
  ];
  const reports = { a: rep(5, "2026-11-22", "Ali"), b: rep(0, "2026-11-01", "Bob"), d: rep(1, "2026-11-20", "Dan") };
  it("summarize counts and averages over active trainees only", () => {
    expect(summarize(links, reports, now)).toEqual({ active: 3, pending: 1, ok: 1, watch: 1, risk: 1, avgLast7: 2 });
  });
  it("sorts risk first, pending last", () => {
    expect(sortTrainees(links, reports, now).map((l) => l.id)).toEqual(["b", "d", "a", "c"]);
  });
  it("filters by name or email", () => {
    expect(filterTrainees(links, reports, "ali").map((l) => l.id)).toEqual(["a"]);
    expect(filterTrainees(links, reports, "c@x").map((l) => l.id)).toEqual(["c"]);
    expect(filterTrainees(links, reports, "").length).toBe(4);
  });
  it("activity strip", () => {
    const s = activityStrip(["2026-11-22", "2026-11-20"], 7, now);
    expect(s).toHaveLength(7); expect(s[6]).toEqual({ date: "2026-11-22", trained: true }); expect(s[5].trained).toBe(false); expect(s[4].trained).toBe(true);
  });
  it("weight trend", () => {
    expect(weightTrend([{ weight: 80 }])).toBeNull();
    const t = weightTrend([{ weight: 80 }, { weight: 79 }, { weight: 78.5 }]);
    expect(t.change).toBe(-1.5); expect(t.points[0]).toEqual({ x: 0, y: 0 }); expect(t.points[2].y).toBe(1);
    expect(weightTrend([{ weight: 70 }, { weight: 70 }]).change).toBe(0);
  });
});
