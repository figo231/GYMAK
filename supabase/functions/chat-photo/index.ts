import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.45.0';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-chat-thread, x-photo-nonce, x-photo-id, x-photo-action, x-report-id'};
const answer=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
export function createPhotoHandler(createClient:any,env:{get:(key:string)=>string|undefined}){return async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return answer({error:'method_not_allowed'},405);
 const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
 const url=env.get('SUPABASE_URL')!,anon=env.get('SUPABASE_ANON_KEY')!,key=env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const service=createClient(url,key,{auth:{persistSession:false}});
 const action=req.headers.get('x-photo-action');
 // Dedicated scheduled cleanup uses the service JWT, never a client-authorized task.
 if(action==='cleanup'){
  if(jwt!==key)return answer({error:'not_allowed'},403);
  const {data:rows,error}=await service.from('chat_photos').select('id,path').in('status',['reserved','ready']).lt('expires_at',new Date().toISOString()).limit(200);
  if(error)return answer({error:'cleanup_failed'},500);
  let removed=0,failed=0;for(const row of rows||[]){const {error:e}=await service.storage.from('chat-delivery').remove([row.path]);if(!e){const {error:r}=await service.rpc('chat_photo_removed',{p_photo:row.id,p_saved:false});if(!r)removed++;else failed++;}else failed++;}
  const {data:evidence,error:evidenceError}=await service.from('moderation_reports').select('id,photo_evidence_path').not('photo_evidence_path','is',null).lt('photo_evidence_expires_at',new Date().toISOString()).limit(200);
  if(evidenceError)failed++;
  for(const row of evidence||[]){const {error:e}=await service.storage.from('chat-report-evidence').remove([row.photo_evidence_path]);if(!e){const {error:updateError}=await service.from('moderation_reports').update({photo_evidence_path:null}).eq('id',row.id);if(updateError)failed++;}else failed++;}
  return answer({removed,failed},failed?500:200);
 }
 const {data:auth,error:authError}=await service.auth.getUser(jwt);
 if(authError||!auth?.user)return answer({error:'not_authenticated'},401);
 const user=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${jwt}`}},auth:{persistSession:false}});
 try{
  if(action==='report-upload'||action==='report-view'){
   const {data:r,error}=await user.rpc('chat_report_photo_access',{p_report:req.headers.get('x-report-id')});if(error)throw error;
   if(!r.path||new Date(r.expires_at).getTime()<=Date.now())return answer({error:'evidence_unavailable'},410);
   if(action==='report-view'){if(!r.owner)return answer({error:'owner_only'},403);const {data:blob,error:e}=await service.storage.from('chat-report-evidence').download(r.path);if(e)throw e;return new Response(blob,{headers:{...cors,'Content-Type':'image/jpeg','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
   if(r.reporter_id!==auth.user.id)return answer({error:'reporter_only'},403);
   const length=Number(req.headers.get('content-length'));if(length>204800)return answer({error:'photo_too_large'},413);
   const reader=req.body?.getReader();if(!reader)return answer({error:'invalid_photo'},400);let total=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>204800){await reader.cancel();return answer({error:'photo_too_large'},413);}chunks.push(value);}
   const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}if(total<4||bytes[0]!==255||bytes[1]!==216||bytes[total-2]!==255||bytes[total-1]!==217)return answer({error:'invalid_jpeg'},400);
   const {error:e}=await service.storage.from('chat-report-evidence').upload(r.path,bytes,{contentType:'image/jpeg',upsert:false,cacheControl:'0'});if(e&&!/Duplicate|already exists/i.test(e.message))throw e;return answer({attached:true});
  }
  if(action==='upload'){
   if(req.headers.get('content-type')!=='image/jpeg')return answer({error:'jpeg_only'},400);
   const length=Number(req.headers.get('content-length'));if(length>204800)return answer({error:'photo_too_large'},413);
   // Bound the stream rather than accepting an unbounded arrayBuffer allocation.
   const reader=req.body?.getReader();if(!reader)return answer({error:'invalid_photo'},400);
   const chunks:Uint8Array[]=[];let total=0;while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>204800){await reader.cancel();return answer({error:'photo_too_large'},413);}chunks.push(value);}
   const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
   if(total<4||bytes[0]!==255||bytes[1]!==216||bytes[total-2]!==255||bytes[total-1]!==217)return answer({error:'invalid_jpeg'},400);
   const {data:r,error}=await user.rpc('chat_photo_reserve',{p_thread:req.headers.get('x-chat-thread'),p_nonce:req.headers.get('x-photo-nonce'),p_bytes:total});
   if(error)throw error;
   if(!r.message_id){const {error:e}=await service.storage.from('chat-delivery').upload(r.path,bytes,{contentType:'image/jpeg',upsert:false,cacheControl:'0'});if(e&&!/already exists|Duplicate/i.test(e.message))throw e;}
   const {data:m,error:e}=await user.rpc('chat_photo_publish',{p_photo:r.id});if(e)throw e;return answer({message:m,photoId:r.id});
  }
  const {data:r,error}=await user.rpc('chat_photo_access',{p_photo:req.headers.get('x-photo-id')});if(error)throw error;
  if(action==='status')return answer(r);
  if(action==='saved'){
   if(r.recipient_id!==auth.user.id)return answer({error:'recipient_only'},403);
   if(r.status==='saved')return answer({saved:true});
   if(r.status!=='ready')return answer({error:'photo_unavailable'},410);
   const {error:e}=await service.storage.from('chat-delivery').remove([r.path]);if(e)throw e;
   const {error:updateError}=await service.rpc('chat_photo_removed',{p_photo:r.id,p_saved:true});if(updateError)throw updateError;
   return answer({saved:true});
  }
  if(action==='download'){
   if(r.status!=='ready'||new Date(r.expires_at).getTime()<=Date.now())return answer({error:'photo_expired_or_saved'},410);
   if(r.blocked)return answer({error:'chat_blocked'},403);
   const {data:blob,error:e}=await service.storage.from('chat-delivery').download(r.path);if(e)throw e;
   return new Response(blob,{headers:{...cors,'Content-Type':'image/jpeg','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  return answer({error:'invalid_action'},400);
 }catch(e){return answer({error:String((e as Error)?.message||'photo_failed').slice(0,160)},400);}
};}
if(import.meta.main)Deno.serve(createPhotoHandler(createClient,Deno.env));
