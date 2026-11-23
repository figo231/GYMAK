import {verifyAdmin} from '../_shared/verifyAdmin.ts';
import {sendToDeviceToken} from '../_shared/fcmClient.ts';
import {runOwnerPush} from '../_shared/ownerPushRunner.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-gymak-training-generation','Access-Control-Allow-Methods':'POST,OPTIONS'};
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405,headers:cors});
 try{
  const a=await verifyAdmin(req);if(a.role!=='super_admin')throw{status:403,message:'owner_only'};
  const {campaign_id}=await req.json();if(typeof campaign_id!=='string'||!/^[0-9a-f-]{36}$/i.test(campaign_id))throw{status:400,message:'invalid_campaign'};
  const {data:c,error}=await a.serviceClient.from('owner_push_campaigns').select('owner_id,state').eq('id',campaign_id).single();
  if(error||c?.owner_id!==a.userId)throw{status:403,message:'campaign_not_allowed'};
  return Response.json({ok:true,...await runOwnerPush(a.serviceClient,sendToDeviceToken,campaign_id)},{headers:cors});
 }catch(e:any){return Response.json({ok:false,error:e.message||'send_failed'},{status:e.status||500,headers:cors});}
});
