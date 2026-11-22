import { describe, it, expect } from "vitest";
import { FAQ } from "../src/lib/faq";
describe("faq", () => { it("has unique questions with answers", () => { expect(FAQ.length).toBeGreaterThanOrEqual(8); expect(new Set(FAQ.map((f) => f.q)).size).toBe(FAQ.length); for (const f of FAQ) expect(f.q && f.a).toBeTruthy(); }); });
