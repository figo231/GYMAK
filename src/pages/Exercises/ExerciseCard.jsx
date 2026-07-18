import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import ExerciseThumb from "./ExerciseThumb";
import Store from "../../lib/store/gymakStore";
import { useConfirm } from "../../hooks/useDialog";
import { useI18n } from "../../hooks/useI18n";

export default function ExerciseCard({ ex, meta, onDeleted }) {
  const navigate = useNavigate();
  const confirmAsync = useConfirm();
  const { lang } = useI18n();
  const pressTimer = useRef(null);
  const longPressFired = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  const last = Store.getLastExerciseLog(ex.id);
  const setsLabel = last ? `${last.sets}×${last.reps}` : `${ex.sets}×${ex.reps}`;
  const lastLabel = last ? `آخر مرة ${last.weight} كجم` : "لسه ما اتسجلش";

  async function runDelete() {
    const name = ex.name;
    const msg = lang === "en" ? `Delete "${name}"?` : `تحذف "${name}" نهائيًا من قائمة تمارينك؟`;
    const ok = await confirmAsync({ title: msg, danger: true, confirmLabel: "حذف", cancelLabel: "إلغاء" });
    if (ok) {
      Store.deleteExercise(ex.id);
      onDeleted?.();
    }
  }

  function cancelPress() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }

  function onPointerDown(e) {
    longPressFired.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      if (navigator.vibrate) navigator.vibrate(25);
      runDelete();
    }, 550);
  }

  function onPointerMove(e) {
    if (!pressTimer.current) return;
    if (Math.abs(e.clientX - start.current.x) > 10 || Math.abs(e.clientY - start.current.y) > 10) cancelPress();
  }

  function onClick(e) {
    if (longPressFired.current) {
      e.preventDefault();
      longPressFired.current = false;
      return;
    }
    navigate(`/exercise/${encodeURIComponent(ex.id)}`);
  }

  return (
    <a
      href={`/exercise/${encodeURIComponent(ex.id)}`}
      className="glass ex-card"
      style={{ textDecoration: "none", color: "inherit" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onClick={onClick}
    >
      <ExerciseThumb color={meta.color} muscle={ex.muscle} />
      <div className="ex-info">
        {/* JSX escapes ex.name automatically — this is what closes the stored-XSS
            hole flagged in the Phase 1 audit (the old innerHTML template didn't). */}
        <p className="ex-name">{ex.name}</p>
        <div className="ex-tags">
          <span className="badge primary">{ex.muscleLabel}</span>
          {ex.secondary && <span className="badge secondary">{ex.secondary}</span>}
        </div>
      </div>
      <div className="ex-meta">
        <div className="ex-sets">{setsLabel}</div>
        <div className="ex-last">{lastLabel}</div>
      </div>
      <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
    </a>
  );
}
