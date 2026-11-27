import {validSavedState} from "./savedStateShape";
import { tx } from "./i18n/tx";
import { localISO } from "./dateKey";
// Local automatic backups of the app data. Snapshots live in IndexedDB (own database, separate from photos).
// Pure helpers are exported for tests; the IndexedDB parts are small and guarded.
export const STATE_KEY = "gymak_state_v1";
export const KEEP = 5;
export const MIN_GAP_MS = 20 * 3600 * 1000; // at most about one automatic snapshot a day
const DB = "gymak-backups", STORE = "snaps";

export function summarize(text) {
  try {
    const s = JSON.parse(text);
    return {
      workoutDays: Array.isArray(s.workoutDays) ? s.workoutDays.length : 0,
      weights: Array.isArray(s.weightLogs) ? s.weightLogs.length : 0,
      foodDays: Array.isArray(s.foodLog) ? s.foodLog.length : 0,
    };
  } catch { return null; }
}
export function isMeaningful(sum) { return !!sum && (sum.workoutDays + sum.weights + sum.foodDays) > 0; }

export function validateBackup(text) {
  if (typeof text !== "string" || text.length < 2 || text.length > 20 * 1024 * 1024) return { ok: false, error: tx("الملف مش صالح.") };
  let s;
  try { s = JSON.parse(text); } catch { return { ok: false, error: tx("الملف مش نسخة GYMAK صالحة.") }; }
  if (!s || typeof s !== "object" || Array.isArray(s)) return { ok: false, error: tx("الملف مش نسخة GYMAK صالحة.") };
  if (!validSavedState(s,{requireCore:true})) return { ok: false, error: tx("الملف مش نسخة GYMAK صالحة.") };
  return { ok: true, summary: summarize(text) };
}
export function shouldSnapshot(lastTs, now = Date.now()) { return !lastTs || now - lastTs >= MIN_GAP_MS; }
export function prune(list, keep = KEEP) {
  const manual = list.filter((x) => x.kind !== "auto");
  const auto = list.filter((x) => x.kind === "auto").sort((a, b) => b.ts - a.ts).slice(0, keep);
  return [...manual.sort((a, b) => b.ts - a.ts).slice(0, keep), ...auto].sort((a, b) => b.ts - a.ts);
}

const committed=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error("backup_write_failed"));tx.onabort=()=>reject(tx.error||Error("backup_write_aborted"));});

function open() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") return rej(new Error("no-idb"));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export async function listSnapshots() {
  try {
    const db = await open();
    const all = await wrap(db.transaction(STORE).objectStore(STORE).getAll());
    db.close();
    return all.sort((a, b) => b.ts - a.ts);
  } catch { return []; }
}
export async function createSnapshot(kind = "auto") {
  const text = localStorage.getItem(STATE_KEY);
  const sum = text ? summarize(text) : null;
  if (!text || !isMeaningful(sum)) return null;
  try {
    const db = await open();
    const snap = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), kind, text, summary: sum };
    const write=db.transaction(STORE,"readwrite"),done=committed(write);write.objectStore(STORE).put(snap);await done;
    const all = await wrap(db.transaction(STORE).objectStore(STORE).getAll());
    const keepIds = new Set(prune(all).map((x) => x.id));
    const tx = db.transaction(STORE, "readwrite");
    all.filter((x) => !keepIds.has(x.id)).forEach((x) => tx.objectStore(STORE).delete(x.id));
    await committed(tx);
    db.close();
    return snap;
  } catch { return null; }
}
export async function autoSnapshotIfDue() {
  const list = await listSnapshots();
  const lastAuto = list.find((x) => x.kind === "auto");
  if (shouldSnapshot(lastAuto && lastAuto.ts)) return createSnapshot("auto");
  return null;
}
// Replace the app data with a backup text. Keeps a "before-restore" snapshot so it can be undone.
export async function restoreText(text) {
  const v = validateBackup(text);
  if (!v.ok) return v;
  const current=localStorage.getItem(STATE_KEY);
  if(current&&isMeaningful(summarize(current))&&!await createSnapshot("manual"))return {ok:false,error:tx("معرفناش نحفظ نسخة من بياناتك الحالية. الاسترجاع اتوقف من غير تغيير.")};
  try { localStorage.setItem(STATE_KEY, text); }
  catch {return {ok:false,error:tx("الاسترجاع متحفظش. النسخة الحالية متغيرتش.")};}
  return { ok: true };
}
export function downloadCurrent() {
  const text = localStorage.getItem(STATE_KEY) || "{}";
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = `gymak-backup-${localISO()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
