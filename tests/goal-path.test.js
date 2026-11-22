import { describe, it, expect, beforeEach, vi } from "vitest";
import { goalTrajectory, goalProgress, GOAL_STATUS_LABEL } from "../src/lib/stats/goalPath";

const H = [
  { date: "2026-11-01", weight: 90 },
  { date: "2026-11-08", weight: 89 },
  { date: "2026-11-15", weight: 88.2 },
];

describe("weight goal trajectory", () => {
  it("draws a line from the latest weigh-in to the deadline", () => {
    expect(goalTrajectory(H, 85, "2026-12-15")).toEqual({
      from: { date: "2026-11-15", weight: 88.2 },
      to: { date: "2026-12-15", weight: 85 },
    });
  });
  it("is null without goal, deadline, history, or with a past deadline", () => {
    expect(goalTrajectory(H, null, "2026-12-15")).toBeNull();
    expect(goalTrajectory(H, 85, null)).toBeNull();
    expect(goalTrajectory([], 85, "2026-12-15")).toBeNull();
    expect(goalTrajectory(H, 85, "2026-11-10")).toBeNull();
  });
});

describe("weight goal progress", () => {
  it("reports on-track when the recent rate matches the required one", () => {
    const p = goalProgress(H, 85, "2026-12-13", "2026-11-15");
    expect(p.status).toBe("on");
    expect(p.remaining).toBeCloseTo(-3.2);
    expect(p.requiredPerWeek).toBeCloseTo(-0.8, 1);
    expect(p.actualPerWeek).toBeCloseTo(-0.9, 1);
  });
  it("reports behind when weight is not moving toward the goal", () => {
    const up = [{ date: "2026-11-01", weight: 85 }, { date: "2026-11-15", weight: 86.5 }];
    const p = goalProgress(up, 82, "2026-12-15", "2026-11-15");
    expect(p.status).toBe("behind");
  });
  it("reports done at the goal and missed after the deadline", () => {
    expect(goalProgress([{ date: "2026-11-15", weight: 85.1 }], 85, "2026-12-15", "2026-11-15").status).toBe("done");
    expect(goalProgress(H, 85, "2026-11-14", "2026-11-15").status).toBe("missed");
  });
  it("needs a few weigh-ins before judging", () => {
    expect(goalProgress([{ date: "2026-11-15", weight: 88.2 }], 85, "2026-12-15", "2026-11-15").status).toBe("no-data");
    expect(goalProgress([], 85, "2026-12-15", "2026-11-15")).toBeNull();
  });
  it("has an Egyptian-Arabic label for every status", () => {
    for (const s of ["done", "missed", "ahead", "on", "behind", "no-data"]) expect(GOAL_STATUS_LABEL[s]).toBeTruthy();
  });
});

describe("store goal deadline", () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });
  it("saves and clears a goal deadline", async () => {
    const S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData();
    expect(S.getGoalDeadline()).toBeNull();
    S.setGoalDeadline("2026-12-31");
    expect(S.getGoalDeadline()).toBe("2026-12-31");
    S.setGoalDeadline("not-a-date");
    expect(S.getGoalDeadline()).toBeNull();
  });
});
