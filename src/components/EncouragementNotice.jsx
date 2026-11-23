import {REVIEW_BACKEND_GATED} from "../lib/reviewBuild";
import {useEffect,useState,useRef} from 'react';
import {Capacitor} from '@capacitor/core';
import {useAuth} from '../hooks/useAuth';
import {readEncouragement,changeEncouragement} from '../lib/encouragement';
export default function EncouragementNotice(){
 const {user,isPasswordRecovery}=useAuth();const id=user?.id;const current=useRef(id);current.current=id;
 const [identityOpen,setIdentityOpen]=useState(false);
 useEffect(()=>{const fn=e=>setIdentityOpen(e.detail?.open===true);window.addEventListener('gymak-identity-prompt',fn);return()=>window.removeEventListener('gymak-identity-prompt',fn);},[]);
 const [show,setShow]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let live=true;setShow(false);setBusy(false);setMessage('');if(REVIEW_BACKEND_GATED||!id||isPasswordRecovery||!Capacitor.isNativePlatform())return;
 readEncouragement(id).then(p=>{if(live&&!p.enrolled)setShow(true);}).catch(()=>{});return()=>{live=false};},[id,isPasswordRecovery]);
 async function finish(enabled){const owner=id;setBusy(true);setMessage('');try{
  if(enabled){const {enrollDefaultEncouragementDevice}=await import('../lib/push/pushService');const ready=await enrollDefaultEncouragementDevice(id);if(!ready){if(current.current!==owner)return;setMessage('إذن الإشعارات مش متاح. مش هنفعّل الإرسال على الجهاز ده. تقدر تقفل التشجيع أو ترجع بعدين.');return;}}
  if(current.current!==owner)return;await changeEncouragement(owner,enabled);if(current.current===owner)setShow(false);
 }catch{if(current.current===owner)setMessage('ماقدرناش نأكد الحفظ. الإرسال لسه مش متفعّل على الجهاز ده. حاول لما الاتصال يرجع.');}finally{if(current.current===owner)setBusy(false);}}
 if(!show||identityOpen)return null;
 return <div className="modal-backdrop open" style={{zIndex:10000}}><section className="edit-sheet" role="dialog" aria-modal="true" aria-labelledby="encouragement-notice-title"><h2 id="encouragement-notice-title">تشجيع يومي من GYMAK</h2><p>التشجيع مفتوح افتراضيًا: رسالة واحدة بالكتير في اليوم للحساب على الجهاز ده، في الميعاد المقترح 12 ظهرًا بتوقيت القاهرة. مش بناءً على تمارينك، وتقدر تقفله في أي وقت من التنبيهات.</p><p className="notif-note">الإرسال التلقائي لسه متوقف لحد اعتماد المالك. إذن أندرويد لازم يكون شغال، ولو رفضته مش هنغيّره. بنحفظ إعداد الحساب والجهاز ومحاولة الإرسال لمنع التكرار. <a href="/privacy.html" target="_blank" rel="noreferrer">الخصوصية</a></p>{message&&<p role="status">{message}</p>}<div className="edit-sheet-actions"><button disabled={busy} onClick={()=>finish(false)}>إيقاف التشجيع</button><button disabled={busy} onClick={()=>finish(true)}>متابعة بالتشجيع</button></div><button disabled={busy} onClick={()=>setShow(false)}>بعدين، من غير تشغيل دلوقتي</button></section></div>;
}
