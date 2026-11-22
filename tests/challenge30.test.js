import { describe, it, expect, beforeEach } from "vitest";
import { joinChallenge, leaveChallenge, challengeStatus, challenge30Complete, CHALLENGE_DAYS } from "../src/lib/challenge30";

const days = (start, n) => Array.from({ length: n }, (_, i) => {
  const [y, m, d0] = start.split("-").map(Number);
  const d = new Date(y, m - 1, d0 + i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
});

beforeEach(() => localStorage.clear());

describe("30-day challenge", () => {
  it("is null before joining and starts on join day", () => {
    expect(challengeStatus([], [], "2026-11-22")).toBeNull();
    joinChallenge("2026-11-10");
    const st = challengeStatus([], [], "2026-11-22");
    expect(st).toMatchObject({ start: "2026-11-10", day: 13, done: 0, complete: false, failed: false });
    expect(st.end).toBe("2026-12-09");
  });

  it("counts workout days in the window, cheat days bridge", () => {
    joinChallenge("2026-11-01");
    const wd = days("2026-11-01", 10).filter((_, i) => i !== 4);
    const st = challengeStatus(wd, ["2026-11-05"], "2026-11-15");
    expect(st.done).toBe(10);
    expect(st.left).toBe(20);
  });

  it("completes at 30 days and unlocks the badge input", () => {
    joinChallenge("2026-10-01");
    const wd = days("2026-10-01", CHALLENGE_DAYS);
    const st = challengeStatus(wd, [], "2026-10-30");
    expect(st.complete).toBe(true);
    expect(challenge30Complete(wd, [], "2026-10-30")).toBe(1);
  });

  it("fails when the window ends short, and restart works", () => {
    joinChallenge("2026-09-01");
    const st = challengeStatus(days("2026-09-01", 20), [], "2026-11-22");
    expect(st.failed).toBe(true);
    expect(st.complete).toBe(false);
    leaveChallenge();
    expect(challengeStatus([], [], "2026-11-22")).toBeNull();
  });
});
