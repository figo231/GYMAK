import { useEffect, useId, useState } from "react";
import { hasGuestImport } from "../../lib/guestImport";
import { Outlet } from "react-router-dom";
import { passwordStrength } from "../../lib/authLogic";
import { tx } from "../../lib/i18n/tx";

export default function AuthShell() {
  return (
    <>
      <div className="bg-ambient" />
      <div className="app auth-app">
        <div className="auth-hero">
          <div className="auth-hero-glow" />
          <div className="auth-logo">
            <div className="auth-logo-ring">
              <img src="/icon-512.png" alt="GYMAK" className="auth-logo-mark" />
            </div>
            <p className="auth-wordmark">GYMAK</p>
            <p className="auth-tagline">{tx("جسمك اللي هتفتخر بيه يبدأ من هنا")}</p>
          </div>
        </div>
        <div className="glass auth-card">
          {hasGuestImport()&&<p className="auth-notice" role="note">{tx("بيانات تمرينك القديمة محفوظة على الجهاز. سجّل دخول أو اعمل حساب عشان ننقلها بأمان. متمسحش التطبيق ولا بيانات المتصفح.")}</p>}
          <Outlet />
        </div>
      </div>
    </>
  );
}

const ICONS = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 8 8 6 8-6" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16h.01" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1" /></>,
};
export function AuthIcon({ name, size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>;
}

// Big circular status icon used by the "sent", "done" and "invalid link" screens.
export function AuthStatus({ icon = "check", tone = "gold" }) {
  return <div className={"auth-status tone-" + tone}><AuthIcon name={icon} size={28} /></div>;
}

export function AuthField({ label, type, icon, hint, id: idProp, ...props }) {
  const auto = useId();
  const id = idProp || auto;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && reveal ? "text" : type;
  // Emails and passwords are Latin text: keep them left-to-right inside the RTL page.
  const latin = type === "email" || isPassword;
  const extra = type === "email" ? { inputMode: "email", autoCapitalize: "none", autoCorrect: "off", spellCheck: false, name: "email" } : {};

  return (
    <div className="edit-field auth-field">
      <label htmlFor={id}>{icon && <AuthIcon name={icon} size={14} />}<span>{label}</span></label>
      <div className="auth-input-wrap">
        <input id={id} type={effectiveType} dir={latin ? "ltr" : undefined} className={latin ? "is-latin" : undefined} {...extra} {...props} />
        {isPassword && (
          <button type="button" className="auth-reveal-btn" aria-label={reveal ? tx("إخفاء الباسورد") : tx("إظهار الباسورد")} aria-pressed={reveal} onClick={() => setReveal((r) => !r)}>
            {reveal ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-3.2 4M6.5 6.6C4 8.3 2 12 2 12a13.2 13.2 0 0 0 5 5.6" /></svg>
            )}
          </button>
        )}
      </div>
      {hint}
    </div>
  );
}

export function AuthError({ message, children }) {
  if (!message) return null;
  return <div className="auth-error" role="alert"><AuthIcon name="alert" size={16} /><div>{message}{children}</div></div>;
}
export function AuthNotice({ message, tone = "ok" }) {
  if (!message) return null;
  return <div className={"auth-notice tone-" + tone} role="status"><AuthIcon name="check" size={16} /><div>{message}</div></div>;
}

export function PasswordMeter({ value }) {
  const s = passwordStrength(value);
  if (!value) return null;
  return (
    <div className="pw-meter" aria-live="polite">
      <div className="pw-bars" aria-hidden="true">{[1, 2, 3, 4].map((i) => <span key={i} className={i <= s.score ? "on s" + s.score : ""} />)}</div>
      <span className={"pw-label s" + s.score}>{s.label}</span>
    </div>
  );
}

// Seconds left until `until` (ms timestamp); re-renders every second.
export function useCooldown() {
  const [until, setUntil] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!until) return undefined;
    const id = setInterval(() => { tick((n) => n + 1); if (Date.now() >= until) setUntil(0); }, 500);
    return () => clearInterval(id);
  }, [until]);
  return [Math.max(0, Math.ceil((until - Date.now()) / 1000)), (sec = 60) => setUntil(Date.now() + sec * 1000)];
}

export function Spinner() { return <span className="auth-spin" aria-hidden="true" />; }
