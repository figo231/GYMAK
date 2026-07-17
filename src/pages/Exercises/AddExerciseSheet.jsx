import { useState } from "react";

const MUSCLES = [
  { m: "chest", color: "#FF7A3D", label: "صدر" },
  { m: "back", color: "#22C55E", label: "ظهر" },
  { m: "shoulders", color: "#FFA35E", label: "أكتاف" },
  { m: "legs", color: "#F59E0B", label: "أرجل" },
  { m: "arms", color: "#EC4899", label: "ذراعين" },
  { m: "core", color: "#14B8A6", label: "بطن" },
];

const fieldStyle = {
  width: "100%", boxSizing: "border-box", background: "rgba(17,24,39,0.045)",
  border: "1px solid var(--border-soft)", borderRadius: 12, padding: "11px 12px",
  color: "#111827", fontFamily: "'Tajawal',sans-serif", fontSize: 14, marginBottom: 14,
};
const labelStyle = { fontSize: 11, color: "var(--text-dim)", fontWeight: 700, display: "block", marginBottom: 6 };

export default function AddExerciseSheet({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [secondary, setSecondary] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [muscle, setMuscle] = useState("chest");

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({ name: trimmed, muscle, secondary: secondary.trim(), sets, reps });
  }

  return (
    <div className="sheet-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass sheet-panel" style={{ maxHeight: "88vh", overflowY: "auto" }}>
        <div className="sheet-grip" />
        <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 16px" }}>إضافة تمرين جديد</h3>

        <label style={labelStyle}>اسم التمرين</label>
        <input style={fieldStyle} type="text" placeholder="مثال: سكوات بار" value={name} autoFocus onChange={(e) => setName(e.target.value)} />

        <label style={labelStyle}>العضلة الأساسية</label>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {MUSCLES.map((opt) => (
            <div
              key={opt.m}
              className={"chip ms-opt" + (muscle === opt.m ? " active" : "")}
              onClick={() => setMuscle(opt.m)}
              style={{ cursor: "pointer" }}
            >
              <span className="dot" style={{ background: opt.color, color: opt.color }} />
              {opt.label}
            </div>
          ))}
        </div>

        <label style={labelStyle}>عضلات مساعدة (اختياري)</label>
        <input style={fieldStyle} type="text" placeholder="مثال: ترايسبس" value={secondary} onChange={(e) => setSecondary(e.target.value)} />

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>مجموعات</label>
            <input style={{ ...fieldStyle, marginBottom: 0 }} type="number" value={sets} onChange={(e) => setSets(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>تكرارات</label>
            <input style={{ ...fieldStyle, marginBottom: 0 }} type="number" value={reps} onChange={(e) => setReps(e.target.value)} />
          </div>
        </div>

        <div className="sheet-actions" style={{ marginTop: 0 }}>
          <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" onClick={handleSave}>إضافة التمرين</button>
        </div>
      </div>
    </div>
  );
}
