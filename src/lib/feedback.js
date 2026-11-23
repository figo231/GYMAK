import { supabase } from "./supabaseClient";
import { tx } from "./i18n/tx";
export const PUBLIC_EMAIL = "kareemmohamed7392@gmail.com";
export function validateFeedback(msg) {
  const t = String(msg || "").trim();
  if (t.length < 5) return { ok: false, error: tx("اكتب رسالة أطول شوية (5 حروف على الأقل).") };
  if (t.length > 2000) return { ok: false, error: tx("الرسالة طويلة. الحد الأقصى 2000 حرف.") };
  return { ok: true, text: t };
}
export async function sendFeedback(message, { client = supabase, version = "" } = {}) {
  const v = validateFeedback(message);
  if (!v.ok) return v;
  if (!client) return { ok: false, error: tx("الخدمة مش متاحة دلوقتي. ابعت لنا على البريد.") };
  const { data, error } = await client.from("feedback").insert({ message: v.text, app_version: version || null }).select("id").single();
  if (error) {
    if (/rate_limited/.test(error.message || "")) return { ok: false, error: tx("بعتّ رسايل كتير. جرّب بعد ساعة.") };
    return { ok: false, error: tx("معرفناش نبعت الرسالة. جرّب تاني بعد شوية.") };
  }
  return { ok: true, id: data?.id || null };
}
