import { useState } from "react";
import { DetailTopBar } from "../../components/layout/DetailShell";
import { useToast } from "../../hooks/useToast";
import { FIELDS, loadMeasures, saveMeasure, deleteMeasure, measureDeltas } from "../../lib/measure/measure";

export default function Measurements() {
  const toast = useToast();
  const [entries, setEntries] = useState(loadMeasures);
  const [vals, setVals] = useState({});
  const deltas = measureDeltas(entries);
  const latest = entries[entries.length - 1];

  function add() {
    const e = saveMeasure(vals);
    if (!e) { toast("اكتب قياس واحد على الأقل (بالسنتيمتر)."); return; }
    setEntries(loadMeasures()); setVals({}); toast("اتسجلت القياسات ✅");
  }
  function del(date) { deleteMeasure(date); setEntries(loadMeasures()); }
  const card = { padding: 14, marginBottom: 12 };
  return (
    <>
      <DetailTopBar backTo="/profile" title="قياسات الجسم" />
      <div className="glass" style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>قياسات النهاردة (سم)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FIELDS.map(([k, label]) => (
            <div className="edit-field" key={k} style={{ margin: 0 }}>
              <label>{label}</label>
              <input type="number" inputMode="decimal" dir="ltr" value={vals[k] ?? ""} placeholder={latest?.[k] ?? ""}
                onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={add}>حفظ</button>
      </div>

      {Object.keys(deltas).length > 0 && (
        <div className="glass" style={card}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>التغيير من أول قياس</div>
          {FIELDS.filter(([k]) => k in deltas).map(([k, label]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
              <span>{label}</span>
              <b dir="ltr" style={{ color: deltas[k] === 0 ? "inherit" : deltas[k] < 0 ? "#16a34a" : "#d97706" }}>{deltas[k] > 0 ? "+" : ""}{deltas[k]} سم</b>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontWeight: 800, fontSize: 13.5, margin: "8px 0" }}>السجل</div>
      {entries.length === 0 && <p className="notif-note">لسه مسجلتش أي قياس.</p>}
      {[...entries].reverse().map((e) => (
        <div className="glass" key={e.date} style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, fontSize: 12.5 }}>
            <div dir="ltr" style={{ fontWeight: 800, textAlign: "right" }}>{e.date}</div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>{FIELDS.filter(([k]) => e[k] != null).map(([k, l]) => `${l} ${e[k]}`).join(" · ")}</div>
          </div>
          <button type="button" onClick={() => del(e.date)} style={{ background: "none", border: "1px solid var(--border-soft)", borderRadius: 10, padding: "6px 10px", color: "inherit", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>مسح</button>
        </div>
      ))}
    </>
  );
}
