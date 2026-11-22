import { beforeEach, describe, expect, it, vi } from "vitest";
let S;
beforeEach(async () => { localStorage.clear(); vi.resetModules(); S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData(); });
const g = (t) => S.parseFood(t).map((i) => [i.name, i.grams]);
describe("parseFood quantities", () => {
  it("number before a piece food", () => { expect(g("٢ بيض")).toEqual([["بيض", 100]]); });
  it("number and unit before a prefixed word", () => { expect(g("200 جم أرز").map((x) => x[1])).toEqual([200]); expect(g("150 جم بالرز")[0][1]).toBe(150); });
  it("quantity after the food", () => { expect(g("رز 200 جم")).toEqual([["رز", 200]]); expect(g("بيض 3")).toEqual([["بيض", 150]]); });
  it("bread without بلدي", () => { expect(g("رغيف عيش")).toEqual([["رغيف عيش", 90]]); expect(g("2 رغيف عيش")[0][1]).toBe(180); });
  it("baladi and fino still win over generic bread", () => { expect(g("عيش فينو")[0][1]).toBe(70); expect(g("عيش بلدي")[0][1]).toBe(90); });
  it("several foods keep their own quantities", () => { expect(g("200 جم رز و 3 بيض").sort()).toEqual([["بيض", 150], ["رز", 200]]); });
});
