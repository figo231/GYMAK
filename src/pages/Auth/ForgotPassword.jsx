import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { translateAuthError } from "../../lib/authErrors";
import { AuthField, AuthError } from "./AuthShell";

export default function ForgotPassword() {
  const { resetPasswordForEmail, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email) { setError("اكتب إيميلك."); return; }
    setBusy(true);
    const { error } = await resetPasswordForEmail(email);
    setBusy(false);
    if (error) { setError(translateAuthError(error)); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <>
        <h1 className="auth-title">اتبعت لك رسالة</h1>
        <p className="auth-sub">
          لو الإيميل ده مسجل عندنا، هيوصلك رابط لإعادة تعيين الباسورد على <b>{email}</b>.
        </p>
        <Link to="/auth/login" className="auth-skip">رجوع لتسجيل الدخول</Link>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title">نسيت الباسورد؟</h1>
      <p className="auth-sub">اكتب إيميلك وهنبعتلك رابط تقدر تظبط بيه باسورد جديد.</p>

      <form onSubmit={handleSubmit}>
        <AuthField label="الإيميل" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <AuthError message={error} />
        <button type="submit" className="btn btn-primary auth-submit" disabled={busy || !isConfigured}>
          {busy ? "جاري الإرسال..." : "ابعت رابط إعادة التعيين"}
        </button>
      </form>

      <Link to="/auth/login" className="auth-skip">رجوع لتسجيل الدخول</Link>
    </>
  );
}
