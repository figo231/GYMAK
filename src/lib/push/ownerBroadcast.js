import {REVIEW_BACKEND_GATED} from "../reviewBuild";
import { supabase } from "../supabaseClient";

/* Owner-only helpers. Admin-ness is decided server side (admin_users + RLS +
   the send-notification edge function); the app only hides the UI. */
/* Backend is live (migration 0020, send-notification edge function, FIREBASE_SERVICE_ACCOUNT secret). The first real send after deploy is the end-to-end test. */
export const BROADCAST_ENABLED = true;

export async function isOwnerAdmin(userId) {
  if (!supabase || !userId) return false;
  try {
    const { data } = await supabase.from("admin_users").select("role").eq("user_id", userId).maybeSingle();
    return data?.role === "super_admin";
  } catch { return false; }
}

export async function sendBroadcast({ title, body }) {
  if(REVIEW_BACKEND_GATED)throw Error("review_backend_disabled");
  if (!supabase) throw new Error("no-supabase");
  const { data: inserted, error } = await supabase
    .from("notifications")
    .insert({ title, body, category: "announcement", priority: "normal", audience_type: "everyone", audience_ref: null, status: "draft" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { data: result, error: fnError } = await supabase.functions.invoke("send-notification", { body: { notificationId: inserted.id } });
  if (fnError) {
    let detail = fnError.message;
    try { const j = await fnError.context?.json?.(); if (j?.error) detail = j.error; } catch { /* keep generic message */ }
    throw new Error(detail);
  }
  if (result?.ok !== true) {
    const error = new Error("broadcast_not_accepted");
    error.code = "broadcast_not_accepted";
    throw error;
  }
  return { accepted: true };
}

export function broadcastFeedback(lang = "ar") {
  return lang === "en" ? {
    accepted: "Queued for subscribed devices. Provider acceptance and receipt are not yet confirmed.",
    failed: "Could not confirm delivery acceptance. Do not retry automatically; check the send status first.",
  } : {
    accepted: "الرسالة دخلت طابور الأجهزة المشتركة. ده مش تأكيد قبول خدمة الإشعارات ولا وصولها لكل جهاز.",
    failed: "ماقدرناش نأكد قبول الرسالة للإرسال. متعيدش الإرسال تلقائيًا؛ راجع حالته الأول.",
  };
}
