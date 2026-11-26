import {readOwnerRows} from "./readPages";
import {exerciseLogId,validLogId} from "./exerciseLogIdentity";
import { supabase } from "../supabaseClient";
import Store from "../store/gymakStore";
import { deterministicId } from "./deterministicId";
import {
  validateWeightLog, validateFoodLog, validateExercise, validateExerciseLog,
  validatePR, validateWorkoutDay, sanitizeProfileForPush, validateProfileFromRemote,
} from "./validate";

/* Every push function here is a Supabase upsert — safe to call repeatedly
   with the same data (idempotent). Every pull function fetches remote rows,
   drops anything malformed, and hands the rest to the matching
   Store.merge*FromRemote() method. See gymakStore.js's "Sync support"
   section for the merge logic itself.

   Every push/pull function returns { dropped } — the count of rows it
   filtered out for failing validation — so syncManager.js can surface a
   "N records were skipped" diagnostic instead of that silently vanishing. */

// Deletes the remote rows for entries the user removed locally, then clears
// them from the pending list. `toMatch` turns a pending key into an eq-filter
// object. A failed delete throws, so the key stays pending and is retried.
async function flushDeletes(userId, table, list, toMatch) {
  const keys = Store.getPendingDeletes()[list].slice();
  for (const key of keys) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId).match(toMatch(key));
    if (error) throw error;
  }
  if (keys.length) Store.clearPendingDeletes(list, keys);
}

// ---------------------------------------------------------------------------
// profile (single row, last-write-wins via push-before-pull + server now())
// ---------------------------------------------------------------------------
export async function pushProfile(userId) {
  const s = Store.getRawStateForSync();
  const p = sanitizeProfileForPush(s.profile);
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    name: p.name ?? "",
    username: p.username ?? "",
    bio: p.bio ?? "",
    avatar: p.avatar,
    cover: p.cover,
    cover_gradient: p.coverGradient,
    gender: p.gender,
    height_cm: p.heightCm,
    level: p.level,
    xp: p.xp,
    xp_next: p.xpNext,
    member_since: p.memberSince,
    goal_weight: s.goalWeight,
    active_program_id: s.activeProgramId,
    best_streak: s.bestStreak,
    unit: s.settings.unit,
    lang: s.settings.lang,
    notif_enabled: s.settings.notifEnabled,
    notif_time: s.settings.notifTime,
  });
  if (error) throw error;
  return { dropped: 0 };
}

export async function pullProfile(userId,canApply=()=>true,applyRemote=fn=>fn()) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (data && !validateProfileFromRemote(data)) return { dropped: 1 };
  if(canApply())applyRemote(()=>Store.mergeProfileFromRemote(data));
  return { dropped: 0 };
}

// ---------------------------------------------------------------------------
// weight_logs (one row per date)
// ---------------------------------------------------------------------------
export async function pushWeightLogs(userId) {
  const s = Store.getRawStateForSync();
  await flushDeletes(userId, "weight_logs", "weight", (date) => ({ date }));
  const valid = s.weightLogs.filter(validateWeightLog);
  const dropped = s.weightLogs.length - valid.length;
  if (!valid.length) return { dropped };
  const rows = valid.map((w) => ({
    id: deterministicId("weight_log", userId, w.date),
    user_id: userId, date: w.date, weight: w.weight, body_fat: w.bodyFat,
  }));
  const { error } = await supabase.from("weight_logs").upsert(rows, { onConflict: "user_id,date" });
  if (error) throw error;
  return { dropped };
}

export async function pullWeightLogs(userId,canApply=()=>true,applyRemote=fn=>fn()) {
  const rows=await readOwnerRows(supabase,"weight_logs",userId,{canRead:canApply});
  const valid = rows.filter(validateWeightLog);
  if(canApply())applyRemote(()=>Store.mergeWeightLogsFromRemote(valid));
  return { dropped: rows.length - valid.length };
}

// ---------------------------------------------------------------------------
// food_log (one row per date)
// ---------------------------------------------------------------------------
export async function pushFoodLog(userId) {
  const s = Store.getRawStateForSync();
  await flushDeletes(userId, "food_log", "food", (date) => ({ date }));
  const valid = s.foodLog.filter(validateFoodLog);
  const dropped = s.foodLog.length - valid.length;
  if (!valid.length) return { dropped };
  const rows = valid.map((f) => ({
    id: deterministicId("food_log", userId, f.date),
    user_id: userId, date: f.date, items: f.items,
    total_kcal: f.totalKcal, total_protein: f.totalProtein, total_carbs: f.totalCarbs, total_fat: f.totalFat,
  }));
  const { error } = await supabase.from("food_log").upsert(rows, { onConflict: "user_id,date" });
  if (error) throw error;
  return { dropped };
}

