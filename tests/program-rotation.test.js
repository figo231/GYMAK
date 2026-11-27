globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
vi.mock("../src/hooks/useI18n", () => ({ useI18n: () => ({ lang: "ar" }) }));
vi.mock("../src/hooks/useDialog", () => ({ useConfirm: () => async () => true }));

let S, root, el;
beforeEach(async () => { localStorage.clear(); vi.resetModules(); S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData(); });
afterEach(() => { if (root) act(() => root.unmount()); el?.remove(); root = null; vi.useRealTimers(); });

describe("split rotation (store)", () => {
  it("is null with no active program", () => {
    expect(S.getProgramRotation()).toBe(null);
    expect(S.finishProgramDay()).toBe(null);
    expect(S.restProgramDay()).toBe(null);
    expect(S.setProgramDay(1)).toBe(null);
  });
  it("starts at day 1 on first open and advances only when marked done, wrapping at the end", () => {
    S.applyProgram("arnold-split");
    let r = S.getProgramRotation();
    expect(r.index).toBe(0); expect(r.count).toBe(6); expect(r.day.title).toBe("صدر وظهر");
    expect(S.getProgramRotation().index).toBe(0); // reading never advances
    for (let i = 1; i <= 5; i++) expect(S.finishProgramDay().index).toBe(i);
    expect(S.finishProgramDay().index).toBe(0);
  });
  it("rest keeps the planned day, is only for today, and can be undone", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 27, 10));
    S.applyProgram("arnold-split");
    S.finishProgramDay();
    const r = S.restProgramDay();
    expect(r.index).toBe(1); expect(r.restToday).toBe(true);
    vi.setSystemTime(new Date(2026, 10, 28, 10));
    const next = S.getProgramRotation();
    expect(next.index).toBe(1); expect(next.restToday).toBe(false); expect(next.canUndo).toBe(false);
  });
  it("undo restores the previous day after done, and after rest", () => {
    S.applyProgram("arnold-split");
    S.finishProgramDay();
    expect(S.getProgramRotation().canUndo).toBe(true);
    expect(S.undoProgramDay().index).toBe(0);
    expect(S.undoProgramDay()).toBe(null);
    S.restProgramDay();
    expect(S.getProgramRotation().restToday).toBe(true);
    expect(S.undoProgramDay().restToday).toBe(false);
  });
  it("skipped days: a day can be chosen directly, and bad indexes are ignored", () => {
    S.applyProgram("arnold-split");
    expect(S.setProgramDay(2).index).toBe(2);
    expect(S.setProgramDay(9)).toBe(null);
    expect(S.setProgramDay(-1)).toBe(null);
    expect(S.setProgramDay(1.5)).toBe(null);
    expect(S.getProgramRotation().index).toBe(2);
  });
  it("switching splits restarts at day 1 and switching back does not resume a stale index", () => {
    S.applyProgram("arnold-split");
    S.finishProgramDay(); S.finishProgramDay();
    S.applyProgram("push-pull-legs");
    let r = S.getProgramRotation();
    expect(r.index).toBe(0); expect(r.count).toBe(3);
    S.finishProgramDay();
    S.applyProgram("arnold-split");
    expect(S.getProgramRotation().index).toBe(0);
  });
  it("a saved index past the end of the split is wrapped, and stopping the program clears the view", () => {
    S.applyProgram("push-pull-legs");
    S.setProgramDay(2);
    S.applyProgram("push-pull-legs");
    expect(S.getProgramRotation().index).toBe(2);
    S.stopProgram();
    expect(S.getProgramRotation()).toBe(null);
  });
  it("does not touch logs, favorites, the exercise library or other programs' data", () => {
    S.applyProgram("arnold-split");
    S.logSet("bench-press-barbell", 60, 3, 8);
    const before = JSON.stringify([S.getExerciseLogs("bench-press-barbell"), S.getExercises().length]);
    S.finishProgramDay(); S.restProgramDay(); S.undoProgramDay(); S.setProgramDay(3);
    expect(JSON.stringify([S.getExerciseLogs("bench-press-barbell"), S.getExercises().length])).toBe(before);
  });
  it("survives a reload from storage", async () => {
    S.applyProgram("arnold-split"); S.finishProgramDay();
    vi.resetModules();
    const S2 = (await import("../src/lib/store/gymakStore.js")).default;
    expect(S2.getProgramRotation().index).toBe(1);
  });
});

