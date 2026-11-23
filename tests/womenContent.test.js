import { beforeEach, describe, expect, it, vi } from "vitest";
import { WOMEN_EXERCISES, WOMEN_PROGRAMS, WOMEN_TEMPLATES, WOMEN_EXERCISES_EN, WOMEN_PROGRAMS_EN } from "../src/lib/content/womenContent";
import { pickExerciseOfTheDay } from "../src/lib/exerciseMeta";
let S;
beforeEach(async () => {
  localStorage.clear(); vi.resetModules();
  S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData();
});
const wIds = WOMEN_EXERCISES.map((e) => e.id);
describe("women content integrity", () => {
  it("every program template id resolves to a real exercise", () => {
    S.setGender("female");
    const all = new Set(S.getExercises().map((e) => e.id));
    for (const [pid, days] of Object.entries(WOMEN_TEMPLATES)) {
      expect(WOMEN_PROGRAMS.some((p) => p.id === pid)).toBe(true);
      days.forEach((d) => d.exerciseIds.forEach((id) => expect(all.has(id), `${pid}:${id}`).toBe(true)));
    }
  });
  it("chips match template day titles and have English", () => {
    WOMEN_PROGRAMS.forEach((p) => {
      expect(p.dayChips).toEqual(WOMEN_TEMPLATES[p.id].map((d) => d.title));
      expect(WOMEN_PROGRAMS_EN[p.id].dayChips).toHaveLength(p.dayChips.length);
    });
    wIds.forEach((id) => expect(WOMEN_EXERCISES_EN[id]).toBeTruthy());
  });
});
describe("gender visibility", () => {
  it("female sees women exercises and programs", () => {
    S.setGender("female");
    const ids = new Set(S.getExercises().map((e) => e.id));
    wIds.forEach((id) => expect(ids.has(id)).toBe(true));
    WOMEN_PROGRAMS.forEach((p) => expect(S.getPrograms().some((x) => x.id === p.id)).toBe(true));
  });
  it("male and unknown do not", () => {
    for (const g of ["male", null]) {
      S.setGender(g);
      const ids = new Set(S.getExercises().map((e) => e.id));
      wIds.forEach((id) => expect(ids.has(id)).toBe(false));
      WOMEN_PROGRAMS.forEach((p) => expect(S.getPrograms().some((x) => x.id === p.id)).toBe(false));
      expect(S.getExerciseById("donkey-kicks")).toBeNull();
    }
  });
  it("switching gender keeps data and re-shows content", () => {
    S.setGender("female");
    S.applyProgram("w-home-glutes");
    S.logSet("donkey-kicks", 0, 3, 15);
    S.setGender("male");
    expect(S.getExerciseLogs("donkey-kicks")).toHaveLength(1);
    expect(S.getExerciseById("donkey-kicks")).toBeNull(); // logs stay, discovery is filtered
    expect(S.getExerciseById("frog-pump")).toBeNull();
    S.setGender("female");
    expect(S.getExerciseById("frog-pump")).toBeTruthy();
  });
  it("applying a women program builds its days", () => {
    S.setGender("female");
    S.applyProgram("w-tone-body");
    const days = S.getProgramDays("w-tone-body");
    expect(days).toHaveLength(4);
    days.forEach((d) => expect(d.exercises.length).toBeGreaterThan(0));
  });
  it("recommended program follows gender and goal mode", () => {
    S.setGender("female");
    expect(S.getRecommendedProgramId()).toBe("glutes-tone");
    S.setGoalMode("glutes");
    expect(S.getRecommendedProgramId()).toBe("w-gym-glutes");
    S.setGender("male");
    expect(S.getRecommendedProgramId()).toBe("push-pull-legs");
  });
  it("internal catalog keeps every program", () => {
    S.setGender("male");
    expect(S.getAllPrograms().some((p) => p.id === "w-home-glutes")).toBe(true);
  });
  it("daily suggestion leads with women-only moves for women", () => {
    S.setGender("female");
    const r = pickExerciseOfTheDay({ dateISO: "2026-11-24", programDays: null, exercises: S.getExercises() });
    expect(r.exercises.length).toBeGreaterThan(0);
    for (let d=1;d<=28;d++) {
      const dateISO=`2026-11-${String(d).padStart(2,"0")}`;
      S.setGender("male");
      const male=pickExerciseOfTheDay({ dateISO, programDays: null, exercises:S.getExercises() });
      expect(male.exercises.every(e=>e.only!=="female")).toBe(true);
    }
  });
});
describe("owner view", () => {
  it("owner sees women content whatever the gender, others unaffected after turning off", () => {
    S.setGender("male");
    expect(S.getExerciseById("donkey-kicks")).toBeNull();
    S.setOwnerView(true);
    expect(S.isOwnerView()).toBe(true);
    expect(S.getExerciseById("donkey-kicks")).toBeTruthy();
    expect(S.getPrograms().some((p) => p.id === "w-home-glutes")).toBe(true);
    expect(S.canSeeWomenContent()).toBe(true);
    S.setOwnerView(false);
    expect(S.getExerciseById("donkey-kicks")).toBeNull();
    expect(S.getPrograms().some((p) => p.id === "w-home-glutes")).toBe(false);
    expect(S.canSeeWomenContent()).toBe(false);
  });
  it("notifies listeners so open screens refresh", () => {
    let n = 0; S.onChange(() => { n++; });
    S.setOwnerView(true); S.setOwnerView(true); S.setOwnerView(false);
    expect(n).toBe(2);
  });
});

describe("gym content and access guards", () => {
 it("tags every female exercise and includes five gym moves", () => {
  expect(WOMEN_EXERCISES.filter(e => e.venue === "gym")).toHaveLength(5);
  expect(WOMEN_EXERCISES.every(e => ["home","gym"].includes(e.venue))).toBe(true);
 });
 it("rejects hidden programs without changing the current program", () => {
  S.setGender("male"); S.applyProgram("full-body");
  expect(S.applyProgram("w-gym-glutes")).toBeNull();
  expect(S.getActiveProgram().id).toBe("full-body");
  expect(S.getProgramDays("w-gym-glutes")).toEqual([]);
  expect(S.getProgramExerciseIds("w-gym-glutes").size).toBe(0);
 });
 it("keeps custom edits, logs and deletion tombstones on reload", async () => {
  S.setGender("female");
  S.logSet("bench-press-barbell", 25, 3, 8);
  const st=S.get(); st.exercises.find(e=>e.id==="bench-press-barbell").name="My edited bench";
  st.deletedExerciseIds=["frog-pump"]; st.exercises=st.exercises.filter(e=>e.id!=="frog-pump");
  localStorage.setItem("gymak_state_v1", JSON.stringify(st));
  vi.resetModules(); const T=(await import("../src/lib/store/gymakStore.js")).default;
  expect(T.getExerciseById("bench-press-barbell").name).toBe("My edited bench");
  expect(T.getExerciseLogs("bench-press-barbell")).toHaveLength(1);
  expect(T.getExerciseById("frog-pump")).toBeNull();
  expect(T.getExerciseById("w-hip-abductor")).toBeTruthy();
 });
});

describe("original female illustrations", () => {
 it("all 18 exercises have original two-frame demos", async () => {
  const {getExerciseFrames}=await import("../src/lib/exerciseImages");
  const fs=await import("node:fs");
  for (const ex of WOMEN_EXERCISES) {
   const frames=getExerciseFrames(ex.id);
   expect(frames).toHaveLength(2);
   for (const f of frames) expect(fs.existsSync(`public${f}`)).toBe(true);
  }
 });
});
