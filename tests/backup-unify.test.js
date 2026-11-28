// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { restoreText, validateBackup, unwrapBackup, downloadCurrent } from "../src/lib/backup";
import { parseBackup } from "../src/lib/profileLogic";

const state = { workoutDays: ["2026-01-01"], weightLogs: [{ date: "2026-01-01", weight: 80 }], foodLog: [], exerciseLogs: {}, exercises: [], settings: {}, profile: {} };
beforeEach(() => localStorage.clear());

describe("one backup format for both screens", () => {
  it("raw state JSON still validates (old backups keep working)", () => {
    const v = validateBackup(JSON.stringify(state));
    expect(v.ok, v.error).toBe(true);
  });
  it("profile-export format validates and unwraps with measurements and water", () => {
    const text = JSON.stringify({ app: "GYMAK", state, measurements: [{ date: "2026-01-01", chest: 100 }], water: { x: 1 } });
    expect(validateBackup(text).ok).toBe(true);
    expect(unwrapBackup(text).extras.measurements).toHaveLength(1);
  });
  it("restoring an export file brings back measurements and water; raw restore leaves them alone", async () => {
    localStorage.setItem("gymak_measure_v1", JSON.stringify([{ keep: 1 }]));
    const r1 = await restoreText(JSON.stringify(state));
    expect(r1.ok).toBe(true);
    expect(JSON.parse(localStorage.getItem("gymak_measure_v1"))).toEqual([{ keep: 1 }]);
    localStorage.removeItem("gymak_state_v1"); // no IndexedDB in jsdom: skip the pre-restore snapshot path
    const text = JSON.stringify({ app: "GYMAK", state, measurements: [{ a: 2 }], water: { w: 3 } });
    const r2 = await restoreText(text);
    expect(r2.ok).toBe(true);
    expect(JSON.parse(localStorage.getItem("gymak_measure_v1"))).toEqual([{ a: 2 }]);
    expect(JSON.parse(localStorage.getItem("gymak_water_v1"))).toEqual({ w: 3 });
  });
  it("garbage is still rejected", () => {
    expect(validateBackup("not json").ok).toBe(false);
    expect(validateBackup(JSON.stringify({ app: "GYMAK", state: {} })).ok).toBe(false);
  });
  it("download format is accepted by the profile import parser too", () => {
    const text = JSON.stringify({ app: "GYMAK", state, measurements: null, water: null });
    expect(parseBackup(text).ok).toBe(true);
  });
});
