import { localISO, windowStart } from "../dateKey";
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
    days, sets, tonnage: ton, prs, weightDiff, waterAvg, waterGoalDays, foodDays,
    streak: store.getStreak(), prev,
    daysDelta: days - prev.days, tonnageDelta: pctChange(ton, prev.tonnage),
    empty: days === 0 && sets === 0,
  };
}

export function headline(w) {
  if (w.empty) return "الأسبوع ده لسه فاضي. تمرينة واحدة بتبدأ السلسلة 💪";
  if (w.prs > 0) return `أسبوع قوي: ${w.prs} ${w.prs === 1 ? "رقم قياسي جديد" : "أرقام قياسية جديدة"} 🏆`;
  if (w.daysDelta > 0) return `زودت ${w.daysDelta} ${w.daysDelta === 1 ? "يوم" : "أيام"} تمرين عن الأسبوع اللي فات 🔥`;
  if (w.days >= 4) return "التزام ممتاز الأسبوع ده 🔥";
  if (w.daysDelta < 0) return "الأسبوع ده أقل شوية. رجّع الإيقاع بتمرينة بكرة.";
  return "ثبات حلو. كمّل على نفس الإيقاع.";
}

export function weeklyCardData(w, tonLabel = "كجم", conv = (x) => x) {
  if (!w || w.empty) return null;
  return {
    kind: "weekly",
    title: "أسبوعي مع GYMAK",
    big: `${w.days}`,
    unit: w.days === 1 ? "يوم تمرين" : "أيام تمرين",
    sub: `${w.sets} مجموعة · ${Math.round(conv(w.tonnage)).toLocaleString("en-US")} ${tonLabel}${w.prs ? ` · ${w.prs} رقم قياسي` : ""}`,
  };
}
