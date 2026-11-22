import { describe, expect, it } from "vitest";
import { normalizeEmail, validEmail, passwordStrength, isDuplicateSignup, parseAuthUrl, withTimeout, recoveryActive, setRecovery, MIN_PASSWORD } from "../src/lib/authLogic";
import { translateAuthError, isUnconfirmed } from "../src/lib/authErrors";

const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };

describe("auth logic", () => {
  it("normalizes and validates email", () => {
    expect(normalizeEmail("  Kareem@Example.COM \n")).toBe("kareem@example.com");
    expect(validEmail("a@b.co")).toBe(true);
    ["", "a", "a@b", "a b@c.com", "a@b.c"].forEach((x) => expect(validEmail(x)).toBe(false));
  });
  it("password strength", () => {
    expect(passwordStrength("").score).toBe(0);
    expect(passwordStrength("abc12")).toMatchObject({ ok: false, score: 1 });
    expect(passwordStrength("a".repeat(MIN_PASSWORD)).ok).toBe(true);
    expect(passwordStrength("Abcdefg1!xyz").score).toBe(4);
    expect(passwordStrength("abcdefgh1").score).toBeLessThan(4);
  });
  it("detects Supabase's fake duplicate sign-up", () => {
    expect(isDuplicateSignup({ user: { identities: [] } })).toBe(true);
    expect(isDuplicateSignup({ user: { identities: [{ id: 1 }] } })).toBe(false);
    expect(isDuplicateSignup({ user: null })).toBe(false);
    expect(isDuplicateSignup(null)).toBe(false);
  });
  it("parses recovery and error links", () => {
    expect(parseAuthUrl("#access_token=x&type=recovery", "").type).toBe("recovery");
    expect(parseAuthUrl("#error=access_denied&error_code=otp_expired&error_description=x", "").error).toBe("otp_expired");
    expect(parseAuthUrl("", "?type=recovery").type).toBe("recovery");
    expect(parseAuthUrl("", "")).toEqual({});
  });
  it("times out", async () => {
    await expect(withTimeout(new Promise(() => {}), 20)).rejects.toMatchObject({ code: "client_timeout" });
    await expect(withTimeout(Promise.resolve(5), 20)).resolves.toBe(5);
  });
  it("recovery flag survives a reload and expires after an hour", () => {
    const s = mem();
    expect(recoveryActive(s)).toBe(false);
    setRecovery(s, true, 1000);
    expect(recoveryActive(s, 2000)).toBe(true);
    expect(recoveryActive(s, 1000 + 61 * 60 * 1000)).toBe(false);
    setRecovery(s, false);
    expect(recoveryActive(s, 2000)).toBe(false);
  });
});

describe("auth errors never leak English", () => {
  const ar = /[\u0600-\u06FF]/;
  const cases = [
    { message: "Invalid login credentials" }, { message: "Failed to fetch" }, { message: "Load failed" },
    { message: "For security purposes, you can only request this after 52 seconds." },
    { message: "New password should be different from the old password." },
    { message: "Auth session missing!" }, { message: "Signups not allowed for this instance" },
    { message: "Email link is invalid or has expired" }, { code: "weak_password", message: "Password should be at least 6 characters." },
    { message: "email rate limit exceeded" }, { message: "Something totally unexpected" }, { message: "timeout", code: "client_timeout" },
    { name: "AuthRetryableFetchError", message: "x" },
  ];
  it("every message is Arabic", () => cases.forEach((c) => expect(translateAuthError(c, true)).toMatch(ar)));
  it("offline wins", () => expect(translateAuthError({ message: "Invalid login credentials" }, false)).toContain("الإنترنت"));
  it("maps specifics", () => {
    expect(translateAuthError({ message: "Invalid login credentials" }, true)).toContain("غلط");
    expect(translateAuthError({ message: "Something totally unexpected" }, true)).toBe("حصلت مشكلة. جرب تاني بعد شوية.");
    expect(isUnconfirmed({ code: "email_not_confirmed", message: "x" })).toBe(true);
    expect(isUnconfirmed({ message: "Email not confirmed" })).toBe(true);
    expect(isUnconfirmed({ message: "nope" })).toBe(false);
  });
});
