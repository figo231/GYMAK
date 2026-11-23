import SectionNav from "../../components/layout/SectionNav";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { fmt } from "../../lib/format";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { localISO, shiftISO } from "../../lib/dateKey";
import { PERIODS, arDate, capPct, fmtLoggedWeight, signed, weightTone } from "../../lib/stats/format";
import WeightChart from "./WeightChart";
import GoalCard, { goalTrajectory } from "./GoalCard";
import MuscleHeatmap from "./MuscleHeatmap";
import WeeklyCard from "./WeeklyCard";
import TrendChart from "./TrendChart";
import { loadMeasures, FIELDS } from "../../lib/measure/measure";
import { windowStart } from "../../lib/dateKey";
import { tx, txf } from "../../lib/i18n/tx";

const STRENGTH_COLORS = ["#C9A24B,#F1DFA8", "#22C55E,#86EFAC", "#A67C2E,#E6C877", "#F59E0B,#FDE68A", "#EC4899,#FBCFE8"];
const TONE_COLOR = { good: "var(--success)", bad: "var(--danger)", neutral: "var(--text-dim)" };
const TONE_BG = { good: "rgba(34, 197, 94, 0.14)", bad: "rgba(244, 63, 94, 0.14)", neutral: "rgba(var(--ink), 0.07)" };

function SectionTitle({ title, sub }) {
  return (
    <div className="section-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 4px 12px" }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{title}</h2>
      {sub && <span className="sub" style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>{sub}</span>}
    </div>
  );
}

