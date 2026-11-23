import { stepValue } from "../../lib/logLogic";
import { txf } from "../../lib/i18n/tx";

// Number input with - / + buttons. Always ltr so "+" is on the right.
export default function Stepper({ id, label, value, onChange, field, unit, inputMode = "numeric", invalid }) {
  const bump = (dir) => onChange(stepValue(value, dir, field, unit));
  return (
    <div className="log-field">
      <label className="log-label" htmlFor={id}>{label}</label>
      <div className="stepper">
        <button type="button" className="step-btn" aria-label={txf(`أقل {0}`, [label])} onClick={() => bump(-1)}>−</button>
        <input id={id} type="number" inputMode={inputMode} dir="ltr" value={value} min="0" aria-invalid={invalid ? true : undefined} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="step-btn" aria-label={txf(`أكتر {0}`, [label])} onClick={() => bump(1)}>+</button>
      </div>
    </div>
  );
}
