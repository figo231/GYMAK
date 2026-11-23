import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../public/landing.html"), "utf8");

describe("landing mobile layout", () => {
  it("allows the mobile grid to shrink and sizes the collage within its track", () => {
    const mobile = html.slice(html.indexOf("@media(max-width:800px)"));
    expect(mobile).toContain("grid-template-columns:minmax(0,1fr)");
    expect(mobile).toContain(".hero>*,.big>*{min-width:0}");
    expect(mobile).toMatch(/\.phones\{[^}]*width:100%/);
    expect(mobile).toMatch(/\.phones\{[^}]*overflow:hidden/);
  });
  it("keeps both download buttons on the stable latest APK link", () => {
    expect(html.match(/href="\/download\/GYMAK.apk"/g)).toHaveLength(2);
  });
});
