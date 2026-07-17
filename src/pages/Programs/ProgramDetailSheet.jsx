const LEVEL_CLASS = { "مبتدئ": "lvl-beginner", "متوسط": "lvl-inter", "متقدم": "lvl-advanced" };

export default function ProgramDetailSheet({ program, isActive, onClose, onApply, t }) {
  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="detail-sheet">
        <div className="detail-sheet-handle" />
        <div className="detail-head">
          <div>
            <p className="detail-name">{program.name}</p>
            <div className="detail-days-count">{program.daysPerWeek}</div>
          </div>
          <span className={"prog-level " + (LEVEL_CLASS[program.level] || "lvl-beginner")}>{program.level}</span>
        </div>
        <p className="detail-section-label">نظرة عامة</p>
        <p className="detail-desc">{program.desc}</p>
        <p className="detail-section-label">تقسيم الأيام</p>
        <div className="detail-day-list">
          {program.dayChips.map((c, i) => (
            <div className="detail-day-row" key={i}>
              <span className="detail-day-num">{i + 1}</span>
              <span className="detail-day-name">{c}</span>
            </div>
          ))}
        </div>
        <div className="detail-actions">
          <button type="button" onClick={onClose}>إغلاق</button>
          <button
            type="button"
            className={isActive ? "applied" : ""}
            style={isActive ? { background: "rgba(34,197,94,0.18)", color: "var(--success)" } : { background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "#fff" }}
            onClick={onApply}
          >
            {isActive ? t("prog_applied") || "مطبّق" : t("prog_apply") || "تطبيق البرنامج"}
          </button>
        </div>
      </div>
    </div>
  );
}
