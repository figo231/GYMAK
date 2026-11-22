import { useState } from "react";
import Store from "../../lib/store/gymakStore";
import { useToast } from "../../hooks/useToast";
import { isNative, applyExtraReminders, syncMissedReminder } from "../../lib/push/nativeReminder";

const ROWS = [
  { k: "meals", label: "تسجيل الأكل", sub: "تذكير يومي تسجل فيه أكلك", time: true },
  { k: "water", label: "شرب المياه", sub: "6 تذكيرات خلال اليوم، من 10 الصبح لـ 8 بالليل", time: false },
  { k: "weigh", label: "وزنة الأسبوع", sub: "كل سبت في الميعاد ده", time: true },
  { k: "missed", label: "لو معملتش تمرين", sub: "تنبيه بالليل لو لسه متمرنتش النهاردة", time: true },
];

export default function Notifications() {
  const toast = useToast();
  const [prefs, setPrefs] = useState(() => Store.getReminderPrefs());
  const native = isNative();

  async function update(k, patch) {
    const next = Store.setReminderPrefs({ [k]: patch });
    setPrefs(next);
    if (!native) return;
    const ok = await applyExtraReminders(next);
    if (!ok) { toast("محتاجين إذنك للإشعارات. فعّلها من إعدادات الموبايل."); const off = Store.setReminderPrefs({ [k]: { on: false } }); setPrefs(off); return; }
    syncMissedReminder(next, Store.trainedOn(), true);
  }

  return (
    <div className="help-page">
      <div className="section-head"><h1 className="section-title">التنبيهات</h1></div>
      {!native && <p className="notif-note">التنبيهات الإضافية بتشتغل في تطبيق الأندرويد. على المتصفح بنحفظ اختياراتك بس.</p>}
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
              <label htmlFor={"t-" + r.k}>الميعاد</label>
              <input type="time" id={"t-" + r.k} value={prefs[r.k].time} onChange={(e) => e.target.value && update(r.k, { time: e.target.value })} />
            </div>
          )}
        </div>
      ))}
      <p className="notif-note">تذكير التمرين اليومي بتظبطه من حسابي &gt; الإعدادات.</p>
    </div>
  );
}
