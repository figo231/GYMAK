// Presentation-layer normalisation for the exercise library: consistent muscle
// labels, clean Arabic names, timed-exercise units, search aliases and filters.
// Applied on read (Store.getExercises), so stored data is never rewritten.
import { getExerciseEnglish } from "./exerciseImages";

// Variant label -> [canonical primary label, extra secondary muscle or ""].
const LABELS = {
  "ترايسبس وصدر": ["ترايسبس", "صدر"],
  "صدر وترايسبس": ["صدر", "ترايسبس"],
  "صدر وظهر": ["صدر", "ظهر"],
  "ظهر وترايسبس": ["ظهر", "ترايسبس"],
  "ظهر علوي (لاتس)": ["ظهر علوي", ""],
  "ظهر أسفل لاتس": ["ظهر علوي", ""],
  "ظهر علوي وترابيس": ["ظهر علوي", "ترابيس"],
  "ظهر أسفل": ["أسفل الظهر", ""],
  "ظهر سفلي": ["أسفل الظهر", ""],
  "أكتاف أمامي": ["أكتاف أمامية", ""],
  "أكتاف خلفي": ["أكتاف خلفية", ""],
  "أكتاف جانبي": ["أكتاف جانبية", ""],
  "أكتاف وترابيس": ["أكتاف", "ترابيس"],
  "أرجل خلفية": ["فخذ خلفي", ""],
  "أرجل (كواد)": ["فخذ أمامي", ""],
  "فخذ": ["فخذ أمامي", ""],
  "فخذ ومؤخرة": ["فخذ أمامي", "مؤخرة"],
  "فخذ داخلي ومؤخرة": ["فخذ داخلي", "مؤخرة"],
  "فخذ خارجي ومؤخرة": ["فخذ خارجي", "مؤخرة"],
  "فخذ خلفي وأسفل الظهر": ["فخذ خلفي", "أسفل الظهر"],
  "بايسبس وساعد": ["بايسبس", "ساعد"],
  "ساعد وبطن": ["بطن", "ساعد"],
  "بطن جانبي": ["جوانب البطن", ""],
  "بطن كامل": ["بطن", ""],
  "بطن عميق": ["بطن", ""],
};

// Exercises measured in seconds, not reps.
const TIMED_IDS = new Set(["plank", "mountain-climbers", "side-bridge", "farmers-walk"]);

// Better one-line descriptions where the original was a duplicate or too thin.
const DESC = {
  "lying-leg-curl": "عزل للفخذ الخلفي وانت نايم على الجهاز، بتحس بالانقباض في آخر الحركة.",
  "seated-leg-curl": "عزل للفخذ الخلفي من وضع الجلوس، ثبات أعلى وتحكم أسهل.",
  "lying-leg-raise": "بيشغّل أسفل البطن برفع الرجلين وانت نايم على البنش.",
  "reverse-crunch": "بيشغّل أسفل البطن برفع الحوض ناحية الصدر.",
  "flutter-kicks": "ركلات صغيرة متبادلة بتحرق أسفل البطن.",
  "crunch": "حركة البطن الأساسية، ارفع الكتفين بس من غير ما تشد رقبتك.",
  "ab-roller": "حركة قوية للبطن بتشتغل فيها على مدى كامل، ابدأ بمدى قصير.",
  "air-bike": "كرانش بالرجلين بتحرك فيه كوعك لعكس ركبتك وبيشغّل البطن كلها.",
  "front-raise": "بيعزل مقدمة الكتف برفع الدمبل لقدام لحد مستوى الكتف.",
  "leg-extension": "عزل للفخذ الأمامي على الجهاز، ممتاز للتسخين أو آخر التمرين.",
  "machine-curl": "كيرل على الجهاز، آمن ومناسب لتعلم الحركة.",
  "tricep-kickback": "عزل للترايسبس بمد الذراع لورا والكوع ثابت.",
  "glute-kickback": "عزل للمؤخرة بركل الرجل لورا على الكابل أو الجهاز.",
  "russian-twist": "لف الجذع يمين وشمال بيشغّل جوانب البطن.",
  "side-bridge": "ثبات على الجنب بيقوّي جوانب البطن والجذع.",
  "farmers-walk": "مشي وانت شايل أوزان تقيلة بيبني القبضة والثبات.",
};

const EN_MUSCLE = { chest: "chest pecs", back: "back lats", shoulders: "shoulders delts", legs: "legs quads hamstrings glutes", arms: "arms biceps triceps", core: "core abs" };
const EN_EQUIP = { "دمبل": "dumbbell", "بار": "barbell", "جهاز": "machine", "كابل": "cable", "وزن الجسم": "bodyweight", "سميث": "smith", "قرص": "plate", "عجلة": "wheel roller" };

function addSecondary(secondary, extra) {
  if (!extra) return secondary || "";
  if (!secondary) return extra;
  return secondary.includes(extra) ? secondary : secondary + "، " + extra;
}

