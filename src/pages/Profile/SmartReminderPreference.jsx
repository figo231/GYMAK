import {useState} from 'react';
import Store from '../../lib/store/gymakStore';
import {isEn} from '../../lib/i18n/lang';
import {suggestedWorkoutTime} from '../../lib/workoutIntelligence';
import {getSmartReminder,saveSmartReminder,syncSmartReminder} from '../../lib/push/smartReminder';
import {isNative} from '../../lib/push/nativeReminder';
const t=(ar,en)=>isEn()?en:ar;
export default function SmartReminderPreference(){
 const [prefs,setPrefs]=useState(getSmartReminder),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const suggestion=suggestedWorkoutTime(Store.getRawStateForSync().exerciseLogs),native=isNative();
 async function save(){setBusy(true);const previous=getSmartReminder();try{saveSmartReminder(prefs);let result;try{result=await syncSmartReminder(Store.getRawStateForSync().workoutDays,{prefs:Store.getSettings().notificationsMaster===false?{...prefs,enabled:false}:prefs,requestPermission:true,lang:isEn()?'en':'ar'});}catch(e){saveSmartReminder(previous);throw e;}if(result.denied){setStatus(t('اختيارك محفوظ، بس إذن الإشعارات مقفول. فعّله من إعدادات الجهاز عشان توصلك.','Choice saved, but OS permission is off. Enable it in device settings for delivery.'));return;}setStatus(native?t('اتحفظ. هنجهّز تنبيهات الأسبوع الجاي كل ما تفتح التطبيق، ونلغي يومك لما تسجل تمرين.','Saved. Opening the app renews the next week of reminders. Logging a workout cancels that day.'):t('اختياراتك اتحفظت فقط. التنبيهات دي محتاجة تطبيق الأندرويد.','Preferences saved only. These reminders need the Android app.'));}catch{setStatus(t('الحفظ أو جدولة التنبيهات متعملش. جرّب تاني.','Saving or scheduling failed. Try again.'));}finally{setBusy(false);}}

 const names=isEn()?['Sun','Mon','Tue','Wed','Thu','Fri','Sat']:['أحد','اتنين','تلات','أربع','خميس','جمعة','سبت'];
 return <section className="glass" style={{padding:18,marginBottom:16}}><h2 style={{fontSize:17}}>{t('تذكير على نظامك','Your workout schedule')}</h2><p className="notif-note">{t('مفتوح افتراضيًا. اختار أيامك وميعادك أو اقفله من هنا.','On by default. Choose your days and time, or turn it off here.')}</p>
  {suggestion&&<button type="button" className="wp-finish" onClick={()=>setPrefs({...prefs,time:suggestion.time})}>{t('من تاريخك، جرّب','From your history, try')} {suggestion.time}</button>}
  <label className="toggle-row">{t('تفعيل تذكير الجدول','Enable scheduled reminders')}<input type="checkbox" checked={prefs.enabled} onChange={e=>setPrefs({...prefs,enabled:e.target.checked})}/></label>
  <label style={{display:'block',margin:'14px 0'}}>{t('الميعاد','Time')} <input aria-label={t('ميعاد تذكير الجدول','Schedule reminder time')} type="time" value={prefs.time} onChange={e=>e.target.value&&setPrefs({...prefs,time:e.target.value})}/></label>
  <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>{names.map((name,i)=><label key={i} style={{fontSize:12}}><input type="checkbox" checked={prefs.weekdays.includes(i)} onChange={()=>setPrefs({...prefs,weekdays:prefs.weekdays.includes(i)?prefs.weekdays.filter(x=>x!==i):[...prefs.weekdays,i]})}/>{name}</label>)}</div>
  <p className="notif-note">{t('لو التذكير اليومي القديم شغال، اقفله عشان متوصلكش رسالتين. إشعارات أندرويد ممكن تتأخر بسبب توفير البطارية.','Turn off the old daily reminder to avoid duplicates. Android battery settings can delay delivery.')}</p>
  <button type="button" className="btn-apply" style={{padding:"10px 18px",minWidth:130}} disabled={busy||(prefs.enabled&&!prefs.weekdays.length)} onClick={save}>{t('حفظ اختياراتي','Save my choices')}</button>{status&&<p role="status" className="notif-note">{status}</p>}
 </section>;
}
