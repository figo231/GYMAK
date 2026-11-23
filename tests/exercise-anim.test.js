import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getExerciseFrames, getExerciseEnglish } from "../src/lib/exerciseImages";

describe("exercise animated demos", () => {
  it("serves bundled local WebP frames for a known exercise", () => {
    expect(getExerciseFrames("bench-press-barbell")).toEqual([
      "/exercises/bench-press-barbell/0.webp",
      "/exercises/bench-press-barbell/1.webp",
    ]);
  });

  it("hides the incorrect bundled floor-bridge demo without losing search aliases", () => {
    expect(getExerciseFrames("glute-bridge")).toBeNull();
    expect(getExerciseFrames("hip-thrust")).not.toBeNull();
    expect(getExerciseEnglish("glute-bridge")).toBe("Barbell Glute Bridge");
  });

  it("returns null for an unknown exercise id", () => {
    expect(getExerciseFrames("not-a-real-exercise")).toBeNull();
  });

  it("does not retain the uncertain-license photo source or downloader", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../src/lib/exerciseImages.js"), "utf8");
    expect(source).not.toContain("cdn.jsdelivr.net");
    expect(source).not.toContain("getRemoteExerciseFrames");
    expect(fs.existsSync(path.resolve(__dirname, "../scripts/generate-exercise-frames.sh"))).toBe(false);
  });

  it("records reviewed generated art for every built-in men's exercise", () => {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../scripts/men-art-manifest.json"), "utf8"));
    expect(manifest.complete).toBe(true);
    expect(manifest.external_stock_used).toBe(false);
    expect(manifest.records).toHaveLength(130);
    expect(new Set(manifest.records.map(r => r.id)).size).toBe(130);
    for (const record of manifest.records) {
      expect(record.frames).toBe(2);
      expect(record.source_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(record.type).toBe("AI-generated illustration");
    }
  });

  it("uses no muscle drawing as library thumbnail fallback", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../src/pages/Exercises/ExerciseThumb.jsx"), "utf8");
    expect(source).not.toContain("MuscleIllustration");
    expect(source).toContain("ex-thumb-placeholder");
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
