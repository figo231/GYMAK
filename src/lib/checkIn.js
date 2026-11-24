import { localISO, shiftISO } from './dateKey';
export function weekStart(date = localISO()) {
  const d = new Date(`${date}T12:00:00`);
  return shiftISO(date, -((d.getDay() + 1) % 7));
}
export function normalizeCheckIn(value, date = localISO()) {
  const out = { date, week: weekStart(date) };
  for (const [key, min, max] of [['sleep',0,24],['energy',1,5],['hunger',1,5],['adherence',0,100]]) {
    if (value[key] === '' || value[key] == null || !Number.isFinite(Number(value[key])) || Number(value[key]) < min || Number(value[key]) > max) throw Error('راجع القيم قبل الحفظ.');
    out[key] = Number(value[key]);
    if (["energy","hunger"].includes(key) && !Number.isInteger(out[key])) throw Error("اختار درجة من1 لحد5.");
  }
  out.note = String(value.note || '').trim().slice(0,400);
  return out;
}
export function checkInText(row) {
  return [`متابعتي الأسبوعية | ${row.date}`,`متوسط النوم: ${row.sleep} ساعة`,`الطاقة: ${row.energy}/5`,`الجوع: ${row.hunger}/5`,`الالتزام بالخطة: ${row.adherence}%`,row.note ? `ملاحظتي: ${row.note}` : ''].filter(Boolean).join('\n');
}
