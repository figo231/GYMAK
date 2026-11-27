import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { recoverFailureMessage } from "../../lib/authErrors";
import { normalizeEmail, validEmail } from "../../lib/authLogic";
import { AuthField, AuthError, AuthNotice, AuthStatus, Spinner, useCooldown } from "./AuthShell";
import { tx, txf } from "../../lib/i18n/tx";

export default function ForgotPassword() {
  const { resetPasswordForEmail, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [wait, startWait] = useCooldown();

  async function send() {
    const mail = normalizeEmail(email);
    if (!mail) { setError(tx("اكتب إيميلك.")); return false; }
    if (!validEmail(mail)) { setError(tx("صيغة الإيميل مش صحيحة.")); return false; }
    setBusy(true);
    let res;
    try { res = await resetPasswordForEmail(mail); } catch (err) { res = { error: err }; }
    setBusy(false);
    startWait(60);
    if (res.error) { setError(recoverFailureMessage(res.error)); return false; }
    setEmail(mail);
    return true;
  }

  async function handleSubmit(e) { e.preventDefault(); setError(""); setInfo(""); if (await send()) setSent(true); }
  async function again() { if (wait > 0) return; setError(""); setInfo(""); if (await send()) setInfo(tx("بعتناه تاني. شوف الوارد والسبام.")); }

  if (sent) {
    return (
      <>
        <AuthStatus icon="mail" />
        <h1 className="auth-title">{tx("اتبعتت الرسالة")}</h1>
        <p className="auth-sub">
          {tx("لو الإيميل ده مسجل عندنا، هيوصلك رابط لإعادة تعيين الباسورد على")} <b dir="ltr">{email}</b>{tx(". الرابط بيشتغل مرة واحدة.")}
        </p>
        <AuthNotice message={info} />
        <AuthError message={error} />
        <div className="auth-actions-2">
          <button type="button" className="auth-text-btn" onClick={again} disabled={wait > 0 || busy}>{wait > 0 ? txf(`ابعت تاني ({0})`, [wait]) : tx("ابعت تاني")}</button>
          <button type="button" className="auth-text-btn" onClick={() => { setSent(false); setInfo(""); setError(""); }}>{tx("غيّر الإيميل")}</button>
        </div>
        <Link to="/auth/login" className="auth-skip">{tx("رجوع لتسجيل الدخول")}</Link>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title">{tx("نسيت الباسورد؟")}</h1>
      <p className="auth-sub">{tx("اكتب إيميلك وهنبعتلك رابط تقدر تظبط بيه باسورد جديد.")}</p>

      {!isConfigured && <AuthError message={tx("الربط مع الخادم لسه متظبطش. التطبيق شغال أوفلاين عادي.")} />}
      <form onSubmit={handleSubmit} noValidate>
        <AuthField label={tx("الإيميل")} icon="mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <AuthError message={error} />
        <button type="submit" className="btn btn-primary auth-submit" disabled={busy || !isConfigured}>
          {busy ? <><Spinner />{tx("جاري الإرسال...")}</> : tx("ابعت رابط إعادة التعيين")}
        </button>
      </form>

      <Link to="/auth/login" className="auth-skip">{tx("رجوع لتسجيل الدخول")}</Link>
    </>
  );
}
