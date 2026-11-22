import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getExerciseFrames, getRemoteExerciseFrames, getExerciseEnglish } from "../src/lib/exerciseImages";

describe("exercise animated demos", () => {
  it("serves bundled local WebP frames for a known exercise", () => {
    expect(getExerciseFrames("bench-press-barbell")).toEqual([
      "/exercises/bench-press-barbell/0.webp",
      "/exercises/bench-press-barbell/1.webp",
    ]);
  });

  it("returns null for an unknown exercise id", () => {
    expect(getExerciseFrames("not-a-real-exercise")).toBeNull();
  });

  it("keeps the remote jsDelivr URLs available as a fallback reference", () => {
    const remote = getRemoteExerciseFrames("pushup");
    expect(remote[0]).toContain("cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@");
    expect(remote[0]).toMatch(/\/0\.jpg$/);
  });

  it("every mapped exercise has both frames committed locally", () => {
    // Read the ids straight from the source module's mapping table.
    const src = fs.readFileSync(path.resolve(__dirname, "../src/lib/exerciseImages.js"), "utf8");
    const ids = [...src.matchAll(/^\s*"([\w-]+)": "[^"]+",?$/gm)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(100);
    const missing = [];
    for (const id of ids) {
      for (const n of [0, 1]) {
        const p = path.resolve(__dirname, `../public/exercises/${id}/${n}.webp`);
        if (!fs.existsSync(p) || fs.statSync(p).size < 2000) missing.push(`${id}/${n}.webp`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("local frames stay small enough for offline bundling", () => {
    const dir = path.resolve(__dirname, "../public/exercises");
    let total = 0, files = 0;
    for (const id of fs.readdirSync(dir)) {
      for (const f of fs.readdirSync(path.join(dir, id))) {
        const size = fs.statSync(path.join(dir, id, f)).size;
        expect(size).toBeLessThan(80 * 1024); // no single frame over 80 KB
        total += size; files++;
      }
    }
    expect(files).toBeGreaterThan(200);
    expect(total).toBeLessThan(8 * 1024 * 1024); // whole library under 8 MB
  });

  it("still derives English search terms from the mapping", () => {
    expect(getExerciseEnglish("bench-press-barbell")).toContain("Barbell Bench Press");
  });
});
