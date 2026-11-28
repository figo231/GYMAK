import fs from "fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WOMEN_PROGRAMS, WOMEN_TEMPLATES, WOMEN_PROGRAMS_EN } from "../src/lib/content/womenContent";
import { WOMEN_TIPS, TIPS, tipOfTheDay } from "../src/lib/content/tips";
import { ownerSectionMatches } from "../src/components/OwnerGenderSwitch.jsx";
import { getExerciseFrames } from "../src/lib/exerciseImages";
import { EN_EXTRA } from "../src/lib/i18n/enExtra";
let S;
beforeEach(async () => { localStorage.clear(); vi.resetModules(); S = (await import("../src/lib/store/gymakStore.js")).default; S.resetAllData(); S.setOwnerView(false); });
const NEW = ["w-home-full-3", "w-glute-focus-4", "w-gym-beginner-3"];
describe("owner section switch", () => {
  it("all shows both, male hides women, female shows only women", () => {
    expect(ownerSectionMatches("all", true) && ownerSectionMatches("all", false)).toBe(true);
    expect(ownerSectionMatches("male", true)).toBe(false);
    expect(ownerSectionMatches("male", false)).toBe(true);
    expect(ownerSectionMatches("female", true)).toBe(true);
    expect(ownerSectionMatches("female", false)).toBe(false);
  });
  it("owner view lists men and women programs together", () => {
    S.setGender("male"); S.setOwnerView(true);
    const l = S.getPrograms();
    expect(l.some((p) => p.only === "female")).toBe(true);
    expect(l.some((p) => p.only !== "female")).toBe(true);
    NEW.forEach((id) => expect(l.some((p) => p.id === id)).toBe(true));
  });
});
describe("new women programs", () => {
  it("exist, are female only, have English and every exercise has real bundled art", () => {
    S.setGender("female");
    for (const id of NEW) {
      const p = WOMEN_PROGRAMS.find((x) => x.id === id);
      expect(p?.only).toBe("female");
      expect(p.dayChips).toEqual(WOMEN_TEMPLATES[id].map((d) => d.title));
      expect(WOMEN_PROGRAMS_EN[id].dayChips).toHaveLength(p.dayChips.length);
      expect(S.getPrograms().some((x) => x.id === id)).toBe(true);
      for (const d of WOMEN_TEMPLATES[id]) for (const ex of d.exerciseIds) {
        const fr = getExerciseFrames(ex);
        expect(fr, `${id}:${ex} has no image`).toBeTruthy();
        fr.forEach((u) => expect(fs.existsSync("public" + u.split("?")[0]), u).toBe(true));
        expect(S.getExerciseById(ex), ex).toBeTruthy();
      }
    }
  });
  it("men never see them and can not activate them", () => {
    S.setGender("male");
    NEW.forEach((id) => { expect(S.getPrograms().some((p) => p.id === id)).toBe(false); expect(S.getProgramDays(id)).toEqual([]); });
  });
  it("a woman can apply each one and gets days with exercises", () => {
    S.setGender("female");
    for (const id of NEW) { S.applyProgram(id); const days = S.getProgramDays(id); expect(days.length).toBe(WOMEN_TEMPLATES[id].length); days.forEach((d) => expect(d.exercises.length).toBeGreaterThan(0)); }
  });
});
describe("women tips", () => {
  it("men and unset get exactly the old tip", () => {
    for (let d = 1; d <= 30; d++) { const k = `2026-11-${String(d).padStart(2, "0")}`; expect(tipOfTheDay(k)).toBe(tipOfTheDay(k, "male")); expect(TIPS).toContain(tipOfTheDay(k, "male")); }
  });
  it("women get women tips on some days and every tip has English", () => {
    const got = new Set(); for (let d = 1; d <= 30; d++) got.add(tipOfTheDay(`2026-11-${String(d).padStart(2, "0")}`, "female"));
    expect([...got].some((t) => WOMEN_TIPS.includes(t))).toBe(true);
    WOMEN_TIPS.forEach((t) => { expect(t.length).toBeGreaterThan(20); expect(EN_EXTRA[t], t).toBeTruthy(); });
  });
});
describe("new foods", () => {
  it("parse with the listed values", () => {
    const cases = [["سبانخ 100 جم", 23], ["بروكلي 100 جم", 35], ["جرجير 100 جم", 25], ["سمسم 100 جم", 573], ["كينوا 100 جم", 120]];
    for (const [txt, kcal] of cases) {
      const r = S.parseFood(txt);
      expect(r, txt).toBeTruthy();
      const item = Array.isArray(r) ? r[0] : r.items?.[0] ?? r;
      expect(Math.round(item.kcal ?? item.calories), txt).toBe(kcal);
    }
  });
});
