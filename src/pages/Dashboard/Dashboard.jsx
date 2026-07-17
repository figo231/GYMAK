import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { fmt } from "../../lib/format";
import { usePrompt } from "../../hooks/useDialog";
import WeightLogSheet from "./WeightLogSheet";

const DAY_LETTERS = ["ح", "ن", "ث", "ر", "خ", "ج", "س"]; // Sun..Sat

export default function Dashboard() {
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  const promptAsync = usePrompt();
  const [showWeightSheet, setShowWeightSheet] = useState(false);

  const data = useMemo(() => {
    const profile = Store.getProfile();
    return {
      profile,
      latest: Store.getLatestWeight(),
      diffInfo: Store.getWeightDiffVsLastWeek(),
      streak: Store.getStreak(),
      best: Store.getBestStreak(),
      week: Store.getLast7DaysStatus(),
      goal: Store.getGoalWeight(),
      monthDiff: Store.getWeightDiffOverDays(30),
      bmi: Store.getBMI(),
      recent: Store.getRecentExerciseLogs(3),
    };
  }, [version]);

  const { profile, latest, diffInfo, streak, best, week, goal, monthDiff, bmi, recent } = data;

  async function handleBMIClick() {
    const current = Store.getProfile().heightCm;
    const val = await promptAsync({
      title: "اكتب طولك بالسنتيمتر (لحساب BMI):",
      inputType: "number",
      defaultValue: current || "",
    });
    if (val && !isNaN(parseFloat(val))) {
      Store.setHeight(parseFloat(val));
      refresh();
    }
  }

  async function handleGoalClick() {
    const currentKg = Store.getGoalWeight();
    const currentDisp = currentKg != null ? Store.toDisplayWeight(currentKg) : "";
    const val = await promptAsync({
      title: `اكتب وزنك المستهدف (${Store.unitLabel()}):`,
      inputType: "number",
      defaultValue: currentDisp,
    });
    if (val && !isNaN(parseFloat(val))) {
      Store.setGoalWeight(Store.fromDisplayWeight(parseFloat(val)));
      refresh();
    }
  }

  function handleWeightSave(wDisplay, bf) {
    Store.addWeight(Store.fromDisplayWeight(wDisplay), bf);
    setShowWeightSheet(false);
    refresh();
  }

  const diffDown = diffInfo ? diffInfo.diff < 0 : false;
  const diffText = !diffInfo
    ? ""
    : diffInfo.diff !== 0
    ? `${Math.abs(diffInfo.diff).toFixed(1)} هذا الأسبوع`
    : "ثابت هذا الأسبوع";

  return (
    <>
      <div className="header">
        <div className="avatar-wrap">
          <div className="avatar-ring"><img src={profile.avatar || "/icon-192.png"} alt="صورتي" /></div>
          <div className="level-badge">Lv. {profile.level}</div>
        </div>
        <div className="header-info">
          <p className="header-name">أهلاً، {profile.name || "بطل الجيم"} 👋</p>
          <p className="header-sub">
            <span>{fmt(profile.xp)} / {fmt(profile.xpNext)} XP</span>
            <span style={{ color: "var(--text-dim)" }}>·</span>
            <span>باقي {fmt(profile.xpNext - profile.xp)} للمستوى {profile.level + 1}</span>
          </p>
          <div className="xp-track"><div className="xp-fill" style={{ width: `${Math.min(100, (profile.xp / profile.xpNext) * 100)}%` }} /></div>
        </div>
        <Link to="/profile" className="header-icon-btn" style={{ textDecoration: "none" }} aria-label="الإشعارات">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"><path d="M12 2a7 7 0 0 0-7 7v3.6c0 .5-.2 1-.6 1.4L3 16.5h18l-1.4-2.5c-.4-.4-.6-.9-.6-1.4V9a7 7 0 0 0-7-7Z" /><path d="M9 19a3 3 0 0 0 6 0" /></svg>
        </Link>
      </div>

      <div className="glass streak-card">
        <div className="streak-flame">
          <svg viewBox="0 0 24 24" width="30" height="30">
            <defs>
              <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="55%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>
            </defs>
            <path fill="url(#flameGrad)" d="M12 2c1 3-2 4.2-2 7 0 1.7 1.3 3 3 3s3-1.3 3-3c1.5 1.5 2.5 3.6 2.5 5.8 0 3.6-2.9 6.7-6.5 6.7S5.5 19.4 5.5 15.8c0-2.6 1.2-4.4 2.4-6.1C9.2 7.7 10 5.3 12 2Z" />
          </svg>
        </div>
        <div className="streak-body">
          <div className="streak-num-row">
            <span className="streak-num">{streak}</span>
            <span className="streak-label">يوم متتالي</span>
          </div>
          <div className="streak-week">
            {week.map((d) => {
              const dow = new Date(d.date + "T00:00:00").getDay();
              return <div key={d.date} className={"sw-day" + (d.done ? " on" : "")}>{DAY_LETTERS[dow]}</div>;
            })}
          </div>
        </div>
        <div className="streak-record">
          <span className="rec-num">{best}</span>
          <span className="rec-txt">أعلى رقم</span>
        </div>
      </div>

      <div className="top-row">
        <div className="glass weight-card">
          <div>
            <div className="weight-top">
              <span className="weight-num">{latest ? Store.toDisplayWeight(latest.weight) : "—"}</span>
              <span className="weight-unit">{Store.unitLabel()}</span>
            </div>
            {diffInfo && (
              <span className={"weight-diff" + (diffDown ? " down" : " up")}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 4v16M6 14l6 6 6-6" /></svg>
                <span>{diffText}</span>
              </span>
            )}
          </div>
          <div className="weight-meta">
            <div className="weight-meta-row"><span>الدهون</span><span>{latest && latest.bodyFat != null ? latest.bodyFat + "%" : "—"}</span></div>
            <div className="weight-meta-row" style={{ cursor: "pointer" }} onClick={handleGoalClick}>
              <span>الهدف</span><span>{goal != null ? Store.formatWeight(goal) : "—"}</span>
            </div>
          </div>
        </div>

        <div className="side-actions">
          <Link to="/exercises" className="glass qa-tile" style={{ textDecoration: "none" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#FFD9BE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7v10M18 7v10M2 10v4M22 10v4M6 12h12" /></svg>
            <span>تسجيل تمرين</span>
          </Link>
          <div className="glass qa-tile" style={{ cursor: "pointer" }} onClick={() => setShowWeightSheet(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#FFE0C7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" /><path d="M12 8v4l3 2" /></svg>
            <span>تسجيل وزن</span>
          </div>
        </div>
      </div>

      <div className="section-title">
        <h2>قياسات الجسم</h2>
        <Link to="/stats">التفاصيل</Link>
      </div>
      <div className="inbody-grid">
        <div className="glass inbody-card">
          <span className="inbody-val">{latest && latest.bodyFat != null ? <>{latest.bodyFat}<small>%</small></> : "—"}</span>
          <div className="inbody-name">دهون الجسم</div>
        </div>
        <div className="glass inbody-card">
          <span className="inbody-val">{monthDiff ? (monthDiff.diff > 0 ? "+" : "") + monthDiff.diff : "—"}</span>
          <div className="inbody-name">تغيّر الشهر</div>
        </div>
        <div className="glass inbody-card" style={{ cursor: "pointer" }} onClick={handleBMIClick}>
          <span className="inbody-val">{bmi != null ? bmi : "حدد طولك"}</span>
          <div className="inbody-name">BMI</div>
        </div>
      </div>

      <div className="section-title">
        <h2>آخر تمرين مسجّل</h2>
        <Link to="/exercises">عرض الكل</Link>
      </div>
      <div className="glass" style={{ padding: "6px 14px" }}>
        {!recent.length ? (
          <div style={{ textAlign: "center", padding: "20px 10px", color: "var(--text-dim)", fontSize: 12.5 }}>
            لسه ما سجلتش أي تمرين. دوس "تسجيل تمرين" وابدأ.
          </div>
        ) : (
          recent.map((r, i) => (
            <div className="plan-row" key={i}>
              <div className="plan-info">
                <span className={`muscle-dot ${r.muscle}`} />
                <div>
                  <div className="plan-name">{r.name}</div>
                  <div className="plan-sub">{r.muscleLabel} · {r.sets} × {r.reps}</div>
                </div>
              </div>
              <span className="plan-weight">{Store.formatWeight(r.weight)}</span>
            </div>
          ))
        )}
      </div>

      {showWeightSheet && (
        <WeightLogSheet
          initialWeight={latest ? Store.toDisplayWeight(latest.weight) : ""}
          initialBodyFat={latest && latest.bodyFat != null ? latest.bodyFat : ""}
          unitLabel={Store.unitLabel()}
          onClose={() => setShowWeightSheet(false)}
          onSave={handleWeightSave}
        />
      )}
    </>
  );
}
