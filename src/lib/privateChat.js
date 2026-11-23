import { supabase } from "./supabaseClient";
import { withTimeout } from "./authLogic";
import { tx } from "./i18n/tx";

export const CHAT_TERMS_VERSION = "2026-11-23-tou-v1";
export const CHAT_MAX_LENGTH = 2000;
export const CHAT_ROLE_LABELS = { user: tx("مستخدم"), coach: tx("مدرب"), doctor: tx("دكتور تغذية") };
export const CHAT_PRIVACY = tx("الرسائل خاصة بالطرفين داخل التطبيق، ومحمية بـ HTTPS أثناء النقل. مش تشفير من الطرف للطرف (E2EE): مسؤول قاعدة البيانات يقدر تقنيًا يقرأ الرسائل المخزنة. صاحب التطبيق مش بيشوف محادثات غيره من لوحة الإدارة، والاستثناء الوحيد إنه يراجع المحتوى اللي مستخدم بلّغ عنه بالظبط عشان ياخد إجراء.");
export const CHAT_HEALTH_NOTE = tx("إرشادات عامة، مش للطوارئ ولا بديل عن الكشف الطبي. مفيش ضمان لرد فوري. صفة دكتور أو مدرب بيحددها صاحب التطبيق، ومش توثيق لشهادة أو ترخيص. متبعتش مستندات طبية أو معلومات شخصية مش ضرورية.");

export function newChatNonce(cryptoApi = globalThis.crypto) {
  if (cryptoApi.randomUUID) return cryptoApi.randomUUID();
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function validateChatMessage(value) {
  const body = String(value ?? "").trim();
  if (!body) return { ok: false, error: tx("اكتب رسالة الأول.") };
  if (Array.from(body).length > CHAT_MAX_LENGTH) return { ok: false, error: tx("الرسالة طويلة. الحد الأقصى 2000 حرف.") };
  return { ok: true, body };
}

// Deliberately HTTPS only, no HTML, Markdown, embeds, previews or URL-fetching.
export function safeChatUrl(value) {
  if (typeof value !== "string" || !/^https:\/\//i.test(value) || /[\u0000-\u0020\u007f-\u009f\\\u202a-\u202e\u2066-\u2069]/u.test(value)) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || !u.hostname || u.username || u.password || (u.port && u.port !== "443")) return null;
    return { href: u.href, host: u.hostname };
  } catch { return null; }
}
export function splitChatLinks(body) {
  const text = String(body ?? "");
  const out = []; let start = 0;
  const pattern = /https:\/\/[^\s<>"'\u0000-\u001f]+/giu;
  for (const match of text.matchAll(pattern)) {
    if (match.index > start) out.push({ text: text.slice(start, match.index) });
    const raw = match[0];
    // Sentence punctuation is text, not part of the clickable destination.
    const token = raw.replace(/[.,،؛!?؟)\]}]+$/u, "");
    const link = safeChatUrl(token);
    out.push(link ? { text: token, ...link } : { text: token });
    if (raw.length > token.length) out.push({ text: raw.slice(token.length) });
    start = match.index + raw.length;
  }
  if (start < text.length) out.push({ text: text.slice(start) });
  return out.length ? out : [{ text }];
}

