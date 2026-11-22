// Not deployed/activated with the draft. Only a server-held dedicated secret may run it.
import { getServiceClient } from '../_shared/verifyAdmin.ts';
import { sendToDeviceToken } from '../_shared/fcmClient.ts';
Deno.serve(async(req:Request)=>{
 const key=Deno.env.get('ENCOURAGEMENT_RUNNER_SECRET');
 if(req.method!=='POST'||!key||req.headers.get('x-encouragement-secret')!==key)return new Response('Unauthorized',{status:401});
 const db=getServiceClient();
 const {data:claims,error}=await db.rpc('claim_encouragement');
 if(error)return Response.json({ok:false,stage:'claim'},{status:500});
 let accepted=0,skipped=0,unknown=0,rejected=0;
 for(const claim of claims||[]){
  const {data:p,error:e}=await db.rpc('encouragement_send_payload',{p_claim:claim.id});
  if(e||!p){skipped++;continue;}
  // The claim is consumed before the network call. No retries on timeout/crash.
  let status='outcome_unknown';
  try{const result=await sendToDeviceToken(p.token,{title:p.title,body:p.body,notificationId:p.notificationId,priority:'normal',ttlSeconds:900,collapseKey:p.collapseKey});status=result.ok?'accepted':'rejected';}catch{/* May have reached FCM: never retry. */}
  const {error:updateError}=await db.from('encouragement_deliveries').update({status,completed_at:new Date().toISOString()}).eq('id',claim.id).eq('status','outcome_unknown');
  if(updateError||status==='outcome_unknown')unknown++;else if(status==='accepted')accepted++;else rejected++;
 }
 return Response.json({ok:true,claimed:(claims||[]).length,accepted_by_fcm:accepted,skipped,rejected,outcome_unknown:unknown,delivered:'not_measured'});
});
