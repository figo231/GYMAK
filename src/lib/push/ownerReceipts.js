import {Capacitor,registerPlugin} from '@capacitor/core';
const NativeTaps=registerPlugin('OwnerPushTap');
import {supabase} from '../supabaseClient';
import {REVIEW_BACKEND_GATED} from '../reviewBuild';
const KEY='gymak_owner_receipts_v1';
export function queueOwnerReceipt(notification,kind,storage=localStorage){
 const d=notification?.data||{};if(!d.owner_delivery_id||!d.owner_user_id||!['received','opened'].includes(kind))return;
 let rows=[];try{rows=JSON.parse(storage.getItem(KEY)||'[]');}catch{}
 if(!rows.some(r=>r.id===d.owner_delivery_id&&r.kind===kind))rows.push({id:d.owner_delivery_id,user:d.owner_user_id,kind,created:Date.now()});
 storage.setItem(KEY,JSON.stringify(rows.slice(-100)));
}
export async function flushOwnerReceipts(userId,deviceId,client=supabase,storage=localStorage){
 if(REVIEW_BACKEND_GATED||!client||!userId||!deviceId)return;
 let rows=[];try{rows=JSON.parse(storage.getItem(KEY)||'[]');}catch{return;}
 for(const r of rows){if(r.user!==userId)continue;
  const {data,error}=await client.auth.getUser();if(error||data?.user?.id!==userId)return;
  const result=await client.rpc('ack_owner_push',{p_delivery:r.id,p_device:deviceId,p_kind:r.kind});
  if(result.error)continue;
  let current=[];try{current=JSON.parse(storage.getItem(KEY)||'[]');}catch{}
  storage.setItem(KEY,JSON.stringify(current.filter(x=>!(x.id===r.id&&x.kind===r.kind))));
 }
}

export async function collectNativeOwnerTaps(){
 if(REVIEW_BACKEND_GATED||!Capacitor.isNativePlatform())return;
 const {events=[]}=await NativeTaps.pending();
 for(const e of events){queueOwnerReceipt({data:{owner_delivery_id:e.id,owner_user_id:e.user}},'opened');await NativeTaps.remove({id:e.id});}
}
