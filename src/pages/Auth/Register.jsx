import {REVIEW_BACKEND_GATED,reviewBackendMessage} from "../../lib/reviewBuild";
import IdentityFields from "../../components/IdentityFields";
import {useI18n} from "../../hooks/useI18n";
import {identityText,validateIdentity} from "../../lib/accountIdentity";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { translateAuthError } from "../../lib/authErrors";
import { MIN_PASSWORD, normalizeEmail, validEmail } from "../../lib/authLogic";
import { AuthField, AuthError, AuthNotice, AuthStatus, PasswordMeter, Spinner, useCooldown } from "./AuthShell";

export default function Register() {
  const { signUp, resendConfirmation, isConfigured } = useAuth();
  const navigate = useNavigate();
  const {lang}=useI18n();const it=identityText[lang==='en'?'en':'ar'];
  const [identity,setIdentity]=useState({name:"",gender:"",username:""});
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
    const invalid=validateIdentity(identity);if(invalid){setError(it[invalid]);return;}
    const mail = normalizeEmail(email);
    if (!mail || !password) { setError("املا الإيميل والباسورد."); return; }
    if (!validEmail(mail)) { setError("صيغة الإيميل مش صحيحة."); return; }
    if (password.length < MIN_PASSWORD) { setError(`الباسورد لازم يكون ${MIN_PASSWORD} حروف على الأقل.`); return; }
    if (password !== confirm) { setError("الباسوردين مش متطابقين."); return; }
    setBusy(true);
    let res;
    try { res = await signUp(mail, password,identity); } catch (err) { res = { error: err }; }
    setBusy(false);
    if (res.error) { setError(/database|username/i.test(res.error.message||"")?it.signup_conflict:translateAuthError(res.error)); return; }
    if (res.duplicate) { setDuplicate(true); setError("الإيميل ده مسجل قبل كده."); return; }
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
    if (res.error) setError(translateAuthError(res.error)); else setInfo("بعتناه تاني. شوف الوارد والسبام.");
  }

  if(REVIEW_BACKEND_GATED)return <p role="status">{reviewBackendMessage(lang)}</p>;
  if (sent) {
    return (
      <>
        <AuthStatus icon="mail" />
        <h1 className="auth-title">تحقق من إيميلك</h1>
        <p className="auth-sub">
          بعتنالك رابط تأكيد على <b dir="ltr">{email}</b>. دوس عليه عشان تفعّل حسابك، وبعدها سجّل دخول.
        </p>
        <AuthNotice message={info} />
        <AuthError message={error} />
        <button type="button" className="btn btn-primary auth-submit" onClick={() => navigate("/auth/login")}>
          روح لتسجيل الدخول
        </button>
        <div className="auth-actions-2">
          <button type="button" className="auth-text-btn" onClick={handleResend} disabled={wait > 0}>{wait > 0 ? `ابعت تاني (${wait})` : "ابعت تاني"}</button>
          <button type="button" className="auth-text-btn" onClick={() => { setSent(false); setInfo(""); setError(""); }}>غيّر الإيميل</button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title">إنشاء حساب</h1>
      <p className="auth-sub">احفظ تقدمك وزامنه على كل أجهزتك.</p>

      {!isConfigured && <AuthError message="الربط مع الخادم لسه متظبطش من مطوّر التطبيق. التطبيق شغال أوفلاين عادي." />}

      <form onSubmit={handleSubmit} noValidate>
        <IdentityFields value={identity} onChange={setIdentity} lang={lang} disabled={busy}/>
        <AuthField label="الإيميل" icon="mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <AuthField label="الباسورد" icon="lock" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`${MIN_PASSWORD} حروف على الأقل`} hint={<PasswordMeter value={password} />} />
        <AuthField label="تأكيد الباسورد" icon="lock" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
        <AuthError message={error}>
          {duplicate && <span className="auth-inline-links"><Link to="/auth/login">سجّل دخول</Link><Link to="/auth/forgot-password">نسيت الباسورد؟</Link></span>}
        </AuthError>
        <button type="submit" className="btn btn-primary auth-submit" disabled={busy || !isConfigured}>
          {busy ? <><Spinner />جاري الإنشاء...</> : "إنشاء حساب"}
        </button>
        <p className="auth-legal">بالتسجيل أنت موافق على <a href="/terms.html" target="_blank" rel="noopener noreferrer">شروط الاستخدام</a> و<a href="/privacy.html" target="_blank" rel="noopener noreferrer">سياسة الخصوصية</a>.</p>
      </form>

      <p className="auth-footer">
        عندك حساب بالفعل؟ <Link to="/auth/login">سجّل دخولك</Link>
      </p>
      <Link to="/" className="auth-skip">متابعة بدون تسجيل دخول</Link>
    </>
  );
}
