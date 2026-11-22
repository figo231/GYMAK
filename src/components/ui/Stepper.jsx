import { stepValue } from "../../lib/logLogic";

// Number input with - / + buttons. Always ltr so "+" is on the right.
export default function Stepper({ id, label, value, onChange, field, unit, inputMode = "numeric", invalid }) {
  const bump = (dir) => onChange(stepValue(value, dir, field, unit));
  return (
    <div className="log-field">
      <label className="log-label" htmlFor={id}>{label}</label>
      <div className="stepper">
        <button type="button" className="step-btn" aria-label={`أقل ${label}`} onClick={() => bump(-1)}>−</button>
        <input id={id} type="number" inputMode={inputMode} dir="ltr" value={value} min="0" aria-invalid={invalid ? true : undefined} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="step-btn" aria-label={`أكتر ${label}`} onClick={() => bump(1)}>+</button>
      </div>
    </div>
  );
}
