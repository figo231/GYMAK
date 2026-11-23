import { useEffect, useState } from "react";
import { tx } from "../../lib/i18n/tx";

const FIELDS = [["grams", tx("الكمية (جم)")], ["kcal", tx("السعرات")], ["protein", tx("بروتين (جم)")], ["carbs", tx("كارب (جم)")], ["fat", tx("دهون (جم)")]];

export default function EditFoodSheet({ item, onClose, onSave }) {
  const [v, setV] = useState({ name: item.name, grams: String(item.grams), kcal: String(item.kcal), protein: String(item.protein ?? 0), carbs: String(item.carbs ?? 0), fat: String(item.fat ?? 0) });
  const [err, setErr] = useState("");
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  function save() {
    if (!v.name.trim()) { setErr(tx("اكتب اسم الأكلة.")); return; }
    if (!(Number(v.grams) > 0)) { setErr(tx("الكمية لازم تكون أكبر من صفر.")); return; }
    setErr(""); onSave(v);
  }
  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet" role="dialog" aria-modal="true" aria-label={tx("تعديل الأكلة")}>
        <div className="edit-sheet-handle" />
        <h3>{tx("تعديل الأكلة")}</h3>
        <div className="edit-field"><label htmlFor="ef-name">{tx("الاسم")}</label><input id="ef-name" value={v.name} maxLength={60} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
        <div className="log-grid3" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {FIELDS.map(([k, label]) => (
            <div className="edit-field" key={k} style={{ margin: 0 }}>
              <label htmlFor={"ef-" + k}>{label}</label>
              <input id={"ef-" + k} type="number" inputMode="decimal" min="0" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        {err && <p className="log-error" role="alert">{err}</p>}
        <div className="edit-sheet-actions">
          <button type="button" onClick={onClose}>{tx("إلغاء")}</button>
          <button type="button" className="primary" onClick={save}>{tx("حفظ")}</button>
        </div>
      </div>
    </div>
  );
}
