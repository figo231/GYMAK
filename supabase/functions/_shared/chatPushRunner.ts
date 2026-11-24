// Each message/device is claimed once. Unknown outcomes are not retried blindly.
export function chatPushPayload(delivery:string,language:string='ar'){
 const en=language==='en';
 return {title:'GYMAK',body:en?'You have a new message. Open GYMAK to view it.':'عندك رسالة جديدة. افتح GYMAK عشان تشوفها.',notificationId:delivery,priority:'high',ttlSeconds:900};
}
export async function runChatPush(db:any,send:any,limit=50){
 let attempted=0,accepted=0,skipped=0,unknown=0;
 for(let i=0;i<Math.min(Math.max(limit,0),50);i++){
  const {data:p,error}=await db.rpc('chat_push_claim_v1');
  if(error)throw Error('chat_push_claim_failed');if(!p)break;if(p.skipped){skipped++;continue;}
  attempted++;let state='outcome_unknown',provider=null,code=null;
  try{const r=await send(p.token,chatPushPayload(p.delivery_id,p.language));
   if(r.ok){state='accepted';provider=r.messageId;}else{state=r.errorCode==='UNREGISTERED'?'invalid_token':'failed';code=r.errorCode;}
  }catch{/* Provider may have accepted before the network dropped. */}
  const {error:e}=await db.rpc('chat_push_finish_v1',{p_delivery:p.delivery_id,p_state:state,p_provider:provider,p_error:code});
  if(e||state==='outcome_unknown')unknown++;else if(state==='accepted')accepted++;
 }
 return {attempted,accepted_by_fcm:accepted,skipped,outcome_unknown:unknown,receipt:'not_confirmed'};
}
