import { useMemo, useState } from "react";
import { localISO } from "../../lib/dateKey";
import { Link, useNavigate } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { fmt } from "../../lib/format";
import { usePrompt } from "../../hooks/useDialog";
import { useToast } from "../../hooks/useToast";
import { HEIGHT_RANGE, GOAL_RANGE_KG, validHeight, validGoalKg, bmiCategory, xpToNext, exercisesWord } from "../../lib/profileLogic";
import { buzz } from "../../lib/haptics";
import { getWater } from "../../lib/water/water";
import { sparkPoints, heroState, parseWeightForm, relDayAr, weightChangeView, streakAtRisk, logUnitText, logLoadText } from "../../lib/homeLogic";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import WeightLogSheet from "./WeightLogSheet";
import WaterCard from "./WaterCard";
import { pickExerciseOfTheDay, unitLabel } from "../../lib/exerciseMeta";

const press = (fn) => ({ role: "button", tabIndex: 0, onClick: fn, onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(e); } } });
const DAY_LETTERS = ["ح", "ن", "ث", "ر", "خ", "ج", "س"]; // Sun..Sat

export default function Dashboard() {
  const [version, refresh] = useStoreVersion();
  const promptAsync = usePrompt();
  const toast = useToast();
  const navigate = useNavigate();
  const [showWeightSheet, setShowWeightSheet] = useState(false);
  const kcalToday = useMemo(() => Store.getTodayFoodLog().totalKcal, [version]);

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
      bodyFat: Store.getLatestBodyFat(),
      hasProgram: !!Store.getActiveProgram(),
      spark: Store.getWeightHistory(7).map((w) => Store.toDisplayWeight(w.weight)),
      setsToday: Store.getSetsInRange(1),
      bmi: Store.getBMI(),
      recent: Store.getRecentExerciseLogs(3),
      todayList: Store.getTodayPlanIds().map((id) => Store.getExerciseById(id)).filter(Boolean).map((ex) => ({ ex, done: Store.isLoggedToday(ex.id) })),
      eotd: (() => {
        const prog = Store.getActiveProgram();
        return pickExerciseOfTheDay({
          dateISO: Store.getTodayKey(),
          programDays: prog ? Store.getProgramDays(prog.id) : null,
          exercises: Store.getExercises(),
        });
      })(),
    };
  }, [version]);

  const { profile, latest, diffInfo, streak, best, week, goal, monthDiff, bmi, recent, todayList, eotd, bodyFat, hasProgram, spark, setsToday } = data;

  async function handleBMIClick() {
    const current = Store.getProfile().heightCm;
    const val = await promptAsync({ title: "اكتب طولك بالسنتيمتر (لحساب BMI):", inputType: "number", defaultValue: current || "" });
    if (val === null || val === undefined || val === "") return;
    const n = parseFloat(val);
    if (!validHeight(n)) { toast(`الطول لازم يكون بين ${HEIGHT_RANGE[0]} و ${HEIGHT_RANGE[1]} سم.`); return; }
    Store.setHeight(n); refresh();
  }

  async function handleGoalClick() {
    const currentKg = Store.getGoalWeight();
    const currentDisp = currentKg != null ? Store.toDisplayWeight(currentKg) : "";
    const val = await promptAsync({ title: `اكتب وزنك المستهدف (${Store.unitLabel()}):`, inputType: "number", defaultValue: currentDisp });
    if (val === null || val === undefined || val === "") return;
    const kg = Store.fromDisplayWeight(parseFloat(val));
    if (!validGoalKg(kg)) { toast(`الوزن المستهدف لازم يكون بين ${GOAL_RANGE_KG[0]} و ${GOAL_RANGE_KG[1]} كجم.`); return; }
    Store.setGoalWeight(kg); refresh();
  }

  // Returns an error string for the sheet, or null when saved.
  function handleWeightSave(form) {
    const r = parseWeightForm(form, (v) => Store.fromDisplayWeight(v));
    if (!r.ok) return r.error;
    const res = Store.saveWeight(r.kg, r.bodyFat, r.date);
    if (!res.ok) return "مقدرناش نحفظ الوزن. راجع الأرقام.";
    setShowWeightSheet(false);
    refresh();
    buzz(12);
    toast("اتسجّل الوزن", { action: { label: "تراجع", onClick: () => { Store.undoSaveWeight(res); refresh(); } }, duration: 5000 });
    return null;
  }

  const unit = Store.unitLabel();
  const weekView = weightChangeView(diffInfo, { goal, toDisplay: Store.toDisplayWeight.bind(Store), unit, window: 7 });
  const monthView = weightChangeView(monthDiff, { goal, toDisplay: Store.toDisplayWeight.bind(Store), unit, window: 30 });
  const toneColor = (tone) => (tone === "good" ? "var(--success)" : tone === "bad" ? "var(--danger)" : undefined);
  const xp = xpToNext(profile);
  const atRisk = streakAtRisk(streak, week);
  const today = localISO();
  const bmiCat = bmiCategory(bmi);
  const trainedToday = !!(week[week.length - 1] && week[week.length - 1].done);
  const hero = heroState({ trainedToday, todayList, eotd, streak });
  const sparkG = sparkPoints(spark);
  const water = getWater();
  const waterPct = Math.min(100, Math.round((water.ml / water.goal) * 100));
  const doneCount = todayList.filter((x) => x.done).length;
  const startSuggested = () => {
    Store.addManyToTodayPlan(hero.exercises.map((e) => e.id));
    refresh();
    navigate(`/exercise/${encodeURIComponent(hero.exercises[0].id)}`);
  };
  const notifOff = typeof Notification !== "undefined" && Notification.permission === "default";

  return (
    <div className="home">
      <div className="header">
        <div className="avatar-wrap">
          <div className="avatar-ring"><img src={profile.avatar || "/icon-192.png"} alt="صورتي" /></div>
          <div className="level-badge">Lv. {profile.level}</div>
        </div>
        <div className="header-info">
          <p className="header-name">أهلاً، {profile.name || "بطل الجيم"}</p>
          <p className="header-sub">
            <span>{fmt(profile.xp)} / {fmt(profile.xpNext)} XP</span>
            <span style={{ color: "var(--text-dim)" }}>·</span>
            <span>{xp.capped ? "وصلت سقف الـXP النهارده" : `فاضل ${xp.exercises} ${exercisesWord(xp.exercises)} للمستوى ${xp.nextLevel}`}</span>
          </p>
          <div className="xp-track"><div className="xp-fill" style={{ width: `${Math.min(100, (profile.xp / profile.xpNext) * 100)}%` }} /></div>
        </div>
        <Link to="/profile?notif=1" className="header-icon-btn" aria-label={notifOff ? "الإشعارات (غير مفعّلة)" : "الإشعارات"} style={{ textDecoration: "none", position: "relative" }}>
          {notifOff && <span className="bell-dot" />}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><path d="M12 2a7 7 0 0 0-7 7v3.6c0 .5-.2 1-.6 1.4L3 16.5h18l-1.4-2.5c-.4-.4-.6-.9-.6-1.4V9a7 7 0 0 0-7-7Z" /><path d="M9 19a3 3 0 0 0 6 0" /></svg>
        </Link>
      </div>

      <div className={"glass hero" + (hero.kind === "done" ? " is-done" : "")} data-testid="hero">
        <div className="hero-eyebrow">{hero.kind === "done" ? "تمرين النهارده" : hero.kind === "plan" ? "خطة النهارده" : hero.kind === "suggest" ? "مقترح النهارده" : "ابدأ"}</div>
        {hero.kind === "done" && (<>
          <div className="hero-title"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>خلصت النهارده</div>
          <div className="hero-sub">{streak > 0 ? `سلسلتك ${streak} ${streak === 1 ? "يوم" : streak === 2 ? "يومين" : streak <= 10 ? "أيام" : "يوم"}. ارتاح وارجع بكرة.` : "ارتاح وارجع بكرة."}</div>
          <Link to="/exercises" className="btn btn-secondary hero-cta">سجّل تمرين تاني</Link>
        </>)}
        {hero.kind === "plan" && (<>
          <div className="hero-title">{hero.total} {exercisesWord(hero.total)} النهارده</div>
          <div className="hero-sub">{hero.done} من {hero.total} خلصوا. الجاي: {hero.next.name}</div>
          <div className="hero-track" role="progressbar" aria-valuemin={0} aria-valuemax={hero.total} aria-valuenow={hero.done}><div style={{ width: `${(hero.done / hero.total) * 100}%` }} /></div>
          <Link to={`/exercise/${encodeURIComponent(hero.next.id)}`} className="btn btn-primary hero-cta">{hero.done ? "كمّل" : "ابدأ"}</Link>
        </>)}
        {hero.kind === "suggest" && (<>
          <div className="hero-title">{hero.title}</div>
          <div className="hero-sub">{hero.exercises.length} {exercisesWord(hero.exercises.length)} مقترحة. الأول: {hero.exercises[0].name}</div>
          <button type="button" className="btn btn-primary hero-cta" onClick={startSuggested}>ابدأ</button>
        </>)}
        {hero.kind === "empty" && (<>
          <div className="hero-title">اختار تمرينك</div>
          <div className="hero-sub">ابدأ بتمرين واحد النهارده، وسلسلتك تبدأ.</div>
          <Link to="/exercises" className="btn btn-primary hero-cta">تسجيل تمرين</Link>
        </>)}
      </div>

      <div className="today-strip" data-testid="today-strip">
        <Link to="/exercises" className="ts-item"><b>{todayList.length ? `${doneCount}/${todayList.length}` : "—"}</b><span>تمارين</span></Link>
        <button type="button" className="ts-item" onClick={() => document.querySelector('[data-testid="water-card"]')?.scrollIntoView({ behavior: "smooth", block: "center" })}><b dir="ltr">{waterPct}%</b><span>مياه</span></button>
        <Link to="/food" className="ts-item"><b dir="ltr">{kcalToday}</b><span>سعرات</span></Link>
      </div>

      {recent.length === 0 && (
        <div className="glass start-card" data-testid="start-card">
          <div className="start-title">ابدأ في 3 خطوات</div>
          {[
            { done: !!latest, text: "سجّل وزنك", onClick: () => setShowWeightSheet(true) },
            { done: !!hasProgram, text: "اختار برنامج", to: "/programs" },
            { done: false, text: "سجّل أول تمرين", to: "/exercises" },
          ].map((s, i) => {
            const inner = (<><span className={"start-n" + (s.done ? " done" : "")}>{s.done ? "✓" : i + 1}</span><span className="start-t">{s.text}</span></>);
            return s.to
              ? <Link key={i} to={s.to} className="start-step">{inner}</Link>
              : <div key={i} className="start-step" {...press(s.onClick)}>{inner}</div>;
          })}
        </div>
      )}

      <div className={"glass streak-card" + (trainedToday ? " lit" : "")}>
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
            <span className="streak-label">{streak === 0 ? "ابدأ سلسلتك النهارده" : "يوم متتالي"}</span>
          </div>
          <div className="streak-week">
            {week.map((d) => {
              const dow = new Date(d.date + "T00:00:00").getDay();
              const isToday = d.date === localISO();
              return <div key={d.date} className={"sw-day" + (d.done ? " on" : "") + (isToday ? " today" : "")} aria-label={`${DAY_LETTERS[dow]}${isToday ? " (النهارده)" : ""}: ${d.done ? "اتمرنت" : "لا"}`}>{DAY_LETTERS[dow]}</div>;
            })}
          </div>
          {atRisk && <div className="streak-warn">سجّل تمرين النهارده عشان سلسلة الـ{streak} {streak === 1 ? "يوم" : streak === 2 ? "يومين" : streak <= 10 ? "أيام" : "يوم"} متتقطعش</div>}
        </div>
        <div className="streak-record">
          <span className="rec-num">{best}</span>
          <span className="rec-txt">أطول سلسلة</span>
        </div>
      </div>

      <div className="top-row">
        <div className="glass weight-card">
          <div>
            {latest ? (<>
              <div className="weight-top">
                <span className="weight-num">{Store.toDisplayWeight(latest.weight)}</span>
                <span className="weight-unit">{Store.unitLabel()}</span>
              </div>
              {weekView && (
                <span className={"weight-diff tone-" + weekView.tone} dir="rtl">
                  {weekView.dir !== "flat" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ transform: weekView.dir === "up" ? "rotate(180deg)" : "none" }}><path d="M12 4v16M6 14l6 6 6-6" /></svg>}
                  <span>{weekView.text}</span>
                </span>
              )}
              {sparkG && (
                <svg className="spark" viewBox="0 0 84 26" width="84" height="26" role="img" aria-label="آخر أوزانك" dir="ltr">
                  <path d={sparkG.d} fill="none" stroke="var(--glow-blue)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx={sparkG.last[0]} cy={sparkG.last[1]} r="2.6" fill="var(--glow-blue)" />
                </svg>
              )}
            </>) : (
              <div className="empty-mini">
                <div className="empty-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 20h14M7 20V9l5-5 5 5v11M10 20v-5h4v5" /></svg></div>
                <div className="empty-t">لسه مسجلتش وزنك</div>
                <button type="button" className="btn btn-secondary empty-btn" onClick={() => setShowWeightSheet(true)}>سجّل أول وزن</button>
              </div>
            )}
          </div>
          <div className="weight-meta">
            <div className="weight-meta-row"><span>الدهون</span><span>{bodyFat ? <bdi dir="ltr">{bodyFat.value}%</bdi> : "—"}</span></div>
            <div className="weight-meta-row tap" {...press(handleGoalClick)} aria-label="غيّر الوزن المستهدف">
              <span>الهدف</span><span>{goal != null ? Store.formatWeight(goal) : "—"}</span>
            </div>
          </div>
        </div>

        <div className="side-actions">
          <Link to="/exercises" className="glass qa-tile" style={{ textDecoration: "none" }}>
            <div className="qa-tile-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7v10M18 7v10M2 10v4M22 10v4M6 12h12" /></svg>
            </div>
            <span>تسجيل تمرين</span>
          </Link>
          <div className="glass qa-tile" style={{ cursor: "pointer" }} {...press(() => setShowWeightSheet(true))}>
            <div className="qa-tile-icon" style={{ background: "rgba(255, 148, 87, 0.14)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text-soft)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" /><path d="M12 8v4l3 2" /></svg>
            </div>
            <span>تسجيل وزن</span>
          </div>
        </div>
      </div>

      <WaterCard />

      <div className="home-body">
      <div className="section-title">
        <h2>مؤشرات الجسم</h2>
        <Link to="/measurements">
          المقاسات
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link>
      </div>
      <div className="inbody-grid">
        <div className="glass inbody-card">
          {bodyFat ? (<>
            <span className="inbody-val"><bdi dir="ltr">{bodyFat.value}<small>%</small></bdi></span>
            <div className="inbody-name">دهون الجسم</div>
            <div className="inbody-sub">{`آخر قياس ${relDayAr(bodyFat.date, today)}`}</div>
          </>) : (<>
            <div className="inbody-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M12 3c3 4 5 6.500 5 9.500a5 5 0 0 1-10 0C7 9.500 9 7 12 3Z" /></svg></div>
            <div className="inbody-name">دهون الجسم</div>
            <button type="button" className="inbody-btn" onClick={() => setShowWeightSheet(true)}>سجّلها</button>
          </>)}
        </div>
        <div className="glass inbody-card">
          {!monthView ? (<>
            <div className="inbody-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17l5-5 4 4 7-8" /></svg></div>
            <div className="inbody-name">تغيّر الوزن</div>
            <button type="button" className="inbody-btn" onClick={() => setShowWeightSheet(true)}>سجّل وزنين</button>
          </>) : (<>
          <span className="inbody-val" style={{ color: toneColor(monthView.tone) }} dir="ltr">
            {monthView && monthView.dir !== "flat" && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ transform: monthView.dir === "up" ? "rotate(180deg)" : "none" }}><path d="M12 4v16M6 14l6 6 6-6" /></svg>
            )}
            {monthView ? <>{monthView.diff > 0 ? "+" : ""}{monthView.diff}<small>{unit}</small></> : "—"}
          </span>
          <div className="inbody-name">{monthView.label === "الشهر" ? "تغيّر الشهر" : `تغيّر ${monthView.label}`}</div>
          </>)}
        </div>
        <div className="glass inbody-card tap" {...press(handleBMIClick)} aria-label="BMI، دوس لتحديد طولك">
          {bmi != null ? (<>
            <span className="inbody-val">{bmi}</span>
            <div className="inbody-name">BMI</div>
            <div className="inbody-sub">{`${bmiCat} · ${Store.getProfile().heightCm} سم`}</div>
          </>) : (<>
            <div className="inbody-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" /></svg></div>
            <div className="inbody-name">BMI</div>
            <span className="inbody-btn">حدد طولك</span>
          </>)}
        </div>
      </div>
      </div>

      {todayList.length > 0 && (
        <div className="home-plan">
          <div className="section-title"><h2>تمارين النهارده</h2></div>
          <div className="glass" style={{ padding: "4px 14px", marginBottom: 12 }}>
            {todayList.map(({ ex, done }) => (
              <div className="today-row" key={ex.id}>
                <Link to={`/exercise/${encodeURIComponent(ex.id)}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}>
                  <span className={"today-check" + (done ? " done pop" : "")} aria-label={done ? "اتسجل" : "لسه"}>
                    {done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="plan-name">{ex.name}</div>
                    <div className="plan-sub">{ex.muscleLabel} · <bdi dir="ltr">{ex.sets}×{ex.reps}</bdi> {unitLabel(ex)}</div>
                  </div>
                </Link>
                <button type="button" className="today-x" aria-label={`شيل ${ex.name} من تمارين النهارده`} onClick={() => { Store.toggleTodayPlan(ex.id); refresh(); }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="home-last">
      <div className="section-title">
        <h2>آخر تمرين مسجّل</h2>
        <Link to="/exercises">
          عرض الكل
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link>
      </div>
      <div className="glass" style={{ padding: "6px 14px" }}>
        {!recent.length ? (
          <div className="empty-mini wide">
            <div className="empty-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 7v10M18 7v10M2 10v4M22 10v4M6 12h12" /></svg></div>
            <div className="empty-t">لسه ما سجلتش أي تمرين</div>
            <Link to="/exercises" className="btn btn-secondary empty-btn">سجّل أول تمرين</Link>
          </div>
        ) : (
          recent.map((r, i) => (
            <div className="plan-row" key={i}>
              <div className="plan-info">
                <div className="plan-icon-chip" style={{ background: "rgba(var(--ink), 0.055)", border: "1px solid var(--border-soft)" }}>
                  <span className={`muscle-dot ${r.muscle}`} />
                </div>
                <div>
                  <div className="plan-name">{r.name}</div>
                  <div className="plan-sub">{relDayAr(r.date, today)} · {r.muscleLabel} · <bdi dir="ltr">{r.sets}×{r.reps}</bdi> {logUnitText(r)}</div>
                </div>
              </div>
              <span className="plan-weight">{logLoadText(r, (w) => Store.formatWeight(w))}</span>
            </div>
          ))
        )}
      </div>
      </div>

      {showWeightSheet && (
        <WeightLogSheet
          initialWeight={latest ? Store.toDisplayWeight(latest.weight) : ""}
          lastBodyFat={bodyFat ? bodyFat.value : null}
          unitLabel={Store.unitLabel()}
          onClose={() => setShowWeightSheet(false)}
          onSave={handleWeightSave}
        />
      )}
    </div>
  );
}
