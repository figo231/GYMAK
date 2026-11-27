// @vitest-environment node
import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { translateAuthError, isServerError, SIGNUP_EMAIL_ERROR } from "../src/lib/authErrors";
import { isNetworkAuthError } from "../src/lib/connectionCheck";
import { withTimeout } from "../src/lib/authLogic";
import { readFileSync } from "node:fs";
const mk = (fetch) => createClient("https://x.supabase.co", "sb_publishable_abcdefghijklmnopqrstuvwx", { global: { fetch }, auth: { persistSession: false, autoRefreshToken: false } });
const up = (c) => c.auth.signUp({ email: "a@example.com", password: "Passw0rd!!" });
const json = (status, body) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
it("HTTP 500 (SMTP unexpected_failure) is a server error, never offline, even if navigator says offline", async () => {
  const { error } = await up(mk(json(500, { code: 500, error_code: "unexpected_failure", msg: "Error sending confirmation email" })));
  expect(isServerError(error)).toBe(true);
  expect(isNetworkAuthError(error)).toBe(false);
  for (const online of [true, false]) { const m = translateAuthError(error, online); expect(m).toContain("الخادم"); expect(m).not.toContain("مفيش اتصال"); expect(m).not.toContain("للخادم. جرب تبدّل"); }
  expect(SIGNUP_EMAIL_ERROR).toContain("إيميل التأكيد");
});
it("HTTP 500 with empty body and 502/503 behave the same", async () => {
  for (const st of [500, 502, 503]) { const { error } = await up(mk(async () => new Response("", { status: st }))); expect(isServerError(error)).toBe(true); expect(translateAuthError(error, true)).not.toContain("مفيش اتصال"); }
});
it("success returns no error", async () => {
  const { error, data } = await up(mk(json(200, { id: "u1", email: "a@example.com", identities: [{ id: "i" }], app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-01-01T00:00:00Z" })));
  expect(error).toBeNull(); expect(data.user.id).toBe("u1");
});
it("fetch rejection stays a network error (unreachable server; offline flag says offline)", async () => {
  const { error } = await up(mk(async () => { throw new TypeError("Failed to fetch"); }));
  expect(isServerError(error)).toBe(false); expect(isNetworkAuthError(error)).toBe(true);
  expect(translateAuthError(error, true)).toContain("للخادم"); expect(translateAuthError(error, false)).toContain("مفيش اتصال");
});
it("4xx errors keep their own messages", async () => {
  const { error } = await up(mk(json(422, { code: 422, error_code: "weak_password", msg: "Password should be at least 8 characters" })));
  expect(isServerError(error)).toBe(false); expect(translateAuthError(error, true)).toContain("ضعيف");
  const r = await up(mk(json(429, { code: 429, error_code: "over_email_send_rate_limit", msg: "email rate limit exceeded" })));
  expect(translateAuthError(r.error, true)).toContain("حد الإرسال");
});
it("client timeout shows the slow-connection message", async () => {
  let err; try { await withTimeout(new Promise(() => {}), 20); } catch (e) { err = e; }
  expect(isServerError(err)).toBe(false); expect(translateAuthError(err, true)).toContain("بطيء");
});
it("Register screen uses the signup-specific message function for failed signups", () => {
  const s = readFileSync("src/pages/Auth/Register.jsx", "utf8"); expect(s).toContain("signupFailureMessage(res.error,res.detail)");
});
