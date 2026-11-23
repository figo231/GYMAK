import { useState } from "react";
import { setPin, verifyPin, clearPin, isLockEnabled, validPin } from "../../lib/appLock";
import { useToast } from "../../hooks/useToast";
import { tx, txf } from "../../lib/i18n/tx";

export default function AppLockSheet({ onClose, onChanged }) {
  const toast = useToast();
  const enabled = isLockEnabled();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const digits = (setter) => (e) => setter(e.target.value.replace(/\D/g, "").slice(0, 4));

  async function enable() {
    if (!validPin(next)) { toast(tx("الرمز لازم يكون 4 أرقام.")); return; }
    if (next !== again) { toast(tx("الرمزين مش زي بعض.")); return; }
    setBusy(true); await setPin(next); setBusy(false);
    toast(tx("القفل اتفعّل.")); onChanged(); onClose();
  }
  async function checkCurrent() {
    const r = await verifyPin(cur);
    if (!r.ok) toast(r.waitMs ? txf(`حاول بعد {0} ثانية`, [Math.ceil(r.waitMs / 1000)]) : tx("الرمز الحالي غلط."));
    return r.ok;
  }
  async function disable() {
    setBusy(true);
    if (await checkCurrent()) { clearPin(); toast(tx("القفل اتقفل.")); onChanged(); onClose(); }
    setBusy(false);
  }
  async function change() {
    if (!validPin(next)) { toast(tx("الرمز الجديد لازم يكون 4 أرقام.")); return; }
    setBusy(true);
    if (await checkCurrent()) { await setPin(next); toast(tx("الرمز اتغيّر.")); onChanged(); onClose(); }
    setBusy(false);
  }
  const field = (id, label, val, set, auto) => (
    <div className="edit-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={val} onChange={digits(set)} placeholder="••••" autoFocus={auto} style={{ direction: "ltr", letterSpacing: 6, textAlign: "center" }} />
    </div>
  );
  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet">
        <div className="edit-sheet-handle" />
        <h3>{tx("قفل التطبيق")}</h3>
        {!enabled ? (
          <>
            {field("lockNew", tx("اختار رمز من 4 أرقام"), next, setNext, true)}
            {field("lockAgain", tx("أكد الرمز"), again, setAgain)}
          </>
        ) : (
          <>
            {field("lockCur", tx("الرمز الحالي"), cur, setCur, true)}
            {field("lockNew", tx("رمز جديد (لو عايز تغيّره)"), next, setNext)}
          </>
        )}
        <p className="notif-note">{tx("القفل بيتطلب عند فتح التطبيق وبعد دقيقة في الخلفية. هو لحماية خصوصيتك لو بتشارك تليفونك، لكن مش تشفير للبيانات.")}</p>
        <div className="edit-sheet-actions" style={{ marginTop: 14 }}>
          <button type="button" onClick={onClose}>{tx("إلغاء")}</button>
          {!enabled ? (
            <button type="button" disabled={busy} style={{ background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "var(--on-acc, #fff)" }} onClick={enable}>{tx("تفعيل")}</button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={disable}>{tx("إيقاف")}</button>
              <button type="button" disabled={busy} style={{ background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "var(--on-acc, #fff)" }} onClick={change}>{tx("تغيير")}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
