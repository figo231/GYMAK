// Pure helpers for the Profile / Account pages.
import { localISO, shiftISO } from "./dateKey";
import { tx, txf } from "./i18n/tx";

export const HEIGHT_RANGE = [100, 250];
export const GOAL_RANGE_KG = [30, 300];
export const validHeight = (cm) => Number.isFinite(cm) && cm >= HEIGHT_RANGE[0] && cm <= HEIGHT_RANGE[1];
export const validGoalKg = (kg) => Number.isFinite(kg) && kg >= GOAL_RANGE_KG[0] && kg <= GOAL_RANGE_KG[1];

export function bmiCategory(bmi) {
  if (bmi == null) return "";
  if (bmi < 18.5) return tx("نحافة");
  if (bmi < 25) return tx("طبيعي");
  if (bmi < 30) return tx("زيادة وزن");
  return tx("سمنة");
}

const MONTHS = [tx("يناير"), tx("فبراير"), tx("مارس"), tx("أبريل"), tx("مايو"), tx("يونيو"), tx("يوليو"), tx("أغسطس"), tx("سبتمبر"), tx("أكتوبر"), tx("نوفمبر"), tx("ديسمبر")];
export function arDateFull(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : iso || "";
}

// One honest line for the AI-coach card, based on real activity.
export function coachLine(workoutDays, today = localISO()) {
  if (!workoutDays || !workoutDays.length) return tx("اسأل المدرب عن تمرينك وأكلك");
  const set = new Set(workoutDays);
  if (set.has(today)) return tx("كمّلت تمرين النهارده. اسأله عن الأكل والراحة");
  let gap = 1;
  while (gap < 60 && !set.has(shiftISO(today, -gap))) gap++;
  if (gap === 1) return tx("اسأله إيه تمرين النهارده بعد تمرينة امبارح");
  if (gap >= 60) return tx("ارجع للتمرين. اسأله يبدّيك منين");
  return txf(`عدّى {0} {1} من آخر تمرين. اسأله إيه تمرين النهارده`, [gap, gap <= 10 ? "أيام" : "يوم"]);
}

// Local keys wiped by "reset all data" (identity, theme and sync bookkeeping stay).
export const RESET_KEYS = ["gymak_state_v1", "gymak_measure_v1", "gymak_water_v1", "gymak_rest_v1"];
export const RESET_DBS = ["gymak_photos_v1", "gymak_exmedia_v1"];
export async function clearLocalData(storage = localStorage, idb = typeof indexedDB !== "undefined" ? indexedDB : null) {
  RESET_KEYS.forEach((k) => { try { storage.removeItem(k); } catch { /* ignore */ } });
  if (idb) await Promise.all(RESET_DBS.map((n) => new Promise((res) => { try { const r = idb.deleteDatabase(n); r.onsuccess = r.onerror = r.onblocked = () => res(); } catch { res(); } })));
}

// Data the user can download. No auth tokens or device ids.
export function exportPayload(storage = localStorage) {
  const read = (k) => { try { return JSON.parse(storage.getItem(k) || "null"); } catch { return null; } };
  return { app: "GYMAK", exportedAt: new Date().toISOString(), state: read("gymak_state_v1"), measurements: read("gymak_measure_v1"), water: read("gymak_water_v1") };
}

// XP shown in the profile header: +25 XP per logged exercise.
export function xpToNext(profile, today = localISO()) {
  const left = Math.max(0, (profile.xpNext || 500) - (profile.xp || 0));
  const exercises = Math.ceil(left / 25);
  const capped = !!(profile.xpDay && profile.xpDay.date === today && profile.xpDay.n >= 10);
  return { exercises, nextLevel: (profile.level || 1) + 1, capped };
}

export function timeAgoAr(ts, now = Date.now()) {
  if (!ts) return tx("لسه محصلش مزامنة");
  const sec = Math.round((now - ts) / 1000);
  if (sec < 60) return tx("من كذا ثانية");
  const min = Math.round(sec / 60);
  if (min < 60) return txf(`من {0} دقيقة`, [min]);
  const hr = Math.round(min / 60);
  if (hr < 24) return txf(`من {0} ساعة`, [hr]);
  return new Date(ts).toLocaleDateString("ar-EG");
}

// Validates a backup file made by exportPayload(). Returns { ok, error?, payload? }.
export function parseBackup(text) {
  if (typeof text !== "string" || text.length > 5 * 1024 * 1024) return { ok: false, error: tx("الملف كبير أو غير صالح.") };
  let p;
  try { p = JSON.parse(text); } catch { return { ok: false, error: tx("الملف مش نسخة GYMAK صالحة.") }; }
  const st = p && p.state;
  const good = p && p.app === "GYMAK" && st && typeof st === "object" && Array.isArray(st.weightLogs)
    && st.exerciseLogs && typeof st.exerciseLogs === "object" && !Array.isArray(st.exerciseLogs)
    && Array.isArray(st.workoutDays) && st.profile && typeof st.profile === "object";
  if (!good) return { ok: false, error: tx("الملف مش نسخة GYMAK صالحة.") };
  if (p.measurements != null && !Array.isArray(p.measurements)) return { ok: false, error: tx("قياسات الجسم في الملف تالفة.") };
  return { ok: true, payload: p };
}
export function applyBackup(payload, storage = localStorage) {
  storage.setItem("gymak_state_v1", JSON.stringify(payload.state));
  if (payload.measurements) storage.setItem("gymak_measure_v1", JSON.stringify(payload.measurements));
  if (payload.water) storage.setItem("gymak_water_v1", JSON.stringify(payload.water));
}

export function exercisesWord(n) { return n === 1 ? tx("تمرين") : n === 2 ? tx("تمرينين") : n >= 3 && n <= 10 ? tx("تمارين") : tx("تمرين"); }

// CSV (opens in Excel). UTF-8 BOM so Arabic shows correctly. Sections: weight, food, exercises.
const csvCell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && isNaN(Number(s))) s = "'" + s; // block formula injection
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export function buildCsv(state) {
  const s = state || {};
  const rows = [[tx("النوع"), tx("التاريخ"), tx("الاسم"), tx("قيمة 1"), tx("قيمة 2"), tx("قيمة 3"), tx("قيمة 4")]];
  for (const w of s.weightLogs || []) rows.push([tx("وزن"), w.date, tx("الوزن (كجم)"), w.weight, w.bodyFat ?? "", "", ""]);
  for (const d of s.foodLog || []) for (const it of d.items || []) rows.push([tx("أكل"), d.date, it.name, it.grams, it.kcal, it.protein, it.carbs]);
  for (const [id, logs] of Object.entries(s.exerciseLogs || {})) for (const l of logs || []) rows.push([tx("تمرين"), l.date, id, l.weight, l.sets, l.reps, ""]);
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