export default function Stats() {
  const [version] = useStoreVersion();
  const [periodDays, setPeriodDays] = useState(30);
  const [mField, setMField] = useState(null);
  const [view, setView] = useState("overview");
  const period = PERIODS.find((p) => p.days === periodDays) || PERIODS[1];
  const unit = Store.unitLabel();

  const hasAnyData = useMemo(() => Store.getTotalWorkoutDays() > 0 || Store.getWeightHistory(1).length > 0, [version]);
  const goal = Store.getGoalWeight();
  const history = useMemo(() => Store.getWeightHistoryInRange(periodDays), [periodDays, version]);
  const strengthRows = useMemo(() => Store.getStrengthProgress(5), [version]);
  const prs = useMemo(() => Store.getRecentPRs(5), [version]);
  const muscles = useMemo(() => Store.getMuscleSetsInRange(periodDays).slice(0, 6), [periodDays, version]);
  const muscleKeys = useMemo(() => Store.getMuscleKeySetsInRange(periodDays), [periodDays, version]);
  const prevMuscles = useMemo(() => new Map(Store.getMuscleSetsInRange(periodDays, periodDays).map((m) => [m.label, m.sets])), [periodDays, version]);
  const bodyFat = useMemo(() => {
    const from = windowStart(localISO(), periodDays);
    const rows = Store.getWeightHistoryInRange(periodDays).filter((w) => w.bodyFat != null && w.date >= from);
    // addWeight carries the last body-fat forward, so keep only real changes plus the ends
    return rows.filter((w, i) => i === 0 || i === rows.length - 1 || w.bodyFat !== rows[i - 1].bodyFat).map((w) => ({ date: w.date, value: w.bodyFat }));
  }, [periodDays, version]);
  const measures = useMemo(() => loadMeasures(), [version]);
  const measureFields = FIELDS.filter(([k]) => measures.filter((e) => typeof e[k] === "number").length >= 1);
  const activeField = measureFields.find(([k]) => k === mField) ? mField : measureFields[0]?.[0];
  const measurePts = useMemo(() => {
    if (!activeField) return [];
    const from = windowStart(localISO(), periodDays);
    return measures.filter((e) => typeof e[activeField] === "number" && e.date >= from).map((e) => ({ date: e.date, value: e[activeField] }));
  }, [measures, activeField, periodDays]);
  const heat = useMemo(() => {
    const today = localISO();
    const done = new Set(Store.getLast28DaysDone());
    return Array.from({ length: 28 }, (_, i) => {
      const date = shiftISO(today, i - 27);
      return { date, on: done.has(date), today: date === today };
    });
  }, [version]);

  const summary = useMemo(() => {
    const days = Store.getWorkoutDaysInRange(periodDays);
    const sets = Store.getSetsInRange(periodDays);
    const prCount = Store.getPRCountInRange(periodDays);
    const diffInfo = Store.getWeightDiffOverDays(periodDays);
    const diffDisp = diffInfo ? +(Store.toDisplayWeight(diffInfo.to) - Store.toDisplayWeight(diffInfo.from)).toFixed(1) : null;
    const tone = diffInfo ? weightTone(diffDisp, diffInfo.from, goal) : "neutral";
    const peak = Store.getPeakWeight(periodDays);
    const peakWeight = fmtLoggedWeight(peak == null ? null : Store.toDisplayWeight(peak), unit);
    return { days, sets, prCount, diffDisp, tone, peakWeight };
  }, [periodDays, version, goal, unit]);

  const maxPct = strengthRows.length ? Math.max(...strengthRows.map((r) => Math.abs(r.pct)), 1) : 1;
  const maxMuscle = muscles.length ? muscles[0].sets : 1;

  return (
    <>
      <SectionNav group="progress" />
      <div className="page-head">
        <h1 className="page-title">{tx("الإحصائيات")}</h1>
        <div className="page-count">{tx("تقدمك خلال")} {period.long}</div>
      </div>

      {!hasAnyData ? (
        <div className="glass stats-empty">
          <p>{tx("لسه مفيش بيانات. سجّل أول تمرين وأول وزن وهتشوف تقدمك هنا.")}</p>
          <div className="row">
            <Link to="/exercises" className="btn">{tx("سجّل تمرين")}</Link>
            <Link to="/" className="btn">{tx("سجّل وزنك")}</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="period-tabs" role="group" aria-label={tx("الفترة الزمنية")}>
            {PERIODS.map((p) => (
              <button
                type="button"
                key={p.days}
                className={"p-tab" + (periodDays === p.days ? " active" : "")}
                aria-pressed={periodDays === p.days}
                onClick={() => setPeriodDays(p.days)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="xd-tabs sx-tabs" role="tablist" aria-label={tx("عرض الإحصائيات")}>
            {[["overview", tx("نظرة عامة")], ["body", tx("الجسم")], ["strength", tx("القوة")]].map(([id, l]) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} className={"xd-tab" + (view === id ? " on" : "")} onClick={() => setView(id)}>{l}</button>
            ))}
          </div>

          {view === "overview" && (<>
          <div className="sx-hero" data-testid="stats-hero">
            <div className="sx-hero-main">
              <span className="sx-hero-cap">{tx("تغيّر الوزن ·")} {period.long}</span>
              <b className="sx-hero-num" dir="ltr">{summary.diffDisp != null ? signed(summary.diffDisp) : "—"}<small>{unit}</small></b>
            </div>
            <div className="sx-hero-row">
              <div><b>{summary.days}</b><span>{tx("يوم تمرين")}</span></div>
              <div><b>{summary.sets}</b><span>{tx("مجموعة")}</span></div>
              <div><b>{summary.prCount}</b><span>{tx("رقم قياسي")}</span></div>
            </div>
          </div>

          <WeeklyCard />

          <SectionTitle title={tx("أيام التمرين")} sub={tx("آخر 28 يوم")} />
          <div className="glass" style={{ padding: 14 }}>
            <div className="heat-grid" role="img" aria-label={txf(`تمرنت {0} يوم من آخر 28 يوم`, [heat.filter((h) => h.on).length])}>
              {heat.map((h) => (
                <div key={h.date} className={"heat-cell" + (h.on ? " on" : "") + (h.today ? " today" : "")}>{+h.date.slice(8)}</div>
              ))}
            </div>
          </div>

          <SectionTitle title={tx("ملخص الفترة")} sub={period.long} />
          <div className="glass" style={{ padding: "4px 14px" }}>
            <div className="mini-row">
              <div className="mini-left">
                <div className="mini-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="1.8" strokeLinecap="round"><path d="M6 7v10M18 7v10M2 10v4M22 10v4M6 12h12" /></svg></div>
                <div>
                  <div className="mini-name">{tx("أعلى وزن شلته في مجموعة")}</div>
                  <div className="mini-sub">{tx("أعلى وزن مسجل في الفترة، مش مجموع الأوزان أو وزن جسمك")}</div>
                </div>
              </div>
              <div className="mini-val" dir="ltr">{summary.peakWeight}</div>
            </div>
            <div className="mini-row">
              <div className="mini-left">
                <div className="mini-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text-soft)" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2c1 3-2 4.2-2 7 0 1.7 1.3 3 3 3s3-1.3 3-3c1.5 1.5 2.5 3.6 2.5 5.8 0 3.6-2.9 6.7-6.5 6.7S5.5 19.4 5.5 15.8c0-2.6 1.2-4.4 2.4-6.1C9.2 7.7 10 5.3 12 2Z" /></svg></div>
                <div>
                  <div className="mini-name">{tx("أطول ستريك")}</div>
                  <div className="mini-sub">{tx("أيام متتالية على الإطلاق")}</div>
                </div>
              </div>
              <div className="mini-val">{Store.getBestStreak()} {tx("يوم")}</div>
            </div>
          </div>
          </>)}
          {view === "body" && (<>
          <SectionTitle title={tx("تطور الوزن")} sub={period.long} />
          <GoalCard history={history} />
          <WeightChart history={history} goal={goal} goalTo={goalTrajectory(history, goal, Store.getGoalDeadline())?.to ?? null} periodLabel={period.long} />

          {measureFields.length > 0 && (
            <>
              <SectionTitle title={tx("قياسات الجسم")} sub={period.long} />
              <div className="glass chart-card" style={{ padding: "14px" }}>
                <div className="chip-row" role="group" aria-label={tx("القياس")}>
                  {measureFields.map(([k, l]) => (
                    <button type="button" key={k} className={"m-chip" + (k === activeField ? " on" : "")} aria-pressed={k === activeField} onClick={() => setMField(k)}>{l}</button>
                  ))}
                </div>
                <TrendChart points={measurePts} unit={tx("سم")} label={FIELDS.find(([k]) => k === activeField)?.[1]} />
              </div>
            </>
          )}

          {bodyFat.length > 0 && (
            <>
              <SectionTitle title={tx("نسبة الدهون")} sub={period.long} />
              <div className="glass chart-card" style={{ padding: "14px" }}>
                <TrendChart points={bodyFat} unit="%" label={tx("نسبة الدهون")} />
              </div>
            </>
          )}

          </>)}
          {view === "strength" && (<>
          <SectionTitle title={tx("تطور القوة")} sub={tx("أفضل وزن: أول مرة مقابل دلوقتي")} />
          <div className="glass chart-card" style={{ padding: "16px 14px" }}>
            {!strengthRows.length ? (
              <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", margin: "6px 0", lineHeight: 1.7 }}>
                {tx("سجّل نفس التمرين في يومين بينهم أسبوع على الأقل عشان نقدر نتابع تطورك فيه.")}
              </p>
            ) : (
              strengthRows.map((r, i) => {
                const width = Math.min(100, Math.max(6, (Math.abs(r.pct) / maxPct) * 100));
                return (
                  <div className="strength-row" key={r.exerciseId}>
                    <div className="strength-head">
                      <b>{r.name}</b>
                      <div className="strength-nums">
                        <span>{txf("من {0} إلى {1}", [fmt(Store.toDisplayWeight(r.from)), fmt(Store.toDisplayWeight(r.to))])} {unit}</span>
                        <span className={"pct-badge " + (r.pct >= 0 ? "pos" : "neg")} dir="ltr">{capPct(r.pct)}</span>
                      </div>
                    </div>
                    <div className="strength-track">
                      <div className="strength-fill" style={{ width: `${width}%`, background: `linear-gradient(90deg,${STRENGTH_COLORS[i % STRENGTH_COLORS.length]})` }} />
                    </div>
                    <div className="strength-sub">{tx("تقدير أقصى وزن لمرة واحدة:")} <bdi>{fmt(Store.toDisplayWeight(r.e1rm))}</bdi> {unit}</div>
                  </div>
                );
              })
            )}
          </div>

          <SectionTitle title={tx("أرقام قياسية جديدة (PRs)")} />
          {!prs.length ? (
            <div className="glass" style={{ padding: 16, textAlign: "center", color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.7 }}>
              {tx("لسه مفيش أرقام قياسية. أول ما ترفع وزن أعلى من قبل في أي تمرين هيتسجل هنا تلقائيًا.")}
            </div>
          ) : (
            prs.map((pr, i) => (
              <div className="glass pr-card" key={pr.exerciseId + pr.date + i}>
                <div className="pr-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warn-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h2a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3M7 5H5a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3" /></svg>
                </div>
                <div className="pr-info">
                  <p className="pr-name">{pr.exerciseName}</p>
                  <p className="pr-date">{arDate(pr.date)}</p>
                </div>
                <div className="pr-value">
                  <div className="pr-num">{Store.formatWeight(pr.weight)}</div>
                  {pr.prevWeight > 0 && <div className="pr-old-label">{tx("كان")} <span className="pr-old">{Store.formatWeight(pr.prevWeight)}</span></div>}
                </div>
              </div>
            ))
          )}

          <SectionTitle title={tx("خريطة العضلات")} sub={period.long} />
          <div className="glass chart-card" style={{ padding: "16px 14px" }}>
            <MuscleHeatmap sets={muscleKeys} />
          </div>

          <SectionTitle title={tx("توزيع المجموعات على العضلات")} sub={tx("مقارنة بالفترة اللي قبلها")} />
          <div className="glass chart-card" style={{ padding: "16px 14px" }}>
            {!muscles.length ? (
              <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", margin: "6px 0" }}>{tx("مفيش تمارين متسجلة في الفترة دي.")}</p>
            ) : muscles.map((m) => (
              <div className="muscle-row" key={m.label}>
                <span className="m-name">{m.label}</span>
                <div className="m-track"><div className="m-fill" style={{ width: `${Math.max(6, (m.sets / maxMuscle) * 100)}%` }} /></div>
                <span className="m-val">{m.sets}</span>
                <span className="m-delta" dir="ltr">{(() => { const d = m.sets - (prevMuscles.get(m.label) || 0); return d === 0 ? "=" : signed(d, 0); })()}</span>
              </div>
            ))}
          </div>

          </>)}
        </>
      )}
    </>
  );
}
