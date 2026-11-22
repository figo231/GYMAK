import { useEffect, useState } from "react";
import Store from "../../lib/store/gymakStore";
import Stepper from "../../components/ui/Stepper";
import { parseLogForm } from "../../lib/logLogic";

export default function EditSetSheet({ entry, onClose, onSave }) {
  const unit = Store.unitLabel();
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
    const r = parseLogForm({ weight, sets, reps }, (v) => Store.fromDisplayWeight(v));
    if (!r.ok) { setError(r); return; }
    onSave({ weight: r.kg, sets: r.sets, reps: r.reps });
  }
  const bad = (f) => error && error.field === f;
  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet" role="dialog" aria-modal="true" aria-label="تعديل المجموعة">
        <div className="edit-sheet-handle" />
        <h3>{entry.name}</h3>
        <div className="log-grid3">
          <Stepper id="es-weight" label={`الوزن (${unit})`} field="weight" unit={unit} inputMode="decimal" value={weight} invalid={bad("weight")} onChange={(v) => { setError(null); setWeight(v); }} />
          <Stepper id="es-sets" label="مجموعات" field="sets" unit={unit} value={sets} invalid={bad("sets")} onChange={(v) => { setError(null); setSets(v); }} />
          <Stepper id="es-reps" label="تكرارات" field="reps" unit={unit} value={reps} invalid={bad("reps")} onChange={(v) => { setError(null); setReps(v); }} />
        </div>
        {error && <p className="log-error" role="alert">{error.error}</p>}
        <div className="edit-sheet-actions">
          <button type="button" onClick={onClose}>إلغاء</button>
          <button type="button" style={{ background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "var(--on-acc,#fff)" }} onClick={save}>حفظ</button>
        </div>
      </div>
    </div>
  );
}
