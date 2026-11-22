import MuscleFigure from "../../lib/muscleFigure";
import { buzz } from "../../lib/haptics";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { DetailTopBar } from "../../components/layout/DetailShell";
import { useConfirm } from "../../hooks/useDialog";
import { startRest } from "../../lib/rest/restTimer";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { useToast } from "../../hooks/useToast";
import { localISO } from "../../lib/dateKey";
import { relDayAr } from "../../lib/homeLogic";
import { initialForm, parseLogForm, stepValue, logsOnDate, bestWeight, previousSession, volume, isBodyweight, best1RM, percentTable } from "../../lib/logLogic";
import MuscleAnatomy from "./MuscleAnatomy";
import ExerciseAnim, { hasExerciseAnim } from "../../components/ExerciseAnim";
import { useExerciseMedia } from "../../lib/exerciseMedia";
import MuscleIllustration from "../Exercises/MuscleIllustration";
import ExerciseThumb from "../Exercises/ExerciseThumb";
import { Link } from "react-router-dom";
import { findAlternatives, equipmentOptions } from "../../lib/alternatives";

// Classifies a user-supplied media URL so we know whether to render a
// <video>, an <img> (gif/still), or a YouTube embed. Anything we can't
// confidently classify falls back to the illustration — never a broken
// or low-quality placeholder.
function getMediaKind(url) {
  if (!url) return null;
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".mov")) return "video";
  if (clean.endsWith(".gif") || clean.endsWith(".jpg") || clean.endsWith(".jpeg") || clean.endsWith(".png") || clean.endsWith(".webp")) return "image";
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  return "image";
}
function toYouTubeEmbed(url) {
  const m = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

export default function ExerciseDetailRoute() {
  const { id } = useParams();
  // remount per exercise so the form never carries values from another one
  return <ExerciseDetail key={id || "default"} id={id} />;
}

function ExerciseDetail({ id }) {
  const navigate = useNavigate();
  const confirmAsync = useConfirm();
  const [version] = useStoreVersion();
  const toast = useToast();
  const exerciseId = id || "bench-press-barbell";
  const exercise = Store.getExerciseById(exerciseId);
  const meta = Store.getMuscleMeta(exercise ? exercise.muscle : "chest");
  const last = Store.getLastExerciseLog(exerciseId);
  const mediaKind = exercise ? getMediaKind(exercise.mediaUrl) : null;
  const localMedia = useExerciseMedia(exerciseId, !!(exercise && exercise.localMedia));
  const unit = Store.unitLabel();
  const today = localISO();
  const allLogs = Store.getExerciseLogs(exerciseId);
  void version;
  const todaySets = logsOnDate(allLogs, today);
  const prevSession = previousSession(allLogs, today);
  const best = bestWeight(allLogs);
  const orm = best1RM(allLogs);
  const ormDisplay = orm ? Store.toDisplayWeight(orm.value) : 0;
  const ormStep = unit === "lb" ? 5 : 2.5;
  const ormTable = orm ? percentTable(ormDisplay, ormStep) : [];
  const [showOrm, setShowOrm] = useState(false);
  const [tab, setTab] = useState("log");
  const [altEq, setAltEq] = useState("all");
  const alts = exercise ? findAlternatives(exercise, Store.getExercises(), { limit: 12 }) : [];
  const altOpts = equipmentOptions(alts);
  const altShown = (altEq === "all" ? alts : alts.filter((a) => a.equipment === altEq)).slice(0, 6);
  const fav = Store.getFavoriteIds().includes(exerciseId);
  const secUnit = !!(exercise && exercise.unit === "sec");

  const init = initialForm(exercise, last, (kg) => Store.toDisplayWeight(kg));
  const [weight, setWeight] = useState(init.weight);
  const [sets, setSets] = useState(init.sets);
  const [reps, setReps] = useState(init.reps);
  const [error, setError] = useState(null);
  const [justSaved, setJustSaved] = useState(null);
  const weightRef = useRef(null);
  const setsRef = useRef(null);
  const repsRef = useRef(null);
  const refs = { weight: weightRef, sets: setsRef, reps: repsRef };

  useEffect(() => {
    document.title = exercise ? `${exercise.name} — GYMAK` : "GYMAK";
  }, [exercise]);
  useEffect(() => {
    if (!justSaved) return undefined;
    const t = setTimeout(() => setJustSaved(null), 3000);
    return () => clearTimeout(t);
  }, [justSaved]);

  function bump(field, dir) {
    setError(null);
    const set = field === "weight" ? setWeight : field === "sets" ? setSets : setReps;
    const cur = field === "weight" ? weight : field === "sets" ? sets : reps;
    set(stepValue(cur, dir, field, unit));
    buzz(6);
  }

  function handleSave() {
    if (!exercise) return;
    const r = parseLogForm({ weight, sets, reps }, (v) => Store.fromDisplayWeight(v));
    if (!r.ok) {
      setError(r.error);
      const el = refs[r.field] && refs[r.field].current;
      if (el) el.focus();
      return;
    }
    setError(null);
    const before = Store.getExerciseLogs(exerciseId).length;
    Store.logSet(exerciseId, r.kg, r.sets, r.reps);
    const saved = Store.getExerciseLogs(exerciseId).at(-1);
    buzz(15);
    startRest();
    setJustSaved({ index: before, xp: !!(saved && saved.xp) });
  }

  function undoLast() {
    if (!justSaved) return;
    const snap = Store.deleteExerciseLog(exerciseId, justSaved.index);
    setJustSaved(null);
    if (snap) toast("اتلغت المجموعة", { duration: 5000, action: { label: "تراجع", onClick: () => Store.restore(snap) } });
  }

  async function removeSet(l) {
    const ok = await confirmAsync({ title: "مسح المجموعة؟", label: `${Store.formatWeight(l.weight)} × ${l.sets}×${l.reps}`, confirmLabel: "مسح", danger: true });
    if (!ok) return;
    const snap = Store.deleteExerciseLog(exerciseId, l.i);
    if (snap) toast("تم مسح المجموعة", { duration: 6000, action: { label: "تراجع", onClick: () => Store.restore(snap) } });
  }

  function toggleFav() { Store.toggleFavorite(exerciseId); buzz(8); }

  const fmtSet = (l) => `${l.weight > 0 ? Store.formatWeight(l.weight) : (isBodyweight(exercise) ? "وزن الجسم" : "بدون وزن")} · ${l.sets}×${l.reps}${secUnit ? " ث" : ""}`;

  async function handleDelete() {
    if (!exercise) return;
    const ok = await confirmAsync({
      title: `تحذف "${exercise.name}" نهائيًا من مكتبة تمارينك؟`,
      danger: true, confirmLabel: "حذف", cancelLabel: "إلغاء",
    });
    if (ok) {
      Store.deleteExercise(exercise.id);
      navigate("/exercises");
    }
  }

  return (
    <>
      <header className="xd-hero" style={exercise ? { "--mc": meta.color } : undefined}>
        <div className="xd-bar">
          <button type="button" className="xd-ico" aria-label="رجوع" onClick={() => navigate(-1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="xd-bar-end">
            {exercise && (
              <button type="button" className={"xd-ico" + (fav ? " on" : "")} aria-pressed={fav} aria-label={fav ? "شيل من المفضلة" : "ضيف للمفضلة"} onClick={toggleFav}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" /></svg>
              </button>
            )}
            {exercise && (
              <button type="button" className="xd-ico detail-delete-btn" aria-label="حذف التمرين" onClick={handleDelete}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" /></svg>
              </button>
            )}
          </div>
        </div>
        {exercise && <div className="xd-art" aria-hidden="true"><MuscleIllustration muscle={exercise.muscle} color={meta.color} size={150} /></div>}
        <div className="xd-meta">
          <span className="xd-kicker">{exercise ? exercise.muscleLabel + (exercise.secondary ? " + " + exercise.secondary : "") : ""}</span>
          <h1 className="xd-title">{exercise ? exercise.name : "تمرين غير موجود"}</h1>
          {exercise && (
            <div className="xd-chips">
              {exercise.equipment && <span className="xd-chip">{exercise.equipment}</span>}
              {exercise.difficulty && <span className="xd-chip">{exercise.difficulty}</span>}
              {best > 0 && <span className="xd-chip hot">أفضل {Store.formatWeight(best)}</span>}
            </div>
          )}
        </div>
      </header>
      {exercise && <section className="glass muscle-figure-panel" aria-label="العضلات المستهدفة">
        <h2>العضلات المستهدفة</h2><p>اللون الذهبي بيوضح مجموعة {exercise.muscleLabel}. الرسم للتوضيح، مش لقياس نشاط العضلة.</p>
        <div className="muscle-figure-pair"><div><MuscleFigure view="front" highlight={exercise.muscle} width={110} label={`العضلات من الأمام: ${exercise.muscleLabel}`} /><small>أمام</small></div><div><MuscleFigure view="back" highlight={exercise.muscle} width={110} label={`العضلات من الخلف: ${exercise.muscleLabel}`} /><small>خلف</small></div></div>
      </section>}


      {exercise && (
        <div className="xd-tabs" role="tablist" aria-label="أقسام التمرين">
          {[["log", "سجّل"], ["how", "الأداء"], ["more", "السجل والبدائل"]].map(([id, l]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={"xd-tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</button>
          ))}
        </div>
      )}

      {!exercise && (
        <div className="glass" style={{ padding: 14 }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
            مينفعش نسجل أداء لتمرين مش موجود. ارجع لمكتبة التمارين واختار تمرين من القائمة.
          </p>
        </div>
      )}
      {tab === "log" && (<>
      {exercise && (
      <div className="glass log-card" id="log">
        <div className="log-head">
          <span className="log-title">سجّل مجموعة</span>
          {best > 0 && <span className="log-best">أفضل وزن: {Store.formatWeight(best)}</span>}
        </div>
        {prevSession && (
          <div className="log-prev">
            <span>آخر مرة ({relDayAr(prevSession.date, today)})</span>
            <b dir="ltr">{prevSession.sets.map((l) => `${l.weight > 0 ? Store.toDisplayWeight(l.weight) : 0}×${l.sets}×${l.reps}`).slice(0, 3).join("  ·  ")}</b>
          </div>
        )}
        {!prevSession && allLogs.length === 0 && <div className="log-prev"><span>أول مرة تسجل التمرين ده. ابدأ بوزن خفيف.</span></div>}
        <div className="log-grid3">
            <div className="log-field">
              <label className="log-label" htmlFor="log-weight">{"الوزن (" + unit + ")"}</label>
              <div className="stepper">
                <button type="button" className="step-btn" aria-label="أقل الوزن" onClick={() => bump("weight", -1)}>−</button>
                <input id="log-weight" ref={weightRef} type="number" inputMode="decimal" dir="ltr" value={weight} min="0"
                  onChange={(e) => { setError(null); setWeight(e.target.value); }} aria-invalid={error && error.includes("الوزن") ? true : undefined} />
                <button type="button" className="step-btn" aria-label="أكتر الوزن" onClick={() => bump("weight", 1)}>+</button>
              </div>
            </div>
            <div className="log-field">
              <label className="log-label" htmlFor="log-sets">مجموعات</label>
              <div className="stepper">
                <button type="button" className="step-btn" aria-label="أقل المجموعات" onClick={() => bump("sets", -1)}>−</button>
                <input id="log-sets" ref={setsRef} type="number" inputMode="numeric" dir="ltr" value={sets} min="0"
                  onChange={(e) => { setError(null); setSets(e.target.value); }} aria-invalid={error && error.includes("المجموعات") ? true : undefined} />
                <button type="button" className="step-btn" aria-label="أكتر المجموعات" onClick={() => bump("sets", 1)}>+</button>
              </div>
            </div>
            <div className="log-field">
              <label className="log-label" htmlFor="log-reps">{secUnit ? "ثواني" : "تكرارات"}</label>
              <div className="stepper">
                <button type="button" className="step-btn" aria-label="أقل التكرارات" onClick={() => bump("reps", -1)}>−</button>
                <input id="log-reps" ref={repsRef} type="number" inputMode="numeric" dir="ltr" value={reps} min="0"
                  onChange={(e) => { setError(null); setReps(e.target.value); }} aria-invalid={error && error.includes("التكرارات") ? true : undefined} />
                <button type="button" className="step-btn" aria-label="أكتر التكرارات" onClick={() => bump("reps", 1)}>+</button>
              </div>
            </div>
        </div>
        {isBodyweight(exercise) && <p className="log-hint">الوزن 0 معناه وزن الجسم بس.</p>}
        {error && <p className="log-error" role="alert">{error}</p>}
        <button type="button" className="log-btn" onClick={handleSave}>تسجيل المجموعة</button>
        {justSaved && (
          <div className="log-saved" role="status">
            <span>تم الحفظ ✓{justSaved.xp ? " +25 XP" : ""}</span>
            <button type="button" onClick={undoLast}>تراجع</button>
          </div>
        )}
        {orm && (
          <div className="orm">
            <button type="button" className="orm-head" aria-expanded={showOrm} onClick={() => setShowOrm((v) => !v)}>
              <span>الحد الأقصى المقدّر (1RM)</span>
              <b dir="ltr">{Math.round(ormDisplay * 10) / 10} {unit}</b>
            </button>
            {showOrm && (
              <div className="orm-body">
                <p className="orm-note">تقدير من أفضل مجموعة ليك ({Store.formatWeight(orm.from.weight)} × {orm.from.reps}). دقيق لحد 12 تكرار تقريبًا. استخدمه كدليل مش كحقيقة ثابتة.</p>
                <div className="orm-table" role="table">
                  {ormTable.map((r) => (
                    <div className="orm-row" role="row" key={r.percent}>
                      <span role="cell" dir="ltr">{r.percent}%</span>
                      <b role="cell" dir="ltr">{r.weight} {unit}</b>
                      <span role="cell" className="orm-reps">~{r.reps} تكرار</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {todaySets.length > 0 && (
          <div className="log-today">
            <div className="log-today-head"><span>النهارده · {todaySets.length} {todaySets.length === 1 ? "تسجيلة" : "تسجيلات"}</span><span dir="ltr">{Store.formatWeight(volume(todaySets))}</span></div>
            {todaySets.map((l) => (
              <div className="log-today-row" key={l.i}>
                <span>{fmtSet(l)}</span>
                <button type="button" aria-label="مسح المجموعة" onClick={() => removeSet(l)}>مسح</button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      </>)}

      {tab === "how" && (<>
      {exercise && hasExerciseAnim(exercise.id) && (
        <div className="media-frame media-frame-lg">
          <span className="media-tag">طريقة الأداء</span>
          <ExerciseAnim exerciseId={exercise.id} alt={exercise.name} />
        </div>
      )}

      <div className="media-frame media-frame-lg anatomy-frame">
        <span className="media-tag">خريطة العضلات</span>
        <MuscleAnatomy
          muscle={exercise ? exercise.muscle : "chest"}
          muscleLabel={exercise ? exercise.muscleLabel : ""}
          secondary={exercise ? exercise.secondary : ""}
          color={meta.color}
        />
      </div>

      {localMedia.url && (
        <div className="media-frame media-frame-lg">
          <span className="media-tag">صورتك أنت (على جهازك بس)</span>
          {localMedia.kind === "video" ? (
            <video className="media-real" src={localMedia.url} autoPlay loop muted playsInline controls />
          ) : (
            <img className="media-real" src={localMedia.url} alt={exercise.name} />
          )}
        </div>
      )}

      {mediaKind && (
        <div className="media-frame media-frame-sm">
          {mediaKind === "video" ? (
            <video className="media-real" src={exercise.mediaUrl} autoPlay loop muted playsInline controls />
          ) : mediaKind === "youtube" ? (
            <iframe className="media-real" src={toYouTubeEmbed(exercise.mediaUrl)} title={exercise.name} allow="autoplay; encrypted-media" allowFullScreen />
          ) : (
            <img className="media-real" src={exercise.mediaUrl} alt={exercise.name} />
          )}
        </div>
      )}

      {exercise && (
        <div className="glass muscle-card">
          <div className="muscle-card-row">
            <div className="muscle-illo-frame" style={{ background: `radial-gradient(circle at 40% 30%, ${meta.color}22, transparent 70%)` }}>
              <MuscleIllustration muscle={exercise.muscle} color={meta.color} size={54} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="muscle-legend">
                <div className="legend-item"><span className="legend-dot" style={{ background: "var(--accent-text)", color: "var(--accent-text)" }} />أساسية</div>
                <div className="legend-item"><span className="legend-dot" style={{ background: "var(--text-secondary)", color: "var(--text-secondary)" }} />مساعدة</div>
              </div>
              <div className="muscle-tags">
                <span className="m-tag primary">{exercise.muscleLabel}</span>
                {exercise.secondary && <span className="m-tag secondary">{exercise.secondary}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {exercise && exercise.instructions?.length ? (
        <div>
          <p className="section-title">طريقة الأداء الصحيح</p>
          {exercise.description && <p className="ex-description">{exercise.description}</p>}
          <div className="glass steps-card">
            {exercise.instructions.map((step, i) => (
              <div className="step-row" key={i}>
                <div className="step-num">{i + 1}</div>
                <div className="step-txt">{step}</div>
              </div>
            ))}
          </div>
          <div className="tip-card">
            <div className="tip-ic">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--warn-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /><circle cx="12" cy="12" r="4" /></svg>
            </div>
            <div className="tip-txt"><b>نصيحة:</b> لو حسيت بألم في المفصل، قلل مدى الحركة وركّز على الانقباض في أعلى الحركة بدل ما تزود الوزن.</div>
          </div>
        </div>
      ) : (
        <div className="glass" style={{ padding: 14 }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
            التمرين ده مضاف منك، فمعندناش خطوات أداء جاهزة ليه.
          </p>
        </div>
      )}

      </>)}

      {tab === "more" && exercise && (<>
      <div className="xd-hist">
        <p className="section-title">آخر التسجيلات</p>
        {allLogs.length === 0 ? <div className="glass" style={{ padding: 14, fontSize: 13, color: "var(--text-secondary)" }}>لسه مسجلتش التمرين ده.</div> : allLogs.slice(-8).reverse().map((l, k) => (
          <div className="glass xd-hrow" key={k}><span>{relDayAr(l.date, today)}</span><b dir="ltr">{fmtSet(l)}</b></div>
        ))}
      </div>
      {alts.length > 0 && (
        <div className="alts">
          <p className="section-title">بدائل للتمرين ده</p>
          <p className="alts-sub">مفيش المعدة أو التمرين مش مناسب؟ جرّب واحد من دول لنفس العضلة.</p>
          <div className="goal-tabs" role="tablist" aria-label="نوع المعدة">
            {["all", ...altOpts].map((o) => (
              <button key={o} type="button" role="tab" aria-selected={altEq === o} className={"goal-tab" + (altEq === o ? " on" : "")} onClick={() => setAltEq(o)}>{o === "all" ? "الكل" : o}</button>
            ))}
          </div>
          {altShown.map((a) => (
            <Link key={a.id} to={`/exercise/${encodeURIComponent(a.id)}`} className="glass alt-row">
              <ExerciseThumb color={Store.getMuscleMeta(a.muscle).color} muscle={a.muscle} exerciseId={a.id} localMedia={a.localMedia} />
              <div className="alt-main">
                <div className="alt-name">{a.name}</div>
                <div className="alt-meta">{[a.equipment, a.difficulty, a.sets && a.reps ? `${a.sets}×${a.reps}` : null].filter(Boolean).join(" · ")}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </Link>
          ))}
        </div>
      )}
      </>)}
    </>
  );
              }
