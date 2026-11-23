import { useMemo, useState } from "react";
import SectionNav from "../../components/layout/SectionNav";
import Store from "../../lib/store/gymakStore";
import { estimate1RM, workingWeights } from "../../lib/strength";
import { tx } from "../../lib/i18n/tx";

const arDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "long" });

export default function Strength() {
  const [tab, setTab] = useState("pr");
  const [w, setW] = useState("");
  const [r, setR] = useState("");
  const records = useMemo(() => Store.getPersonalRecords(), []);
  const unit = Store.unitLabel();
  const kg = Store.fromDisplayWeight(w);
  const one = estimate1RM(kg, r);
  const step = unit === "رطل" ? 5 : 2.5;
  const rows = one ? workingWeights(one, Store.fromDisplayWeight(step)) : [];
  const fmt = (v) => Store.toDisplayWeight(v).toLocaleString("en-US", { maximumFractionDigits: 1 });
  const useRecord = (p) => { setW(String(Store.toDisplayWeight(p.weight))); setR(String(p.reps)); setTab("calc"); };

  return (
    <div className="wu-page">
      <SectionNav group="train" title={tx("تدريب")} />
      <div className="mp-tabs">
        <button type="button" className={tab === "pr" ? "on" : ""} onClick={() => setTab("pr")}>{tx("أرقامي القياسية")}</button>
        <button type="button" className={tab === "calc" ? "on" : ""} onClick={() => setTab("calc")}>{tx("حاسبة 1RM")}</button>
      </div>
      {tab === "pr" && (<>
        <p className="mp-note">{tx("أثقل وزن سجلته في كل تمرين. أول ما تكسر رقم، هتظهر لك بطاقة احتفال تلقائيًا. دوس على تمرين تحسب منه أوزان شغلك.")}</p>
        {!records.length && <div className="glass" style={{ padding: 16, textAlign: "center", fontSize: 13, lineHeight: 1.7 }}>{tx("لسه مفيش أوزان متسجلة. سجّل أول تمرين وهتلاقي رقمك هنا.")}</div>}
        {records.map((p) => (
          <button type="button" key={p.exerciseId} className="glass pr-card sr-row" onClick={() => useRecord(p)}>
            <div className="pr-info"><p className="pr-name">{p.name}</p><p className="pr-date">{arDate(p.date)} · {p.reps} {tx("عدة")}</p></div>
            <div className="pr-value"><div className="pr-num"><bdi>{fmt(p.weight)}</bdi> {unit}</div>{p.e1rm ? <div className="pr-old-label">{tx("1RM تقديري")} <bdi>{fmt(p.e1rm)}</bdi></div> : null}</div>
          </button>
        ))}
      </>)}
      {tab === "calc" && (<>
        <p className="mp-note">{tx("دخّل وزن وعدّاته من أي مجموعة صعبة (لحد 12 عدة أدق). هنقدّر أقصى وزن ترفعه مرة واحدة، ونديك أوزان الشغل. التقدير تقريبي، مش لازم تجرّب المرة الواحدة فعلًا.")}</p>
        <div className="sr-inputs">
          <label>{tx("الوزن (")}{unit})<input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} placeholder="80" /></label>
          <label>{tx("العدّات")}<input inputMode="numeric" value={r} onChange={(e) => setR(e.target.value)} placeholder="8" /></label>
        </div>
        {one ? (<>
          <div className="glass sr-result"><span>{tx("أقصى وزن لمرة واحدة (تقديري)")}</span><b><bdi>{fmt(one)}</bdi> {unit}</b></div>
          {rows.map((z) => (
            <div key={z.pct} className="glass sr-zone"><span className="sr-pct">{z.pct}%</span><b><bdi>{fmt(z.kg)}</bdi> {unit}</b><span>{z.reps} {tx("عدة")}</span><small>{z.goal}</small></div>
          ))}
          <p className="mp-note">{tx("الأوزان متقرّبة لأقرب")} {step} {unit === "رطل" ? tx("رطل") : tx("كجم")}{tx(". للتضخيم غالبًا 70 إلى 80%، وللقوة 85% فوق. ابدأ أخف شوية لو مش متأكد.")}</p>
        </>) : (w || r) ? <p className="mp-note">{tx("دخّل وزن أكبر من صفر وعدّات من 1 لحد 30.")}</p> : null}
      </>)}
    </div>
  );
}
