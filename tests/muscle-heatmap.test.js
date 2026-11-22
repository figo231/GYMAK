import { describe, it, expect, beforeEach, vi } from "vitest";
let S;
beforeEach(async () => {
  localStorage.clear(); vi.resetModules();
  S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData();
});
describe("muscle heatmap data", () => {
  it("aggregates sets by stable muscle key within the range", () => {
    const today = S.getTodayKey();
    S.logSet("bench-press-barbell", 60, 3, 10); // chest
    S.logSet("squat-barbell", 80, 4, 8); // legs
    const heat = S.getMuscleKeySetsInRange(30);
    expect(heat.chest).toBe(3);
    expect(heat.legs).toBe(4);
    expect(heat.back || 0).toBe(0);
    expect(today).toBeTruthy();
  });
  it("ignores logs outside the range", async () => {
    // Seed a 40-day-old log before the store is ever loaded.
    const old = new Date(); old.setDate(old.getDate() - 40);
    const iso = old.toISOString().slice(0, 10);
    const raw = JSON.parse(localStorage.getItem("gymak_state_v1") || "null") || null;
    const base = raw || null;
    localStorage.clear(); vi.resetModules();
    const Fresh = (await import("../src/lib/store/gymakStore.js")).default; Fresh.resetAllData();
    const st = JSON.parse(localStorage.getItem("gymak_state_v1"));
    st.exerciseLogs["bench-press-barbell"] = [{ date: iso, weight: 60, sets: 3, reps: 10 }];
    localStorage.setItem("gymak_state_v1", JSON.stringify(st));
    vi.resetModules();
    const S2 = (await import("../src/lib/store/gymakStore.js")).default;
    expect(S2.getMuscleKeySetsInRange(30).chest || 0).toBe(0);
    expect(S2.getMuscleKeySetsInRange(60).chest).toBe(3);
    expect(base).toBeNull();
  });
});
