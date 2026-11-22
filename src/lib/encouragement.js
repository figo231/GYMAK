import { supabase } from './supabaseClient';
const prefix='gymak_encouragement_stop_v1:';
export const stopPending=(id)=>!!id&&localStorage.getItem(prefix+id)==='1';
async function checkUser(id){const {data,error}=await supabase.auth.getUser();if(error||data?.user?.id!==id)throw new Error('session_changed');}
export async function flushEncouragementStop(id){
 if(!supabase||!stopPending(id))return true;
 await checkUser(id);
 const {error}=await supabase.rpc('set_my_encouragement',{p_enabled:false,p_device_id:null});
 if(error)throw error;
 localStorage.removeItem(prefix+id);return true;
}
export async function readEncouragement(id){
 if(!supabase||!id)return false;
 await flushEncouragementStop(id);await checkUser(id);
 const {data,error}=await supabase.rpc('my_encouragement');if(error)throw error;
 return data?.enabled===true;
}
export async function changeEncouragement(id,enabled){
 if(!id||!supabase)throw new Error('sign_in_required');
 // Never claim an offline opt-out reached the server. Retry only for this account.
 if(!enabled){localStorage.setItem(prefix+id,'1');return flushEncouragementStop(id);}
 await flushEncouragementStop(id);await checkUser(id);
 const {prepareEncouragementDevice}=await import('./push/pushService');
 const device=await prepareEncouragementDevice(id);
 await checkUser(id);
 const {error}=await supabase.rpc('set_my_encouragement',{p_enabled:true,p_device_id:device});
 if(error)throw error;return true;
}
