// Pure helpers for the Profile / Account pages.
import { localISO, shiftISO } from "./dateKey";

export const HEIGHT_RANGE = [100, 250];
export const GOAL_RANGE_KG = [30, 300];
export const validHeight = (cm) => Number.isFinite(cm) && cm >= HEIGHT_RANGE[0] && cm <= HEIGHT_RANGE[1];
export const validGoalKg = (kg) => Number.isFinite(kg) && kg >= GOAL_RANGE_KG[0] && kg <= GOAL_RANGE_KG[1];

export function bmiCategory(bmi) {
  if (bmi == null) return "";
  if (bmi < 18.5) return "نحافة";
  if (bmi < 25) return "طبيعي";
  if (bmi < 30) return "زيادة وزن";
  return "سمنة";
}

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export function arDateFull(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : iso || "";
}

// One honest line for the AI-coach card, based on real activity.
export function coachLine(workoutDays, today = localISO()) {
  if (!workoutDays || !workoutDays.length) return "اسأل المدرب عن تمرينك وأكلك";
  const set = new Set(workoutDays);
  if (set.has(today)) return "كمّلت تمرين النهارده. اسأله عن الأكل والراحة";
  let gap = 1;
  while (gap < 60 && !set.has(shiftISO(today, -gap))) gap++;
  if (gap === 1) return "اسأله إيه تمرين النهارده بعد تمرينة امبارح";
  if (gap >= 60) return "ارجع للتمرين. اسأله يبدّيك منين";
  return `عدّى ${gap} ${gap <= 10 ? "أيام" : "يوم"} من آخر تمرين. اسأله إيه تمرين النهارده`;
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
