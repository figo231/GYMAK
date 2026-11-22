import { describe, it, expect } from "vitest";
import { TERMS_VERSION, REPORT_REASONS, validateReportDetails, moderationError, reportContent } from "../src/lib/moderation";
import { CHAT_TERMS_VERSION, chatError } from "../src/lib/privateChat";

describe("moderation client", () => {
  it("keeps the ToU version in sync with the chat consent version", () => {
    expect(TERMS_VERSION).toBe(CHAT_TERMS_VERSION);
    expect(TERMS_VERSION).toMatch(/^2026-11-23-tou-v1$/);
  });
  it("validates optional report details", () => {
    expect(validateReportDetails("")).toEqual({ ok: true, details: null });
    expect(validateReportDetails("  شوية تفاصيل  ")).toEqual({ ok: true, details: "شوية تفاصيل" });
    expect(validateReportDetails("x".repeat(1001)).ok).toBe(false);
  });
  it("rejects unknown reasons before any network call", async () => {
    await expect(reportContent({ targetType: "chat_user", reason: "nope", targetUserId: "x" }, {})).rejects.toThrow(/invalid_reason/);
    await expect(reportContent({ targetType: "chat_user", reason: REPORT_REASONS[0][0], details: "x".repeat(1001) }, {})).rejects.toThrow(/طويلة/);
  });
  it("maps server errors to Arabic user-facing messages", () => {
    expect(moderationError(new Error("report_rate_limited"))).toContain("بلاغات كتير");
    expect(moderationError(new Error("report_duplicate"))).toContain("قبل كده");
    expect(moderationError(new Error("report_self"))).toContain("نفسك");
    expect(moderationError(new Error("owner_only"))).toContain("المالك");
    expect(moderationError(new Error("consent_required"))).toContain("شروط الاستخدام");
    expect(moderationError({ code: "PGRST205", message: "Could not find the function public.moderation_report" })).toContain("مش مفعلين");
    expect(moderationError(new Error("something else"))).toContain("معرفناش");
  });
  it("maps blocked conversations in the chat error mapper", () => {
    expect(chatError(new Error("chat_blocked"))).toContain("حظر");
  });
});
