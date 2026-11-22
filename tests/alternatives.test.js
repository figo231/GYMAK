import { describe, expect, it } from "vitest";
import { findAlternatives, equipmentOptions } from "../src/lib/alternatives";
const mk = (id, muscle, equipment, secondary = "", name = id) => ({ id, muscle, equipment, secondary, name });
describe("alternatives", () => {
  const all = [mk("a", "chest", "بار", "ترايسبس"), mk("b", "chest", "دمبل", "ترايسبس"), mk("c", "chest", "وزن الجسم", "ترايسبس"), mk("d", "legs", "بار"), mk("e", "chest", "بار", "ترايسبس")];
  it("same muscle only, never itself, prefers different equipment", () => {
    const r = findAlternatives(all[0], all).map((x) => x.id);
    expect(r).not.toContain("a"); expect(r).not.toContain("d");
    expect(r.slice(0, 2).sort()).toEqual(["b", "c"]);
  });
  it("handles missing input and lists equipment by accessibility", () => {
    expect(findAlternatives(null, all)).toEqual([]);
    expect(equipmentOptions(all)).toEqual(["وزن الجسم", "دمبل", "بار"]);
  });
  it("respects the limit", () => { expect(findAlternatives(all[0], all, { limit: 1 })).toHaveLength(1); });
});
