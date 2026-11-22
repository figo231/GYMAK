import { useState } from "react";
import { setPin, verifyPin, clearPin, isLockEnabled, validPin } from "../../lib/appLock";
import { useToast } from "../../hooks/useToast";

export default function AppLockSheet({ onClose, onChanged }) {
  const toast = useToast();
  const enabled = isLockEnabled();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const digits = (setter) => (e) => setter(e.target.value.replace(/\D/g, "").slice(0, 4));

  async function enable() {
    if (!validPin(next)) { toast("الرمز لازم يكون 4 أرقام."); return; }
    if (next !== again) { toast("الرمزين مش زي بعض."); return; }
    setBusy(true); await setPin(next); setBusy(false);
    toast("القفل اتفعّل."); onChanged(); onClose();
  }
  async function checkCurrent() {
    const r = await verifyPin(cur);
    if (!r.ok) toast(r.waitMs ? `حاول بعد ${Math.ceil(r.waitMs / 1000)} ثانية` : "الرمز الحالي غلط.");
    return r.ok;
  }
  async function disable() {
    setBusy(true);
    if (await checkCurrent()) { clearPin(); toast("القفل اتقفل."); onChanged(); onClose(); }
    setBusy(false);
  }
  async function change() {
    if (!validPin(next)) { toast("الرمز الجديد لازم يكون 4 أرقام."); return; }
    setBusy(true);
    if (await checkCurrent()) { await setPin(next); toast("الرمز اتغيّر."); onChanged(); onClose(); }
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
        <h3>قفل التطبيق</h3>
        {!enabled ? (
          <>
            {field("lockNew", "اختار رمز من 4 أرقام", next, setNext, true)}
            {field("lockAgain", "أكد الرمز", again, setAgain)}
          </>
        ) : (
          <>
            {field("lockCur", "الرمز الحالي", cur, setCur, true)}
            {field("lockNew", "رمز جديد (لو عايز تغيّره)", next, setNext)}
          </>
        )}
        <p className="notif-note">القفل بيتطلب عند فتح التطبيق وبعد دقيقة في الخلفية. هو لحماية خصوصيتك لو بتشارك تليفونك، لكن مش تشفير للبيانات.</p>
        <div className="edit-sheet-actions" style={{ marginTop: 14 }}>
          <button type="button" onClick={onClose}>إلغاء</button>
          {!enabled ? (
            <button type="button" disabled={busy} style={{ background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "var(--on-acc, #fff)" }} onClick={enable}>تفعيل</button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={disable}>إيقاف</button>
              <button type="button" disabled={busy} style={{ background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "var(--on-acc, #fff)" }} onClick={change}>تغيير</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
