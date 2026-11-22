/* Weekly summary: the last 7 days (today included) vs the 7 days before. Pure, store passed in. */
export function pctChange(cur, prev) {
  if (!prev) return cur > 0 ? null : 0; // null = "new", nothing to compare with
  return Math.round(((cur - prev) / prev) * 100);
}

export function buildWeekly(store, waterDays = []) {
  // getXInRange(n) counts dates >= today-n, so n=6 is today plus the 6 days before it.
  const days = store.getWorkoutDaysInRange(6), daysAll = store.getWorkoutDaysInRange(13);
  const sets = store.getSetsInRange(6), setsAll = store.getSetsInRange(13);
  const ton = store.getTonnage(6), tonAll = store.getTonnage(13);
  const prev = { days: daysAll - days, sets: setsAll - sets, tonnage: tonAll - ton };
  const cutoff = new Date(Date.now() - 6 * 86400000);
  const p = (n) => String(n).padStart(2, "0");
  const cutKey = `${cutoff.getFullYear()}-${p(cutoff.getMonth() + 1)}-${p(cutoff.getDate())}`;
  const prs = store.getRecentPRs(1000).filter((x) => x.date >= cutKey).length;
  const wd = store.getWeightDiffOverDays(6);
  const weightDiff = wd ? Math.round((wd.to - wd.from) * 10) / 10 : null; // kg
  const logged = waterDays.filter((d) => d.ml > 0);
  const waterAvg = logged.length ? Math.round(logged.reduce((a, d) => a + d.ml, 0) / logged.length) : 0;
  const waterGoalDays = waterDays.filter((d) => d.ml >= d.goal && d.goal > 0).length;
  return {
    days, sets, tonnage: ton, prs, weightDiff, waterAvg, waterGoalDays,
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
