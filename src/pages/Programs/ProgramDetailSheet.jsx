import { useState } from "react";
import Store from "../../lib/store/gymakStore";
import { useConfirm } from "../../hooks/useDialog";

const LEVEL_CLASS = { "مبتدئ": "lvl-beginner", "متوسط": "lvl-inter", "متقدم": "lvl-advanced" };

export default function ProgramDetailSheet({ program, isActive, onClose, onApply, t }) {
  const [version, setVersion] = useState(0);
  const confirmAsync = useConfirm();
  const days = Store.getProgramDays(program.id);
  const hasTemplate = days.length > 0 && days.some((d) => d.exercises.length);

  async function handleDeleteExercise(ex) {
    const ok = await confirmAsync({
      title: `تحذف "${ex.name}" نهائيًا من مكتبة تمارينك؟`,
      danger: true, confirmLabel: "حذف", cancelLabel: "إلغاء",
    });
    if (ok) {
      Store.deleteExercise(ex.id);
      setVersion((v) => v + 1); // re-read Store.getProgramDays with the tombstone applied
    }
  }

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

        <p className="detail-section-label">تقسيم الأيام — يتولّد تلقائيًا</p>
        {hasTemplate ? (
          <div className="prog-days-generated" key={version}>
            {days.map((day, i) => (
              <div className="prog-gen-day" key={i}>
                <div className="prog-gen-day-head">
                  <span className="detail-day-num">{i + 1}</span>
                  <span className="detail-day-name">{day.title}</span>
                </div>
                <div className="prog-gen-ex-list">
                  {day.exercises.map((ex) => (
                    <div className="prog-gen-ex" key={ex.id}>
                      <span className="prog-gen-ex-name">{ex.name}</span>
                      <span className="prog-gen-ex-sr">{ex.sets}×{ex.reps}</span>
                      <button
                        type="button"
                        className="prog-gen-ex-del"
                        aria-label={`حذف ${ex.name}`}
                        onClick={() => handleDeleteExercise(ex)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="detail-day-list">
            {program.dayChips.map((c, i) => (
              <div className="detail-day-row" key={i}>
                <span className="detail-day-num">{i + 1}</span>
                <span className="detail-day-name">{c}</span>
              </div>
            ))}
          </div>
        )}

        <div className="detail-actions">
          <button type="button" onClick={onClose}>إغلاق</button>
          <button
            type="button"
            className={isActive ? "applied" : ""}
            style={isActive ? { background: "rgba(34,197,94,0.18)", color: "var(--success)" } : { background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "#fff" }}
            onClick={onApply}
          >
            {isActive ? t("prog_applied") || "مطبّق" : t("prog_apply") || "ابدأ التمرين الآن"}
          </button>
        </div>
      </div>
    </div>
  );
}
