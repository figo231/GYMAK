import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DetailTopBar } from '../../components/layout/DetailShell';
import {useAuth} from '../../hooks/useAuth';
import Store from '../../lib/store/gymakStore';
import { normalizeCheckIn, weekStart, checkInText } from '../../lib/checkIn';
import './followUp.css';
export default function WeeklyCheckIn() {
 const {user}=useAuth(); const nav=useNavigate(); const [rows,setRows]=useState(()=>Store.getWeeklyCheckIns());
 const [form,setForm]=useState(()=>rows.find(r=>r.week===weekStart()) || {sleep:'',energy:3,hunger:3,adherence:75,note:''});
 const [notice,setNotice]=useState('');
 function save(e) {e.preventDefault(); try {const row=normalizeCheckIn(form);Store.saveWeeklyCheckIn(row);setRows(Store.getWeeklyCheckIns());setNotice('اتحفظت على الجهاز. مفيش حاجة اتبعتت لحد.');}catch(e){setNotice(e.message);}}
 const field=(key,value)=>setForm(v=>({...v,[key]:value}));
 return <div className="fu-page" dir="rtl"><DetailTopBar title="متابعتي الأسبوعية" backTo="/profile"/>
 <header className="fu-hero"><span className="fu-eyebrow">وقفة صغيرة · كل أسبوع</span><h2>أسبوعك كان عامل إيه؟</h2><p>بص على نومك وطاقتك والتزامك. الأرقام دي ليك، والمشاركة باختيارك.</p><div className="fu-badge">محفوظة على جهازك فقط</div></header>
 <form onSubmit={save} className="fu-card glass"><h3>ملخص الأسبوع</h3><p className="fu-muted">من السبت للجمعة. لو حفظت تاني في نفس الأسبوع، الملخص بيتحدّث.</p>
 <label>متوسط ساعات النوم<input type="number" min="0" max="24" step="0.5" required value={form.sleep} onChange={e=>field('sleep',e.target.value)} placeholder="مثلاً 7.5" inputMode="decimal"/></label>
 {[["energy","طاقتك خلال اليوم","1 قليلة · 5 عالية"],["hunger","إحساسك بالجوع","1 قليل · 5 عالي"]].map(([key,title,hint])=><fieldset key={key}><legend>{title}</legend><small>{hint}</small><div className="fu-scores">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-pressed={Number(form[key])===n} onClick={()=>field(key,n)}>{n}</button>)}</div></fieldset>)}
 <label>التزامك بالخطة <b>{form.adherence}%</b><input type="range" min="0" max="100" step="5" value={form.adherence} onChange={e=>field('adherence',e.target.value)}/></label>
 <label>حابب تضيف إيه؟ <small>اختياري</small><textarea rows="3" maxLength="400" value={form.note} onChange={e=>field('note',e.target.value)} placeholder="حاجة ساعدتك، أو حاجة عطلتك..."/></label><button className="btn btn-primary" type="submit">احفظ ملخص الأسبوع</button><p className="fu-muted">متكتبش مستندات طبية أو بيانات شخصية مش ضرورية.</p>{notice&&<p role="status" className="fu-notice">{notice}</p>}</form>
 <h3 className="fu-section-title">الأسابيع اللي فاتت <span>{rows.length}</span></h3>
 {!rows.length&&<div className="fu-card glass fu-muted">أول ملخص ليك هيظهر هنا بعد الحفظ.</div>}
 {rows.map(r=><article className="fu-card glass" key={r.week}><div className="fu-row"><h3>أسبوع <bdi>{r.week}</bdi></h3><span className="fu-muted">آخر حفظ <bdi>{r.date}</bdi></span></div><div className="fu-metrics">{[[r.sleep,'ساعة نوم'],[`${r.energy}/5`,'طاقة'],[`${r.hunger}/5`,'جوع'],[`${r.adherence}%`,'التزام']].map(([v,k])=><div key={k}><b dir="ltr">{v}</b><small>{k}</small></div>)}</div>{r.note&&<p className="fu-note-text">{r.note}</p>}<button type="button" className="fu-outline" onClick={()=>user?nav('/messages',{state:{proposedDraft:checkInText(r),draftOwner:user.id}}):nav('/auth/login',{state:{from:'/weekly-check-in'}})}>{user?'اختار محادثة وراجع قبل الإرسال ←':'سجّل دخولك عشان تختار محادثة ←'}</button><p className="fu-muted">بيفتح مسودة بس. أنت اللي بتختار الشخص وبتضغط إرسال.</p><button className="fu-delete" type="button" onClick={()=>{if(!window.confirm('تمسح ملخص الأسبوع من الجهاز؟ ده مش بيمسح رسالة بعتها قبل كده.'))return;try{Store.deleteWeeklyCheckIn(r.week);setRows(Store.getWeeklyCheckIns());}catch(e){setNotice(e.message);}}}>حذف الملخص</button></article>)}
 <p className="fu-muted">الملخصات بتدخل في نسخة بيانات الجهاز الاحتياطية. مش بتتزامن تلقائيًا مع حسابك، ومش تقييم طبي.</p></div>;
}
