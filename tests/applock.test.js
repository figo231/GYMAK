import { describe, expect, it, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { setPin, verifyPin, clearPin, isLockEnabled, validPin, shouldRelock } from "../src/lib/appLock";
import { exercisesWord, parseBackup, applyBackup, exportPayload, xpToNext, timeAgoAr } from "../src/lib/profileLogic";

beforeEach(() => localStorage.clear());

describe("app lock", () => {
  it("accepts only 4 digits and stores a hash, not the PIN", async () => {
    expect(validPin("1234")).toBe(true); expect(validPin("12a4")).toBe(false); expect(validPin("123")).toBe(false);
    expect(await setPin("12")).toBe(false); expect(isLockEnabled()).toBe(false);
    expect(await setPin("4821")).toBe(true); expect(isLockEnabled()).toBe(true);
    const record = JSON.parse(localStorage.getItem("gymak_lock_v1"));
    expect(Object.keys(record).sort()).toEqual(["fails", "hash", "salt", "until"]);
    expect(record.salt).toMatch(/^[a-f0-9]{32}$/);
    expect(record.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(record.hash).toBe(createHash("sha256").update(`${record.salt}:4821`).digest("hex"));
    expect(record).toMatchObject({ fails: 0, until: 0 });
    expect(Object.values(record)).not.toContain("4821");
    expect(Object.values(record)).not.toContain(4821);
    expect(record.hash).not.toBe(createHash("sha256").update("4821").digest("hex"));
    expect((await verifyPin("4821")).ok).toBe(true);
    expect((await verifyPin("0000")).ok).toBe(false);
  });
  it("verifies, throttles after five wrong tries, and clears", async () => {
    await setPin("4821");
    expect((await verifyPin("4821")).ok).toBe(true);
    let r; const t = 1000000;
    for (let i = 0; i < 5; i++) r = await verifyPin("0000", localStorage, t);
    expect(r.ok).toBe(false); expect(r.waitMs).toBe(30000);
    expect((await verifyPin("4821", localStorage, t + 1000)).ok).toBe(false); // still locked out
    expect((await verifyPin("4821", localStorage, t + 31000)).ok).toBe(true);
    clearPin(); expect(isLockEnabled()).toBe(false);
  });
  it("relocks only after the grace period", () => {
    expect(shouldRelock(0, 100000)).toBe(false);
    expect(shouldRelock(1000, 30000)).toBe(false);
    expect(shouldRelock(1000, 100000)).toBe(true);
  });
});

describe("backup import", () => {
  it("round-trips an export and rejects junk", () => {
    localStorage.setItem("gymak_state_v1", JSON.stringify({ weightLogs: [], exerciseLogs: {}, workoutDays: ["2026-11-01"], profile: { name: "x" } }));
    localStorage.setItem("gymak_measure_v1", JSON.stringify([{ date: "2026-11-01", waist: 90 }]));
    const text = JSON.stringify(exportPayload());
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    localStorage.clear();
    applyBackup(parsed.payload);
    expect(JSON.parse(localStorage.getItem("gymak_state_v1")).workoutDays).toEqual(["2026-11-01"]);
    expect(JSON.parse(localStorage.getItem("gymak_measure_v1"))[0].waist).toBe(90);
    expect(parseBackup("not json").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "other", state: {} })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "GYMAK", state: { weightLogs: "x", exerciseLogs: {}, workoutDays: [], profile: {} } })).ok).toBe(false);
  });
});

describe("profile header", () => {
  it("xp to next level and daily cap", () => {
    expect(xpToNext({ xp: 100, xpNext: 500, level: 1 })).toMatchObject({ exercises: 16, nextLevel: 2, capped: false });
    expect(xpToNext({ xp: 0, xpNext: 500, level: 3, xpDay: { date: "2026-11-22", n: 10 } }, "2026-11-22").capped).toBe(true);
  });
  it("time ago", () => {
    expect(timeAgoAr(null)).toMatch(/لسه/);
    expect(timeAgoAr(1000000 - 5 * 60000, 1000000)).toBe("من 5 دقيقة");
  });
});

describe("arabic counts", () => { it("agrees the noun with the number", () => { expect([1, 2, 5, 10, 11, 20, 100].map(exercisesWord)).toEqual(["تمرين", "تمرينين", "تمارين", "تمارين", "تمرين", "تمرين", "تمرين"]); }); });
