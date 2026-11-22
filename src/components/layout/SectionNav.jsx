import { NavLink } from "react-router-dom";

const GROUPS = {
  progress: [
    { to: "/stats", label: "ملخص" },
    { to: "/history", label: "السجل" },
    { to: "/measurements", label: "القياسات" },
    { to: "/photos", label: "الصور" },
  ],
  food: [
    { to: "/food", label: "النهارده" },
    { to: "/meal-plan", label: "خطة الأسبوع" },
  ],
  train: [
    { to: "/exercises", label: "التمارين" },
    { to: "/programs", label: "البرامج" },
    { to: "/warmup", label: "إحماء وإطالة" },
  ],
};

export default function SectionNav({ group, title }) {
  const items = GROUPS[group] || [];
  return (
    <div className="section-head">
      {title && <h1 className="section-title">{title}</h1>}
      <nav className="section-nav" aria-label={title || "أقسام"}>
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} className={({ isActive }) => "section-pill" + (isActive ? " active" : "")}>{i.label}</NavLink>
        ))}
      </nav>
    </div>
  );
}
