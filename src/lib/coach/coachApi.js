import { localISO } from "../dateKey";
import { supabase } from "../supabaseClient";
import { tx } from "../i18n/tx";

const lower = (s) => String(s || "").trim().toLowerCase();
async function me() {
  const { data } = await supabase.auth.getUser();
  return { id: data?.user?.id, email: lower(data?.user?.email) };
}
const iso = (d) => localISO(d);

export async function isCoach() {
  if (!supabase) return false;
  const u = await me();
  if (!u.email) return false;
  const { data } = await supabase.from("coach_grants").select("email").eq("email", u.email).maybeSingle();
  return !!data;
}

/* ---- trainee side ---- */
export async function myInvites() {
  const u = await me();
  const { data, error } = await supabase.from("coach_links").select("id,coach_email,status,created_at").eq("trainee_email", u.email).neq("status", "revoked").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
export async function respondInvite(id, accept) {
  const u = await me();
  const { error } = await supabase.from("coach_links").update({ status: accept ? "active" : "revoked", trainee_id: u.id }).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---- coach side ---- */
export async function inviteTrainee(email) {
  const u = await me();
  const e = lower(email);
  if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error(tx("إيميل غير صحيح"));
  if (e === u.email) throw new Error(tx("مينفعش تدعو نفسك"));
  const { error } = await supabase.from("coach_links").insert({ coach_id: u.id, coach_email: u.email, trainee_email: e, status: "pending" });
  if (error) throw new Error(error.code === "23505" ? tx("الدعوة دي اتبعتت قبل كده") : error.message);
}
export async function myTrainees() {
  const u = await me();
  const { data, error } = await supabase.from("coach_links").select("id,trainee_email,trainee_id,status,created_at").eq("coach_id", u.id).neq("status", "revoked").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
export async function revokeLink(id) {
  const { error } = await supabase.from("coach_links").update({ status: "revoked" }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Summary + detail for one trainee (read-only; RLS limits to active links). */
export async function traineeReport(traineeId) {
  const since = new Date(Date.now() - 30 * 86400000);
  const sinceIso = iso(since);
  const [prof, days, weights, foods, prs] = await Promise.all([
    supabase.from("profiles").select("name,username,height_cm").eq("id", traineeId).maybeSingle(),
    supabase.from("workout_days").select("date").eq("user_id", traineeId).gte("date", sinceIso).order("date", { ascending: false }),
    supabase.from("weight_logs").select("date,weight").eq("user_id", traineeId).gte("date", sinceIso).order("date", { ascending: true }),
    supabase.from("food_log").select("date,total_kcal,total_protein").eq("user_id", traineeId).gte("date", sinceIso).order("date", { ascending: false }),
    supabase.from("pr_history").select("exercise_name,weight,prev_weight,date").eq("user_id", traineeId).order("date", { ascending: false }).limit(5),
  ]);
  const dayList = (days.data || []).map((d) => d.date);
  const set = new Set(dayList);
  const last7 = Array.from({ length: 7 }, (_, i) => iso(new Date(Date.now() - i * 86400000))).filter((d) => set.has(d)).length;
  let streak = 0;
  for (let i = set.has(iso(new Date())) ? 0 : 1; i < 400; i++) { if (set.has(iso(new Date(Date.now() - i * 86400000)))) streak++; else break; }
  const w = weights.data || [];
  const f = (foods.data || []).slice(0, 7);
  return {
    name: prof.data?.name || prof.data?.username || "",
    lastWorkout: dayList[0] || null,
    last7, streak,
    days30: dayList.length, dayList,
    weights: w.map((x) => ({ date: x.date, weight: Number(x.weight) })),
    weightFirst: w[0] || null, weightLast: w[w.length - 1] || null,
    avgKcal: f.length ? Math.round(f.reduce((a, x) => a + Number(x.total_kcal || 0), 0) / f.length) : null,
    avgProtein: f.length ? Math.round(f.reduce((a, x) => a + Number(x.total_protein || 0), 0) / f.length) : null,
    prs: prs.data || [],
    errors: [prof, days, weights, foods, prs].some((r) => r.error),
  };
}

/* ---- program assignments (migration 0019; every call fails soft if the table is missing) ---- */
export async function assignProgram(traineeId, programId, note = "") {
  const u = await me();
  const { error } = await supabase.from("coach_assignments").insert({
    coach_id: u.id, coach_email: u.email, trainee_id: traineeId, program_id: programId, note: note.trim().slice(0, 500) || null,
  });
  if (error) throw new Error(error.message);
}
export async function latestAssignment() {
  try {
    const u = await me();
    const { data, error } = await supabase.from("coach_assignments").select("id,coach_email,program_id,note,created_at")
      .eq("trainee_id", u.id).order("created_at", { ascending: false }).limit(1);
    if (error) return null;
    return data?.[0] || null;
  } catch { return null; }
}

/** Programs this coach already sent to one trainee (fails soft if 0019 is missing). */
export async function sentAssignments(traineeId, limit = 5) {
  try {
    const u = await me();
    const { data, error } = await supabase.from("coach_assignments").select("id,program_id,note,created_at")
      .eq("coach_id", u.id).eq("trainee_id", traineeId).order("created_at", { ascending: false }).limit(limit);
    return error ? [] : data || [];
  } catch { return []; }
}
