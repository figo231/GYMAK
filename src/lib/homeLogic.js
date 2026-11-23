// Pure helpers for the home page (Dashboard).
import { localISO, shiftISO } from "./dateKey";
import { weightTone } from "./stats/format";
import { tx, txf } from "./i18n/tx";
import { isEn } from "./i18n/lang";

export const WEIGHT_RANGE_KG = [20, 400];
export const BODYFAT_RANGE = [2, 70];

// Parses what the user typed into the weight sheet. weightKg is converted already.
export function parseWeightForm({ weight, bodyFat, date }, fromDisplay, today = localISO()) {
  const w = parseFloat(weight);
  if (!Number.isFinite(w)) return { ok: false, error: tx("اكتب وزنك.") };
  const kg = fromDisplay(w);
  if (!(kg >= WEIGHT_RANGE_KG[0] && kg <= WEIGHT_RANGE_KG[1])) {
    return { ok: false, error: txf(`الوزن لازم يكون بين {0} و {1} كجم.`, [WEIGHT_RANGE_KG[0], WEIGHT_RANGE_KG[1]]) };
  }
  let bf = null;
  if (bodyFat !== "" && bodyFat != null) {
    bf = parseFloat(bodyFat);
    if (!(bf >= BODYFAT_RANGE[0] && bf <= BODYFAT_RANGE[1])) return { ok: false, error: txf(`نسبة الدهون لازم تكون بين {0} و {1}%.`, [BODYFAT_RANGE[0], BODYFAT_RANGE[1]]) };
  }
  const day = date || today;
  if (day > today) return { ok: false, error: tx("مينفعش تسجّل وزن في تاريخ لسه ماجاش.") };
  return { ok: true, kg, bodyFat: bf, date: day };
}

// "النهارده" / "امبارح" / "من 3 أيام" / "من أسبوع" ...
export function relDayAr(iso, today = localISO()) {
  if (!iso) return "";
  const n = Math.round((Date.UTC(...today.split("-").map((v, i) => (i === 1 ? +v - 1 : +v))) - Date.UTC(...iso.split("-").map((v, i) => (i === 1 ? +v - 1 : +v)))) / 86400000);
  if (n <= 0) return tx("النهارده");
  if (n === 1) return tx("امبارح");
  if (n === 2) return tx("من يومين");
  if (n <= 10) return txf(`من {0} أيام`, [n]);
  if (n < 14) return txf(`من {0} يوم`, [n]);
  if (n < 30) return n < 21 ? tx("من أسبوعين") : txf(`من {0} أسابيع`, [Math.round(n / 7)]);
  if (n < 60) return tx("من شهر");
  return txf(`من {0} شهور`, [Math.round(n / 30)]);
}

// View model for the weight-change chip/card. diff is in kg; convert for display.
export function weightChangeView(info, { goal, toDisplay, unit, window = 7 }) {
  if (!info || !Number.isFinite(info.diff) || !info.span || info.span < 1) return null;
  const d = toDisplay(info.to) - toDisplay(info.from);
  const diff = +d.toFixed(1);
  const base = window === 7 ? tx("هذا الأسبوع") : tx("الشهر");
  const within = info.span <= window + 1;
  const label = within ? base : txf(`من {0} {1}`, [info.span, isEn() ? (info.span === 1 ? "day" : "days") : info.span <= 10 ? "أيام" : "يوم"]);
  const tone = diff === 0 ? "neutral" : weightTone(info.diff, info.from, goal);
  return { diff, abs: Math.abs(diff), dir: diff > 0 ? "up" : diff < 0 ? "down" : "flat", tone, label, unit, text: diff === 0 ? txf(`ثابت {0}`, [label]) : `${Math.abs(diff).toFixed(1)} ${unit} ${label}` };
}

export function streakAtRisk(streak, week) {
  if (!streak || !week || !week.length) return false;
  return !week[week.length - 1].done;
}

export function logUnitText(r) { return r.unit === "sec" ? tx("ثانية") : tx("تكرار"); }
export function logLoadText(r, fmtW) { return r.weight > 0 ? fmtW(r.weight) : r.unit === "sec" ? tx("بدون وزن") : tx("وزن الجسم"); }

// Sparkline points (ltr, oldest first) scaled into w x h with a little padding.
export function sparkPoints(values, w = 84, h = 26, pad = 3) {
  const v = (values || []).filter((x) => Number.isFinite(x));
  if (v.length < 2) return null;
  const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  const pts = v.map((x, i) => [pad + (i * (w - 2 * pad)) / (v.length - 1), pad + (1 - (x - min) / span) * (h - 2 * pad)]);
  return { pts, d: pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" "), last: pts[pts.length - 1] };
}

export function heroState({ trainedToday, todayList, eotd, streak }) {
  const remaining = todayList.filter((x) => !x.done);
  if (trainedToday && remaining.length === 0) return { kind: "done", streak };
  if (remaining.length > 0) return { kind: "plan", total: todayList.length, done: todayList.length - remaining.length, next: remaining[0].ex };
  if (eotd && eotd.exercises && eotd.exercises.length) return { kind: "suggest", title: eotd.title, exercises: eotd.exercises };
  return { kind: "empty" };
}
