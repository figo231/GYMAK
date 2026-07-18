import { useTheme } from "../../hooks/useTheme";

const OPTIONS = [
  { id: "system", label: "تلقائي", sub: "يتبع إعدادات جهازك" },
  { id: "light", label: "فاتح", sub: "خلفية بيضاء ناصعة" },
  { id: "dark", label: "داكن", sub: "مريح للعين ليلًا" },
];

function ThemePreview({ mode }) {
  // mode: "light" | "dark" | "system" — "system" renders a split preview.
  if (mode === "system") {
    return (
      <div className="theme-preview theme-preview-split">
        <div className="theme-preview-half tp-light">
          <div className="tp-bar" />
          <div className="tp-card" />
        </div>
        <div className="theme-preview-half tp-dark">
          <div className="tp-bar" />
          <div className="tp-card" />
        </div>
      </div>
    );
  }
  return (
    <div className={`theme-preview tp-${mode}`}>
      <div className="tp-bar" />
      <div className="tp-card" />
      <div className="tp-card tp-card-sm" />
    </div>
  );
}

export default function AppearanceSheet({ onClose }) {
  const { pref, theme, setTheme } = useTheme();

  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet">
        <div className="edit-sheet-handle" />
        <h3>المظهر</h3>
        <p className="appearance-sub">اختار شكل التطبيق اللي يريحك أكتر</p>

        <div className="theme-grid">
          {OPTIONS.map((opt) => (
            <div
              key={opt.id}
              className={"theme-option" + (pref === opt.id ? " active" : "")}
              onClick={() => setTheme(opt.id)}
              role="button"
            >
              <ThemePreview mode={opt.id} />
              <div className="theme-option-label">
                <span>{opt.label}</span>
                {pref === opt.id && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--glow-blue)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                )}
              </div>
              <p className="theme-option-sub">{opt.sub}</p>
            </div>
          ))}
        </div>

        <div className="appearance-current">
          <span className="status-dot" />
          الوضع الحالي: {theme === "dark" ? "داكن" : "فاتح"}{pref === "system" ? " (تلقائي)" : ""}
        </div>

        <div className="edit-sheet-actions">
          <button type="button" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
