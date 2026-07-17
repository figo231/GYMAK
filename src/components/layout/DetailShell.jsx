import { Outlet, useNavigate } from "react-router-dom";

/* Chat pages (AI Coach) need a full-height flex layout without the .app
   max-width/padding box the other detail pages use, since their content
   must fill the viewport edge-to-edge with an internal scroll region. */
export function ChatShell() {
  return (
    <>
      <div className="bg-ambient" />
      <Outlet />
    </>
  );
}

export function DetailTopBar({ title, backTo }) {
  const navigate = useNavigate();
  return (
    <div className="top-bar">
      <button
        className="back-btn"
        aria-label="رجوع"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      {title && <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{title}</h1>}
    </div>
  );
}

export default function DetailShell() {
  return (
    <>
      <div className="bg-ambient" />
      <div className="app" style={{ paddingBottom: 24 }}>
        <Outlet />
      </div>
    </>
  );
}
