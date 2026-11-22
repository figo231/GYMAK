import { useState } from "react";
import { arNorm, clampInt, validMediaUrl, DIFFICULTIES } from "../../lib/exerciseMeta";

const MUSCLES = [
  { m: "chest", color: "var(--muscle-chest)", label: "صدر" },
  { m: "back", color: "var(--muscle-back)", label: "ظهر" },
  { m: "shoulders", color: "var(--muscle-shoulders)", label: "أكتاف" },
  { m: "legs", color: "var(--muscle-legs)", label: "أرجل" },
  { m: "arms", color: "var(--muscle-arms)", label: "ذراعين" },
  { m: "core", color: "var(--muscle-core)", label: "بطن" },
];
const EQUIPMENT = ["وزن الجسم", "دمبل", "بار", "جهاز", "كابل"];

const fieldStyle = {
  width: "100%", boxSizing: "border-box", background: "rgba(17,24,39,0.045)",
  border: "1px solid var(--border-soft)", borderRadius: 12, padding: "11px 12px",
  color: "var(--text-primary)", fontFamily: "'Tajawal',sans-serif", fontSize: 14, marginBottom: 14,
};
const labelStyle = { fontSize: 11, color: "var(--text-dim)", fontWeight: 700, display: "block", marginBottom: 6 };

export default function AddExerciseSheet({ onClose, onSave, initialName = "", existingNames = [] }) {
  const [name, setName] = useState(initialName);
  const [secondary, setSecondary] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [muscle, setMuscle] = useState("chest");
  const [equipment, setEquipment] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [timed, setTimed] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [tried, setTried] = useState(false);

  const trimmed = name.trim();
  const dup = trimmed && existingNames.some((n) => arNorm(n) === arNorm(trimmed));
  const urlOk = validMediaUrl(mediaUrl.trim());
  const nameOk = !!trimmed;

  function handleSave() {
    setTried(true);
    if (!nameOk || !urlOk) return;
    onSave({
      name: trimmed,
      muscle,
      secondary: secondary.trim(),
      sets: clampInt(sets, 1, 20, 3),
      reps: clampInt(reps, 1, timed ? 600 : 100, timed ? 30 : 10),
      mediaUrl: mediaUrl.trim(),
      equipment,
      difficulty,
      unit: timed ? "sec" : "reps",
    });
  }

  const pill = (active, onClick, children, key) => (
    <button type="button" key={key} className={"chip chip-btn ms-opt" + (active ? " active" : "")} aria-pressed={active} onClick={onClick}>{children}</button>
  );

  return (
    <div className="sheet-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass sheet-panel" role="dialog" aria-modal="true" aria-label="إضافة تمرين جديد" style={{ maxHeight: "88vh", overflowY: "auto" }}>
        <div className="sheet-grip" />
        <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 16px" }}>إضافة تمرين جديد</h3>

        <label style={labelStyle} htmlFor="ex-add-name">اسم التمرين</label>
        <input id="ex-add-name" style={fieldStyle} type="text" maxLength={60} placeholder="مثال: سكوات بار" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
        {tried && !nameOk && <div className="ex-field-err">اكتب اسم التمرين الأول</div>}
        {dup && <div className="ex-dup-warn">في تمرين بنفس الاسم دلوقتي، تقدر تضيفه برضه لو ده تمرين مختلف.</div>}

        <label style={labelStyle}>العضلة الأساسية</label>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {MUSCLES.map((opt) => pill(muscle === opt.m, () => setMuscle(opt.m), (
            <><span className="dot" style={{ background: opt.color, color: opt.color }} />{opt.label}</>
          ), opt.m))}
        </div>

        <label style={labelStyle} htmlFor="ex-add-sec">عضلات مساعدة (اختياري)</label>
        <input id="ex-add-sec" style={fieldStyle} type="text" maxLength={40} placeholder="مثال: ترايسبس" value={secondary} onChange={(e) => setSecondary(e.target.value)} />

        <label style={labelStyle}>المعدة (اختياري)</label>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {EQUIPMENT.map((x) => pill(equipment === x, () => setEquipment(equipment === x ? "" : x), x, x))}
        </div>

        <label style={labelStyle}>الصعوبة (اختياري)</label>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {DIFFICULTIES.map((x) => pill(difficulty === x, () => setDifficulty(difficulty === x ? "" : x), x, x))}
        </div>

        <label style={labelStyle}>نوع التمرين</label>
        <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
          {pill(!timed, () => setTimed(false), "بالتكرارات", "reps")}
          {pill(timed, () => { setTimed(true); setReps((r) => (parseInt(r, 10) < 10 ? "30" : r)); }, "بالوقت (ثواني)", "sec")}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="ex-add-sets">مجموعات (1-20)</label>
            <input id="ex-add-sets" style={{ ...fieldStyle, marginBottom: 0 }} type="number" inputMode="numeric" min={1} max={20} value={sets} onChange={(e) => setSets(e.target.value)} onBlur={() => setSets(String(clampInt(sets, 1, 20, 3)))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="ex-add-reps">{timed ? "ثواني" : "تكرارات"} ({timed ? "1-600" : "1-100"})</label>
            <input id="ex-add-reps" style={{ ...fieldStyle, marginBottom: 0 }} type="number" inputMode="numeric" min={1} max={timed ? 600 : 100} value={reps} onChange={(e) => setReps(e.target.value)} onBlur={() => setReps(String(clampInt(reps, 1, timed ? 600 : 100, timed ? 30 : 10)))} />
          </div>
        </div>

        <label style={labelStyle} htmlFor="ex-add-url">رابط GIF / فيديو التمرين (اختياري)</label>
        <input id="ex-add-url" style={fieldStyle} type="url" inputMode="url" dir="ltr" placeholder="https://... (.gif, .mp4, أو رابط يوتيوب)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
        {!urlOk && <div className="ex-field-err">الرابط لازم يبدأ بـ https:// أو http://</div>}

        <div className="sheet-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>إضافة التمرين</button>
        </div>
      </div>
    </div>
  );
}
