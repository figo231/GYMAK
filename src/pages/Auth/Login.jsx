import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { translateAuthError } from "../../lib/authErrors";
import { AuthField, AuthError } from "./AuthShell";

export default function Login() {
  const { signIn, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const redirectTo = location.state?.from || "/account";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("املا الإيميل والباسورد."); return; }
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) { setError(translateAuthError(error)); return; }
    navigate(redirectTo, { replace: true });
  }

  return (
    <>
      <h1 className="auth-title">تسجيل الدخول</h1>
      <p className="auth-sub">سجّل دخولك عشان بياناتك تتزامن على كل أجهزتك.</p>

      {!isConfigured && (
        <div className="auth-error" style={{ marginBottom: 14 }}>
          الربط مع الخادم لسه متظبطش من مطوّر التطبيق. التطبيق شغال أوفلاين عادي.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <AuthField label="الإيميل" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <AuthField label="الباسورد" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <div style={{ textAlign: "left", marginBottom: 14 }}>
          <Link to="/auth/forgot-password" className="auth-link-sm">نسيت الباسورد؟</Link>
        </div>
        <AuthError message={error} />
        <button type="submit" className="btn btn-primary auth-submit" disabled={busy || !isConfigured}>
          {busy ? "جاري الدخول..." : "دخول"}
        </button>
      </form>

      <p className="auth-footer">
        لسه معملتش حساب؟ <Link to="/auth/register">سجّل دلوقتي</Link>
      </p>
      <Link to="/profile" className="auth-skip">متابعة بدون تسجيل دخول</Link>
    </>
  );
}
