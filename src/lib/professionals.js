import { supabase } from './supabaseClient';
import { withTimeout } from './authLogic';
import { tx } from "./i18n/tx";
async function rpc(name, args, client = supabase) {
  if (!client) throw new Error('not_configured');
  const { data, error } = await withTimeout(client.rpc(name, args), 15000);
  if (error) throw error;
  return data;
}
export const listProfessionals = (kind = 'all', after = null, client) => rpc('professional_directory_v2', { p_kind: kind, p_after_id: after }, client);
export const ownerProfessionalCard = (id, client) => rpc('professional_card_owner', { p_user_id: id }, client);
export const saveProfessionalCard = (id, name, bio, published, client) => rpc('professional_card_save', { p_user_id: id, p_name: name.trim(), p_bio: bio.trim(), p_published: published }, client);
export const requestProfessional = (id, kind, client) => rpc('professional_request_send', { p_professional_id: id, p_kind: kind }, client);
export const listProfessionalRequests = (cursor = null, client) => rpc('professional_request_list', { p_after_at: cursor?.created_at || null, p_after_id: cursor?.id || null }, client);
export const answerProfessionalRequest = (id, action, client) => rpc('professional_request_answer', { p_id: id, p_action: action }, client);
export function professionalError(error) {
  const s = String(error?.message || error || '');
  if (/card_no_email/.test(s)) return tx('مينفعش تحط بريد إلكتروني في البطاقة الظاهرة للناس.');
  if (/invalid_card/.test(s)) return tx('اكتب اسم من 1 إلى 80 حرف، ووصف لحد 500 حرف.');
  if (/professional_required/.test(s)) return tx('اختار حساب المالك عيّنه مدرب أو دكتور الأول. البطاقة مش بتمنح دور.');
  if (/owner_only/.test(s)) return tx('إدارة الاقتراحات لحساب المالك بس.');
  if (/request_closed/.test(s)) return tx('الطلب ده اتقفل. مينفعش تبعت طلب جديد لنفس الشخص.');
  if (/request_not_allowed/.test(s)) return tx('الطلب مش متاح دلوقتي. ممكن الصفة أو حالة الطلب اتغيّرت. حدّث الصفحة.');
  if (/chat_rate_limited/.test(s)) return tx('وصلت لحد 10 طلبات في اليوم. جرب بكرة.');
  if (/consent_required/.test(s)) return tx('افتح رسائلك ووافق على تنبيه الخصوصية الأول، وبعدها ارجع ابعت الطلب.');
  if (/PGRST202|42883|42P01/.test(`${error?.code} ${s}`)) return tx('القسم لسه مش مفعّل على السيرفر. جرب بعد التفعيل.');
  return tx('معرفناش نكمل. راجع النت وجرب تاني.');
}
export const REQUEST_LABELS = { pending: tx('في انتظار الرد'), accepted: tx('مقبول'), declined: tx('مرفوض'), canceled: tx('متوقف') };
