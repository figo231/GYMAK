// Optional 4-digit app lock. A convenience lock for shared phones: the PIN is
// salted + hashed, but app data itself is not encrypted on the device.
const KEY = "gymak_lock_v1";
export const GRACE_MS = 60000;
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const read = (st) => { try { return JSON.parse(st.getItem(KEY) || "null"); } catch { return null; } };

export const validPin = (pin) => /^\d{4}$/.test(String(pin));
export const isLockEnabled = (st = localStorage) => !!read(st)?.hash;
export const shouldRelock = (hiddenAt, now = Date.now(), grace = GRACE_MS) => !!hiddenAt && now - hiddenAt > grace;

async function hashPin(pin, salt) {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", enc.encode(`${salt}:${pin}`));
  return hex(buf);
}
function newSalt() { return hex(globalThis.crypto.getRandomValues(new Uint8Array(16))); }

export async function setPin(pin, st = localStorage) {
  if (!validPin(pin)) return false;
  const salt = newSalt();
  st.setItem(KEY, JSON.stringify({ salt, hash: await hashPin(pin, salt), fails: 0, until: 0 }));
  return true;
}
export function clearPin(st = localStorage) { st.removeItem(KEY); }

// -> { ok, waitMs }. Five wrong tries lock input for 30s, doubling each further five (max 10 min).
export async function verifyPin(pin, st = localStorage, now = Date.now()) {
  const rec = read(st);
  if (!rec) return { ok: true, waitMs: 0 };
  if (rec.until > now) return { ok: false, waitMs: rec.until - now };
  if (validPin(pin) && (await hashPin(pin, rec.salt)) === rec.hash) {
    st.setItem(KEY, JSON.stringify({ ...rec, fails: 0, until: 0 }));
    return { ok: true, waitMs: 0 };
  }
  const fails = (rec.fails || 0) + 1;
  let until = 0;
  if (fails % 5 === 0) until = now + Math.min(600000, 30000 * 2 ** (fails / 5 - 1));
  st.setItem(KEY, JSON.stringify({ ...rec, fails, until }));
  return { ok: false, waitMs: until ? until - now : 0 };
}
