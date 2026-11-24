import {getServiceClient} from '../_shared/verifyAdmin.ts';
import {sendToDeviceToken} from '../_shared/fcmClient.ts';
import {runChatPush} from '../_shared/chatPushRunner.ts';
// Scheduler only. No account tokens, caller-supplied audience, or payload text.
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405});
 const expected=Deno.env.get('CHAT_PUSH_DISPATCH_SECRET');
 const supplied=req.headers.get('x-chat-push-secret')||'';
 if(!expected||supplied.length!==expected.length)return Response.json({error:'unauthorized'},{status:401});
 let different=0;for(let i=0;i<expected.length;i++)different|=expected.charCodeAt(i)^supplied.charCodeAt(i);
 if(different)return Response.json({error:'unauthorized'},{status:401});
 try{return Response.json({ok:true,...await runChatPush(getServiceClient(),sendToDeviceToken)});}
 catch{return Response.json({error:'dispatch_failed'},{status:500});}
});
