import { useState } from "react";
import { Outlet } from "react-router-dom";

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
            <p className="auth-tagline">جسمك اللي هتفتخر بيه يبدأ من هنا</p>
          </div>
        </div>
        <div className="glass auth-card">
          <Outlet />
        </div>
      </div>
    </>
  );
}

export function AuthField({ label, type, ...props }) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && reveal ? "text" : type;

  return (
    <div className="edit-field auth-field">
      <label>{label}</label>
      <div className="auth-input-wrap">
        <input type={effectiveType} {...props} />
        {isPassword && (
          <button
            type="button"
            className="auth-reveal-btn"
            aria-label={reveal ? "إخفاء الباسورد" : "إظهار الباسورد"}
            onClick={() => setReveal((r) => !r)}
          >
            {reveal ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-3.2 4M6.5 6.6C4 8.3 2 12 2 12a13.2 13.2 0 0 0 5 5.6" /></svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthError({ message }) {
  if (!message) return null;
  return <div className="auth-error">{message}</div>;
}
