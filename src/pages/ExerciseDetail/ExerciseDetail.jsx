import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { DetailTopBar } from "../../components/layout/DetailShell";
import { useConfirm } from "../../hooks/useDialog";
import MuscleAnatomy from "./MuscleAnatomy";
import MuscleIllustration from "../Exercises/MuscleIllustration";

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

export default function ExerciseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirmAsync = useConfirm();
  const exerciseId = id || "bench-press-barbell";
  const exercise = Store.getExerciseById(exerciseId);
  const meta = Store.getMuscleMeta(exercise ? exercise.muscle : "chest");
  const last = Store.getLastExerciseLog(exerciseId);
  const mediaKind = exercise ? getMediaKind(exercise.mediaUrl) : null;

  const [weight, setWeight] = useState(() => (last ? Store.toDisplayWeight(last.weight) : (exercise ? 80 : 80)));
  const [sets, setSets] = useState(() => (last ? last.sets : exercise ? exercise.sets : 4));
  const [reps, setReps] = useState(() => (last ? last.reps : exercise ? exercise.reps : 8));
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    document.title = exercise ? `${exercise.name} — GYMAK` : "GYMAK";
  }, [exercise]);

  function handleSave() {
    if (!exercise) return;
    const wDisplay = parseFloat(weight) || 0;
    const s = parseInt(sets) || 0;
    const r = parseInt(reps) || 0;
    if (wDisplay <= 0 || s <= 0 || r <= 0) return;
    Store.logSet(exerciseId, Store.fromDisplayWeight(wDisplay), s, r);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2500);
  }

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
      <DetailTopBar
        title="مكتبة التمارين"
        backTo="/exercises"
        right={
          exercise && (
            <button type="button" className="detail-delete-btn" aria-label="حذف التمرين" onClick={handleDelete}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" /></svg>
            </button>
          )
        }
      />

      <div className="media-frame media-frame-lg anatomy-frame">
        <span className="media-tag">خريطة العضلات</span>
        <MuscleAnatomy
          muscle={exercise ? exercise.muscle : "chest"}
          muscleLabel={exercise ? exercise.muscleLabel : ""}
          secondary={exercise ? exercise.secondary : ""}
          color={meta.color}
        />
      </div>

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

      <div className="ex-title-row">
        <div>
          <p className="ex-title">{exercise ? exercise.name : "تمرين غير موجود"}</p>
          <span className="ex-eng">
            {exercise ? exercise.muscleLabel + (exercise.secondary ? " · " + exercise.secondary : "") : ""}
          </span>
        </div>
        <div className="fav-btn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21c-5-3.5-9-6.9-9-11.2C3 6.6 5.5 4 8.5 4c1.7 0 3.2.8 4.2 2 1-1.2 2.5-2 4.2-2 3 0 5.5 2.6 5.5 5.8 0 4.3-4 7.7-9 11.2Z" /></svg>
        </div>
      </div>

      {exercise && (exercise.equipment || exercise.difficulty) && (
        <div className="ex-info-chips">
          {exercise.equipment && (
            <div className="info-chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="9" width="4" height="6" rx="1" /><rect x="18" y="9" width="4" height="6" rx="1" /><path d="M6 12h12" /></svg>
              {exercise.equipment}
            </div>
          )}
          {exercise.difficulty && (
            <div className={"info-chip difficulty-pill diff-" + (exercise.difficulty === "مبتدئ" ? "beg" : exercise.difficulty === "متقدم" ? "adv" : "mid")}>
              <span className="difficulty-dot" />{exercise.difficulty}
            </div>
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
            التمرين ده مضاف منك، فلسه معندناش صورة/GIF أو خطوات أداء جاهزة ليه. لو حابب، تقدر تضيف ملاحظاتك الخاصة بعدين.
          </p>
        </div>
      )}

      <p className="section-title">تسجيل الأداء</p>
      {!exercise ? (
        <div className="glass" style={{ padding: 14 }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
            مينفعش نسجل أداء لتمرين مش موجود. ارجع لمكتبة التمارين واختار تمرين من القائمة.
          </p>
        </div>
      ) : (
        <div className="glass log-card">
          <div className="log-grid">
            <div className="log-field">
              <div className="log-label">الوزن ({Store.unitLabel()})</div>
              <input
                type="number" step="0.5" inputMode="decimal" value={weight}
                onChange={(e) => setWeight(e.target.value)}
                style={{ width: "100%", background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontFamily: "'Cairo',sans-serif", fontSize: 16, fontWeight: 800, padding: 0 }}
              />
            </div>
            <div className="log-field">
              <div className="log-label">مجموعات × تكرارات</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number" value={sets} onChange={(e) => setSets(e.target.value)}
                  style={{ width: "38%", background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontFamily: "'Cairo',sans-serif", fontSize: 16, fontWeight: 800, padding: 0 }}
                />
                <span className="log-val" style={{ fontWeight: 400, color: "var(--text-dim)" }}>×</span>
                <input
                  type="number" value={reps} onChange={(e) => setReps(e.target.value)}
                  style={{ width: "38%", background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontFamily: "'Cairo',sans-serif", fontSize: 16, fontWeight: 800, padding: 0 }}
                />
              </div>
            </div>
          </div>
          <div className="log-btn" style={{ cursor: "pointer" }} onClick={handleSave}>تسجيل هذه المجموعة</div>
          {showFeedback && (
            <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--success)", fontWeight: 700, marginTop: 10 }}>
              تم الحفظ ✓ +25 XP
            </div>
          )}
        </div>
      )}
    </>
  );
}
