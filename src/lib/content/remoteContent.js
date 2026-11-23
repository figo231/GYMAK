import { supabase } from "../supabaseClient";

/* Owner-editable content (exercises, foods) published from the in-app owner panel.
   Built-in lists stay as the offline fallback; remote rows are cached locally and
   layered on top (same id replaces, active=false hides). */
const KEY = "gymak_remote_content_v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function remoteExercises() { return read().exercises || []; }
export function remoteFoods() { return read().foods || []; }

export async function refreshRemoteContent() {
  if (!supabase) return false;
  try {
    const [ex, fd] = await Promise.all([
      supabase.from("content_exercises").select("id,data,active"),
      supabase.from("content_foods").select("id,data,active"),
    ]);
    if (ex.error || fd.error) return false;
    localStorage.setItem(KEY, JSON.stringify({
      exercises: ex.data || [],
      foods: fd.data || [],
      at: Date.now(),
    }));
    window.dispatchEvent(new Event("gymak-content"));
    return true;
  } catch { return false; }
}

/** Layer remote exercise rows over a base list. */
export function mergeExercises(base) {
  const rows = remoteExercises();
  if (!rows.length) return base;
  const hidden = new Set(rows.filter((r) => !r.active).map((r) => r.id));
  const byId = new Map(rows.filter((r) => r.active).map((r) => [r.id, { ...r.data, id: r.id, custom: false, ownerContent: true }]));
  const out = base.filter((e) => !hidden.has(e.id)).map((e) => byId.get(e.id) || e);
  const have = new Set(out.map((e) => e.id));
  byId.forEach((e, id) => { if (!have.has(id)) out.push(e); });
  return out;
}

export function remoteExerciseFrames(id) {
  const row = remoteExercises().find((r) => r.id === id && r.active);
  const f = row?.data?.frames;
  return Array.isArray(f) && f.length >= 1 ? [f[0], f[1] || f[0]] : null;
}

export function activeRemoteFoods() {
  return remoteFoods().filter((r) => r.active && r.data && Array.isArray(r.data.names) && r.data.per100).map((r) => r.data);
}

/* ---- owner-only writes (RLS enforces admin) ---- */
export async function saveContent(table, id, data, active = true) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from(table).upsert({ id, data, active, updated_at: new Date().toISOString(), updated_by: u?.user?.id || null });
  if (error) throw new Error(error.message);
  await refreshRemoteContent();
}
export async function setContentActive(table, id, active) {
  const { error } = await supabase.from(table).update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await refreshRemoteContent();
}
export async function listCoaches() {
  const { data, error } = await supabase.from("coach_grants").select("email,created_at").order("created_at");
  if (error) throw new Error(error.message);
  return data || [];
}
export async function addCoach(email) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from("coach_grants").insert({ email: email.trim().toLowerCase(), granted_by: u?.user?.id || null });
  if (error) throw new Error(error.message);
}
export async function removeCoach(email) {
  const { error } = await supabase.from("coach_grants").delete().eq("email", email);
  if (error) throw new Error(error.message);
}
