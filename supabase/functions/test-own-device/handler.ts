const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
export const createOwnDeviceTest=(verifyAdmin:any,sendToDeviceToken:any)=>async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return respond({error:'method_not_allowed'},405);
 try{
  const admin=await verifyAdmin(req);if(admin.role!=='super_admin')return respond({error:'owner_only'},403);
  const input=await req.json().catch(()=>({}));
  if(input.confirm!==true || typeof input.device_id!=='string' || !/^[0-9a-f-]{36}$/i.test(input.device_id))return respond({error:'explicit_device_confirmation_required'},400);
  const {data:token,error}=await admin.serviceClient.from('push_tokens').select('id,token,user_id').eq('user_id',admin.userId).eq('device_id',input.device_id).eq('is_active',true).maybeSingle();
  if(error)throw new Error('token_lookup_failed');if(!token)return respond({error:'own_device_not_registered'},404);
  // Atomically claim one test per 60 seconds. No retry or queued delivery.
  const {data:allowed,error:limitError}=await admin.serviceClient.rpc('claim_own_push_test',{p_owner:admin.userId});
  if(limitError || !allowed)return respond({error:'wait_one_minute'},429);
  const result=await sendToDeviceToken(token.token,{title:'GYMAK - اختبار الإشعارات',body:'ده اختبار لجهازك بس. لو ظهر والتطبيق مقفول، ابعت تم.',notificationId:crypto.randomUUID(),priority:'normal'});
  // Never return raw device tokens, account keys or FCM internals.
  return respond(result.ok?{ok:true,accepted_by_fcm:true}:{ok:false,error:'fcm_rejected'},result.ok?200:502);
 }catch(e){return respond({error:(e as {status?:number}).status===401?'sign_in_required':'test_failed'},(e as {status?:number}).status===401?401:400);}
};
