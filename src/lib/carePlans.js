import { supabase } from './supabaseClient';
import { withTimeout } from './authLogic';
async function rpc(name,args) { if(!supabase)throw Error('الاتصال بالحساب مش متاح.');const {data,error}=await withTimeout(supabase.rpc(name,args),12000);if(error)throw error;return data; }
export const carePlanList=thread=>rpc('care_plan_list',{p_thread:thread});
export const carePlanSave=(thread,form,request,version)=>rpc('care_plan_save',{p_thread:thread,p_title:form.title.trim(),p_meals:form.meals.map(m=>({name:m.name.trim(),items:m.items.trim()})),p_note:form.note.trim(),p_change_note:form.change_note.trim(),p_request:request,p_expected_version:version});
export const carePlanChoose=(thread,version)=>rpc('care_plan_choose',{p_thread:thread,p_version:version});
export function validateCarePlan(form) {return !!(form.title.trim()&&form.title.trim().length<=100&&form.meals.length>=1&&form.meals.length<=12&&form.meals.every(m=>m.name.trim()&&m.name.length<=60&&m.items.trim()&&m.items.length<=600)&&form.note.length<=800&&form.change_note.length<=300);}
export function careError(e){if(/plan_changed_refresh/.test(e?.message))return 'الخطة اتغيرت في مكان تاني. حدّث الصفحة قبل الحفظ.';if(/PGRST202|42883|Could not find/.test(`${e?.code} ${e?.message}`))return 'خطط التغذية لسه محتاجة تفعيل على السيرفر. الرسايل العادية شغالة زي ما هي.';if(/chat_blocked|chat_paused|chat_read_only|chat_not_allowed|consent_required/.test(e?.message))return 'الخطة مش متاحة للتعديل دلوقتي. راجع حالة المحادثة وموافقة الرسائل.';return 'العملية متأكدتش. جرّب تاني من غير ما تقفل الصفحة.';}
