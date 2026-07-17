import { Outlet } from "react-router-dom";

export default function AuthShell() {
  return (
    <>
      <div className="bg-ambient" />
      <div className="app auth-app">
        <div className="auth-logo">
          <img src="/icon-512.png" alt="GYMAK" className="auth-logo-mark" />
        </div>
        <div className="glass auth-card">
          <Outlet />
        </div>
      </div>
    </>
  );
}

export function AuthField({ label, ...props }) {
  return (
    <div className="edit-field">
      <label>{label}</label>
      <input {...props} />
    </div>
  );
}

export function AuthError({ message }) {
  if (!message) return null;
  return <div className="auth-error">{message}</div>;
}