export async function pullFoodLog(userId,canApply=()=>true,applyRemote=fn=>fn()) {
  const rows=await readOwnerRows(supabase,"food_log",userId,{canRead:canApply});
  const valid = rows.filter(validateFoodLog);
  if(canApply())applyRemote(()=>Store.mergeFoodLogFromRemote(valid));
  return { dropped: rows.length - valid.length };
}

// ---------------------------------------------------------------------------
// exercises (custom only)
// ---------------------------------------------------------------------------
export async function pushExercises(userId) {
  const s = Store.getRawStateForSync();

  const deletedIds = Store.getDeletedExerciseIds();
  if (deletedIds.length) {
    const { error: delError } = await supabase.from("exercises").delete().eq("user_id", userId).in("id", deletedIds);
    if (delError) throw delError;
    deletedIds.forEach((id) => Store.clearDeletedExerciseId(id));
  }

  const custom = s.exercises.filter((e) => e.custom);
  const valid = custom.filter(validateExercise);
  const dropped = custom.length - valid.length;
  if (!valid.length) return { dropped };
  const rows = valid.map((e) => ({
    id: e.id, user_id: userId, name: e.name, muscle: e.muscle, secondary: e.secondary || null, sets: e.sets, reps: e.reps,
  }));
  const { error } = await supabase.from("exercises").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return { dropped };
}

export async function pullExercises(userId,canApply=()=>true,applyRemote=fn=>fn()) {
  const rows=await readOwnerRows(supabase,"exercises",userId,{canRead:canApply});
  const valid = rows.filter(validateExercise);
  if(canApply())applyRemote(()=>Store.mergeExercisesFromRemote(valid));
  return { dropped: rows.length - valid.length };
}

// ---------------------------------------------------------------------------
// exercise_logs (append-only)
// ---------------------------------------------------------------------------
export async function pushExerciseLogs(userId) {
  const s = Store.getRawStateForSync();
  await flushDeletes(userId, "exercise_logs", "exerciseLogs", (key) => {
    if(key.startsWith("id:")&&validLogId(key.slice(3)))return {id:key.slice(3)};
    const [exerciseId, date, weight, sets, reps] = key.split("|");
    return { id: deterministicId("exercise_log", userId, exerciseId, date, Number(weight), Number(sets), Number(reps)) };
  });
  const rows = [];
  let dropped = 0;
  Object.entries(s.exerciseLogs).forEach(([exerciseId, logs]) => {
    logs.forEach((l) => {
      const candidate = { ...l, exerciseId };
      if (!validateExerciseLog(candidate)) { dropped++; return; }
      rows.push({
        id: exerciseLogId(userId,exerciseId,l),
        user_id: userId, exercise_id: exerciseId, date: l.date, weight: l.weight, sets: l.sets, reps: l.reps,
        rir:Number.isInteger(l.rir)&&l.rir>=0&&l.rir<=5?l.rir:null,client_logged_at:typeof l.at==='number'&&Number.isFinite(l.at)?new Date(l.at).toISOString():null,
      });
    });
  });
  if (!rows.length) return { dropped };
  const { error } = await supabase.from("exercise_logs").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
  return { dropped };
}

export async function pullExerciseLogs(userId,canApply=()=>true,applyRemote=fn=>fn()) {
  const rows=await readOwnerRows(supabase,"exercise_logs",userId,{canRead:canApply});
  const valid = rows.filter(validateExerciseLog);
  if(canApply())applyRemote(()=>Store.mergeExerciseLogsFromRemote(valid));
  return { dropped: rows.length - valid.length };
}

// ---------------------------------------------------------------------------
// pr_history (append-only)
// ---------------------------------------------------------------------------
export async function pushPRHistory(userId) {
  const s = Store.getRawStateForSync();
  await flushDeletes(userId, "pr_history", "prs", (key) => {
    const [exerciseId, date, weight, prevWeight] = key.split("|");
    return { id: deterministicId("pr", userId, exerciseId, date, Number(weight), Number(prevWeight)) };
  });
  const valid = s.prHistory.filter(validatePR);
  const dropped = s.prHistory.length - valid.length;
  if (!valid.length) return { dropped };
  const rows = valid.map((p) => ({
    id: deterministicId("pr", userId, p.exerciseId, p.date, p.weight, p.prevWeight),
    user_id: userId, exercise_id: p.exerciseId, exercise_name: p.exerciseName, weight: p.weight, prev_weight: p.prevWeight, date: p.date,
  }));
  const { error } = await supabase.from("pr_history").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
  return { dropped };
}

