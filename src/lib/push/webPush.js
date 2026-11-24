import {supabase} from '../supabaseClient';
let current=null,unsubscribe=null,registration=null;
let lifecycle=0;
export function webPushSupported(env=globalThis){return !!(env.isSecureContext&&env.Notification&&env.navigator?.serviceWorker&&env.PushManager);}
export async function loadWebPushConfig(){
 const res=await fetch('/push-config.json',{cache:'no-store'});if(!res.ok)throw Error('web_push_not_configured');
 const c=await res.json();if(!c.enabled||!c.firebase?.apiKey||!c.firebase?.projectId||!c.firebase?.messagingSenderId||!c.firebase?.appId||!c.vapidKey)throw Error('web_push_not_configured');return c;
}
export async function registerWebPush(userId,{prompt=false,client=supabase}={}){
 if(!userId||!client||!webPushSupported())return {status:'unsupported'};
 const generation=++lifecycle;
 const config=await loadWebPushConfig();
 let permission=Notification.permission;
 if(permission==='default'&&prompt)permission=await Notification.requestPermission();
 if(permission!=='granted')return {status:permission==='denied'?'denied':'permission_required'};
 const {data,error}=await client.auth.getUser();if(error||data?.user?.id!==userId)throw Error('account_changed');
 const {initializeApp,getApps}=await import('firebase/app');const {getMessaging,getToken}=await import('firebase/messaging');
 const app=getApps().find(a=>a.name==='gymak-web-push')||initializeApp(config.firebase,'gymak-web-push');
 const messaging=getMessaging(app);registration=await navigator.serviceWorker.register('/firebase-messaging-sw.js',{scope:'/push/'});
 const token=await getToken(messaging,{vapidKey:config.vapidKey,serviceWorkerRegistration:registration});
 if(!token)throw Error('web_push_token_missing');
 const again=await client.auth.getUser();if(generation!==lifecycle||again.error||again.data?.user?.id!==userId)throw Error('account_changed');
 let device=localStorage.getItem('gymak_web_push_device_v1');if(!device){device='web-'+crypto.randomUUID();localStorage.setItem('gymak_web_push_device_v1',device);}
 const saved=await client.from('push_tokens').upsert({user_id:userId,device_id:device,token,platform:'web',is_active:true,last_seen:new Date().toISOString(),language:(navigator.language||'ar').slice(0,2),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone},{onConflict:'device_id'});
 if(saved.error)throw saved.error;
 current={userId,device,messaging};
 if(!unsubscribe){const listener=e=>{if(!e.source?.scriptURL||new URL(e.source.scriptURL).origin!==location.origin||!e.source.scriptURL.endsWith('/firebase-messaging-sw.js'))return;if(e.data?.type!=='GYMAK_WEB_PUSH'||!current)return;const n=e.data.payload?.notification||{};window.dispatchEvent(new CustomEvent('gymak-web-push-received',{detail:e.data.payload}));window.dispatchEvent(new CustomEvent('gymak-foreground-push',{detail:{title:n.title,body:n.body}}));};navigator.serviceWorker.addEventListener('message',listener);unsubscribe=()=>navigator.serviceWorker.removeEventListener('message',listener);}
 return {status:'registered'};
}
export async function stopWebPush(client=supabase){
 const previous=current;++lifecycle;current=null;unsubscribe?.();unsubscribe=null;
 if(!previous){
  const saved=await navigator.serviceWorker?.getRegistration("/push/");
  const subscription=await saved?.pushManager?.getSubscription();
  if(subscription)await subscription.unsubscribe();
  return;
 }
 const {deleteToken}=await import('firebase/messaging');
 await deleteToken(previous.messaging);
 // Deletion after sign-out may be denied by RLS. Token was revoked above; stale row cannot receive.
 await client?.from('push_tokens').delete().eq('device_id',previous.device);
}
