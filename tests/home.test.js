import { beforeEach, describe, expect, it, vi } from "vitest";
import { localISO, shiftISO } from "../src/lib/dateKey";
import { parseWeightForm, relDayAr, weightChangeView, streakAtRisk, logLoadText } from "../src/lib/homeLogic";

let S;
beforeEach(async () => {
  localStorage.clear(); vi.resetModules();
  S = (await import("../src/lib/store/gymakStore.js")).default;
  S.resetAllData();
});
const t0 = () => localISO();

describe("weigh-in", () => {
  it("does not count as a workout day or streak", () => {
    expect(S.saveWeight(80).ok).toBe(true);
    expect(S.getStreak()).toBe(0);
    expect(S.getBestStreak()).toBe(0);
    expect(S.getLast7DaysStatus().every((d) => !d.done)).toBe(true);
  });
  it("rejects absurd values and future dates", () => {
    expect(S.saveWeight(1).ok).toBe(false);
    expect(S.saveWeight(9999).ok).toBe(false);
    expect(S.saveWeight(80, 300).error).toBe("bodyFat");
    expect(S.saveWeight(80, -5).ok).toBe(false);
    expect(S.saveWeight(80, null, shiftISO(t0(), 2)).error).toBe("date");
    expect(S.getLatestWeight()).toBe(null);
  });
  it("does not copy body fat forward; blank stays null", () => {
    S.saveWeight(80, 20, shiftISO(t0(), -3));
    S.saveWeight(79, "");
    expect(S.getLatestWeight().bodyFat).toBe(null);
    expect(S.getLatestBodyFat()).toEqual({ value: 20, date: shiftISO(t0(), -3) });
  });
  it("getLatestBodyFat dates a copied-forward legacy value at its first day", async () => {
    const k = Object.keys(localStorage).find((x) => /gymak_state/i.test(x));
    const raw = JSON.parse(localStorage.getItem(k));
    raw.weightLogs = [{ date: "2026-01-01", weight: 80, bodyFat: 18 }, { date: "2026-02-01", weight: 79, bodyFat: 18 }, { date: "2026-03-01", weight: 78, bodyFat: 18 }];
    localStorage.setItem(k, JSON.stringify(raw));
    vi.resetModules();
    S = (await import("../src/lib/store/gymakStore.js")).default;
    expect(S.getLatestBodyFat()).toEqual({ value: 18, date: "2026-01-01" });
  });
  it("past date entry and undo", () => {
    const y = shiftISO(t0(), -1);
    const r = S.saveWeight(81, null, y);
    expect(S.getWeightHistory(5).map((w) => w.date)).toEqual([y]);
    S.undoSaveWeight(r);
    expect(S.getLatestWeight()).toBe(null);
    const a = S.saveWeight(80); const b = S.saveWeight(79);
    S.undoSaveWeight(b);
    expect(S.getLatestWeight().weight).toBe(80);
    expect(a.ok).toBe(true);
  });
  it("no diff with a single log; span reported otherwise", () => {
    S.saveWeight(80);
    expect(S.getWeightDiffVsLastWeek()).toBe(null);
    expect(S.getWeightDiffOverDays(30)).toBe(null);
    S.saveWeight(82, null, shiftISO(t0(), -20));
    const d = S.getWeightDiffOverDays(30);
    expect(d.span).toBe(20); expect(d.diff).toBe(-2);
  });
});

describe("recent logs", () => {
  it("same-day order is newest log first", () => {
    S.logSet("bench", 50, 3, 10); S.logSet("squat", 60, 3, 10); S.logSet("bench", 55, 3, 10);
    const r = S.getRecentExerciseLogs(3);
    expect(r.map((x) => x.weight)).toEqual([55, 60, 50]);
  });
});

describe("home logic", () => {
  const id = (v) => v;
  it("validates the form", () => {
    expect(parseWeightForm({ weight: "", bodyFat: "" }, id).ok).toBe(false);
    expect(parseWeightForm({ weight: "10", bodyFat: "" }, id).ok).toBe(false);
    expect(parseWeightForm({ weight: "80", bodyFat: "90" }, id).ok).toBe(false);
    expect(parseWeightForm({ weight: "80", bodyFat: "" }, id)).toMatchObject({ ok: true, kg: 80, bodyFat: null });
    expect(parseWeightForm({ weight: "80", bodyFat: "", date: "2999-01-01" }, id).ok).toBe(false);
  });
  it("lb inputs convert before range check", () => {
    expect(parseWeightForm({ weight: "40" }, (v) => v * 0.4536).ok).toBe(false);
    expect(parseWeightForm({ weight: "180" }, (v) => v * 0.4536).ok).toBe(true);
  });
  it("relative days", () => {
    expect(relDayAr("2026-11-22", "2026-11-22")).toBe("النهارده");
    expect(relDayAr("2026-11-21", "2026-11-22")).toBe("امبارح");
    expect(relDayAr("2026-11-20", "2026-11-22")).toBe("من يومين");
    expect(relDayAr("2026-11-17", "2026-11-22")).toBe("من 5 أيام");
  });
  it("weight change is goal-aware, unit-converted, labelled with its span", () => {
    const toLb = (kg) => Math.round((kg / 0.45359237) * 10) / 10;
    const info = { diff: 1, from: 80, to: 81, span: 6 };
    const bulk = weightChangeView(info, { goal: 90, toDisplay: (x) => x, unit: "كجم" });
    expect(bulk.tone).toBe("good"); expect(bulk.text).toBe("1.0 كجم هذا الأسبوع");
    expect(weightChangeView(info, { goal: 70, toDisplay: (x) => x, unit: "كجم" }).tone).toBe("bad");
    const lb = weightChangeView(info, { goal: 90, toDisplay: toLb, unit: "رطل" });
    expect(lb.abs).toBeGreaterThan(2);
    expect(weightChangeView({ ...info, span: 40 }, { goal: 90, toDisplay: (x) => x, unit: "كجم" }).label).toBe("من 40 يوم");
    expect(weightChangeView(null, { toDisplay: (x) => x })).toBe(null);
  });
  it("streak at risk and load text", () => {
    expect(streakAtRisk(3, [{ done: true }, { done: false }])).toBe(true);
    expect(streakAtRisk(3, [{ done: false }, { done: true }])).toBe(false);
    expect(streakAtRisk(0, [{ done: false }])).toBe(false);
    expect(logLoadText({ weight: 0, unit: "reps" }, String)).toBe("وزن الجسم");
    expect(logLoadText({ weight: 0, unit: "sec" }, String)).toBe("بدون وزن");
  });
});
