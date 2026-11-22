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
