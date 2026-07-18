import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { DetailTopBar } from "../../components/layout/DetailShell";
import MoveGuide from "./MoveGuide";
import MuscleIllustration from "../Exercises/MuscleIllustration";

const BENCH_PRESS_STEPS = [
  "استلقِ على البنش والقدمين ثابتة على الأرض، والكتفين والمؤخرة ملاصقين للبنش.",
  "امسك البار بمسافة أعرض من الكتفين شوية، وانزله ببطء لمنتصف الصدر.",
  "ادفع البار لأعلى بقوة مع الزفير، من غير ما ترفع المؤخرة عن البنش.",
  "كرر الحركة بشكل متحكم، وحافظ على المرفقين بزاوية 45 درجة مش مفرودين بالكامل جانبًا.",
];

export default function ExerciseDetail() {
  const { id } = useParams();
  const exerciseId = id || "bench-press-barbell";
  const exercise = Store.getExerciseById(exerciseId);
  const meta = Store.getMuscleMeta(exercise ? exercise.muscle : "chest");
  const last = Store.getLastExerciseLog(exerciseId);

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

  const isSeededBenchPress = exercise && exercise.id === "bench-press-barbell";

  return (
    <>
      <DetailTopBar title="مكتبة التمارين" backTo="/exercises" />

      <div className="media-frame">
        <span className="media-tag">توضيح الحركة</span>
        <MoveGuide muscle={exercise ? exercise.muscle : "chest"} color={meta.color} />
      </div>

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

      {isSeededBenchPress ? (
        <div>
          <p className="section-title">طريقة الأداء الصحيح</p>
          <div className="glass steps-card">
            {BENCH_PRESS_STEPS.map((step, i) => (
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
            <div className="tip-txt"><b>نصيحة:</b> لو حسيت بألم في الكتف، قلل مدى الحركة وركّز على الانقباض في أعلى الحركة بدل ما تزود الوزن.</div>
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
