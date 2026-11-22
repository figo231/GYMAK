import { beforeEach, describe, expect, it, vi } from "vitest";
import { localISO, shiftISO } from "../src/lib/dateKey";

let S;
const today = () => localISO();
const key = () => Object.keys(localStorage).find((k) => /gymak/i.test(k));
// Mutate the persisted state, then reload the store so it reads it.
async function boot(mutate) {
  const raw = JSON.parse(localStorage.getItem(key()));
  mutate(raw);
  localStorage.setItem(key(), JSON.stringify(raw));
  vi.resetModules();
  S = (await import("../src/lib/store/gymakStore.js")).default;
}
const logs = (m) => (raw) => {
  Object.entries(m).forEach(([id, entries]) => {
    raw.exerciseLogs[id] = entries;
    raw.workoutDays = [...new Set([...(raw.workoutDays || []), ...entries.map((e) => e.date)])].sort();
  });
};
beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  S = (await import("../src/lib/store/gymakStore.js")).default;
  S.resetAllData();
  S.addWeight(80);
});

describe("stats store", () => {
  it("counts real sets and a window of exactly n days", async () => {
    const t = today();
    const ids = S.getExercises().slice(0, 2).map((e) => e.id);
    await boot(logs({ [ids[0]]: [{ date: t, weight: 50, sets: 4, reps: 8 }, { date: shiftISO(t, -6), weight: 50, sets: 3, reps: 8 }, { date: shiftISO(t, -7), weight: 50, sets: 9, reps: 8 }] }));
    expect(S.getSetsInRange(7)).toBe(7);
    expect(S.getSetsInRange(8)).toBe(16);
    expect(S.getWorkoutDaysInRange(7)).toBe(2);
  });

  it("streak counts consecutive local days", async () => {
    const t = today();
    const id = S.getExercises()[0].id;
    await boot(logs({ [id]: [-2, -1, 0].map((d) => ({ date: shiftISO(t, d), weight: 40, sets: 3, reps: 8 })) }));
    expect(S.getStreak()).toBe(3);
  });

  it("strength is best vs best, ignores deloads, short spans, and timed lifts", async () => {
    const t = today();
    const [a, b] = S.getExercises().filter((e) => e.unit !== "sec").slice(0, 2).map((e) => e.id);
    await boot(logs({ [a]: [{ date: shiftISO(t, -30), weight: 100, sets: 3, reps: 5 }, { date: shiftISO(t, -15), weight: 120, sets: 3, reps: 5 }, { date: t, weight: 70, sets: 3, reps: 8 }], [b]: [{ date: shiftISO(t, -2), weight: 40, sets: 3, reps: 8 }, { date: t, weight: 60, sets: 3, reps: 8 }] }));
    const rows = S.getStrengthProgress(5);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ exerciseId: a, from: 100, to: 120, pct: 20 });
    expect(rows[0].e1rm).toBe(Math.round(120 * (1 + 5 / 30)));
  });

  it("timed exercises are excluded from tonnage and PR lists", async () => {
    const t = today();
    await boot((raw) => {
      logs({ plank: [{ date: t, weight: 20, sets: 3, reps: 60 }] })(raw);
      raw.prHistory = [{ exerciseId: "plank", exerciseName: "بلانك (Plank)", weight: 0, prevWeight: 0, date: t }, { exerciseId: "x1", exerciseName: "بنش (Bench)", weight: 80, prevWeight: 60, date: t }];
    });
    expect(S.getTonnage(7)).toBe(0);
    const prs = S.getRecentPRs(10);
    expect(prs).toHaveLength(1);
    expect(prs[0].exerciseName).toBe("بنش");
    expect(S.getPRCountInRange(7)).toBe(1);
  });
});
