import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
it("admin cards say what they count (profiles created, opt-in activity), no misleading old labels", () => {
  const a = readFileSync("src/pages/Admin/Admin.jsx", "utf8");
  expect(a).toContain("بروفايلات اتعملت آخر 7 أيام"); expect(a).not.toContain("جدد آخر 7 أيام");
  expect(a).toContain("ده مش عدد المسجلين"); expect(a).toContain("فعّلت المشاركة");
  const en = readFileSync("src/lib/i18n/en.js", "utf8");
  expect(en).toContain("Profiles created in the last 7 days"); expect(en).toContain("Not the number of registered users");
});
it("the start-up daily-encouragement popup is no longer mounted (setting in Profile stays)", () => {
  const app = readFileSync("src/App.jsx", "utf8");
  expect(app).not.toContain("EncouragementNotice");
  expect(readFileSync("src/pages/Profile/EncouragementPreference.jsx", "utf8")).toContain("changeEncouragement");
});
it("CSV export failure is reported instead of silently ignored", () => {
  const a = readFileSync("src/pages/Auth/Account.jsx", "utf8");
  expect(a).toContain("معرفناش نجهّز ملف الـCSV"); expect(a).not.toMatch(/a\.remove\(\);\s*setTimeout\([^\n]*\n\s*\} catch \{ \/\* ignore \*\/ \}/);
  expect(readFileSync("src/lib/i18n/en.js", "utf8")).toContain("Could not prepare the CSV file");
});