export async function pullPRHistory(userId,canApply=()=>true,applyRemote=fn=>fn()) {
  const rows=await readOwnerRows(supabase,"pr_history",userId,{canRead:canApply});
  const valid = rows.filter(validatePR);
  if(canApply())applyRemote(()=>Store.mergePRHistoryFromRemote(valid));
  return { dropped: rows.length - valid.length };
}

// ---------------------------------------------------------------------------
// workout_days (set of dates, insert-if-absent)
// ---------------------------------------------------------------------------
export async function pushWorkoutDays(userId) {
  const s = Store.getRawStateForSync();
  const valid = s.workoutDays.filter(validateWorkoutDay);
  const dropped = s.workoutDays.length - valid.length;
  if (!valid.length) return { dropped };
  const rows = valid.map((date) => ({ user_id: userId, date }));
  const { error } = await supabase.from("workout_days").upsert(rows, { onConflict: "user_id,date", ignoreDuplicates: true });
  if (error) throw error;
  return { dropped };
}

export async function pullWorkoutDays(userId,canApply=()=>true,applyRemote=fn=>fn()) {
  const rows=await readOwnerRows(supabase,"workout_days",userId,{columns:"date",key:"date",canRead:canApply});
  const dates = rows.map((r) => r.date);
  const valid = dates.filter(validateWorkoutDay);
  if(canApply())applyRemote(()=>Store.mergeWorkoutDaysFromRemote(valid));
  return { dropped: dates.length - valid.length };
}

// ---------------------------------------------------------------------------
// exercise_favorites (one row per user, last-write-wins by updated_ms).
// Never fatal: if the table is missing or the call fails, the rest of the sync
// cycle must still succeed, so errors are swallowed here (favourites stay local).
// ---------------------------------------------------------------------------
function validFavRow(r) {
  return r && Array.isArray(r.exercise_ids) && r.exercise_ids.length <= 500
    && r.exercise_ids.every((x) => typeof x === "string" && x.length > 0 && x.length <= 120)
    && Number.isFinite(Number(r.updated_ms));
}

export async function pushFavorites(userId) {
  try {
    const local = Store.getFavoritesMeta();
    const { data, error } = await supabase.from("exercise_favorites").select("updated_ms").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    const remoteMs = data ? Number(data.updated_ms) : 0;
    if (local.updatedMs <= remoteMs) return { dropped: 0 }; // remote is same or newer, pull handles it
    const { error: e2 } = await supabase.from("exercise_favorites").upsert({
      user_id: userId, exercise_ids: local.ids, updated_ms: local.updatedMs, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (e2) throw e2;
  } catch (e) {
    console.warn("favorites push skipped", e && e.message);
  }
  return { dropped: 0 };
}

export async function pullFavorites(userId,canApply=()=>true,applyRemote=fn=>fn()) {
  try {
    const { data, error } = await supabase.from("exercise_favorites").select("exercise_ids,updated_ms").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!data) return { dropped: 0 };
    if (!validFavRow(data)) return { dropped: 1 };
    if(canApply())applyRemote(()=>Store.mergeFavoritesFromRemote(data.exercise_ids, Number(data.updated_ms)));
  } catch (e) {
    console.warn("favorites pull skipped", e && e.message);
  }
  return { dropped: 0 };
}

// ---------------------------------------------------------------------------
// Orchestration helpers used by syncManager.js — each returns the total
// number of rows dropped for failing validation, across every domain.
// ---------------------------------------------------------------------------
export async function pushAll(userId,{mutable=true}={}) {
  const results = await Promise.all([
    ...(mutable?[pushProfile(userId), pushWeightLogs(userId), pushFoodLog(userId), pushExercises(userId)]:[]),
    pushExerciseLogs(userId), pushPRHistory(userId), pushWorkoutDays(userId), pushFavorites(userId),
  ]);
  return results.reduce((sum, r) => sum + r.dropped, 0);
}

export async function pullAll(userId,canApply=()=>true,applyRemote=fn=>fn(),{mutable=true}={}) {
  const results = await Promise.all([
    ...(mutable?[pullProfile(userId,canApply,applyRemote), pullWeightLogs(userId,canApply,applyRemote), pullFoodLog(userId,canApply,applyRemote), pullExercises(userId,canApply,applyRemote)]:[]),
    pullExerciseLogs(userId,canApply,applyRemote), pullPRHistory(userId,canApply,applyRemote), pullWorkoutDays(userId,canApply,applyRemote), pullFavorites(userId,canApply,applyRemote),
  ]);
  return results.reduce((sum, r) => sum + r.dropped, 0);
                         }
