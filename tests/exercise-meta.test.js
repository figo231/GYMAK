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
