import { beforeEach, describe, expect, it, vi } from "vitest";

let S;
beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  S = (await import("../src/lib/store/gymakStore.js")).default;
  S.resetAllData();
});

describe("weight entries", () => {
  it("deletes, tombstones, ignores a stale remote row, and undoes", () => {
    S.addWeight(80);
    const date = S.getLatestWeight().date;
    const snap = S.deleteWeightEntry(date);
    expect(S.getWeightEntries()).toHaveLength(0);
    expect(S.getPendingDeletes().weight).toEqual([date]);
    S.mergeWeightLogsFromRemote([{ date, weight: 80, body_fat: null }]);
    expect(S.getWeightEntries()).toHaveLength(0);
    S.restore(snap);
    expect(S.getWeightEntries()).toHaveLength(1);
    expect(S.getPendingDeletes().weight).toEqual([]);
  });

  it("edits and undoes an edit", () => {
    S.addWeight(80);
    const date = S.getLatestWeight().date;
    const snap = S.updateWeightEntry(date, 79.5);
    expect(S.getLatestWeight().weight).toBe(79.5);
    S.restore(snap);
    expect(S.getLatestWeight().weight).toBe(80);
  });

  it("rejects invalid weights", () => {
    S.addWeight(80);
    expect(S.updateWeightEntry(S.getLatestWeight().date, -3)).toBeNull();
  });
});

describe("exercise logs", () => {
  it("removes the PR a set created, and restores both on undo", () => {
    S.logSet("bench-press-barbell", 60, 3, 10);
    S.logSet("bench-press-barbell", 70, 3, 10);
    expect(S.getRecentPRs(5)).toHaveLength(1);
    const top = S.getExerciseLogEntries()[0];
    const snap = S.deleteExerciseLog(top.exerciseId, top.i);
    expect(S.getExerciseLogEntries()).toHaveLength(1);
    expect(S.getRecentPRs(5)).toHaveLength(0);
    expect(S.getPendingDeletes().exerciseLogs).toHaveLength(1);
    S.restore(snap);
    expect(S.getExerciseLogEntries()).toHaveLength(2);
    expect(S.getRecentPRs(5)).toHaveLength(1);
    expect(S.getPendingDeletes().exerciseLogs).toHaveLength(0);
  });

  it("does not resurrect a deleted set on pull", () => {
    S.logSet("bench-press-barbell", 60, 3, 10);
    const e = S.getExerciseLogEntries()[0];
    S.deleteExerciseLog(e.exerciseId, e.i);
    const today = e.date;
    S.mergeExerciseLogsFromRemote([{ exercise_id: "bench-press-barbell", date: today, weight: 60, sets: 3, reps: 10 }]);
    expect(S.getExerciseLogEntries()).toHaveLength(0);
  });

  it("edits a set and undoes the edit", () => {
    S.logSet("bench-press-barbell", 60, 3, 10);
    const e = S.getExerciseLogEntries()[0];
    const snap = S.updateExerciseLog(e.exerciseId, e.i, { weight: 62.5, sets: 4, reps: 8 });
    expect(S.getExerciseLogEntries()[0]).toMatchObject({ weight: 62.5, sets: 4, reps: 8 });
    S.restore(snap);
    expect(S.getExerciseLogEntries()[0]).toMatchObject({ weight: 60, sets: 3, reps: 10 });
  });
});

describe("food log", () => {
  const items = () => [
    { name: "a", grams: 100, kcal: 200, protein: 10, carbs: 20, fat: 5 },
    { name: "b", grams: 50, kcal: 100, protein: 5, carbs: 10, fat: 2 },
  ];

  it("scales macros when grams change, and undoes", () => {
    S.logFoodEntries(items());
    const d = S.getFoodDays()[0].date;
    const snap = S.updateFoodItemGrams(d, 0, 200);
    expect(S.getFoodDays()[0].totalKcal).toBe(500);
    S.restore(snap);
    expect(S.getFoodDays()[0].totalKcal).toBe(300);
  });

  it("recalculates totals on delete and tombstones an emptied day", () => {
    S.logFoodEntries(items());
    const d = S.getFoodDays()[0].date;
    const a = S.deleteFoodItem(d, 0);
    expect(S.getFoodDays()[0].totalKcal).toBe(100);
    const b = S.deleteFoodItem(d, 0);
    expect(S.getFoodDays()).toHaveLength(0);
    expect(S.getPendingDeletes().food).toEqual([d]);
    S.restore(b);
    S.restore(a);
    expect(S.getFoodDays()[0].items).toHaveLength(2);
    expect(S.getFoodDays()[0].totalKcal).toBe(300);
    expect(S.getPendingDeletes().food).toEqual([]);
  });
});

describe("basics", () => {
  it("counts a streak and daily calorie target", () => {
    S.addWeight(80);
    expect(S.getStreak()).toBe(1);
    expect(S.getDailyCalorieTarget()).toBe(2560);
  });
  it("parses Arabic food text", () => {
    const items = S.parseFood("فطاري 2 بيضة");
    expect(items.length).toBeGreaterThan(0);
  });
});
