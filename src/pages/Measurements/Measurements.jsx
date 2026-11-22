import { useMemo, useState } from "react";
import SectionNav from "../../components/layout/SectionNav";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useDialog";
import { buzz } from "../../lib/haptics";
import { localISO } from "../../lib/dateKey";
import { dayLabel } from "../../lib/historyLogic";
import { FIELDS, loadMeasures, saveMeasure, deleteMeasure, restoreMeasure, measureDeltas, validateMeasures, latestByField } from "../../lib/measure/measure";

// Waist and hips going down is the usual goal; for the rest we do not judge the direction.
const DOWN_IS_GOOD = new Set(["waist", "hips"]);

function Spark({ series }) {
  if (!series || series.length < 2) return null;
  const w = 56, h = 18, min = Math.min(...series), max = Math.max(...series), span = max - min || 1;
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(" ");
  return <svg className="ms-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function toneFor(k, d) {
  if (d == null || d === 0) return "flat";
  if (!DOWN_IS_GOOD.has(k)) return "flat";
  return d < 0 ? "good" : "warn";
}

export default function Measurements() {
  const toast = useToast();
  const confirm = useConfirm();
  const today = localISO();
  const [entries, setEntries] = useState(loadMeasures);
  const [vals, setVals] = useState({});
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState({});
  const latest = entries[entries.length - 1];
  const deltas = useMemo(() => measureDeltas(entries), [entries]);
  const byField = useMemo(() => latestByField(entries), [entries]);
  const reload = () => setEntries(loadMeasures());

  function add() {
    const v = validateMeasures(vals);
    setErrors(v.errors);
    if (Object.keys(v.errors).length) { toast(Object.values(v.errors)[0]); return; }
    if (!v.count) { toast("اكتب قياس واحد على الأقل (بالسنتيمتر)."); return; }
    if (date > today) { toast("مينفعش تسجّل قياس في تاريخ لسه ماجاش."); return; }
    const had = entries.find((e) => e.date === date);
    saveMeasure(vals, date);
    reload(); setVals({}); buzz(15);
    toast(had ? "اتحدّثت قياسات اليوم ده" : "اتسجلت القياسات", had ? { duration: 6000, action: { label: "تراجع", onClick: () => { restoreMeasure(had); reload(); } } } : undefined);
  }
  async function del(e) {
    const ok = await confirm({ title: "مسح القياسات؟", label: dayLabel(e.date, today), confirmLabel: "مسح", danger: true });
    if (!ok) return;
    deleteMeasure(e.date); reload();
    toast("تم مسح القياسات", { duration: 6000, action: { label: "تراجع", onClick: () => { restoreMeasure(e); reload(); } } });
  }
  const setField = (k, v) => { setVals((o) => ({ ...o, [k]: v })); if (errors[k]) setErrors((o) => { const n = { ...o }; delete n[k]; return n; }); };

  return (
    <>
      <SectionNav group="progress" title="تقدّمي" />

      {Object.keys(byField).length > 0 && (
        <div className="ms-tiles">
          {FIELDS.filter(([k]) => byField[k]).map(([k, label]) => {
            const f = byField[k];
            return (
              <div className="glass ms-tile" key={k}>
                <div className="ms-tile-label">{label}</div>
                <div className="ms-tile-val"><span dir="ltr">{f.value}</span><small> سم</small></div>
                <div className={"ms-tile-delta " + toneFor(k, f.delta)}>
                  {f.delta == null ? "أول قياس" : f.delta === 0 ? "ثابت" : <bdi dir="ltr">{f.delta > 0 ? "+" : "−"}{Math.abs(f.delta)}</bdi>}
                  <Spark series={f.series} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="glass ms-card">
        <div className="ms-card-title">قياس جديد (سم)</div>
        <div className="edit-field">
          <label htmlFor="ms-date">التاريخ</label>
          <input id="ms-date" type="date" dir="ltr" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
        </div>
        <div className="ms-grid">
          {FIELDS.map(([k, label]) => (
            <div className="edit-field" key={k} style={{ margin: 0 }}>
              <label htmlFor={`ms-${k}`}>{label}</label>
              <input id={`ms-${k}`} type="number" inputMode="decimal" dir="ltr" step="0.1" value={vals[k] ?? ""} placeholder={latest && latest[k] != null ? String(latest[k]) : ""}
                aria-invalid={errors[k] ? true : undefined} onChange={(e) => setField(k, e.target.value)} />
            </div>
          ))}
        </div>
        {Object.values(errors)[0] && <p className="log-error" role="alert" style={{ marginTop: 10 }}>{Object.values(errors)[0]}</p>}
        <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={add}>حفظ</button>
        <p className="notif-note" style={{ marginTop: 10 }}>القياسات بتتحفظ على جهازك وبتدخل في النسخة الاحتياطية (من الملف الشخصي)، لكن مش بتتزامن مع حسابك.</p>
      </div>

      {Object.keys(deltas).length > 0 && (
        <div className="glass ms-card">
          <div className="ms-card-title">التغيير من أول قياس</div>
          {FIELDS.filter(([k]) => k in deltas).map(([k, label]) => (
            <div key={k} className="ms-delta-row">
              <span>{label}</span>
              <b className={"ms-tile-delta " + toneFor(k, deltas[k])}><span><bdi dir="ltr">{deltas[k] > 0 ? "+" : deltas[k] < 0 ? "−" : ""}{Math.abs(deltas[k])}</bdi> سم</span></b>
            </div>
          ))}
        </div>
      )}

      <div className="ms-card-title" style={{ margin: "14px 4px 8px" }}>السجل</div>
      {entries.length === 0 && <EmptyState type="trophy" compact title="لسه مسجلتش أي قياس" subtitle="سجّل أول قياس النهارده وقارن بعد كام أسبوع." />}
      {[...entries].reverse().map((e) => (
        <div className="glass hist-row" key={e.date}>
          <div className="hist-main">
            <div className="hist-name">{dayLabel(e.date, today)}</div>
            <div className="hist-meta">{FIELDS.filter(([k]) => e[k] != null).map(([k, l]) => `${l} ${e[k]}`).join(" · ")}</div>
          </div>
          <button type="button" className="hist-btn danger" aria-label={`مسح قياسات ${dayLabel(e.date, today)}`} onClick={() => del(e)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" /></svg>
          </button>
        </div>
      ))}
    </>
  );
}
