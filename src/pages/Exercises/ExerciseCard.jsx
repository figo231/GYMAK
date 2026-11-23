import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import ExerciseThumb from "./ExerciseThumb";
import Store from "../../lib/store/gymakStore";
import { useConfirm } from "../../hooks/useDialog";
import { useI18n } from "../../hooks/useI18n";
import { unitLabel, setsRepsText, daysAgoLabel } from "../../lib/exerciseMeta";
import { tx, txf } from "../../lib/i18n/tx";

export default function ExerciseCard({ ex, meta, fav, onToggleFav, inToday, onToggleToday, onDeleted }) {
  const navigate = useNavigate();
  const confirmAsync = useConfirm();
  const { lang } = useI18n();
  const pressTimer = useRef(null);
  const longPressFired = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  const last = Store.getLastExerciseLog(ex.id);
  const setsLabel = last ? setsRepsText(last.sets, last.reps) : setsRepsText(ex.sets, ex.reps);

  async function runDelete() {
    const msg = lang === "en" ? `Delete "${ex.name}"?` : txf(`تحذف "{0}" نهائيًا من قائمة تمارينك؟`, [ex.name]);
    const ok = await confirmAsync({ title: msg, danger: true, confirmLabel: tx("حذف"), cancelLabel: tx("إلغاء") });
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

  function onTodayTap(e) {
    e.preventDefault();
    e.stopPropagation();
    onToggleToday?.(ex.id);
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
      <ExerciseThumb color={meta.color} muscle={ex.muscle} exerciseId={ex.id} localMedia={ex.localMedia} />
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
        {last && <div className="ex-last">{daysAgoLabel(last.date, Store.getTodayKey())} · {last.weight} {tx("كجم")}</div>}
      </div>
      <div className="ex-actions">
      <button
          type="button"
          className={"ex-act-btn ex-fav-btn" + (fav ? " on" : "")}
          aria-label={fav ? txf(`شيل {0} من المفضلة`, [ex.name]) : txf(`ضيف {0} للمفضلة`, [ex.name])}
          aria-pressed={!!fav}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onFavTap}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" /></svg>
        </button>
        <button
          type="button"
          className={"ex-act-btn ex-today-btn" + (inToday ? " on" : "")}
          aria-label={inToday ? txf(`شيل {0} من تمارين النهارده`, [ex.name]) : txf(`ضيف {0} لتمارين النهارده`, [ex.name])}
          aria-pressed={!!inToday}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onTodayTap}
        >
          {inToday
            ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
            : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>}
        </button>
      </div>
    </a>
  );
}
