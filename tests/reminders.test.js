import { describe, it, expect } from "vitest";
import { normalizeReminders, buildNotifications, missedNotification, ALL_IDS } from "../src/lib/push/reminders";
describe("reminders", () => {
  it("defaults are all off and nothing is scheduled", () => {
    const p = normalizeReminders(null);
    expect(Object.values(p).every((x) => x.on === false)).toBe(true);
    expect(buildNotifications(p)).toEqual([]);
  });
  it("sanitises bad input", () => {
    const p = normalizeReminders({ meals: { on: 1, time: "99:99" }, weigh: { on: true, time: "07:30" }, evil: { on: true } });
    expect(p.meals).toEqual({ on: true, time: "14:00" });
    expect(p.weigh.time).toBe("07:30");
    expect(p.evil).toBeUndefined();
  });
  it("builds unique ids, water has 6 slots, weekly is Saturday", () => {
    const list = buildNotifications({ meals: { on: true }, water: { on: true }, weigh: { on: true } });
    expect(list).toHaveLength(8);
    expect(new Set(list.map((n) => n.id)).size).toBe(8);
    expect(list.every((n) => ALL_IDS.includes(n.id))).toBe(true);
    expect(list.find((n) => n.id === 4104).schedule.on.weekday).toBe(7);
  });
  it("missed nudge only if on, untrained, and still ahead", () => {
    const prefs = { missed: { on: true, time: "20:30" } };
    const noon = new Date(2026, 10, 22, 12, 0);
    expect(missedNotification(prefs, noon, false).id).toBe(4120);
    expect(missedNotification(prefs, noon, true)).toBeNull();
    expect(missedNotification(prefs, new Date(2026, 10, 22, 21, 0), false)).toBeNull();
    expect(missedNotification({ missed: { on: false } }, noon, false)).toBeNull();
  });
});
