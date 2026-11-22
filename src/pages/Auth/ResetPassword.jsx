import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { translateAuthError } from "../../lib/authErrors";
import { MIN_PASSWORD } from "../../lib/authLogic";
import { AuthField, AuthError, AuthStatus, PasswordMeter, Spinner } from "./AuthShell";

export default function ResetPassword() {
  const { updatePassword, isPasswordRecovery, session, linkError, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // Give supabase-js a moment to turn the link into a session before calling it invalid.
  const [settled, setSettled] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSettled(true), 1200); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => navigate("/", { replace: true }), 1500);
    return () => clearTimeout(t);
  }, [done, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD) { setError(`الباسورد لازم يكون ${MIN_PASSWORD} حروف على الأقل.`); return; }
    if (password !== confirm) { setError("الباسوردين مش متطابقين."); return; }
    setBusy(true);
    let res;
    try { res = await updatePassword(password); } catch (err) { res = { error: err }; }
    setBusy(false);
    if (res.error) { setError(translateAuthError(res.error)); return; }
    setDone(true);
  }

  if (done) {
    return (
      <>
        <AuthStatus icon="check" />
        <h1 className="auth-title">تم</h1>
        <p className="auth-sub">اتغيّر باسوردك. بنوديك للتطبيق دلوقتي...</p>
      </>
    );
  }

  const valid = !!session && isPasswordRecovery;
  if (!valid && (loading || (!settled && !linkError))) {
    return <div className="auth-wait"><Spinner /><span>ثواني...</span></div>;
  }
  if (!valid) {
    const expired = /expired|otp/i.test(linkError || "");
    return (
      <>
        <AuthStatus icon="link" tone="warn" />
        <h1 className="auth-title">{expired ? "الرابط انتهى" : "الرابط ده مش صالح"}</h1>
        <p className="auth-sub">
          {expired
            ? "روابط الإيميل بتنتهي بسرعة وبتشتغل مرة واحدة بس. اطلب رابط جديد وافتحه على طول."
            : "الصفحة دي بتفتح بس من رابط إعادة تعيين الباسورد اللي بيوصلك في الإيميل. اطلب رابط جديد."}
        </p>
        <Link to="/auth/forgot-password" className="btn btn-primary auth-submit auth-link-btn">ابعت رابط جديد</Link>
        <Link to="/auth/login" className="auth-skip">رجوع لتسجيل الدخول</Link>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title">باسورد جديد</h1>
      <p className="auth-sub">اكتب باسوردك الجديد.</p>

      <form onSubmit={handleSubmit} noValidate>
        <AuthField label="الباسورد الجديد" icon="lock" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`${MIN_PASSWORD} حروف على الأقل`} hint={<PasswordMeter value={password} />} />
        <AuthField label="تأكيد الباسورد" icon="lock" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
        <AuthError message={error} />
        <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
          {busy ? <><Spinner />جاري الحفظ...</> : "حفظ الباسورد الجديد"}
        </button>
      </form>
    </>
  );
}
