import { useEffect,useRef,useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../../hooks/useAuth';
import {changeEncouragement,readEncouragement,stopPending} from '../../lib/encouragement';
export default function EncouragementPreference(){
 const {user}=useAuth();const id=user?.id;const current=useRef(id);current.current=id;
 const [on,setOn]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[loaded,setLoaded]=useState(false);
 const native=Capacitor.isNativePlatform();
 useEffect(()=>{let live=true;setOn(true);setBusy(false);setLoaded(false);setMessage('');
  if(!id){setLoaded(true);return;}
  readEncouragement(id).then(v=>{if(live){setOn(v.enabled);setLoaded(true);}}).catch(()=>{if(live){setLoaded(true);setMessage(stopPending(id)?'طلب الإيقاف محفوظ على الجهاز. لسه محتاج اتصال بنفس الحساب عشان يتأكد على السيرفر، وممكن إشعار يوصل لحد ما يتأكد.':'مش قادرين نقرأ اختيارك دلوقتي. جرّب تاني لما الاتصال يرجع.');}});
  return()=>{live=false;};
 },[id]);
 async function change(e){const target=e.target.checked,owner=id;setBusy(true);setMessage('');try{await changeEncouragement(owner,target);if(current.current===owner){setOn(target);setMessage(target?'تم حفظ تشغيل التشجيع. الإرسال التلقائي لسه متوقف لحد اعتماد المالك.':'تم إيقاف رسائل التشجيع على السيرفر. رسالة اتبعتت بالفعل ممكن توصل.');}}catch{if(current.current===owner){if(!target)setOn(false);setMessage(!target?'طلب الإيقاف محفوظ على الجهاز. لسه محتاج اتصال بنفس الحساب عشان يتأكد على السيرفر، وممكن إشعار يوصل لحد ما يتأكد.':'ماحفظناش الموافقة. اتأكد إنك داخل من تطبيق الأندرويد وإن إذن الإشعارات شغال، وحاول تاني.');}}finally{if(current.current===owner)setBusy(false);}}
 return <section className="glass notif-row" aria-labelledby="encouragement-title"><div className="toggle-row"><div><h2 id="encouragement-title" className="trow-label">رسالة تشجيع يومية</h2><div className="trow-sub">مرة واحدة بالكتير في اليوم للحساب، على جهاز أندرويد واحد.</div></div><label className="switch"><input type="checkbox" aria-label="رسالة تشجيع يومية" checked={on} disabled={!id||busy||!loaded||(!native&&!on)} onChange={change}/><span className="switch-track"/></label></div><p className="notif-note">مفتوحة افتراضيًا بعد تنبيه أول استخدام على الأندرويد، وتقدر تقفلها هنا. الميعاد المقترح 12 ظهرًا بتوقيت القاهرة. الإرسال التلقائي متوقف حاليًا لحد اعتماد المالك، ومش مرتبط بتسجيلك لتمرين. محتاجة إنترنت وإذن إشعارات، ووصولها مش مضمون.</p>{!id?<p className="notif-note">سجل دخول عشان تختار.</p>:!native&&<p className="notif-note">التفعيل من تطبيق الأندرويد فقط. تقدر توقف اختيار سابق من هنا.</p>}<p className="notif-note">بنحفظ إعداد الحساب ومعرّف الجهاز وسجل محاولة الإرسال لمنع التكرار، مش بيانات تمارينك. الإيقاف من هنا بيحتاج اتصال للتأكيد على السيرفر. <a href="/privacy.html" target="_blank" rel="noreferrer">سياسة الخصوصية</a></p>{message&&<p role="status" className="notif-note">{message}</p>}</section>;
}
