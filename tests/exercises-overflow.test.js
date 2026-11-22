// Regression: Exercises toolbar chips overflowed the 390px mobile viewport
// because .ex-toolbar was display:flex with no wrapping, so long chip rows
// extended leftward in RTL and pushed document scrollWidth past the viewport,
// shifting the whole app and clipping the right column.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/styles/global.css"), "utf8");

describe("exercises toolbar overflow regression", () => {
  it(".ex-toolbar wraps so chips never overflow narrow viewports", () => {
    const rule = css.match(/\.ex-toolbar\s*\{[^}]*\}/);
    expect(rule, ".ex-toolbar rule should exist in global.css").toBeTruthy();
    expect(rule[0]).toContain("flex-wrap: wrap");
  });
});
