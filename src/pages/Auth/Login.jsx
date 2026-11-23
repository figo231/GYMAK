import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { translateAuthError, isUnconfirmed } from "../../lib/authErrors";
import { normalizeEmail, validEmail } from "../../lib/authLogic";
import { AuthField, AuthError, AuthNotice, Spinner, useCooldown } from "./AuthShell";
import { tx, txf } from "../../lib/i18n/tx";

export default function Login() {
  const { signIn, resendConfirmation, isConfigured, user, isPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, startWait] = useCooldown();

  const from = location.state?.from;
  const redirectTo = typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : "/";

  if (user && !isPasswordRecovery) return <Navigate to={redirectTo} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setInfo(""); setUnconfirmed(false);
    const mail = normalizeEmail(email);
    if (!mail || !password) { setError(tx("املا الإيميل والباسورد.")); return; }
    if (!validEmail(mail)) { setError(tx("صيغة الإيميل مش صحيحة.")); return; }
    setBusy(true);
    let res;
    try { res = await signIn(mail, password); } catch (err) { res = { error: err }; }
    setBusy(false);
    if (res.error) {
      setError(translateAuthError(res.error));
      setUnconfirmed(isUnconfirmed(res.error));
      return;
    }
    navigate(redirectTo, { replace: true });
  }

  async function handleResend() {
    if (wait > 0) return;
    setError(""); setInfo("");
    let res;
    try { res = await resendConfirmation(normalizeEmail(email)); } catch (err) { res = { error: err }; }
    startWait(60);
    if (res.error) { setError(translateAuthError(res.error)); return; }
    setUnconfirmed(false);
    setInfo(tx("بعتنالك رابط التأكيد تاني. شوف الوارد والسبام."));
  }

  return (
    <>
      <h1 className="auth-title">{tx("تسجيل الدخول")}</h1>
      <p className="auth-sub">{tx("سجّل دخولك عشان بياناتك تتزامن على كل أجهزتك.")}</p>

      {!isConfigured && <AuthError message="الربط مع الخادم لسه متظبطش من مطوّر التطبيق. التطبيق شغال أوفلاين عادي." />}
      <AuthNotice message={info} />

      <form onSubmit={handleSubmit} noValidate>
        <AuthField label={tx("الإيميل")} icon="mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <AuthField label={tx("الباسورد")} icon="lock" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <div className="auth-row-end">
          <Link to="/auth/forgot-password" className="auth-link-sm">{tx("نسيت الباسورد؟")}</Link>
        </div>
        <AuthError message={error}>
          {unconfirmed && (
            <button type="button" className="auth-inline-btn" onClick={handleResend} disabled={wait > 0}>
              {wait > 0 ? txf(`ابعت التأكيد تاني ({0})`, [wait]) : tx("ابعت التأكيد تاني")}
            </button>
          )}
        </AuthError>
        <button type="submit" className="btn btn-primary auth-submit" disabled={busy || !isConfigured}>
          {busy ? <><Spinner />{tx("جاري الدخول...")}</> : tx("دخول")}
        </button>
      </form>

      <p className="auth-footer">
        {tx("لسه معملتش حساب؟")} <Link to="/auth/register">{tx("سجّل دلوقتي")}</Link>
      </p>
      <Link to="/" className="auth-skip">{tx("متابعة بدون تسجيل دخول")}</Link>
    </>
  );
}
