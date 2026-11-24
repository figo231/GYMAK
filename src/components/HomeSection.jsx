import {useState} from 'react';
export default function HomeSection({id,title,subtitle,children}){
 const key=`gymak_home_section_${id}`;
 const [open,setOpen]=useState(()=>{try{return localStorage.getItem(key)==='open';}catch{return false;}});
 return <section className="home-fold"><button type="button" className="home-fold-toggle" aria-expanded={open} aria-controls={`home-section-${id}`} onClick={()=>setOpen(v=>{try{localStorage.setItem(key,v?'closed':'open');}catch{}return !v;})}><span><strong>{title}</strong><small>{subtitle}</small></span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{transform:open?'rotate(180deg)':undefined}}><path d="m6 9 6 6 6-6"/></svg></button><div id={`home-section-${id}`} hidden={!open}>{children}</div></section>;
}
