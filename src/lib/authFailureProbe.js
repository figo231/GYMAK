// supabase-js throws away the body of a 5xx auth answer (the message becomes "{}").
// This wrapper reads a COPY of a failed signup answer and keeps only its short error code and message,
// so the signup screen can tell "database/username" from "email sending" from "unknown".
// It never changes the response, never reads other requests, and keeps nothing after takeSignupFailure().
let last = null;
const isSignup = (input) => {
  const u = typeof input === "string" ? input : input && (input.url || String(input));
  return /\/auth\/v1\/signup(\?|$)/.test(u || "");
};
const clean = (v, n) => (typeof v === "string" ? v.replace(/"[^"]*"/g, '"..."').slice(0, n) : "");
export function withAuthFailureCapture(baseFetch) {
  return async function captureFetch(input, init) {
    const res = await baseFetch(input, init);
    try {
      if (!res.ok && isSignup(input)) {
        let code = "", msg = "";
        try { const b = JSON.parse(await res.clone().text()); code = clean(b.error_code || b.code, 60); msg = clean(b.msg || b.message || b.error_description || b.error, 120); } catch { /* body is not JSON: keep nothing */ }
        last = { status: res.status, code: String(code), msg };
      }
    } catch { /* never break the request */ }
    return res;
  };
}
export function clearSignupFailure() { last = null; }
export function takeSignupFailure() { const v = last; last = null; return v; }
