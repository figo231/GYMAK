import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { recoverFailureMessage, RECOVER_SEND_FAILED, translateAuthError } from "../src/lib/authErrors";
it("password reset: a server failure or email-send failure says the email could not be sent", () => {
  for (const e of [{ status: 500, message: "x" }, { status: 500, code: "unexpected_failure", message: "Error sending recovery email" }, { status: 429, code: "over_email_send_rate_limit", message: "email rate limit exceeded" }]) expect(recoverFailureMessage(e, true)).toBe(RECOVER_SEND_FAILED);
  expect(RECOVER_SEND_FAILED).toContain("إيميل");
});
it("password reset: other failures keep their normal wording (offline stays offline)", () => {
  const off = new TypeError("Failed to fetch");
  expect(recoverFailureMessage(off, false)).toBe(translateAuthError(off, false));
  expect(recoverFailureMessage(null)).toBe("");
});
it("sign-in and sign-up pages no longer append connection diagnostics, and forgot-password uses the new message", () => {
  for (const f of ["Login", "Register"]) { const s = readFileSync(`src/pages/Auth/${f}.jsx`, "utf8"); expect(s).not.toMatch(/checkConnection|chk:/); }
  expect(readFileSync("src/pages/Auth/ForgotPassword.jsx", "utf8")).toContain("recoverFailureMessage(res.error)");
});
