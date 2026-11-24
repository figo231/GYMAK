import {useEffect,useState} from 'react';
import {useAuth} from '../hooks/useAuth';
import {useI18n} from '../hooks/useI18n';
import {fetchAnnouncements,dismissAnnouncement} from '../lib/announcements';
import './announcementNotice.css';
export default function AnnouncementNotice(){
 const {user,isPasswordRecovery}=useAuth();
 return user&&!isPasswordRecovery?<AccountAnnouncements key={user.id} userId={user.id}/>:null;
}
function AccountAnnouncements({userId}){
 const {lang}=useI18n(),en=lang==='en';const [rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;let loading=false;const load=async()=>{if(loading||document.hidden)return;loading=true;try{const data=await fetchAnnouncements();if(active)setRows(data||[]);}catch{}finally{loading=false;}};load();window.addEventListener('online',load);document.addEventListener('visibilitychange',load);return()=>{active=false;window.removeEventListener('online',load);document.removeEventListener('visibilitychange',load);};},[userId]);
 async function dismiss(){if(busy)return;const id=rows[0]?.id;setBusy(true);setError('');try{await dismissAnnouncement(id);setRows(v=>v.filter(x=>x.id!==id));}catch{setError(en?'Could not save. Try again when online.':'ماقدرناش نحفظ الإخفاء. جرّب لما النت يرجع.');}finally{setBusy(false);}}
 const row=rows[0];if(!row)return null;
 return <aside className="announcement-notice" aria-label={en?'App announcement':'إعلان التطبيق'}><span className="announcement-eyebrow">GYMAK · {en?'What is new':'الجديد عندنا'}</span><button type="button" className="announcement-close" disabled={busy} onClick={dismiss} aria-label={en?'Dismiss announcement':'إخفاء الإعلان'}>×</button><strong>{row.title}</strong><p>{row.body}</p>{error&&<small role="alert">{error}</small>}</aside>;
}
