import { fmtLoggedWeight } from "./format";
import { localISO, windowStart } from "../dateKey";
import { tx, txf } from "../i18n/tx";
/* Weekly summary: the last 7 days (today included) vs the 7 days before. Pure, store passed in. */
export function pctChange(cur, prev) {
  if (!prev) return cur > 0 ? null : 0; // null = "new", nothing to compare with
  return Math.round(((cur - prev) / prev) * 100);
}

export function buildWeekly(store, waterDays = []) {
  // getXInRange(n) covers today plus the n-1 days before it.
  const days = store.getWorkoutDaysInRange(7), daysAll = store.getWorkoutDaysInRange(14);
  const sets = store.getSetsInRange(7), setsAll = store.getSetsInRange(14);
  const ton = store.getTonnage(7), tonAll = store.getTonnage(14);
  const prev = { days: daysAll - days, sets: setsAll - sets, tonnage: tonAll - ton };
  const cutKey = windowStart(localISO(), 7);
  const prs = store.getRecentPRs(1000).filter((x) => x.date >= cutKey).length;
  const wd = store.getWeightDiffOverDays(6);
  const weightDiff = wd ? Math.round((wd.to - wd.from) * 10) / 10 : null; // kg
  const foodDays = typeof store.getNutritionAdherentDays === "function" ? store.getNutritionAdherentDays(7) : null;
  const logged = waterDays.filter((d) => d.ml > 0);
  const waterAvg = logged.length ? Math.round(logged.reduce((a, d) => a + d.ml, 0) / logged.length) : 0;
  const waterGoalDays = waterDays.filter((d) => d.ml >= d.goal && d.goal > 0).length;
  return {
    days, sets, tonnage: ton, peakWeight: typeof store.getPeakWeight === "function" ? store.getPeakWeight(7) : null, prs, weightDiff, waterAvg, waterGoalDays, foodDays,
    streak: store.getStreak(), prev,
    daysDelta: days - prev.days, tonnageDelta: pctChange(ton, prev.tonnage),
    empty: days === 0 && sets === 0,
  };
}

export function headline(w) {
  if (w.empty) return tx("الأسبوع ده لسه فاضي. تمرينة واحدة بتبدأ السلسلة 💪");
  if (w.prs > 0) return txf(`أسبوع قوي: {0} {1} 🏆`, [w.prs, w.prs === 1 ? tx("رقم قياسي جديد") : tx("أرقام قياسية جديدة")]);
  if (w.daysDelta > 0) return txf(`زودت {0} {1} تمرين عن الأسبوع اللي فات 🔥`, [w.daysDelta, w.daysDelta === 1 ? tx("يوم") : tx("أيام")]);
  if (w.days >= 4) return tx("التزام ممتاز الأسبوع ده 🔥");
  if (w.daysDelta < 0) return tx("الأسبوع ده أقل شوية. رجّع الإيقاع بتمرينة بكرة.");
  return tx("ثبات حلو. كمّل على نفس الإيقاع.");
}

export function weeklyCardData(w, tonLabel = tx("كجم"), conv = (x) => x) {
  if (!w || w.empty) return null;
  return {
    kind: "weekly",
    title: tx("أسبوعي مع GYMAK"),
    big: `${w.days}`,
    unit: w.days === 1 ? tx("يوم تمرين") : tx("أيام تمرين"),
    sub: txf(`{0} مجموعة · أعلى وزن: {1}{2}`, [w.sets, fmtLoggedWeight(w.peakWeight == null ? null : conv(w.peakWeight), tonLabel), w.prs ? txf(` · {0} رقم قياسي`, [w.prs]) : ""]),
  };
}
