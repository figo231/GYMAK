import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { translateAuthError } from "../../lib/authErrors";
import { AuthField, AuthError } from "./AuthShell";

export default function ResetPassword() {
  const { updatePassword, isPasswordRecovery, session } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("الباسورد لازم يكون 6 حروف على الأقل."); return; }
    if (password !== confirm) { setError("الباسوردين مش متطابقين."); return; }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) { setError(translateAuthError(error)); return; }
    setDone(true);
    setTimeout(() => navigate("/account", { replace: true }), 1500);
  }

  // Someone landed here directly (not via a recovery email link) — there's
  // no recovery session to act on, so there's nothing safe to do here.
  if (!session || !isPasswordRecovery) {
    return (
      <>
        <h1 className="auth-title">الرابط ده مش صالح</h1>
        <p className="auth-sub">
          الصفحة دي بتفتح بس من رابط إعادة تعيين الباسورد اللي بيوصلك في الإيميل. لو عايز تغيّر باسوردك، اطلب رابط جديد.
        </p>
      </>
    );
  }

  if (done) {
    return (
      <>
        <h1 className="auth-title">تم ✓</h1>
        <p className="auth-sub">اتغيّر باسوردك بنجاح. بنوديك لحسابك دلوقتي...</p>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title">باسورد جديد</h1>
      <p className="auth-sub">اكتب باسوردك الجديد.</p>

      <form onSubmit={handleSubmit}>
        <AuthField label="الباسورد الجديد" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 حروف على الأقل" />
        <AuthField label="تأكيد الباسورد" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
        <AuthError message={error} />
        <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
          {busy ? "جاري الحفظ..." : "حفظ الباسورد الجديد"}
        </button>
      </form>
    </>
  );
}
