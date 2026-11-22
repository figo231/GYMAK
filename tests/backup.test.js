import { describe, it, expect } from "vitest";
import { summarize, isMeaningful, validateBackup, shouldSnapshot, prune, MIN_GAP_MS } from "../src/lib/backup";
const good = JSON.stringify({ profile: {}, weightLogs: [{}, {}], exerciseLogs: {}, workoutDays: ["2026-11-01"], foodLog: [{}] });
describe("backup", () => {
  it("summarizes and flags empty state", () => {
    expect(summarize(good)).toEqual({ workoutDays: 1, weights: 2, foodDays: 1 });
    expect(isMeaningful(summarize(JSON.stringify({ workoutDays: [], weightLogs: [], foodLog: [] })))).toBe(false);
    expect(summarize("nope")).toBeNull();
  });
  it("validates backups strictly", () => {
    expect(validateBackup(good).ok).toBe(true);
    for (const bad of ["", "{", "[]", "null", JSON.stringify({ profile: {} }), JSON.stringify({ profile: {}, weightLogs: {}, exerciseLogs: {}, workoutDays: [] }), 5]) expect(validateBackup(bad).ok).toBe(false);
  });
  it("snapshot timing", () => {
    const now = 10 * MIN_GAP_MS;
    expect(shouldSnapshot(null, now)).toBe(true);
    expect(shouldSnapshot(now - 1000, now)).toBe(false);
    expect(shouldSnapshot(now - MIN_GAP_MS, now)).toBe(true);
  });
  it("prune keeps 5 newest per kind", () => {
    const list = [...Array(8)].map((_, i) => ({ id: "a" + i, ts: i, kind: "auto" })).concat([...Array(7)].map((_, i) => ({ id: "m" + i, ts: 100 + i, kind: "manual" })));
    const p = prune(list);
    expect(p.filter((x) => x.kind === "auto").map((x) => x.id)).toEqual(["a7", "a6", "a5", "a4", "a3"]);
    expect(p.filter((x) => x.kind === "manual")).toHaveLength(5);
  });
});