export function normalizeExercise(ex) {
  if (!ex) return ex;
  let name = ex.name || "";
  const aliases = [];
  const m = name.match(/^(.*?)\s*\(([^()]*[A-Za-z][^()]*)\)\s*$/);
  if (m && m[1].trim()) { name = m[1].trim(); aliases.push(m[2].trim()); }
  let muscleLabel = ex.muscleLabel;
  let secondary = ex.secondary || "";
  const map = LABELS[muscleLabel];
  if (map) { muscleLabel = map[0]; secondary = addSecondary(secondary, map[1]); }
  const en = ex.custom ? "" : getExerciseEnglish(ex.id);
  if (en) aliases.push(en);
  const timed = ex.unit === "sec" || TIMED_IDS.has(ex.id);
  return {
    ...ex,
    name,
    muscleLabel,
    secondary,
    description: DESC[ex.id] || ex.description,
    aliases,
    unit: timed ? "sec" : "reps",
  };
}

export function unitLabel(ex) { return ex && ex.unit === "sec" ? "ثانية" : "تكرار"; }

// "4×8" kept left-to-right so RTL never flips it into "8×4".
export function setsRepsText(sets, reps) { return `${sets}×${reps}`; }

// ----- search -----
export function arNorm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

export function haystack(ex, groupLabel = "") {
  return arNorm([
    ex.name, ex.muscleLabel, ex.secondary, ex.equipment, ex.difficulty, groupLabel,
    (ex.aliases || []).join(" "), EN_MUSCLE[ex.muscle] || "", EN_EQUIP[ex.equipment] || "",
  ].filter(Boolean).join(" "));
}

export function matchesQuery(hay, query) {
  const toks = arNorm(query).split(" ").filter(Boolean);
  return toks.every((t) => hay.includes(t));
}

export const DIFFICULTIES = ["مبتدئ", "متوسط", "متقدم"];
export const EQUIPMENT_ORDER = ["وزن الجسم", "دمبل", "بار", "جهاز", "كابل"];

// Home-workout filter: only exercises the library itself tags as pure bodyweight.
export const HOME_EQUIPMENT = "وزن الجسم";
export function isHomeExercise(ex) {
  return !!ex && ex.equipment === HOME_EQUIPMENT;
}

// ----- add-exercise validation -----
export function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function validMediaUrl(u) {
  if (!u) return true;
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:";
  } catch { return false; }
}

// ----- last done -----
export function daysAgoLabel(dateISO, todayISO) {
  if (!dateISO || !todayISO) return "";
  const d = Math.round((new Date(todayISO + "T00:00:00") - new Date(dateISO + "T00:00:00")) / 86400000);
  if (!Number.isFinite(d) || d < 0) return "";
  if (d === 0) return "النهارده";
  if (d === 1) return "امبارح";
  if (d === 2) return "من يومين";
  if (d <= 10) return `من ${d} أيام`;
  if (d < 30) { const w = Math.round(d / 7); return w === 2 ? "من أسبوعين" : `من ${w} أسابيع`; }
  if (d < 365) { const m = Math.round(d / 30); return m === 1 ? "من شهر" : m === 2 ? "من شهرين" : `من ${m} شهور`; }
  return "من أكتر من سنة";
}

// "3×12 تكرار" / "3×30 ثانية" as plain text (for sentences); use a dir="ltr" span in JSX.
export function setsRepsFull(ex, sets = ex.sets, reps = ex.reps) {
  return `${sets}×${reps} ${unitLabel(ex)}`;
}

// ----- exercise of the day -----
export function dayNumber(dateISO) { return Math.floor(new Date(dateISO + "T00:00:00Z").getTime() / 86400000); }

const GROUP_ROTATION = ["chest", "back", "legs", "shoulders", "arms", "core"];
const GROUP_TITLE = { chest: "صدر", back: "ظهر", legs: "أرجل", shoulders: "أكتاف", arms: "ذراعين", core: "بطن" };

/** Deterministic pick for a date: the program's day (rotating) or a muscle-group session. */
export function pickExerciseOfTheDay({ dateISO, programDays, exercises }) {
  const n = dayNumber(dateISO);
  if (programDays && programDays.length) {
    const days = programDays.filter((d) => d.exercises && d.exercises.length);
    if (days.length) {
      const day = days[n % days.length];
      return { title: day.title, source: "program", exercises: day.exercises.slice(0, 6) };
    }
  }
  const group = GROUP_ROTATION[n % GROUP_ROTATION.length];
  const pool = (exercises || []).filter((e) => e.muscle === group && e.difficulty !== "متقدم");
  const picks = [];
  for (let i = 0; i < pool.length && picks.length < 4; i++) picks.push(pool[(n + i * 3) % pool.length]);
  const uniq = [...new Map(picks.map((e) => [e.id, e])).values()];
  return { title: `تمرين ${GROUP_TITLE[group]}`, source: "rotation", exercises: uniq };
}