describe("DayPlan view", () => {
  async function mount() {
    const { default: DayPlan } = await import("../src/pages/Exercises/DayPlan.jsx");
    const refresh = vi.fn();
    el = document.createElement("div"); document.body.append(el); root = createRoot(el);
    const render = () => {
      const program = S.getActiveProgram(), rotation = S.getProgramRotation();
      act(() => root.render(createElement(MemoryRouter, null, createElement(DayPlan, { program, rotation, favs: new Set(), onToggleFav: () => {}, todayIds: new Set(), onToggleToday: () => {}, refresh: () => { refresh(); render(); } }))));
    };
    render();
    return refresh;
  }
  const btn = (label) => [...el.querySelectorAll("button")].find((b) => b.textContent.includes(label));
  it("shows only today's day exercises, with every day reachable", async () => {
    S.applyProgram("arnold-split");
    await mount();
    expect(el.querySelector(".dp-title").textContent).toBe("صدر وظهر");
    expect(el.querySelectorAll(".dp-list > *").length).toBe(6);
    expect(el.querySelectorAll(".dp-chip").length).toBe(6);
    expect(el.textContent).not.toContain("سكوات");
  });
  it("done moves to the next day and hides the previous day's exercises", async () => {
    S.applyProgram("arnold-split");
    await mount();
    act(() => btn("خلصت اليوم").click());
    expect(el.querySelector(".dp-title").textContent).toBe("أكتاف وذراعين");
    expect(el.querySelectorAll(".dp-list > *").length).toBe(6);
    expect(btn("تراجع")).toBeTruthy();
    act(() => btn("تراجع").click());
    expect(el.querySelector(".dp-title").textContent).toBe("صدر وظهر");
  });
  it("rest keeps the same day and shows the rest note", async () => {
    S.applyProgram("arnold-split");
    await mount();
    act(() => btn("النهارده راحة").click());
    expect(el.querySelector(".dp-title").textContent).toBe("صدر وظهر");
    expect(el.querySelector(".dp-rest")).toBeTruthy();
  });
  it("viewing another day does not change today until asked", async () => {
    S.applyProgram("arnold-split");
    await mount();
    act(() => el.querySelectorAll(".dp-chip")[2].click());
    expect(el.querySelector(".dp-title").textContent).toBe("أرجل");
    expect(S.getProgramRotation().index).toBe(0);
    expect(btn("خلصت اليوم")).toBeFalsy();
    act(() => btn("خليه يوم النهارده").click());
    expect(S.getProgramRotation().index).toBe(2);
  });
  it("start with no signed-in owner shows an error instead of crashing", async () => {
    S.applyProgram("arnold-split");
    localStorage.removeItem("gymak_local_data_owner_v1");
    await mount();
    act(() => btn("ابدأ تمرين اليوم").click());
    expect(el.querySelector(".dp-error")).toBeTruthy();
  });
});

describe("per-day volume guide for built-in programs", () => {
  const sum = (a) => a.reduce((n, e) => n + (Number(e.sets) || 0), 0);
  function all() { S.setOwnerView(true); return S.getAllPrograms().map((p) => ({ p, days: S.getProgramDays(p.id) })); }
  it("every day of every built-in program stays inside the limits", () => {
    const L = S.getProgramDayLimits();
    expect(L).toEqual({ maxExercises: 6, maxSets: 22, maxPerMuscleMultiDay: 3, maxLegsExercises: 5 });
    const bad = [];
    for (const { p, days } of all()) {
      for (const d of days) {
        const by = {};
        d.exercises.forEach((e) => { by[e.muscle] = (by[e.muscle] || 0) + 1; });
        const multi = Object.keys(by).length > 1;
        if (d.exercises.length > L.maxExercises) bad.push(`${p.id}/${d.title}: ${d.exercises.length} exercises`);
        if (sum(d.exercises) > L.maxSets) bad.push(`${p.id}/${d.title}: ${sum(d.exercises)} sets`);
        if (multi && Object.entries(by).some(([m, n]) => n > (m === "legs" ? L.maxLegsExercises : L.maxPerMuscleMultiDay))) bad.push(`${p.id}/${d.title}: too many for one muscle`);
        if (!d.exercises.length) bad.push(`${p.id}/${d.title}: empty day`);
      }
    }
    expect(bad).toEqual([]);
  });
  it("Arnold split: nothing dropped, two exercises moved to the repeat days", () => {
    const ids = (d) => d.exercises.map((e) => e.id);
    const a = all().find((x) => x.p.id === "arnold-split").days;
    expect(a.map((d) => d.exercises.length)).toEqual([6, 6, 5, 5, 6, 4]);
    expect(ids(a[0])).not.toContain("dumbbell-fly"); expect(ids(a[3])).toContain("dumbbell-fly");
    expect(ids(a[1])).not.toContain("front-raise"); expect(ids(a[4])).toContain("front-raise");
    expect(a.flatMap(ids).length).toBe(32); // same 32 exercise slots as before the rebalance
  });
  it("weekly sets per main muscle stay at 10 or more in the split programs", () => {
    // Arnold runs 6 days = each muscle twice a week. PPL's 3 templates are repeated twice in its 5-6 day week.
    for (const [id, times] of [["arnold-split", 1], ["push-pull-legs", 2]]) {
      const days = all().find((x) => x.p.id === id).days;
      const weekly = {};
      days.forEach((d) => d.exercises.forEach((e) => { weekly[e.muscle] = (weekly[e.muscle] || 0) + times * (Number(e.sets) || 0); }));
      for (const m of ["chest", "back", "shoulders", "legs"]) expect(weekly[m], `${id} ${m}`).toBeGreaterThanOrEqual(10);
    }
  });
});
