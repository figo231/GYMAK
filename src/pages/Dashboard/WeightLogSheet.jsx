import { useState } from "react";
import { localISO } from "../../lib/dateKey";

const field = { width: "100%", boxSizing: "border-box", background: "rgba(var(--ink),0.045)", border: "1px solid var(--border-soft)", borderRadius: 12, padding: "11px 12px", color: "var(--text-primary)", fontFamily: "'Tajawal',sans-serif", fontSize: 15, fontWeight: 700 };
const lab = { fontSize: 11, color: "var(--text-dim)", fontWeight: 700, display: "block", marginBottom: 6 };

// onSave(form) returns an error string to show, or null when saved.
export default function WeightLogSheet({ initialWeight, lastBodyFat, unitLabel, onClose, onSave }) {
  const today = localISO();
  const [weight, setWeight] = useState(initialWeight ?? "");
  const [bodyFat, setBodyFat] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState("");

  function handleSave() {
    const err = onSave({ weight, bodyFat, date });
    if (err) setError(err);
  }

  return (
    <div className="sheet-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass sheet-panel" role="dialog" aria-modal="true" aria-label="تسجيل وزن">
        <div className="sheet-grip" />
        <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 16px" }}>{date === today ? "تسجيل وزن اليوم" : "تسجيل وزن بتاريخ قديم"}</h3>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="wl-weight" style={lab}>الوزن ({unitLabel})</label>
            <input id="wl-weight" type="number" step="0.1" inputMode="decimal" value={weight} autoFocus
              onChange={(e) => { setWeight(e.target.value); setError(""); }} style={field} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="wl-bf" style={lab}>نسبة الدهون % (اختياري)</label>
            <input id="wl-bf" type="number" step="0.1" inputMode="decimal" value={bodyFat}
              placeholder={lastBodyFat != null ? `آخر قياس ${lastBodyFat}` : ""}
              onChange={(e) => { setBodyFat(e.target.value); setError(""); }} style={field} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="wl-date" style={lab}>التاريخ</label>
          <input id="wl-date" type="date" value={date} max={today} onChange={(e) => { setDate(e.target.value || today); setError(""); }} style={field} />
        </div>
        {error && <div role="alert" style={{ color: "var(--danger)", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{error}</div>}
        <div className="sheet-actions" style={{ marginTop: 0 }}>
          <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" onClick={handleSave}>حفظ</button>
        </div>
      </div>
    </div>
  );
}
