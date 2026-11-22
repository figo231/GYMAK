import {useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {supabase} from '../../lib/supabaseClient';
import {registerForPush} from '../../lib/push/pushService';
import {useAuth} from '../../hooks/useAuth';
export default function OwnDevicePushTest(){
 const {user}=useAuth(),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[confirm,setConfirm]=useState(false);
 async function send(){if(!confirm || busy || !Capacitor.isNativePlatform())return;setBusy(true);try{
  await registerForPush(user.id);const device_id=localStorage.getItem('gymak_device_id_v1');if(!device_id)throw new Error('not_registered');
  const {data,error}=await supabase.functions.invoke('test-own-device',{body:{device_id,confirm:true}});
  if(error||!data?.ok)throw new Error('failed');
  setStatus('FCM قبل الاختبار لجهازك فقط، مش تأكيد إنه ظهر. حط التطبيق في الخلفية وشوف الإشعار. مفيش إرسال لباقي المستخدمين.');setConfirm(false);
 }catch{setStatus('الاختبار متبعتش أو النتيجة غير مؤكدة. اتأكد من التسجيل والإذن والاتصال. بلاش تكرر بسرعة.');}finally{setBusy(false);}}
 return <details className="ux-group"><summary>اختبار إشعار على جهازي فقط</summary><div className="ux-group-body"><p className="notif-note">اختبار يدوي على جهاز المالك الحالي، مش حملة ومش كل أجهزة الحساب. محتاج نسخة Android وتسجيل دخول وإذن إشعارات. مش بيتبعت تلقائيًا.</p>{!Capacitor.isNativePlatform()?<p className="notif-note">افتح لوحة المالك من تطبيق Android لاختبار الجهاز الحالي.</p>:<><label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>موافق على إشعار اختبار واحد لجهازي الحالي</label><button type="button" className="btn btn-primary" disabled={!confirm||busy} onClick={send}>{busy?'جاري الاختبار...':'إرسال اختبار لجهازي فقط'}</button></>}{status&&<p role="status" className="notif-note">{status}</p>}</div></details>;
}
