import { describe, it, expect } from "vitest";
import { muscleFigureSvg, muscleFigureRegions, muscleFigureZones } from "../src/lib/muscleFigure";

describe("muscleFigureSvg", () => {
  it("renders a valid svg for both views", () => {
    for (const view of ["front", "back"]) {
      const svg = muscleFigureSvg(view, "chest");
      expect(svg).toMatch(/^<svg /);
      expect(svg).toContain("</svg>");
      expect(svg).toContain("mfGold");
    }
  });

  it("covers every muscle group the app's exercises use", () => {
    expect(muscleFigureRegions("front")).toEqual(expect.arrayContaining(["chest", "delt", "abs", "obliques", "biceps", "forearms", "quads", "calves"]));
    expect(muscleFigureRegions("back")).toEqual(expect.arrayContaining(["traps", "delt", "triceps", "lats", "lowerback", "forearms", "hams", "calves", "glutes"]));
  });

  it("maps app zones to regions", () => {
    expect(muscleFigureZones()).toEqual(expect.arrayContaining(["chest", "back", "shoulders", "arms", "core", "legs"]));
  });

  it("highlights a whole zone when given a zone key", () => {
    const svg = muscleFigureSvg("back", "legs");
    // legs zone = hams + glutes + calves -> three gold-glow groups
    expect(svg.match(/filter="url\(#mfGlow\)"/g).length).toBeGreaterThanOrEqual(3);
  });

  it("draws glutes over the shorts only when highlighted", () => {
    expect(muscleFigureSvg("back", "lats")).not.toContain('opacity="0.92"');
    expect(muscleFigureSvg("back", "glutes")).toContain('opacity="0.92"');
  });
});
