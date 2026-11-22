import { useEffect,useState } from 'react';
import { activityOptedIn,setActivityOptIn,recordAppActivity } from '../../lib/appActivity';
import { useAuth } from '../../hooks/useAuth';
export default function ActivityPreference(){
 const {user}=useAuth();const [on,setOn]=useState(()=>activityOptedIn(user?.id));const [message,setMessage]=useState('');
 useEffect(()=>{setOn(activityOptedIn(user?.id));setMessage('');},[user?.id]);
 async function change(e){const next=e.target.checked;setOn(next);const ok=await setActivityOptIn(next,user?.id);if(next&&user)await recordAppActivity(user.id);setMessage(!ok?'وقفنا التسجيل من الجهاز. حذف القياس السابق محتاج اتصال وحساب مسجل؛ هنحاول نحذفه تلقائيًا لما الاتصال يرجع وانت مسجل بنفس الحساب.':next?'القياس الاختياري شغّال للحساب المسجل.':'القياس متوقف.');}
 return <div style={{padding:12}}><label style={{display:'flex',gap:12,alignItems:'center'}}><input type="checkbox" disabled={!user} checked={on} onChange={change}/><b>المساهمة في عدد الحسابات النشطة (اختياري)</b></label><p className="notif-note">مقفول افتراضيًا لكل حساب على الجهاز. محتاج تسجل دخول عشان تختار. لو وافقت وسجلت دخول، بنحفظ معرّف حساب داخلي ويوم فتح التطبيق بتوقيت UTC، مرة يوميًا. من غير اسم أو بريد أو تمارين أو وزن أو رسائل. المالك بيشوف أعداد إجمالية فقط. السجل مرتبط بالحساب داخليًا، مش مجهول بالكامل. الاحتفاظ حتى 90 يوم، والإيقاف بيطلب حذف القياس السابق. مش بيحسب الزوار أو الحسابات اللي رفضت، ومش عدد كل المستخدمين.</p><a href="/privacy.html" target="_blank" rel="noreferrer">سياسة الخصوصية</a>{message&&<p role="status" className="notif-note">{message}</p>}</div>;
}
