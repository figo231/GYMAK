import { supabase } from "./supabaseClient";
import { withTimeout } from "./authLogic";

// Must match the version enforced in supabase/migrations/0027_ugc_terms_moderation.sql.
export const TERMS_VERSION = "2026-11-23-tou-v1";
export const TERMS_URL = "/terms.html";

export const REPORT_REASONS = [
  ["abuse", "تحرّش أو إساءة"],
  ["sexual", "محتوى جنسي أو غير لائق"],
  ["scam", "احتيال أو سبام"],
  ["impersonation", "انتحال شخصية"],
  ["other", "سبب تاني"],
];
export const REPORT_TYPE_LABELS = { chat_message: "رسالة محادثة", chat_user: "مستخدم", support_reply: "رد دعم" };
export const REPORT_STATUS_LABELS = { open: "جديد", reviewed: "اتراجع", actioned: "اتخذ إجراء", dismissed: "مرفوض" };

export function validateReportDetails(value) {
  const details = String(value ?? "").trim();
  if (Array.from(details).length > 1000) return { ok: false, error: "التفاصيل طويلة. الحد الأقصى 1000 حرف." };
  return { ok: true, details: details || null };
}

export function moderationError(error) {
  const s = String(error?.message || error || "");
  if (/report_rate_limited/.test(s)) return "بعتّ بلاغات كتير في وقت قصير. استنى شوية وجرب تاني.";
  if (/report_duplicate/.test(s)) return "البلاغ ده اتبعت قبل كده.";
  if (/report_self/.test(s)) return "مينفعش تبلّغ عن نفسك.";
  if (/invalid_reason|invalid_details|invalid_target_type/.test(s)) return "البيانات المطلوبة للبلاغ ناقصة. جرّب تاني.";
  if (/owner_only/.test(s)) return "مراجعة البلاغات متاحة لحساب المالك بس.";
  if (/invalid_block|account_not_found/.test(s)) return "الحساب ده مش متاح للحظر.";
  if (/consent_required|terms_version_mismatch/.test(s)) return "راجع شروط الاستخدام ووافق عليها الأول.";
  if (/report_not_allowed|not_authenticated/.test(s) || error?.code === "42501") return "البلاغ ده مش متاح لحسابك.";
  if (/PGRST202|PGRST205|42883|42P01/.test(`${error?.code} ${s}`) || /Could not find.*(?:moderation|chat_block|terms_)/i.test(s)) return "الإبلاغ والحظر لسه مش مفعلين على السيرفر. جرّب بعد التفعيل.";
  return "معرفناش نكمل الطلب. راجع النت وجرب تاني.";
}

function clientOrThrow(client) {
  if (!client) throw new Error("moderation_not_configured");
  return client;
}
async function rpc(name, args, client = supabase) {
  const { data, error } = await withTimeout(clientOrThrow(client).rpc(name, args), 15000);
  if (error) throw error;
  return data;
}

export const fetchTermsStatus = (client) => rpc("terms_status", {}, client);
export const acceptTerms = (client) => rpc("terms_accept", { p_version: TERMS_VERSION }, client);
export const blockChatUser = (userId, client) => rpc("chat_block", { p_user_id: userId }, client);
export const unblockChatUser = (userId, client) => rpc("chat_unblock", { p_user_id: userId }, client);
export const fetchMyChatBlocks = (client) => rpc("chat_blocks_mine", {}, client);

export async function reportContent({ targetType, reason, targetUserId = null, conversationId = null, messageId = null, feedbackId = null, details = "" }, client) {
  const v = validateReportDetails(details);
  if (!v.ok) throw new Error(v.error);
  if (!REPORT_REASONS.some(([code]) => code === reason)) throw new Error("invalid_reason");
  return rpc("moderation_report", {
    p_target_type: targetType, p_reason: reason,
    p_target_user_id: targetUserId, p_conversation_id: conversationId,
    p_message_id: messageId, p_feedback_id: feedbackId, p_details: v.details,
  }, client);
}

export const fetchModerationReports = (status = "open", cursor = null, client) =>
  rpc("moderation_reports_list", { p_status: status, ...(cursor ? { p_before_at: cursor.created_at, p_before_id: cursor.id } : {}) }, client);
export const setModerationReportStatus = (id, status, client) =>
  rpc("moderation_report_update", { p_id: id, p_status: status }, client);
