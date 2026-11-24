import {useState} from 'react';
import {useAuth} from '../hooks/useAuth';
import {useI18n} from '../hooks/useI18n';
import {Capacitor} from '@capacitor/core';
import {registerWebPush,stopWebPush,webPushSupported} from '../lib/push/webPush';
export default function WebPushPreference(){
 const {user}=useAuth(),{lang}=useI18n(),en=lang==='en';const [busy,setBusy]=useState(false),[status,setStatus]=useState('');
 if(Capacitor.isNativePlatform()||!user)return null;
 const supported=webPushSupported();
 async function change(enable){if(busy)return;setBusy(true);setStatus('');try{if(enable){const r=await registerWebPush(user.id,{prompt:true});setStatus(r.status==='registered'?(en?'Browser registered. Delivery is not guaranteed.':'المتصفح اتسجل. الوصول مش مضمون.'):(en?'Permission was not granted. You can change it in browser settings.':'الإذن مش متاح. تقدر تغيّره من إعدادات المتصفح.'));if(r.status==='registered')localStorage.setItem('gymak_web_push_enabled_v1','1');}else{localStorage.setItem('gymak_web_push_enabled_v1','0');await stopWebPush();setStatus(en?'Browser notifications disabled.':'إشعارات المتصفح اتقفلت.');}}catch(e){setStatus(e.message==='web_push_not_configured'?(en?'Browser push setup is not active yet.':'إعداد إشعارات المتصفح لسه مش متفعل.'):(en?'Could not confirm. Try again when online.':'ماقدرناش نأكد. جرّب لما النت يرجع.'));}finally{setBusy(false);}}
 return <section className="glass" style={{padding:16,marginBottom:14}}><h2>{en?'Browser notifications':'إشعارات المتصفح'}</h2><p className="notif-note">{supported?(en?'Allow this browser to receive announcements, including while the site is closed. Optional.':'اسمح للمتصفح يستقبل الإعلانات، حتى والموقع مقفول. اختياري.'):(en?'This browser does not support push here. On supported iPhones, add the site to your Home Screen first.':'المتصفح هنا مش بيدعم الإشعارات. على آيفون مدعوم، ضيف الموقع للشاشة الرئيسية الأول.')}</p><button className="btn btn-primary" disabled={busy||!supported} onClick={()=>change(true)}>{en?'Enable on this browser':'تفعيل على المتصفح ده'}</button><button className="btn" disabled={busy} onClick={()=>change(false)}>{en?'Turn off':'إيقاف'}</button>{status&&<p role="status">{status}</p>}</section>;
}
