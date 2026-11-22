import { describe, it, expect } from "vitest";
import { validateFeedback, sendFeedback } from "../src/lib/feedback";
const mk = (res) => ({ from: () => ({ insert: (row) => ({ select: () => ({ single: async () => { mk.last = row; return res; } }) }) }) });
describe("feedback", () => {
  it("validates length", () => {
    expect(validateFeedback("hi").ok).toBe(false);
    expect(validateFeedback("x".repeat(2001)).ok).toBe(false);
    expect(validateFeedback("  رسالة كويسة  ")).toEqual({ ok: true, text: "رسالة كويسة" });
  });
  it("sends trimmed text, never a user id from the client", async () => {
    const r = await sendFeedback(" مشكلة في الأكل ", { client: mk({ data: { id: "abc" }, error: null }), version: "1.0" });
    expect(r).toEqual({ ok: true, id: "abc" });
    expect(mk.last).toEqual({ message: "مشكلة في الأكل", app_version: "1.0" });
  });
  it("maps rate limit and generic errors", async () => {
    expect((await sendFeedback("رسالة طويلة كفاية", { client: mk({ data: null, error: { message: "rate_limited" } }) })).error).toContain("ساعة");
    expect((await sendFeedback("رسالة طويلة كفاية", { client: mk({ data: null, error: { message: "boom" } }) })).ok).toBe(false);
    expect((await sendFeedback("رسالة طويلة كفاية", { client: null })).ok).toBe(false);
  });
});
