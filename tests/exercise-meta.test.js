import { describe, it, expect } from "vitest";
import { normalizeExercise, arNorm, haystack, matchesQuery, clampInt, validMediaUrl, setsRepsText } from "../src/lib/exerciseMeta";

const base = { id: "plank", name: "بلانك (Plank)", muscle: "core", muscleLabel: "بطن", secondary: "", sets: 3, reps: 30, custom: false, equipment: "وزن الجسم", difficulty: "مبتدئ" };

describe("exerciseMeta", () => {
  it("strips latin brackets into aliases and flags timed exercises", () => {
    const n = normalizeExercise(base);
    expect(n.name).toBe("بلانك");
    expect(n.aliases).toContain("Plank");
    expect(n.unit).toBe("sec");
  });
  it("merges variant labels and moves the extra muscle to secondary", () => {
    const n = normalizeExercise({ ...base, id: "x", muscleLabel: "فخذ خلفي وأسفل الظهر", secondary: "مؤخرة", muscle: "legs" });
    expect(n.muscleLabel).toBe("فخذ خلفي");
    expect(n.secondary).toBe("مؤخرة، أسفل الظهر");
    expect(normalizeExercise({ ...base, id: "y", muscleLabel: "أكتاف أمامي" }).muscleLabel).toBe("أكتاف أمامية");
  });
  it("custom exercises keep their unit", () => {
    expect(normalizeExercise({ ...base, id: "ex-z", custom: true, unit: "sec" }).unit).toBe("sec");
    expect(normalizeExercise({ ...base, id: "ex-z2", custom: true }).unit).toBe("reps");
  });
  it("searches Arabic with normalisation and English terms", () => {
    const h = haystack(normalizeExercise({ ...base, id: "x", name: "كيرل بار", muscle: "arms", muscleLabel: "بايسبس", equipment: "بار" }), "ذراعين");
    expect(matchesQuery(h, "بايسبس")).toBe(true);
    expect(matchesQuery(h, "barbell")).toBe(true);
    expect(matchesQuery(h, "كيرل بار")).toBe(true);
    expect(matchesQuery(h, "سكوات")).toBe(false);
    expect(arNorm("أكتاف")).toBe(arNorm("اكتاف"));
  });
  it("validates numbers and urls", () => {
    expect(clampInt("-4", 1, 20, 3)).toBe(1);
    expect(clampInt("", 1, 20, 3)).toBe(3);
    expect(clampInt("999", 1, 20, 3)).toBe(20);
    expect(validMediaUrl("javascript:alert(1)")).toBe(false);
    expect(validMediaUrl("https://x.com/a.gif")).toBe(true);
    expect(validMediaUrl("")).toBe(true);
  });
  it("keeps sets x reps left to right text", () => { expect(setsRepsText(4, 8)).toBe("4×8"); });
});

import { daysAgoLabel, pickExerciseOfTheDay, setsRepsFull } from "../src/lib/exerciseMeta";
describe("last done / exercise of the day", () => {
  it("labels days ago in Arabic", () => {
    expect(daysAgoLabel("2026-11-22", "2026-11-22")).toBe("النهارده");
    expect(daysAgoLabel("2026-11-21", "2026-11-22")).toBe("امبارح");
    expect(daysAgoLabel("2026-11-19", "2026-11-22")).toBe("من 3 أيام");
    expect(daysAgoLabel("2026-10-01", "2026-11-22")).toBe("من شهرين");
    expect(daysAgoLabel("2026-11-01", "2026-11-22")).toBe("من 3 أسابيع");
    expect(daysAgoLabel("2026-12-01", "2026-11-22")).toBe("");
  });
  it("formats reps vs seconds in sentences", () => {
    expect(setsRepsFull({ sets: 3, reps: 30, unit: "sec" })).toBe("3×30 ثانية");
    expect(setsRepsFull({ sets: 4, reps: 8, unit: "reps" })).toBe("4×8 تكرار");
  });
  it("picks deterministically and rotates program days", () => {
    const days = [{ title: "A", exercises: [{ id: "a" }] }, { title: "B", exercises: [{ id: "b" }] }];
    const d1 = pickExerciseOfTheDay({ dateISO: "2026-11-22", programDays: days, exercises: [] });
    const d2 = pickExerciseOfTheDay({ dateISO: "2026-11-22", programDays: days, exercises: [] });
    const d3 = pickExerciseOfTheDay({ dateISO: "2026-11-23", programDays: days, exercises: [] });
    expect(d1).toEqual(d2); expect(d1.title).not.toBe(d3.title); expect(d1.source).toBe("program");
  });
  it("falls back to a muscle-group session without a program", () => {
    const ex = Array.from({ length: 12 }, (_, i) => ({ id: "c" + i, muscle: "chest", difficulty: "مبتدئ" }))
      .concat(Array.from({ length: 12 }, (_, i) => ({ id: "b" + i, muscle: "back", difficulty: "متقدم" })));
    const r = pickExerciseOfTheDay({ dateISO: "2026-11-22", programDays: null, exercises: ex });
    expect(r.source).toBe("rotation");
    expect(new Set(r.exercises.map((e) => e.id)).size).toBe(r.exercises.length);
    expect(r.exercises.every((e) => e.difficulty !== "متقدم")).toBe(true);
  });
});
