import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { isEn } from "../../lib/i18n/lang";
import ExerciseCard from "./ExerciseCard";
import "./dayPlan.css";

const t = (ar, en) => (isEn() ? en : ar);

// Split view: shows one day of the chosen program at a time. The user moves
// to the next day himself ("done"), or marks a rest day. Every day stays one
// tap away in the strip, and the full plan and library are in the scope toggle.
export default function DayPlan({ program, rotation, favs, onToggleFav, todayIds, onToggleToday, refresh }) {
  const navigate = useNavigate();
  const [viewed, setViewed] = useState(null);
  const [error, setError] = useState("");
  const days = Store.getProgramDays(program.id);
  const view = viewed !== null && viewed >= 0 && viewed < days.length ? viewed : rotation.index;
  const isCurrent = view === rotation.index;
  const day = days[view] || rotation.day;
  const active = Store.getWorkoutSession()?.status === "active";

  function startDay() {
    try {
      Store.startWorkoutSession(day.title, day.exercises);
      setError("");
      navigate("/workout");
    } catch {
      setError(t("مقدرناش نبدأ التمرين. تأكد إنك داخل بحسابك وفي مساحة على الجهاز.", "Could not start. Check your account and device storage."));
    }
  }
  const act = (fn) => () => { fn(); setViewed(null); refresh(); };

  return (
    <section className="dp" aria-label={t("تمرين اليوم", "Today's workout")}>
      <div className="dp-hero">
        <div className="dp-eyebrow">
          <span>{program.name}</span>
          <Link to="/programs" className="dp-change">{t("تغيير", "Change")}</Link>
        </div>
        <div className="dp-day-line">
          <span className="dp-num">{view + 1}<small>/{days.length}</small></span>
          <div className="dp-title-wrap">
            <h2 className="dp-title">{day.title}</h2>
            <p className="dp-sub">
              {isCurrent ? t("يوم النهارده", "Today's day") : t("يوم تاني من البرنامج", "Another day of the plan")} · {day.exercises.length} {t("تمارين", "exercises")} · {day.exercises.reduce((n, e) => n + (Number(e.sets) || 0), 0)} {t("مجموعة", "sets")}
            </p>
          </div>
        </div>

        {rotation.restToday && isCurrent && (
          <div className="dp-rest" role="status">
            <span>{t("النهارده راحة. يومك الجاي لسه مستنيك.", "Rest day logged. This workout is still next.")}</span>
            <button type="button" onClick={act(Store.undoProgramDay.bind(Store))}>{t("تراجع", "Undo")}</button>
          </div>
        )}
        {rotation.doneToday && !rotation.restToday && isCurrent && rotation.canUndo && (
          <div className="dp-rest" role="status">
            <span>{t("اتسجل إنك خلصت اليوم اللي فات.", "Previous day marked done.")}</span>
            <button type="button" onClick={act(Store.undoProgramDay.bind(Store))}>{t("تراجع", "Undo")}</button>
          </div>
        )}

        {active ? (
          <Link to="/workout" className="dp-primary">{t("كمّل تمرينك الشغال", "Resume your workout")} ←</Link>
        ) : (
          <button type="button" className="dp-primary" disabled={!day.exercises.length} onClick={startDay}>{t("ابدأ تمرين اليوم", "Start this workout")} ←</button>
        )}
        {error && <p role="alert" className="dp-error">{error}</p>}

        {isCurrent ? (
          <div className="dp-actions">
            <button type="button" className="dp-sec" onClick={act(Store.finishProgramDay.bind(Store))}>{t("✓ خلصت اليوم", "✓ Mark day done")}</button>
            <button type="button" className="dp-sec" aria-pressed={rotation.restToday} onClick={act(Store.restProgramDay.bind(Store))}>{t("النهارده راحة", "Rest today")}</button>
          </div>
        ) : (
          <div className="dp-actions">
            <button type="button" className="dp-sec" onClick={act(() => Store.setProgramDay(view))}>{t("خليه يوم النهارده", "Make this today")}</button>
            <button type="button" className="dp-sec" onClick={() => setViewed(null)}>{t("رجوع ليوم النهارده", "Back to today")}</button>
          </div>
        )}
      </div>

      <div className="dp-strip" role="group" aria-label={t("أيام البرنامج", "Program days")}>
        {days.map((d, i) => (
          <button type="button" key={i} className={"dp-chip" + (i === view ? " active" : "") + (i === rotation.index ? " today" : "")} aria-pressed={i === view} onClick={() => setViewed(i)}>
            <b>{i + 1}</b>
            <span>{d.title}</span>
            {i === rotation.index && <i>{t("النهارده", "Today")}</i>}
          </button>
        ))}
      </div>

      <ol className="dp-list dp-list-num" aria-label={t("تمارين اليوم بالترتيب", "Today's exercises in order")}>
        {day.exercises.map((ex, i) => (
          <li key={ex.id} className="dp-item"><span className="dp-idx" aria-hidden="true">{i + 1}</span>
          <ExerciseCard
            ex={ex}
            meta={Store.getMuscleMeta(ex.muscle)}
            fav={favs.has(ex.id)}
            onToggleFav={onToggleFav}
            inToday={todayIds.has(ex.id)}
            onToggleToday={onToggleToday}
            onDeleted={refresh}
          />
          </li>
        ))}
      </ol>
    </section>
  );
}
