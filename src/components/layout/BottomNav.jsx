import { NavLink } from "react-router-dom";
import { useI18n } from "../../hooks/useI18n";

const ITEMS = [
  {
    to: "/",
    end: true,
    key: "nav_home",
    fallback: "الرئيسية",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    to: "/exercises",
    key: "nav_exercises",
    fallback: "التمارين",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 2v4M16 2v4M4 10h16" />
      </svg>
    ),
  },
  {
    to: "/stats",
    key: "nav_stats",
    fallback: "الإحصائيات",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19V5M10 19v-8M16 19V9M22 19V3" />
      </svg>
    ),
  },
  {
    to: "/profile",
    key: "nav_profile",
    fallback: "حسابي",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const { t } = useI18n();
  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
          >
            {item.icon}
            <span>{t(item.key) || item.fallback}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
