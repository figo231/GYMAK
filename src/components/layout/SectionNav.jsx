import { NavLink } from "react-router-dom";
import { tx } from "../../lib/i18n/tx";

const GROUPS = {
  progress: [
    { to: "/stats", label: tx("ملخص") },
    { to: "/history", label: tx("السجل") },
    { to: "/measurements", label: tx("القياسات") },
    { to: "/photos", label: tx("الصور") },
  ],
  food: [
    { to: "/food", label: tx("النهارده") },
    { to: "/food-swaps", label: tx("بدائل الأكل") },
    { to: "/meal-plan", label: tx("نظامك الغذائي") },
    { to: "/supplements", label: tx("مكملات") },
  ],
  train: [
    { to: "/exercises", label: tx("التمارين") },
    { to: "/supersets", label: tx("سوبر سِت") },
    { to: "/programs", label: tx("البرامج") },
    { to: "/warmup", label: tx("إحماء وإطالة") },
    { to: "/strength", label: tx("قوتك") },
  ],
};

export default function SectionNav({ group, title }) {
  const items = GROUPS[group] || [];
  return (
    <div className="section-head">
      {title && <h1 className="section-title">{title}</h1>}
      <nav className="section-nav" aria-label={title || tx("أقسام")}>
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} className={({ isActive }) => "section-pill" + (isActive ? " active" : "")}>{i.label}</NavLink>
        ))}
      </nav>
    </div>
  );
}
