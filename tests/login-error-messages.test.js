// @vitest-environment node
import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { loginFailureMessage, LOGIN_BAD_CREDENTIALS, LOGIN_SERVER_ERROR, isUnconfirmed } from "../src/lib/authErrors";
import { isNetworkAuthError } from "../src/lib/connectionCheck";
import { readFileSync } from "node:fs";
const mk = (net) => createClient("https://x.supabase.co", "sb_publishable_abcdefghijklmnopqrstuvwx", { global: { fetch: net }, auth: { persistSession: false, autoRefreshToken: false } });
const json = (status, body) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const login = async (net, online = true) => { const { error } = await mk(net).auth.signInWithPassword({ email: "a@example.com", password: "Passw0rd!!" }); return { error, msg: loginFailureMessage(error, online) }; };
it("wrong password / unknown email (invalid_credentials, 400) -> email-or-password message that points to sign-up", async () => {
  const r = await login(json(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" }));
  expect(r.msg).toBe(LOGIN_BAD_CREDENTIALS); expect(r.msg).toContain("الإيميل أو الباسورد"); expect(r.msg).not.toContain("مفيش اتصال");
});
it("email not confirmed -> confirm message and the resend button flag", async () => {
  const r = await login(json(400, { code: 400, error_code: "email_not_confirmed", msg: "Email not confirmed" }));
  expect(r.msg).toContain("تأكد إيميلك"); expect(isUnconfirmed(r.error)).toBe(true);
});
it("429 rate limit -> wait message", async () => {
  const r = await login(json(429, { code: 429, error_code: "over_request_rate_limit", msg: "Request rate limit reached" })); expect(r.msg).toContain("محاولات كتير");
});
it("banned user -> own message", async () => {
  const r = await login(json(400, { code: 400, error_code: "user_banned", msg: "User is banned" })); expect(r.msg).toContain("موقوف");
});
it("5xx (500/502/503, empty or JSON body) -> server message, never offline", async () => {
  for (const net of [async () => new Response("", { status: 500 }), json(502, {}), json(503, { msg: "x" })]) {
    const r = await login(net); expect(r.msg).toBe(LOGIN_SERVER_ERROR); expect(r.msg).not.toContain("مفيش اتصال"); expect(isNetworkAuthError(r.error)).toBe(false);
  }
});
it("real offline keeps the no-internet text (flag offline) and the server-unreachable text (flag online)", async () => {
  const net = async () => { throw new TypeError("Failed to fetch"); };
  expect((await login(net, false)).msg).toContain("مفيش اتصال"); expect((await login(net, true)).msg).toContain("للخادم");
});
it("Login page uses loginFailureMessage", () => { expect(readFileSync("src/pages/Auth/Login.jsx", "utf8")).toContain("setError(loginFailureMessage(res.error))"); });
