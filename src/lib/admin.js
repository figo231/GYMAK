import { supabase } from "./supabaseClient";
import { tx } from "./i18n/tx";

export function validateReply(text) {
  const t = String(text || "").trim();
  if (!t) return { ok: false, error: tx("اكتب الرد الأول.") };
  if (t.length > 2000) return { ok: false, error: tx("الرد طويل. الحد الأقصى 2000 حرف.") };
  return { ok: true, text: t };
}
export const STATUS_LABEL = { new: tx("جديدة"), read: tx("اتقرأت"), replied: tx("اترد عليها") };
export function countByStatus(rows) {
  const c = { new: 0, read: 0, replied: 0 };
  (rows || []).forEach((r) => { if (c[r.status] !== undefined) c[r.status]++; });
  return c;
}
export function filterFeedback(rows, f) { return f === "all" ? rows : rows.filter((r) => r.status === f); }
const isoDaysAgo = (n) => { const d = new Date(Date.now() - n * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export async function fetchStats(client = supabase) {
  const head = (q) => q.then((r) => (r.error ? null : r.count));
  const prof = () => client.from("profiles").select("id", { count: "exact", head: true });
  const [total, week, female, male] = await Promise.all([
    head(prof()),
    head(prof().gte("member_since", isoDaysAgo(7))),
    head(prof().eq("gender", "female")),
    head(prof().eq("gender", "male")),
  ]);
  return { total, week, female, male };
}
export async function fetchFeedback(client = supabase, limit = 100) {
  const { data, error } = await client.from("feedback").select("id,user_id,message,status,app_version,created_at,admin_reply,replied_at").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  const rows = data || [];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  let names = {};
  if (ids.length) {
    const { data: ps } = await client.from("profiles").select("id,name,username").in("id", ids);
    (ps || []).forEach((p) => { names[p.id] = p.name || p.username || ""; });
  }
  return rows.map((r) => ({ ...r, who: names[r.user_id] || tx("مستخدم") }));
}
export async function setFeedbackStatus(id, status, client = supabase) {
  const { error } = await client.from("feedback").update({ status }).eq("id", id);
  return !error;
}
export async function replyFeedback(id, text, client = supabase) {
  const v = validateReply(text);
  if (!v.ok) return v;
  const { error } = await client.from("feedback").update({ admin_reply: v.text, replied_at: new Date().toISOString(), status: "replied" }).eq("id", id);
  return error ? { ok: false, error: tx("معرفناش نحفظ الرد. جرّب تاني.") } : { ok: true };
}
export async function fetchMyFeedback(client = supabase) {
  if (!client) return [];
  const { data, error } = await client.from("feedback").select("id,message,created_at,admin_reply,replied_at").order("created_at", { ascending: false }).limit(10);
  return error ? [] : data || [];
}