export function chatError(error) {
  const s = String(error?.message || error || "");
  if (/chat_rate_limited/.test(s)) return tx("بعتّ رسايل كتير. استنى شوية وجرب تاني.");
  if (/chat_blocked/.test(s)) return tx("المحادثة متوقفة بسبب حظر بين الطرفين.");
  if (/chat_read_only/.test(s)) return tx("المحادثة للقراءة بس، لأن المتابعة أو الصفة اتغيّرت.");
  if (/consent_required|terms_version_mismatch/.test(s)) return tx("راجع تنبيه الخصوصية ووافق عليه الأول.");
  if (/owner_only/.test(s)) return tx("تعديل الأدوار متاح لحساب المالك بس.");
  if (/coach_email_required/.test(s)) return tx("الحساب ده ملوش بريد مسجل. دور المدرب محتاج بريد، لكن ممكن تعيينه دكتور أو مستخدم.");
  if (/account_not_found/.test(s)) return tx("مفيش حساب بالإيميل ده. لازم يسجل في التطبيق الأول.");
  if (/idempotency_conflict/.test(s)) return tx("الرسالة لسه قيد المراجعة. حدّث المحادثة قبل ما تحاول تاني.");
  if (/chat_not_allowed|not_authenticated|not_allowed/.test(s) || error?.code === "42501") return tx("المحادثة دي مش متاحة لحسابك. راجع تسجيل الدخول والمتابعة.");
  if (/PGRST202|PGRST205|42883|42P01/.test(`${error?.code} ${s}`) || /Could not find.*(?:chat_|function)/i.test(s)) return tx("الرسائل لسه مش مفعلة على السيرفر. جرّب بعد التفعيل.");
  return tx("معرفناش نكمل الطلب. راجع النت وجرب تاني. الرسائل غير المرسلة مش محفوظة بعد قفل الصفحة.");
}
function clientOrThrow(client) {
  if (!client) throw new Error("chat_not_configured");
  return client;
}
async function rpc(name, args, client = supabase) {
  const { data, error } = await withTimeout(clientOrThrow(client).rpc(name, args), 15000);
  if (error) throw error;
  return data;
}
export const chatBootstrap = (client) => rpc("chat_bootstrap_v2", undefined, client);
export const acceptChatTerms = (client) => rpc("chat_accept_terms_v2", { p_version: CHAT_TERMS_VERSION }, client);
export const fetchChatContacts = (cursor = null, client) => rpc("chat_contacts_v2", cursor ? { p_after_kind: cursor.kind, p_after_id: cursor.user_id } : {}, client);
export const fetchChatInbox = (cursor = null, client) => rpc("chat_inbox_v2", cursor ? { p_before_at: cursor.last_message_at, p_before_id: cursor.id } : {}, client);
export const fetchChatThread = async (id, client) => (await rpc("chat_inbox_v2", { p_only: id }, client))?.[0] || null;
export const startChat = (professionalId, kind, client) => rpc("chat_start_v2", { p_professional_id: professionalId, p_kind: kind }, client);
export const markChatRead = (id, seq, client) => rpc("chat_mark_read", { p_conversation_id: id, p_through_seq: seq }, client);
export const fetchOwnerStats = (client) => rpc("chat_owner_stats", {}, client);
export const fetchOwnerUsers = (search = "", role = "all", cursor = null, client) => rpc("chat_users", { p_search: search, p_role: role, ...(cursor ? { p_before_at: cursor.created_at, p_before_id: cursor.user_id } : {}) }, client);
export const fetchLegacyCoaches = (after = null, client) => rpc("chat_legacy_coaches", { p_after_email: after }, client);
export const setOwnerUserRole = (id, role, client) => rpc("chat_set_user_role", { p_user_id: id, p_role: role }, client);
export const setChatRole = (email, role, client) => rpc("chat_set_role", { p_email: String(email || "").trim().toLowerCase(), p_role: role }, client);
export async function sendChatMessage(id, body, clientId, client) {
  const v = validateChatMessage(body);
  if (!v.ok) throw new Error(v.error);
  const rows = await rpc("chat_send_v2", { p_conversation_id: id, p_body: v.body, p_client_id: clientId }, client);
  if (!rows?.[0]) throw new Error("missing_message");
  return rows[0];
}
export async function fetchChatMessages(id, before = null, client = supabase) {
  let q = clientOrThrow(client).from("chat_messages").select("id,seq,conversation_id,author_id,body,created_at")
    .eq("conversation_id", id).order("seq", { ascending: false }).limit(50);
  if (before != null) q = q.lt("seq", before);
  const { data, error } = await withTimeout(q, 15000);
  if (error) throw error;
  return (data || []).reverse();
}
export function mergeChatMessages(a, b) {
  const byId = new Map([...a, ...b].map((m) => [m.id, m]));
  return [...byId.values()].sort((x, y) => Number(x.seq) - Number(y.seq));
}
export function subscribeChat(id, onChange, client = supabase) {
  if (!client) return () => {};
  // Realtime is a refresh signal only. Fetch again through authenticated RLS.
  let c = client.channel(`private-chat-${id || "inbox"}-${newChatNonce()}`);
  if (id) c = c.on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${id}` }, () => onChange());
  else c = c.on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_conversations" }, () => onChange());
  c.subscribe();
  return () => { client.removeChannel(c); };
}
