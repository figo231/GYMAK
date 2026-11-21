import { supabase } from "../supabaseClient";

/* Owner-only helpers. Admin-ness is decided server side (admin_users + RLS +
   the send-notification edge function); the app only hides the UI. */
export async function isOwnerAdmin(userId) {
  if (!supabase || !userId) return false;
  try {
    const { data } = await supabase.from("admin_users").select("role").eq("user_id", userId).maybeSingle();
    return !!data;
  } catch { return false; }
}

export async function sendBroadcast({ title, body }) {
  if (!supabase) throw new Error("no-supabase");
  const { data: inserted, error } = await supabase
    .from("notifications")
    .insert({ title, body, category: "announcement", priority: "normal", audience_type: "everyone", audience_ref: null, status: "draft" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { error: fnError } = await supabase.functions.invoke("send-notification", { body: { notificationId: inserted.id } });
  if (fnError) throw new Error(fnError.message);
}
