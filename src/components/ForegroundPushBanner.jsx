import {useEffect,useRef,useState} from 'react';
import {useTheme} from '../hooks/useTheme';
import {useI18n} from '../hooks/useI18n';
export default function ForegroundPushBanner(){
 const {theme}=useTheme();const light=theme==='light';
 const {lang}=useI18n(),en=lang==='en';const [message,setMessage]=useState(null),timer=useRef();
 useEffect(()=>{const receive=e=>{if(document.visibilityState==='hidden')return;const n=e.detail;if(!n?.title&&!n?.body)return;clearTimeout(timer.current);setMessage(n);timer.current=setTimeout(()=>setMessage(null),10000);};window.addEventListener('gymak-foreground-push',receive);return()=>{window.removeEventListener('gymak-foreground-push',receive);clearTimeout(timer.current);};},[]);
 if(!message)return null;
 return <aside role="status" aria-live="polite" className="foreground-push-banner" style={{position:'fixed',insetInline:14,top:'calc(env(safe-area-inset-top, 0px) + 12px)',zIndex:9999,maxWidth:440,marginInline:'auto',padding:16,borderRadius:20,background:light?'#FFFFFF':'#17191F',color:light?'#18191D':'#F5F5F7',border:'1px solid var(--border-soft)',boxShadow:'0 8px 32px rgba(0,0,0,.2)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><span style={{fontSize:12,color:'var(--accent-text)',fontWeight:800}}>{en?'Notification received':'وصلك إشعار'}</span><button type="button" aria-label={en?'Dismiss notification':'إخفاء الإشعار'} onClick={()=>setMessage(null)} style={{background:'transparent',color:'inherit',border:0,padding:6,fontSize:20,cursor:'pointer'}}>×</button></div><strong style={{display:'block',overflowWrap:'anywhere'}}>{message.title}</strong><p style={{margin:'6px 0 0',fontSize:13,lineHeight:1.6,overflowWrap:'anywhere'}}>{message.body}</p></aside>;
}
