import { beforeEach, describe, expect, it, vi } from "vitest";
let S;
beforeEach(async () => { localStorage.clear(); vi.resetModules(); S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData(); });
describe("programs", () => {
  it("applies, stops and restores a program", () => {
    const id = S.getPrograms()[0].id;
    expect(S.getActiveProgram()).toBe(null);
    S.applyProgram(id);
    expect(S.getActiveProgram().id).toBe(id);
    expect(S.stopProgram()).toBe(id);
    expect(S.getActiveProgram()).toBe(null);
    expect(S.stopProgram()).toBe(null);
    S.applyProgram(id);
    expect(S.getActiveProgram().id).toBe(id);
  });
  it("switching programs keeps logs", () => {
    const [a, b] = S.getPrograms();
    S.applyProgram(a.id);
    S.logSet("bench-press-barbell", 60, 3, 8);
    S.applyProgram(b.id);
    expect(S.getActiveProgram().id).toBe(b.id);
    expect(S.getExerciseLogs("bench-press-barbell")).toHaveLength(1);
  });
});
