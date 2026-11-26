import {progressionSuggestion} from "../../lib/workoutIntelligence";
import {useState,useEffect,useRef} from 'react';
import {Link} from 'react-router-dom';
import Store from '../../lib/store/gymakStore';
import {workoutSummary} from '../../lib/workoutSession';
import {useStoreVersion} from '../../hooks/useStoreVersion';
import {isEn} from '../../lib/i18n/lang';
import {DetailTopBar} from '../../components/layout/DetailShell';
import ExerciseAnim from '../../components/ExerciseAnim';
import {fmtClock,remaining} from '../../lib/rest/restTimer';
import './workoutPlayer.css';
const text=(ar,en)=>isEn()?en:ar;
export default function WorkoutPlayer(){
 useStoreVersion();const writing=useRef(false);const session=Store.getWorkoutSession();
 const [selected,setSelected]=useState([]),[error,setError]=useState(''),[weight,setWeight]=useState(''),[reps,setReps]=useState('10'),[rir,setRir]=useState(''),[saving,setSaving]=useState(false),[confirmFinish,setConfirmFinish]=useState(false),[now,setNow]=useState(Date.now());
 const active=Store.getActiveProgram(),days=active?Store.getProgramDays(active.id):[];
 const current=session?.exercises[session.cursor],summary=session?workoutSummary(session,now):null;
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(t);},[]);
 useEffect(()=>{if(!current)return;const previous=Store.getLastExerciseLog(current.id);setWeight(String(previous?Store.toDisplayWeight(previous.weight):0));setReps(String(previous?.reps||current.reps));setRir('');},[current?.id,session?.id]);
 function start(title,exercises){try{Store.startWorkoutSession(title,exercises);setError('');}catch{setError(text('مقدرناش نبدأ. تأكد إنك داخل بحسابك وفي مساحة على الجهاز.','Could not start. Check your account and device storage.'));}}
 function log(){if(writing.current)return;writing.current=true;setSaving(true);try{const w=Number(weight),r=Number(reps);if(!weight.trim()||!reps.trim())throw Error('empty');Store.logWorkoutSet(session.id,current.id,crypto.randomUUID(),Store.fromDisplayWeight(w),r,rir===''?null:Number(rir));setError('');}catch{setError(text('المجموعة ماتحفظتش. راجع الوزن والعدات والمساحة وجرب تاني.','Set was not saved. Check weight, reps and device storage.'));}finally{setSaving(false);setTimeout(()=>{writing.current=false;},350);}}
 function finish(){try{Store.finishWorkoutSession(session.id);setConfirmFinish(false);}catch{setError(text('التمرين ماتقفلش. جرّب تاني.','Could not finish. Try again.'));}}
 const all=Store.getExercises();
 const guidance=current?progressionSuggestion(Store.getExerciseLogs(current.id),{targetReps:current.reps,unit:current.unit}):null;
 return <div className="workout-player">
  <DetailTopBar title={text('وضع التمرين','Workout player')} backTo="/exercises" />
  {error&&<p role="alert" className="wp-error">{error}</p>}
  {!session||session.status!=='active'?<>
   {session?.status==='completed'&&<section className="wp-summary"><p>{text('تمرينك اتحفظ','Workout saved')}</p><h2>{summary.sets} {text('مجموعة','sets')}</h2><span>{summary.exercises} {text('تمارين','exercises')} · {summary.minutes} {text('دقيقة','minutes')}</span><p>{text('كل مجموعة موجودة في سجلك. شغل كويس.','Every set is in your history. Good work.')}</p><Link to="/history">{text('شوف سجل التمرين','View history')}</Link></section>}
   <p className="wp-eyebrow">{text('خطوة بخطوة، من غير تشتيت','ONE SET AT A TIME')}</p><h2>{text('يلا نبدأ تمرينك','Start your workout')}</h2><p className="wp-muted">{text('هنمشي تمرين تمرين. كل مجموعة بتتحفظ فورًا، ولو قفلت تقدر تكمل من مكانك.','Follow your exercises. Each set saves right away, and you can resume after closing.')}</p>
   {days.length>0&&<section><h3>{active.name}</h3><div className="wp-day-list">{days.map((d,i)=><button type="button" key={i} onClick={()=>start(d.title,d.exercises)} disabled={!d.exercises.length}><span className="wp-day-number">{i+1}</span><span><b>{d.title}</b><small>{d.exercises.length} {text('تمارين','exercises')}</small></span><span>←</span></button>)}</div></section>}
   <details className="wp-custom"><summary>{text('كوّن تمرينك من المكتبة','Build your own workout')}</summary><div className="wp-selection">{all.map(e=><label key={e.id}><input type="checkbox" checked={selected.includes(e.id)} disabled={!selected.includes(e.id)&&selected.length>=12} onChange={()=>setSelected(a=>a.includes(e.id)?a.filter(x=>x!==e.id):[...a,e.id])}/>{e.name}</label>)}</div><button type="button" className="wp-primary" disabled={!selected.length} onClick={()=>start(text('تمريني','My workout'),all.filter(e=>selected.includes(e.id)))}>{text('ابدأ التمرين','Start workout')} ({selected.length})</button></details>
  </>:<>
   <div className="wp-session-head"><span className="wp-live">{text('تمرين شغال','IN PROGRESS')}</span><span>{summary.sets} / {summary.plannedSets} {text('مجموعة','sets')}</span></div>
   <h2>{session.title}</h2><div className="wp-progress" role="progressbar" aria-label={text('تقدم التمرين','Workout progress')} aria-valuenow={summary.sets} aria-valuemin={0} aria-valuemax={summary.plannedSets}><i style={{width:(100*summary.sets/summary.plannedSets)+'%'}}/></div>
   {summary.allDone?<section className="wp-summary"><h2>{text('خلصت كل المجموعات','All sets complete')}</h2><p>{text('اقفل التمرين عشان تشوف ملخصك.','Finish your workout to see your summary.')}</p><button type="button" className="wp-primary" onClick={finish}>{text('إنهاء وحفظ الملخص','Finish and save summary')}</button></section>:<>
    <div className="wp-exercise-title"><span>{session.cursor+1} / {session.exercises.length}</span><h3>{current.name}</h3><Link to={'/exercise/'+encodeURIComponent(current.id)}>{text('الشرح','How to')}</Link></div>
    <div className="wp-demo"><div className="wp-media-fallback"><b>{current.name}</b><span>{text("الصورة مش متاحة هنا. شرح الأداء محفوظ في صفحة التمرين.","Image unavailable here. Open the exercise for saved form instructions.")}</span></div><ExerciseAnim exerciseId={current.id} still alt={current.name}/></div>
    <div className="wp-set-dots">{Array.from({length:current.sets},(_,i)=><span key={i} className={i<current.completed.length?'done':i===current.completed.length?'current':''}>{i<current.completed.length?'✓':i+1}</span>)}</div>
    {remaining(session.restUntil,Math.max(now,Date.now()))>0&&<div className="wp-rest" role="status"><span>{text('راحة. خُد وقتك','REST. TAKE YOUR TIME')}</span><b>{fmtClock(remaining(session.restUntil,Math.max(now,Date.now())))}</b><small>{text('المؤقت مش بيمنعك تسجل لما تكون جاهز','Log your next set when you are ready')}</small></div>}
    {guidance&&<p className="wp-muted">{guidance.kind==='consider'?(isEn()?`You may try ${Store.toDisplayWeight(guidance.weight)} ${Store.unitLabel()} if your form is comfortable. A suggestion, not an automatic increase.`:`ممكن تجرب ${Store.toDisplayWeight(guidance.weight)} ${Store.unitLabel()} لو الأداء مريح. اقتراح بس، مش زيادة تلقائية.`):guidance.kind==='learn'?text('سجل يومين مختلفين عشان نشوف اتجاه أدائك.','Log two separate days to see your trend.'):guidance.kind==='maintain'?text('ثبّت الوزن وركّز على الأداء والعدات. أي ألم؟ وقف التمرين.','Keep the load and focus on form and reps. Stop if you feel pain.'):text('زود الوقت براحتك ومع أداء سليم، مش الوزن.','Focus on comfortable duration and good form, not load.')}</p>}
    <div className="wp-fields"><label>{text('الوزن','Weight')} ({Store.unitLabel()})<input inputMode="decimal" type="number" min="0" step="0.5" value={weight} onChange={e=>setWeight(e.target.value)}/></label><label>{current.unit==='sec'?text('ثواني','Seconds'):text('العدات','Reps')}<input inputMode="numeric" type="number" min="1" step="1" value={reps} onChange={e=>setReps(e.target.value)}/></label></div>
    <label className="wp-rir">{text('كان فاضلك كام عدة؟ (اختياري)','Reps left in reserve? (optional)')}<select value={rir} onChange={e=>setRir(e.target.value)}><option value="">{text('مش متأكد','Not sure')}</option>{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}{n===5?'+':''}</option>)}</select></label>
    <button type="button" className="wp-primary" disabled={saving} onClick={log}>{text('✓ سجل المجموعة','✓ Log set')} {current.completed.length+1}</button>
   </>}
   <p className="wp-muted wp-saved">{text('محفوظ على الجهاز. ارجع وكمل في أي وقت.','Saved on this device. Come back and continue anytime.')}</p>
   {summary.sets===0&&<button type="button" className="wp-finish" onClick={()=>{try{Store.cancelEmptyWorkoutSession(session.id);setError('');}catch{setError(text('مقدرناش نلغي التمرين. جرّب تاني.','Could not cancel workout. Try again.'));}}}>{text('إلغاء تمرين لسه مبدأش','Cancel unstarted workout')}</button>}
   {summary.sets>0&&!summary.allDone&&<button type="button" className="wp-finish" onClick={()=>setConfirmFinish(true)}>{text('إنهاء التمرين بدري','Finish workout early')}</button>}
   {confirmFinish&&<div className="wp-confirm" role="alertdialog" aria-label={text('إنهاء التمرين؟','Finish workout?')}><h3>{text('ننهي التمرين؟','Finish workout?')}</h3><p>{text('المجموعات اللي سجلتها محفوظة. الباقي مش هيتسجل كأنه خلص.','Your logged sets are saved. Unfinished sets will not count as complete.')}</p><button type="button" className="wp-primary" onClick={finish}>{text('احفظ الملخص','Save summary')}</button><button type="button" className="wp-finish" onClick={()=>setConfirmFinish(false)}>{text('نكمل تمرين','Keep going')}</button></div>}
  </>}
 </div>;
}
