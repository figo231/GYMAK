import ServerPushPreferences from "./ServerPushPreferences";
import {useAuth} from "../../hooks/useAuth";
import {readPushPreferences,savePushPreference} from "../../lib/push/serverPreferences";
import SmartReminderPreference from "./SmartReminderPreference";
import WebPushPreference from "../../components/WebPushPreference";
import { useState,useEffect } from "react";
import { Link } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { useToast } from "../../hooks/useToast";
import { isNative, applyExtraReminders, syncMissedReminder } from "../../lib/push/nativeReminder";

import ChatPushPreference from './ChatPushPreference';
import EncouragementPreference from "./EncouragementPreference";
import { tx } from "../../lib/i18n/tx";

const ROWS = [
  { k: "meals", label: tx("تسجيل الأكل"), sub: tx("تذكير يومي تسجل فيه أكلك"), time: true },
  { k: "water", label: tx("شرب المياه"), sub: tx("6 تذكيرات خلال اليوم، من 10 الصبح لـ 8 بالليل"), time: false },
  { k: "weigh", label: tx("وزنة الأسبوع"), sub: tx("كل سبت في الميعاد ده"), time: true },
  { k: "supplements", label: tx("المكملات"), sub: tx("تذكير يومي بمعاد مكملاتك (كرياتين، أوميجا...)"), time: true },
  { k: "missed", label: tx("لو معملتش تمرين"), sub: tx("تنبيه بالليل لو لسه متمرنتش النهاردة"), time: true },
];

export default function Notifications() {
  const toast = useToast();
  const {user}=useAuth();
  const [prefs, setPrefs] = useState(() => Store.getReminderPrefs());
  const native = isNative();
  const [master,setMaster]=useState(()=>Store.getSettings().notificationsMaster!==false);
  useEffect(()=>{let live=true;if(user?.id)readPushPreferences(user.id).then(p=>{
    if(!live)return;
    // Any recorded OFF wins. A stale device must never silently re-enable it.
    if(p.master===false){Store.setNotificationsMaster(false);setMaster(false);}
    else if(Store.getSettings().notificationsMaster===false)savePushPreference(user.id,'master',false).catch(()=>{});
  }).catch(()=>{});return()=>{live=false;};},[user?.id]);
  async function toggleMaster(on){
    try{
      Store.setNotificationsMaster(on);setMaster(on);Store.scheduleReminder();
      if(native){const {cancelAllAppReminders}=await import("../../lib/push/nativeReminder");if(!on)await cancelAllAppReminders();}
      try{await savePushPreference(user?.id,'master',on);}
      catch{toast(tx("اختيارك محفوظ على الجهاز. إيقاف إشعارات السيرفر لسه محتاج نت بنفس الحساب، ورسالة اتبعتت ممكن توصل."));}
    }catch{toast(tx("التغيير متعملش بالكامل. جرّب تاني."));}
  }

  async function update(k, patch) {
    try { await updateChoice(k,patch); } catch { setPrefs(Store.getReminderPrefs());toast(tx("الحفظ أو الجدولة متعملش. جرّب تاني.")); }
  }
  async function updateChoice(k,patch) {
    const next = Store.setReminderPrefs({ [k]: patch });
    setPrefs(next);
    if (!native || !master) return;
    const ok = await applyExtraReminders(next);
    if (!ok) { toast(tx("محتاجين إذنك للإشعارات. فعّلها من إعدادات الموبايل.")); const off = Store.setReminderPrefs({ [k]: { on: false } }); setPrefs(off); return; }
    syncMissedReminder(next, Store.trainedOn(), true);
  }

  return (
    <div className="help-page">
      <div className="section-head"><h1 className="section-title">{tx("التنبيهات")}</h1></div>
      {!native && <p className="notif-note">{tx("التنبيهات الإضافية بتشتغل في تطبيق الأندرويد. على المتصفح بنحفظ اختياراتك بس.")}</p>}
      <section className="glass notif-row"><label className="toggle-row"><span>{tx("كل الإشعارات والتذكيرات")}</span><input type="checkbox" checked={master} onChange={e=>toggleMaster(e.target.checked)} /></label><p className="notif-note">{tx("يقفل التذكيرات المحلية وإشعارات الحساب. اختيار السيرفر محتاج اتصال للتأكيد، ورسالة اتبعتت بالفعل ممكن توصل.")}</p></section>
      <fieldset disabled={!master} style={{border:0,padding:0,margin:0,opacity:master?1:.5}}>
      <SmartReminderPreference />
      </fieldset>
      <ServerPushPreferences />
      <WebPushPreference />
      <ChatPushPreference />
      <EncouragementPreference />
      {ROWS.map((r) => (
        <div key={r.k} className="glass notif-row">
          <div className="toggle-row">
            <div><div className="trow-label">{r.label}</div><div className="trow-sub">{r.sub}</div></div>
            <label className="switch">
              <input type="checkbox" aria-label={r.label} checked={prefs[r.k].on} onChange={(e) => update(r.k, { on: e.target.checked })} />
              <span className="switch-track" />
            </label>
          </div>
          {r.time && prefs[r.k].on && (
            <div className="edit-field time-field show">
              <label htmlFor={"t-" + r.k}>{tx("الميعاد")}</label>
              <input type="time" id={"t-" + r.k} value={prefs[r.k].time} onChange={(e) => e.target.value && update(r.k, { time: e.target.value })} />
            </div>
          )}
        </div>
      ))}
      <p className="notif-note">{tx("تذكير التمرين اليومي في حسابي > التفضيلات والخصوصية > التذكير اليومي.")} <Link to="/profile?reminder=1">{tx("افتح التذكير اليومي")}</Link></p>
    </div>
  );
}
