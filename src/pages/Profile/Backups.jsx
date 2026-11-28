import { appLocale } from "../../lib/i18n/locale";
import { useEffect, useRef, useState } from "react";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useDialog";
import { listSnapshots, createSnapshot, restoreText, validateBackup, downloadCurrent } from "../../lib/backup";
import { tx, txf } from "../../lib/i18n/tx";

const fmtDate = (ts) => new Date(ts).toLocaleString(appLocale(), { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

export default function Backups() {
  const toast = useToast();
  const confirm = useConfirm();
  const [snaps, setSnaps] = useState([]);
  const fileRef = useRef(null);
  const refresh = () => listSnapshots().then(setSnaps);
  useEffect(() => { refresh(); }, []);

  async function now() {
    const s = await createSnapshot("manual");
    toast(s ? tx("اتعملت نسخة احتياطية") : tx("مفيش بيانات تتحفظ لسه"));
    refresh();
  }
  async function restore(text, label) {
    const ok = await confirm({ title: tx("استرجاع النسخة؟"), label: txf(`{0}. بياناتك الحالية هتتحفظ في نسخة قبل الاسترجاع.`, [label]), confirmLabel: tx("استرجع"), danger: true });
    if (!ok) return;
    const r = await restoreText(text);
    if (!r.ok) { toast(r.error); return; }
    toast(tx("اتسترجعت. بنعيد تشغيل التطبيق..."));
    setTimeout(() => window.location.assign("/"), 800);
  }
  async function onFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const text = await f.text();
    const v = validateBackup(text);
    if (!v.ok) { toast(v.error); return; }
    restore(text, txf(`ملف {0} فيه {1} يوم تمرين و{2} وزنة`, [f.name, v.summary.workoutDays, v.summary.weights]));
  }

  return (
    <div className="help-page">
      <div className="section-head"><h1 className="section-title">{tx("النسخ الاحتياطي")}</h1></div>
      <p className="notif-note">{tx("التطبيق بياخد نسخة تلقائية من بياناتك على الموبايل مرة في اليوم تقريبًا ويحتفظ بآخر 5. لو سجّلت دخول، بياناتك كمان بتتزامن على حسابك.")}</p>
      <div className="ad-actions">
        <button type="button" className="btn btn-primary" onClick={now}>{tx("انسخ دلوقتي")}</button>
        <button type="button" className="btn" onClick={downloadCurrent}>{tx("تصدير ملف")}</button>
        <button type="button" className="btn" onClick={() => fileRef.current && fileRef.current.click()}>{tx("استيراد ملف")}</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
      </div>
      {snaps.length === 0 && <p className="notif-note">{tx("لسه مفيش نسخ. أول نسخة تلقائية هتتعمل لما يكون عندك بيانات.")}</p>}
      {snaps.map((s) => (
        <div key={s.id} className="glass ad-msg">
          <div className="ad-meta"><b>{fmtDate(s.ts)}</b><span>{s.kind === "auto" ? tx("تلقائية") : tx("يدوية")}</span></div>
          <p className="ad-text">{s.summary.workoutDays} {tx("يوم تمرين ·")} {s.summary.weights} {tx("وزنة ·")} {s.summary.foodDays} {tx("يوم أكل")}</p>
          <div className="ad-actions"><button type="button" className="btn" onClick={() => restore(s.text, fmtDate(s.ts))}>{tx("استرجع")}</button></div>
        </div>
      ))}
    </div>
  );
}
