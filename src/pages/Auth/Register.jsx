import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { translateAuthError } from "../../lib/authErrors";
import { MIN_PASSWORD, normalizeEmail, validEmail } from "../../lib/authLogic";
import { AuthField, AuthError, AuthNotice, AuthStatus, PasswordMeter, Spinner, useCooldown } from "./AuthShell";
import { tx, txf } from "../../lib/i18n/tx";

export default function Register() {
  const { signUp, resendConfirmation, isConfigured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [wait, startWait] = useCooldown();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setDuplicate(false);
    const mail = normalizeEmail(email);
    if (!mail || !password) { setError(tx("املا الإيميل والباسورد.")); return; }
    if (!validEmail(mail)) { setError(tx("صيغة الإيميل مش صحيحة.")); return; }
    if (password.length < MIN_PASSWORD) { setError(txf(`الباسورد لازم يكون {0} حروف على الأقل.`, [MIN_PASSWORD])); return; }
    if (password !== confirm) { setError(tx("الباسوردين مش متطابقين.")); return; }
    setBusy(true);
    let res;
    try { res = await signUp(mail, password); } catch (err) { res = { error: err }; }
    setBusy(false);
    if (res.error) { setError(translateAuthError(res.error)); return; }
    if (res.duplicate) { setDuplicate(true); setError(tx("الإيميل ده مسجل قبل كده.")); return; }
    setEmail(mail);
    setSent(true);
    startWait(60);
  }

  async function handleResend() {
    if (wait > 0) return;
    setError(""); setInfo("");
    let res;
    try { res = await resendConfirmation(normalizeEmail(email)); } catch (err) { res = { error: err }; }
    startWait(60);
    if (res.error) setError(translateAuthError(res.error)); else setInfo(tx("بعتناه تاني. شوف الوارد والسبام."));
  }

  if (sent) {
    return (
      <>
        <AuthStatus icon="mail" />
        <h1 className="auth-title">{tx("تحقق من إيميلك")}</h1>
        <p className="auth-sub">
          {tx("بعتنالك رابط تأكيد على")} <b dir="ltr">{email}</b>{tx(". دوس عليه عشان تفعّل حسابك، وبعدها سجّل دخول.")}
        </p>
        <AuthNotice message={info} />
        <AuthError message={error} />
        <button type="button" className="btn btn-primary auth-submit" onClick={() => navigate("/auth/login")}>
          {tx("روح لتسجيل الدخول")}
        </button>
        <div className="auth-actions-2">
          <button type="button" className="auth-text-btn" onClick={handleResend} disabled={wait > 0}>{wait > 0 ? txf(`ابعت تاني ({0})`, [wait]) : tx("ابعت تاني")}</button>
          <button type="button" className="auth-text-btn" onClick={() => { setSent(false); setInfo(""); setError(""); }}>{tx("غيّر الإيميل")}</button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title">{tx("إنشاء حساب")}</h1>
      <p className="auth-sub">{tx("احفظ تقدمك وزامنه على كل أجهزتك.")}</p>

      {!isConfigured && <AuthError message="الربط مع الخادم لسه متظبطش من مطوّر التطبيق. التطبيق شغال أوفلاين عادي." />}

      <form onSubmit={handleSubmit} noValidate>
        <AuthField label={tx("الإيميل")} icon="mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <AuthField label={tx("الباسورد")} icon="lock" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={txf(`{0} حروف على الأقل`, [MIN_PASSWORD])} hint={<PasswordMeter value={password} />} />
        <AuthField label={tx("تأكيد الباسورد")} icon="lock" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
        <AuthError message={error}>
          {duplicate && <span className="auth-inline-links"><Link to="/auth/login">{tx("سجّل دخول")}</Link><Link to="/auth/forgot-password">{tx("نسيت الباسورد؟")}</Link></span>}
        </AuthError>
        <button type="submit" className="btn btn-primary auth-submit" disabled={busy || !isConfigured}>
          {busy ? <><Spinner />{tx("جاري الإنشاء...")}</> : tx("إنشاء حساب")}
        </button>
        <p className="auth-legal">{tx("بالتسجيل أنت موافق على")} <a href="/terms.html" target="_blank" rel="noopener noreferrer">{tx("شروط الاستخدام")}</a> {tx("و")}<a href="/privacy.html" target="_blank" rel="noopener noreferrer">{tx("سياسة الخصوصية")}</a>.</p>
      </form>

      <p className="auth-footer">
        {tx("عندك حساب بالفعل؟")} <Link to="/auth/login">{tx("سجّل دخولك")}</Link>
      </p>
      <Link to="/" className="auth-skip">{tx("متابعة بدون تسجيل دخول")}</Link>
    </>
  );
}
