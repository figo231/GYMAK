import { NavLink, useLocation } from "react-router-dom";

const ITEMS = [
  { to: "/", end: true, key: "nav_home", fallback: "الرئيسية", match: ["/"], icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10h14V10" />
      </svg>
    ) },
  { to: "/exercises", key: "nav_train", fallback: "تدريب", match: ["/exercises", "/programs", "/exercise/"], icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
      </svg>
    ) },
  { to: "/food", key: "nav_food", fallback: "أكل", match: ["/food"], icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M5 3v5M16 21V3c-2 1-3 4-3 8h3" />
      </svg>
    ) },
  { to: "/stats", key: "nav_progress", fallback: "تقدم", match: ["/stats", "/history", "/measurements", "/photos"], icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19V5M10 19v-8M16 19V9M22 19V3" />
      </svg>
    ) },
  { to: "/profile", key: "nav_profile", fallback: "حسابي", match: ["/profile", "/account", "/coach", "/owner"], icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
      </svg>
    ) },
];

function isOn(item, path) {
  if (item.match[0] === "/" && item.match.length === 1) return path === "/";
  return item.match.some((m) => (m.endsWith("/") ? path.startsWith(m) : path === m || path.startsWith(m + "/")));
}

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={"nav-item" + (isOn(item, pathname) ? " active" : "")}
          >
            <span className="nav-icon-chip">{item.icon}</span>
            <span>{item.fallback}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
