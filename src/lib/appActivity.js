import { localISO } from './dateKey';
import { supabase } from './supabaseClient';
const KEY='gymak_activity_opt_in_v1',PENDING='gymak_activity_delete_v1';
export const activityOptedIn=(userId)=>!!userId && localStorage.getItem(KEY+':'+userId)==='1';
let sent='';
export async function retryActivityDeletion(userId){
  if(!supabase || !userId || localStorage.getItem(PENDING+':'+userId)!=='1')return true;
  try{const {error}=await supabase.rpc('clear_my_app_activity');if(error)return false;localStorage.removeItem(PENDING+':'+userId);return true;}catch{return false;}
}
export async function setActivityOptIn(on,userId){
  if(!userId)return false;
  localStorage.setItem(KEY+':'+userId,on?'1':'0');sent='';
  if(!on){localStorage.setItem(PENDING+':'+userId,'1');return retryActivityDeletion(userId);}
  await retryActivityDeletion(userId);return true;
}
export async function recordAppActivity(userId){
  if(!supabase || !userId)return false;
  const cleared=await retryActivityDeletion(userId);
  if(!cleared || !activityOptedIn(userId) || document.visibilityState!=='visible')return false;
  const day=localISO(),key=userId+':'+day;
  if(sent===key)return true;
  try{const {error}=await supabase.rpc('record_app_activity');if(error)return false;sent=key;return true;}catch{return false;}
}
export function resetActivitySession(){sent='';}
export async function fetchAppActivity(){
  if(!supabase)throw new Error('offline');
  const {data,error}=await supabase.rpc('owner_app_activity');if(error)throw error;return data;
}
