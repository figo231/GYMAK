import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { translateAuthError } from "../../lib/authErrors";
import { AuthField, AuthError } from "./AuthShell";

export default function Register() {
  const { signUp, isConfigured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("املا الإيميل والباسورد."); return; }
    if (password.length < 6) { setError("الباسورد لازم يكون 6 حروف على الأقل."); return; }
    if (password !== confirm) { setError("الباسوردين مش متطابقين."); return; }
    setBusy(true);
    const { error } = await signUp(email, password);
    setBusy(false);
    if (error) { setError(translateAuthError(error)); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <>
        <h1 className="auth-title">تحقق من إيميلك</h1>
        <p className="auth-sub">
          بعتنالك رابط تأكيد على <b>{email}</b>. دوس عليه عشان تفعّل حسابك، وبعدها تقدر تسجّل دخول.
        </p>
        <button type="button" className="btn btn-primary auth-submit" onClick={() => navigate("/auth/login")}>
          روح لصفحة تسجيل الدخول
        </button>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title">إنشاء حساب</h1>
      <p className="auth-sub">احفظ تقدمك وزامنه على كل أجهزتك.</p>

      {!isConfigured && (
        <div className="auth-error" style={{ marginBottom: 14 }}>
          الربط مع الخادم لسه متظبطش من مطوّر التطبيق. التطبيق شغال أوفلاين عادي.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <AuthField label="الإيميل" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <AuthField label="الباسورد" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 حروف على الأقل" />
        <AuthField label="تأكيد الباسورد" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
        <AuthError message={error} />
        <button type="submit" className="btn btn-primary auth-submit" disabled={busy || !isConfigured}>
          {busy ? "جاري الإنشاء..." : "إنشاء حساب"}
        </button>
      </form>

      <p className="auth-footer">
        عندك حساب بالفعل؟ <Link to="/auth/login">سجّل دخولك</Link>
      </p>
      <Link to="/profile" className="auth-skip">متابعة بدون تسجيل دخول</Link>
    </>
  );
}
