import {supabase} from './supabaseClient';
export const normalizeUsername=s=>(s||'').trim().toLowerCase();
export function validateIdentity({name,gender,username}){
 if((name||'').trim().length<2||(name||'').trim().length>40)return 'invalid_name';
 if(!['male','female'].includes(gender))return 'invalid_gender';
 if(!/^[a-z][a-z0-9_]{2,23}$/.test(normalizeUsername(username)))return 'invalid_username';
 return null;
}
export const identityText={
 ar:{name:'الاسم',gender:'النوع',male:'ذكر',female:'أنثى',choose:'اختار النوع',username:'اسم المستخدم',hint:'3-24 حرف إنجليزي صغير أو رقم أو _، ويبدأ بحرف. الاسم مميز لحساب واحد.',invalid_name:'اكتب اسم من حرفين لـ40 حرف.',invalid_gender:'اختار ذكر أو أنثى.',invalid_username:'راجع صيغة اسم المستخدم.',username_taken:'اسم المستخدم مستخدم. اختار اسم تاني.',title:'كمّل بيانات حسابك',note:'اختار اسمك والنوع واسم مستخدم مميز. البيانات القديمة والتمارين مش هتتمسح. تقدر تتخطى دلوقتي.',save:'حفظ',skip:'تخطي دلوقتي',error:'ماقدرناش نحفظ. اتأكد من الاتصال وحاول تاني.',signup_conflict:'تعذر إنشاء الحساب. ممكن اسم المستخدم مستخدم بالفعل؛ جرّب اسم تاني.'},
 en:{name:'Name',gender:'Gender',male:'Male',female:'Female',choose:'Choose gender',username:'Username',hint:'3-24 lowercase English letters, digits or _, starting with a letter. Unique to one account.',invalid_name:'Enter a name between 2 and 40 characters.',invalid_gender:'Choose male or female.',invalid_username:'Check the username format.',username_taken:'That username is taken. Choose another.',title:'Complete your account',note:'Choose your name, gender and a unique username. Existing workout data is not removed. You can skip for now.',save:'Save',skip:'Skip for now',error:'Could not save. Check your connection and try again.',signup_conflict:'Could not create the account. The username may already be taken; try another.'}
};
export async function getIdentity(){if(!supabase)return null;const {data,error}=await supabase.rpc('my_account_identity');if(error)throw error;return data;}
async function requireOwner(id){if(!supabase)throw Error("offline");const {data,error}=await supabase.auth.getUser();if(error)throw error;if(!id||data?.user?.id!==id)throw Error("session_changed");}
export async function saveIdentity(id,value){await requireOwner(id);const errorKey=validateIdentity(value);if(errorKey)throw Error(errorKey);const {error}=await supabase.rpc('complete_account_identity',{p_name:value.name.trim(),p_gender:value.gender,p_username:normalizeUsername(value.username),p_expected_user:id});if(error)throw error;}
export async function skipIdentity(id){await requireOwner(id);const {error}=await supabase.rpc('skip_account_identity',{p_expected_user:id});if(error)throw error;}
