const MUSCLES = new Set(["chest", "back", "shoulders", "legs", "arms", "core"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT = 500; // generous ceiling — original UI caps bio at 150, exercise names much shorter

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}
function isPositiveNumber(n) {
  return isFiniteNumber(n) && n > 0;
}
function isPositiveInt(n) {
  return Number.isInteger(n) && n > 0;
}
function isValidDate(d) {
  if (typeof d !== "string" || !DATE_RE.test(d)) return false;
  const parsed=new Date(d + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10)===d;
}
function isShortText(s, max = MAX_TEXT) {
  return typeof s === "string" && s.length <= max;
}

/**
 * Every validate* function returns true/false — callers filter arrays with
 * it (`rows.filter(validateX)`), so one malformed row is silently dropped
 * rather than throwing and aborting the whole push/pull. Failures are
 * counted and reported to the sync manager for diagnostics rather than
 * logged-and-forgotten (see syncManager.js's `droppedInvalidCount`).
 */
export function validateWeightLog(row) {
  const bodyFat=row?.bodyFat ?? row?.body_fat;
  return isValidDate(row?.date) && isPositiveNumber(row?.weight) && row.weight < 1000 &&
    (bodyFat == null || (isFiniteNumber(bodyFat) && bodyFat >= 0 && bodyFat <= 100));
}

export function validateFoodLog(row) {
  const kcal=row?.totalKcal ?? row?.total_kcal,protein=row?.totalProtein ?? row?.total_protein,carbs=row?.totalCarbs ?? row?.total_carbs,fat=row?.totalFat ?? row?.total_fat;
  return isValidDate(row?.date) &&
    Array.isArray(row?.items) && row.items.length <= 200 &&
    isFiniteNumber(kcal) && kcal >= 0 && kcal < 100000 &&
    isFiniteNumber(protein) && protein >= 0 &&
    isFiniteNumber(carbs) && carbs >= 0 &&
    isFiniteNumber(fat) && fat >= 0;
}

export function validateExercise(row) {
  return isShortText(row?.id, 200) && row.id.length > 0 &&
    isShortText(row?.name, 100) && row.name.trim().length > 0 &&
    MUSCLES.has(row?.muscle) &&
    (row.secondary == null || isShortText(row.secondary, 100)) &&
    isPositiveInt(row?.sets) && row.sets <= 50 &&
    isPositiveInt(row?.reps) && row.reps <= 500;
}

export function validateExerciseLog(row) {
  return isShortText(row?.exerciseId ?? row?.exercise_id, 200) &&
    isValidDate(row?.date) &&
    isFiniteNumber(row?.weight) && row.weight >= 0 && row.weight < 2000 &&
    isPositiveInt(row?.sets) && row.sets <= 50 &&
    isPositiveInt(row?.reps) && row.reps <= 500;
}

export function validatePR(row) {
  return isShortText(row?.exerciseId ?? row?.exercise_id, 200) &&
    isShortText(row?.exerciseName ?? row?.exercise_name, 100) &&
    isValidDate(row?.date) &&
    isPositiveNumber(row?.weight) && row.weight < 2000 &&
    isFiniteNumber(row?.prevWeight ?? row?.prev_weight) && (row.prevWeight ?? row.prev_weight) >= 0;
}

export function validateWorkoutDay(date) {
  return isValidDate(date);
}

/** Profile is a single object, not a list — returns a *sanitized copy* with
    invalid fields dropped (set to undefined) rather than a bool, so one bad
    field (e.g. an absurd height) doesn't block the whole profile push. */
export function sanitizeProfileForPush(p) {
  const out = { ...p };
  if (!isShortText(out.name, 60)) delete out.name;
  if (!isShortText(out.username, 40)) delete out.username;
  if (!isShortText(out.bio, 200)) delete out.bio;
  if (out.heightCm != null && !(isFiniteNumber(out.heightCm) && out.heightCm > 0 && out.heightCm < 300)) delete out.heightCm;
  if (out.gender != null && out.gender !== "male" && out.gender !== "female") delete out.gender;
  if (!Number.isInteger(out.level) || out.level < 1 || out.level > 999) out.level = 1;
  if (!isFiniteNumber(out.xp) || out.xp < 0) out.xp = 0;
  if (!isFiniteNumber(out.xpNext) || out.xpNext <= 0) out.xpNext = 500;
  return out;
}

export function validateProfileFromRemote(row) {
  if (!row || typeof row !== "object") return false;
  // A remote profile row is always well-formed by construction (it's our
  // own schema with defaults), so this mainly guards against a genuinely
  // corrupt/truncated response rather than adversarial input.
  return typeof row.id === "string" && row.id.length > 0;
}
