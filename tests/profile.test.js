import { beforeEach, describe, expect, it, vi } from "vitest";
import { validHeight, validGoalKg, bmiCategory, arDateFull, coachLine, clearLocalData, exportPayload } from "../src/lib/profileLogic";
import { shiftISO } from "../src/lib/dateKey";

let S;
beforeEach(async () => { localStorage.clear(); vi.resetModules(); S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData(); });

describe("profile logic", () => {
  it("validates height and goal", () => {
    expect(validHeight(175)).toBe(true); expect(validHeight(5000)).toBe(false); expect(validHeight(-3)).toBe(false);
    expect(validGoalKg(80)).toBe(true); expect(validGoalKg(-20)).toBe(false); expect(validGoalKg(NaN)).toBe(false);
  });
  it("bmi categories and dates", () => {
    expect(bmiCategory(17)).toBe("نحافة"); expect(bmiCategory(22)).toBe("طبيعي"); expect(bmiCategory(27)).toBe("زيادة وزن"); expect(bmiCategory(33)).toBe("سمنة");
    expect(arDateFull("2026-11-22")).toBe("22 نوفمبر 2026");
  });
  it("coach line reflects real activity", () => {
    expect(coachLine([], "2026-11-22")).toMatch(/اسأل المدرب/);
    expect(coachLine(["2026-11-22"], "2026-11-22")).toMatch(/كمّلت/);
    expect(coachLine([shiftISO("2026-11-22", -3)], "2026-11-22")).toMatch(/3/);
  });
  it("reset clears every local data key", async () => {
    ["gymak_state_v1", "gymak_measure_v1", "gymak_water_v1", "gymak_rest_v1"].forEach((k) => localStorage.setItem(k, "[]"));
    localStorage.setItem("gymak_theme_pref", "dark");
    await clearLocalData(localStorage, null);
    expect(localStorage.getItem("gymak_measure_v1")).toBeNull(); expect(localStorage.getItem("gymak_water_v1")).toBeNull();
    expect(localStorage.getItem("gymak_theme_pref")).toBe("dark");
  });
  it("export has data but no auth", () => {
    localStorage.setItem("gymak_state_v1", JSON.stringify({ a: 1 })); localStorage.setItem("sb-x-auth-token", "secret");
    const p = exportPayload(); expect(p.state).toEqual({ a: 1 }); expect(JSON.stringify(p)).not.toContain("secret");
  });
});

describe("store: profile rules", () => {
  it("rejects bad height and goal", () => {
    S.setHeight(175); S.setHeight(5000); expect(S.getProfile().heightCm).toBe(175);
    S.setGoalWeight(80); S.setGoalWeight(-20); expect(S.getGoalWeight()).toBe(80);
  });
  it("XP is capped per day and refunded on delete and undo", () => {
    for (let i = 0; i < 14; i++) S.logSet("bench-press-barbell", 40 + i, 3, 8);
    expect(S.getProfile().xp + (S.getProfile().level - 1) * 500).toBeGreaterThan(0);
    const total = () => { const p = S.getProfile(); let t = p.xp; let need = 500; for (let l = 1; l < p.level; l++) { t += need; need = Math.round(need * 1.15); } return t; };
    expect(total()).toBe(250);
    const e = S.getExerciseLogEntries()[0];
    const snap = S.deleteExerciseLog(e.exerciseId, e.i);
    expect(total()).toBeLessThanOrEqual(250);
    S.restore(snap);
    expect(total()).toBe(250);
  });
  it("achievements count real sets and ignore weightless PRs", () => {
    S.logSet("bench-press-barbell", 40, 4, 8); S.logSet("squat-barbell", 60, 4, 8);
    const a = Object.fromEntries(S.getAchievements().map((x) => [x.id, x]));
    expect(a.sets10.progress).toBe(8);
    expect(a.sets10.unlocked).toBe(false);
    S.logSet("squat-barbell", 70, 4, 8);
    expect(S.getAchievements().find((x) => x.id === "sets10").unlocked).toBe(true);
  });
  it("goal achievement counts passing the goal", async () => {
    S.setGoalWeight(80); S.addWeight(90);
    expect(S.getAchievements().find((x) => x.id === "goal").unlocked).toBe(false);
    const raw = JSON.parse(localStorage.getItem("gymak_state_v1"));
    raw.weightLogs = [{ date: "2026-10-01", weight: 90, bodyFat: null }, { date: "2026-11-01", weight: 78, bodyFat: null }];
    localStorage.setItem("gymak_state_v1", JSON.stringify(raw));
    vi.resetModules();
    S = (await import("../src/lib/store/gymakStore.js")).default;
    expect(S.getAchievements().find((x) => x.id === "goal").unlocked).toBe(true);
  });
});
