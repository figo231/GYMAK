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

export async function pullProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (data && !validateProfileFromRemote(data)) return { dropped: 1 };
  Store.mergeProfileFromRemote(data);
  return { dropped: 0 };
}

// ---------------------------------------------------------------------------
// weight_logs (one row per date)
// ---------------------------------------------------------------------------
export async function pushWeightLogs(userId) {
  const s = Store.getRawStateForSync();
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

export async function pullWeightLogs(userId) {
  const { data, error } = await supabase.from("weight_logs").select("*").eq("user_id", userId);
  if (error) throw error;
  const rows = data || [];
  const valid = rows.filter(validateWeightLog);
  Store.mergeWeightLogsFromRemote(valid);
  return { dropped: rows.length - valid.length };
}

// ---------------------------------------------------------------------------
// food_log (one row per date)
// ---------------------------------------------------------------------------
export async function pushFoodLog(userId) {
  const s = Store.getRawStateForSync();
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

export async function pullFoodLog(userId) {
  const { data, error } = await supabase.from("food_log").select("*").eq("user_id", userId);
  if (error) throw error;
  const rows = data || [];
  const valid = rows.filter(validateFoodLog);
  Store.mergeFoodLogFromRemote(valid);
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

export async function pullExercises(userId) {
  const { data, error } = await supabase.from("exercises").select("*").eq("user_id", userId);
  if (error) throw error;
  const rows = data || [];
  const valid = rows.filter(validateExercise);
  Store.mergeExercisesFromRemote(valid);
  return { dropped: rows.length - valid.length };
}

// ---------------------------------------------------------------------------
// exercise_logs (append-only)
// ---------------------------------------------------------------------------
export async function pushExerciseLogs(userId) {
  const s = Store.getRawStateForSync();
  const rows = [];
  let dropped = 0;
  Object.entries(s.exerciseLogs).forEach(([exerciseId, logs]) => {
    logs.forEach((l) => {
      const candidate = { ...l, exerciseId };
      if (!validateExerciseLog(candidate)) { dropped++; return; }
      rows.push({
        id: deterministicId("exercise_log", userId, exerciseId, l.date, l.weight, l.sets, l.reps),
        user_id: userId, exercise_id: exerciseId, date: l.date, weight: l.weight, sets: l.sets, reps: l.reps,
      });
    });
  });
  if (!rows.length) return { dropped };
  const { error } = await supabase.from("exercise_logs").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return { dropped };
}

export async function pullExerciseLogs(userId) {
  const { data, error } = await supabase.from("exercise_logs").select("*").eq("user_id", userId);
  if (error) throw error;
  const rows = data || [];
  const valid = rows.filter(validateExerciseLog);
  Store.mergeExerciseLogsFromRemote(valid);
  return { dropped: rows.length - valid.length };
}

// ---------------------------------------------------------------------------
// pr_history (append-only)
// ---------------------------------------------------------------------------
export async function pushPRHistory(userId) {
  const s = Store.getRawStateForSync();
  const valid = s.prHistory.filter(validatePR);
  const dropped = s.prHistory.length - valid.length;
  if (!valid.length) return { dropped };
  const rows = valid.map((p) => ({
    id: deterministicId("pr", userId, p.exerciseId, p.date, p.weight, p.prevWeight),
    user_id: userId, exercise_id: p.exerciseId, exercise_name: p.exerciseName, weight: p.weight, prev_weight: p.prevWeight, date: p.date,
  }));
  const { error } = await supabase.from("pr_history").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return { dropped };
}

export async function pullPRHistory(userId) {
  const { data, error } = await supabase.from("pr_history").select("*").eq("user_id", userId);
  if (error) throw error;
  const rows = data || [];
  const valid = rows.filter(validatePR);
  Store.mergePRHistoryFromRemote(valid);
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
  const { error } = await supabase.from("workout_days").upsert(rows, { onConflict: "user_id,date" });
  if (error) throw error;
  return { dropped };
}

export async function pullWorkoutDays(userId) {
  const { data, error } = await supabase.from("workout_days").select("date").eq("user_id", userId);
  if (error) throw error;
  const dates = (data || []).map((r) => r.date);
  const valid = dates.filter(validateWorkoutDay);
  Store.mergeWorkoutDaysFromRemote(valid);
  return { dropped: dates.length - valid.length };
}

// ---------------------------------------------------------------------------
// Orchestration helpers used by syncManager.js — each returns the total
// number of rows dropped for failing validation, across every domain.
// ---------------------------------------------------------------------------
export async function pushAll(userId) {
  const results = await Promise.all([
    pushProfile(userId), pushWeightLogs(userId), pushFoodLog(userId), pushExercises(userId),
    pushExerciseLogs(userId), pushPRHistory(userId), pushWorkoutDays(userId),
  ]);
  return results.reduce((sum, r) => sum + r.dropped, 0);
}

export async function pullAll(userId) {
  const results = await Promise.all([
    pullProfile(userId), pullWeightLogs(userId), pullFoodLog(userId), pullExercises(userId),
    pullExerciseLogs(userId), pullPRHistory(userId), pullWorkoutDays(userId),
  ]);
  return results.reduce((sum, r) => sum + r.dropped, 0);
}
