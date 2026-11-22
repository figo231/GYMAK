// Extra reminder types (pure logic). The daily workout reminder (id 4101) lives in nativeReminder.js.
export const IDS = { meals: 4102, weigh: 4104, missed: 4120, waterBase: 4110, supplements: 4106 };
export const WATER_HOURS = [10, 12, 14, 16, 18, 20];
export const REMINDER_DEFAULTS = {
  meals: { on: false, time: "14:00" },
  water: { on: false },
  weigh: { on: false, time: "08:00" }, // every Saturday
  missed: { on: false, time: "20:30" },
  supplements: { on: false, time: "16:00" }, // بعد التمرين في العادة
};
const okTime = (t, d) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(t)) ? t : d);

export function normalizeReminders(p) {
  const x = p && typeof p === "object" ? p : {};
  const out = {};
  for (const k of Object.keys(REMINDER_DEFAULTS)) {
    const d = REMINDER_DEFAULTS[k];
    out[k] = { ...d, on: !!(x[k] && x[k].on) };
    if (d.time) out[k].time = okTime(x[k] && x[k].time, d.time);
  }
  return out;
}
const hm = (t) => String(t).split(":").map(Number);

export function buildNotifications(prefs) {
  const p = normalizeReminders(prefs);
  const list = [];
  if (p.meals.on) { const [hour, minute] = hm(p.meals.time); list.push({ id: IDS.meals, title: "GYMAK", body: "سجّل أكلك النهاردة عشان أرقامك تفضل دقيقة.", schedule: { on: { hour, minute }, allowWhileIdle: true } }); }
  if (p.water.on) WATER_HOURS.forEach((hour, i) => list.push({ id: IDS.waterBase + i, title: "GYMAK", body: "اشرب مياه. سجّل كوباية.", schedule: { on: { hour, minute: 0 }, allowWhileIdle: true } }));
  if (p.weigh.on) { const [hour, minute] = hm(p.weigh.time); list.push({ id: IDS.weigh, title: "GYMAK", body: "وقت وزنة الأسبوع. سجّل وزنك.", schedule: { on: { weekday: 7, hour, minute }, allowWhileIdle: true } }); }
  if (p.supplements.on) { const [hour, minute] = hm(p.supplements.time); list.push({ id: IDS.supplements, title: "GYMAK", body: "وقت المكملات 💊 الكرياتين بعد التمرين، والأوميجا مع الأكل.", schedule: { on: { hour, minute }, allowWhileIdle: true } }); }
  return list;
}
export const ALL_IDS = [IDS.meals, IDS.weigh, IDS.missed, IDS.supplements, ...WATER_HOURS.map((_, i) => IDS.waterBase + i)];

// One-off nudge for today, only if the user has not trained and the time is still ahead.
export function missedNotification(prefs, now, trainedToday) {
  const p = normalizeReminders(prefs);
  if (!p.missed.on || trainedToday) return null;
  const [h, m] = hm(p.missed.time);
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (at <= now) return null;
  return { id: IDS.missed, title: "GYMAK", body: "لسه متمرنتش النهاردة. حتى 20 دقيقة تفرق.", schedule: { at, allowWhileIdle: true } };
}
