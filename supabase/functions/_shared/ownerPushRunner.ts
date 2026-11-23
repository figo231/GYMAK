// Bounded orchestration with injected I/O for offline tests. Never retries an unknown send.
export async function runOwnerPush(db:any,send:any,campaign:string,limit=50){
 let attempted=0,accepted=0,skipped=0,unknown=0;
 for(let i=0;i<Math.min(limit,50);i++){
  const {data:p,error}=await db.rpc('claim_owner_push',{p_campaign:campaign});
  if(error)throw new Error('claim_failed');if(!p)break;if(p.skipped){skipped++;continue;}
  attempted++;let state='outcome_unknown',provider=null,code=null;
  try{const r=await send(p.token,{title:p.title,body:p.body,notificationId:p.notificationId,priority:'high',ttlSeconds:900,collapseKey:p.delivery_id,ownerUserId:p.user_id});
   if(r.ok){state='accepted';provider=r.messageId;}else{state=r.errorCode==='UNREGISTERED'?'invalid_token':'failed';code=r.errorCode;}
  }catch{/* Network may have accepted: retain unknown and never retry. */}
  const {error:e}=await db.rpc('finish_owner_push',{p_delivery:p.delivery_id,p_state:state,p_provider:provider,p_error:code});
  if(e||state==='outcome_unknown')unknown++;else if(state==='accepted')accepted++;
 }
 return{attempted,accepted_by_fcm:accepted,skipped,outcome_unknown:unknown,receipt:'not_confirmed'};
}
