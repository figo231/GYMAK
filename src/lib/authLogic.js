import { tx } from "./i18n/tx";
// Pure helpers for the sign-in screens.
export const MIN_PASSWORD = 8;
export const normalizeEmail = (e) => String(e || "").trim().toLowerCase();
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || ""));

// 0..4 plus whether it is acceptable for a NEW password (length >= MIN_PASSWORD).
export function passwordStrength(pw) {
  const p = String(pw || "");
  if (!p) return { score: 0, label: "", ok: false };
  const ok = p.length >= MIN_PASSWORD;
  if (!ok) return { score: 1, label: tx("قصير"), ok };
  let score = 2;
  if (p.length >= 12) score++;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  if (classes >= 3) score++;
  score = Math.min(4, score);
  return { score, label: ["", tx("قصير"), tx("مقبول"), tx("كويس"), tx("قوي")][score], ok };
}

// Supabase answers a sign-up for an already-registered email with a fake user
// that has no identities (when email confirmation is on). That is NOT a new account.
export function isDuplicateSignup(data) {
  const u = data && data.user;
  return !!u && Array.isArray(u.identities) && u.identities.length === 0;
}

// Reads type / error out of the URL fragment or query Supabase redirects back with.
export function parseAuthUrl(hash = "", search = "") {
  const out = {};
  [hash, search].forEach((raw) => {
    const q = new URLSearchParams(String(raw || "").replace(/^[#?]/, ""));
    if (q.get("type")) out.type = out.type || q.get("type");
    if (q.get("error_code") || q.get("error")) out.error = out.error || q.get("error_code") || q.get("error");
  });
  return out;
}

export function withTimeout(promise, ms = 15000) {
  let t;
  const timeout = new Promise((_, rej) => { t = setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "client_timeout" })), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

export const RECOVERY_KEY = "gymak_pw_recovery_v1";
export const RECOVERY_TTL_MS = 60 * 60 * 1000;
export function recoveryActive(storage, now = Date.now()) {
  try { const t = Number(storage.getItem(RECOVERY_KEY)); return t > 0 && now - t < RECOVERY_TTL_MS; } catch { return false; }
}
export function setRecovery(storage, on, now = Date.now()) {
  try { if (on) storage.setItem(RECOVERY_KEY, String(now)); else storage.removeItem(RECOVERY_KEY); } catch { /* ignore */ }
}
