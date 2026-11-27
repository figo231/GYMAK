// @vitest-environment node
import { it, expect, beforeEach } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { signupFailureMessage, SIGNUP_USERNAME_TAKEN, SIGNUP_EMAIL_ERROR, SIGNUP_SERVER_ERROR } from "../src/lib/authErrors";
import { withAuthFailureCapture, takeSignupFailure, clearSignupFailure } from "../src/lib/authFailureProbe";
import { readFileSync } from "node:fs";
const SIGNUP = "https://x.supabase.co/auth/v1/signup";
// Same wiring as the app: supabase-js -> capture wrapper -> (mock) network.
const mk = (net) => createClient("https://x.supabase.co", "sb_publishable_abcdefghijklmnopqrstuvwx", { global: { fetch: withAuthFailureCapture(net) }, auth: { persistSession: false, autoRefreshToken: false } });
const json = (status, body) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
async function run(net, online = true) {
  clearSignupFailure();
  const { error } = await mk(net).auth.signUp({ email: "a@example.com", password: "Passw0rd!!" });
  const detail = error ? takeSignupFailure() : null;
  return { error, detail, msg: signupFailureMessage(error, detail, online) };
}
beforeEach(() => clearSignupFailure());
it("500 Database error saving new user -> username taken message (NOT no-internet, NOT email)", async () => {
  const r = await run(json(500, { code: 500, error_code: "unexpected_failure", msg: "Database error saving new user" }));
  expect(r.error.message).toBe("{}"); // proves supabase-js lost the body, the probe recovered it
  expect(r.detail).toEqual({ status: 500, code: "unexpected_failure", msg: "Database error saving new user" });
  expect(r.msg).toBe(SIGNUP_USERNAME_TAKEN); expect(r.msg).toContain("اسم المستخدم"); expect(r.msg).not.toContain("مفيش اتصال"); expect(r.msg).not.toContain("إيميل");
});
it("500 Error sending confirmation email -> email sending message", async () => {
  const r = await run(json(500, { code: 500, error_code: "unexpected_failure", msg: "Error sending confirmation email" }));
  expect(r.msg).toBe(SIGNUP_EMAIL_ERROR); expect(r.msg).toContain("إيميل التأكيد");
});
it("500 with empty or unreadable body -> neutral server message, never offline, never blames email", async () => {
  for (const net of [async () => new Response("", { status: 500 }), async () => new Response("<html>oops</html>", { status: 502 }), json(503, {})]) {
    const r = await run(net); expect(r.msg).toBe(SIGNUP_SERVER_ERROR); expect(r.msg).not.toContain("مفيش اتصال"); expect(r.msg).not.toContain("إيميل التأكيد");
  }
});
it("422 already registered (email_exists / user_already_exists) -> already-registered message", async () => {
  for (const c of ["email_exists", "user_already_exists"]) { const r = await run(json(422, { code: 422, error_code: c, msg: "User already registered" })); expect(r.msg).toContain("مسجل قبل كده"); }
  const r2 = await run(json(422, { code: 422, error_code: "email_exists", msg: "" })); expect(r2.msg).toContain("مسجل قبل كده");
});
it("invalid email (400/422) -> invalid email message", async () => {
  const a = await run(json(400, { code: 400, error_code: "email_address_invalid", msg: 'Email address "a@b" is invalid' })); expect(a.msg).toContain("صيغة الإيميل");
  const b = await run(json(422, { code: 422, error_code: "validation_failed", msg: "Unable to validate email address: invalid format" })); expect(b.msg).toContain("صيغة الإيميل");
  expect(a.detail.msg).not.toContain("a@b"); // the probe never keeps the user's email
});
it("weak password -> password message", async () => {
  const r = await run(json(422, { code: 422, error_code: "weak_password", msg: "Password should be at least 8 characters", weak_password: { reasons: ["length"] } })); expect(r.msg).toContain("ضعيف");
});
it("429 rate limits keep their own accurate messages", async () => {
  const mail = await run(json(429, { code: 429, error_code: "over_email_send_rate_limit", msg: "email rate limit exceeded" })); expect(mail.msg).toContain("حد الإرسال");
  const req = await run(json(429, { code: 429, error_code: "over_request_rate_limit", msg: "Request rate limit reached" })); expect(req.msg).toContain("محاولات كتير");
});
it("real offline (fetch throws) keeps the no-internet texts", async () => {
  const net = async () => { throw new TypeError("Failed to fetch"); };
  const off = await run(net, false); expect(off.msg).toContain("مفيش اتصال");
  const on = await run(net, true); expect(on.msg).toContain("للخادم");
  expect(off.detail).toBeNull();
});
it("the probe does not touch the response, other URLs, or successful signups", async () => {
  let body;
  const wrapped = withAuthFailureCapture(json(500, { error_code: "unexpected_failure", msg: "Database error saving new user" }));
  const res = await wrapped(SIGNUP, { method: "POST" }); body = await res.json(); expect(res.status).toBe(500); expect(body.msg).toContain("Database");
  expect(takeSignupFailure().status).toBe(500); expect(takeSignupFailure()).toBeNull(); // cleared after take
  await withAuthFailureCapture(json(500, { msg: "x" }))("https://x.supabase.co/rest/v1/profiles", {}); expect(takeSignupFailure()).toBeNull();
  await withAuthFailureCapture(json(200, {}))(SIGNUP, {}); expect(takeSignupFailure()).toBeNull();
});
it("app wiring: client uses the probe, signUp clears and returns detail, Register uses the signup message", () => {
  expect(readFileSync("src/lib/supabaseClient.js", "utf8")).toContain("withAuthFailureCapture(trainingFetch)");
  const a = readFileSync("src/hooks/useAuth.jsx", "utf8"); expect(a).toContain("clearSignupFailure()"); expect(a).toContain("takeSignupFailure()");
  expect(readFileSync("src/pages/Auth/Register.jsx", "utf8")).toContain("signupFailureMessage(res.error,res.detail)");
});
