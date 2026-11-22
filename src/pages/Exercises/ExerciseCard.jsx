import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import ExerciseThumb from "./ExerciseThumb";
import Store from "../../lib/store/gymakStore";
import { useConfirm } from "../../hooks/useDialog";
import { useI18n } from "../../hooks/useI18n";
import { unitLabel, setsRepsText } from "../../lib/exerciseMeta";

export default function ExerciseCard({ ex, meta, fav, onToggleFav, onDeleted }) {
  const navigate = useNavigate();
  const confirmAsync = useConfirm();
  const { lang } = useI18n();
  const pressTimer = useRef(null);
  const longPressFired = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  const last = Store.getLastExerciseLog(ex.id);
  const setsLabel = last ? setsRepsText(last.sets, last.reps) : setsRepsText(ex.sets, ex.reps);

  async function runDelete() {
    const msg = lang === "en" ? `Delete "${ex.name}"?` : `تحذف "${ex.name}" نهائيًا من قائمة تمارينك؟`;
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
    }, 650);
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
    e.preventDefault();
    navigate(`/exercise/${encodeURIComponent(ex.id)}`);
  }

  function onFavTap(e) {
    e.preventDefault();
    e.stopPropagation();
    onToggleFav?.(ex.id);
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
      onContextMenu={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <ExerciseThumb color={meta.color} muscle={ex.muscle} exerciseId={ex.id} />
      <div className="ex-info">
        {/* JSX escapes ex.name automatically (stored-XSS fix from the Phase 1 audit). */}
        <p className="ex-name">{ex.name}</p>
        <div className="ex-tags">
          <span className="badge primary">{ex.muscleLabel}</span>
          {ex.equipment && <span className="badge secondary">{ex.equipment}</span>}
          {ex.difficulty && (
            <span className={"difficulty-pill diff-" + (ex.difficulty === "مبتدئ" ? "beg" : ex.difficulty === "متقدم" ? "adv" : "mid")} title={ex.difficulty}>
              <span className="difficulty-dot" />{ex.difficulty}
            </span>
          )}
        </div>
      </div>
      <div className="ex-meta">
        <div className="ex-sets" dir="ltr">{setsLabel}</div>
        <div className="ex-unit">{unitLabel(ex)}</div>
        {last && <div className="ex-last">آخر مرة {last.weight} كجم</div>}
      </div>
      <button
        type="button"
        className={"ex-fav-btn" + (fav ? " on" : "")}
        aria-label={fav ? `شيل ${ex.name} من المفضلة` : `ضيف ${ex.name} للمفضلة`}
        aria-pressed={!!fav}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onFavTap}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" /></svg>
      </button>
    </a>
  );
}
