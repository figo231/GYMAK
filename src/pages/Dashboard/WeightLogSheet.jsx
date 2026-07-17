import { useState } from "react";

export default function WeightLogSheet({ initialWeight, initialBodyFat, unitLabel, onClose, onSave }) {
  const [weight, setWeight] = useState(initialWeight ?? "");
  const [bodyFat, setBodyFat] = useState(initialBodyFat ?? "");

  function handleSave() {
    const wDisplay = parseFloat(weight);
    if (!wDisplay || wDisplay <= 0) return;
    onSave(wDisplay, bodyFat === "" ? null : parseFloat(bodyFat));
  }

  return (
    <div className="sheet-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass sheet-panel">
        <div className="sheet-grip" />
        <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 16px" }}>تسجيل وزن اليوم</h3>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700, display: "block", marginBottom: 6 }}>
              الوزن ({unitLabel})
            </label>
            <input
              type="number" step="0.1" inputMode="decimal" value={weight} autoFocus
              onChange={(e) => setWeight(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(17,24,39,0.045)", border: "1px solid var(--border-soft)", borderRadius: 12, padding: "11px 12px", color: "#111827", fontFamily: "'Tajawal',sans-serif", fontSize: 15, fontWeight: 700 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700, display: "block", marginBottom: 6 }}>
              نسبة الدهون % (اختياري)
            </label>
            <input
              type="number" step="0.1" inputMode="decimal" value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(17,24,39,0.045)", border: "1px solid var(--border-soft)", borderRadius: 12, padding: "11px 12px", color: "#111827", fontFamily: "'Tajawal',sans-serif", fontSize: 15, fontWeight: 700 }}
            />
          </div>
        </div>
        <div className="sheet-actions" style={{ marginTop: 0 }}>
          <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" onClick={handleSave}>حفظ</button>
        </div>
      </div>
    </div>
  );
}
