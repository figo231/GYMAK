import { useEffect, useState } from "react";
import Store from "../../lib/store/gymakStore";
import Stepper from "../../components/ui/Stepper";
import { parseLogForm } from "../../lib/logLogic";
import { tx, txf } from "../../lib/i18n/tx";

export default function EditSetSheet({ entry, onClose, onSave }) {
  const unit = Store.unitLabel();
  const timed = entry.unit === "sec";
  const cardio = Store.getExerciseById(entry.exerciseId)?.muscle === "cardio";
  const [weight, setWeight] = useState(String(Store.toDisplayWeight(entry.weight)));
  const [sets, setSets] = useState(String(entry.sets));
  const [reps, setReps] = useState(String(entry.reps));
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    const r = parseLogForm({ weight: cardio ? "0" : weight, sets, reps }, (v) => Store.fromDisplayWeight(v), timed);
    if (!r.ok) { setError(r); return; }
    onSave({ weight: r.kg, sets: r.sets, reps: r.reps });
  }
  const bad = (f) => error && error.field === f;
  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet" role="dialog" aria-modal="true" aria-label={tx("تعديل المجموعة")}>
        <div className="edit-sheet-handle" />
        <h3>{entry.name}</h3>
        <div className="log-grid3" style={cardio ? {gridTemplateColumns:"repeat(2, minmax(0, 1fr))"} : undefined}>
          {!cardio && <Stepper id="es-weight" label={txf(`الوزن ({0})`, [unit])} field="weight" unit={unit} inputMode="decimal" value={weight} invalid={bad("weight")} onChange={(v) => { setError(null); setWeight(v); }} />}
          <Stepper id="es-sets" label={tx("مجموعات")} field="sets" unit={unit} value={sets} invalid={bad("sets")} onChange={(v) => { setError(null); setSets(v); }} />
          <Stepper id="es-reps" label={timed ? tx("ثواني") : tx("تكرارات")} field="reps" unit={unit} value={reps} invalid={bad("reps")} onChange={(v) => { setError(null); setReps(v); }} />
        </div>
        {error && <p className="log-error" role="alert">{error.error}</p>}
        <div className="edit-sheet-actions">
          <button type="button" onClick={onClose}>{tx("إلغاء")}</button>
          <button type="button" style={{ background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "var(--on-acc,#fff)" }} onClick={save}>{tx("حفظ")}</button>
        </div>
      </div>
    </div>
  );
}
