import { beforeEach, describe, expect, it, vi } from "vitest";
let S;
beforeEach(async () => { localStorage.clear(); vi.resetModules(); S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData(); });
const iso = (d) => { const x = new Date(Date.now() - d * 86400000); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
function seedDays(days) { const st = JSON.parse(localStorage.getItem("gymak_state_v1")); st.workoutDays = days.map(iso).sort(); localStorage.setItem("gymak_state_v1", JSON.stringify(st)); }
describe("cheat day", () => {
  it("bridges the streak but does not count", async () => {
    S.getStreak(); S.setCheatDay(iso(1), true); seedDays([0, 2, 3]);
    vi.resetModules(); S = (await import("../src/lib/store/gymakStore.js")).default;
    expect(S.getStreak()).toBe(3);
  });
  it("without cheat day the gap breaks it", async () => {
    S.getStreak(); seedDays([0, 2, 3]);
    vi.resetModules(); S = (await import("../src/lib/store/gymakStore.js")).default;
    expect(S.getStreak()).toBe(1);
  });
  it("one per rolling 7 days, removable", () => {
    expect(S.setCheatDay(iso(0), true).ok).toBe(true);
    expect(S.setCheatDay(iso(3), true)).toEqual({ ok: false, on: false, reason: "limit" });
    expect(S.setCheatDay(iso(8), true).ok).toBe(true);
    expect(S.setCheatDay(iso(0), false).on).toBe(false); expect(S.isCheatDay(iso(0))).toBe(false);
  });
});
