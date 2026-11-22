import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { fmt } from "../../lib/format";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { localISO, shiftISO } from "../../lib/dateKey";
import { PERIODS, arDate, capPct, fmtVolume, signed, weightTone } from "../../lib/stats/format";
import WeightChart from "./WeightChart";
import WeeklyCard from "./WeeklyCard";

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
  const period = PERIODS.find((p) => p.days === periodDays) || PERIODS[1];
  const unit = Store.unitLabel();

  const hasAnyData = useMemo(() => Store.getTotalWorkoutDays() > 0 || Store.getWeightHistory(1).length > 0, [version]);
  const goal = Store.getGoalWeight();
  const history = useMemo(() => Store.getWeightHistoryInRange(periodDays), [periodDays, version]);
  const strengthRows = useMemo(() => Store.getStrengthProgress(5), [version]);
  const prs = useMemo(() => Store.getRecentPRs(5), [version]);
  const muscles = useMemo(() => Store.getMuscleSetsInRange(periodDays).slice(0, 6), [periodDays, version]);
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
    const tonnage = fmtVolume(Store.toDisplayWeight(Store.getTonnage(periodDays)), unit);
    return { days, sets, prCount, diffDisp, tone, tonnage };
  }, [periodDays, version, goal, unit]);

  const maxPct = strengthRows.length ? Math.max(...strengthRows.map((r) => Math.abs(r.pct)), 1) : 1;
  const maxMuscle = muscles.length ? muscles[0].sets : 1;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">الإحصائيات</h1>
        <div className="page-count">تقدمك خلال {period.long}</div>
      </div>

      {!hasAnyData ? (
        <div className="glass stats-empty">
          <p>لسه مفيش بيانات. سجّل أول تمرين وأول وزن وهتشوف تقدمك هنا.</p>
          <div className="row">
            <Link to="/exercises" className="btn">سجّل تمرين</Link>
            <Link to="/" className="btn">سجّل وزنك</Link>
          </div>
        </div>
      ) : (
        <>
          <WeeklyCard />

          <div className="period-tabs" role="group" aria-label="الفترة الزمنية">
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

          <div className="summary-grid">
            <div className="glass sum-card" role="group" aria-label="المجموعات المنجزة">
              <div className="sum-icon" style={{ background: "rgba(var(--acc-rgb), 0.14)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="1.8" strokeLinecap="round"><path d="M6 7v10M18 7v10M2 10v4M22 10v4M6 12h12" /></svg>
              </div>
              <div className="sum-val num">{summary.sets}</div>
              <div className="sum-label">مجموعة منجزة</div>
            </div>
            <div className="glass sum-card" role="group" aria-label="أيام التمرين">
              <div className="sum-icon" style={{ background: "rgba(34, 197, 94, 0.14)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.8" strokeLinecap="round"><path d="M4 19V5M10 19v-8M16 19V9M22 19V3" /></svg>
              </div>
              <div className="sum-val num">{summary.days}</div>
              <div className="sum-label">يوم تمرين</div>
            </div>
            <div className="glass sum-card" role="group" aria-label="تغيّر الوزن">
              <div className="sum-icon" style={{ background: TONE_BG[summary.tone] }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TONE_COLOR[summary.tone]} strokeWidth="2.2" strokeLinecap="round" style={{ transform: summary.diffDisp > 0 ? "rotate(180deg)" : "none" }}><path d="M12 4v16M6 14l6 6 6-6" /></svg>
              </div>
              <div className="sum-val num">{summary.diffDisp != null ? signed(summary.diffDisp) : "—"}</div>
              <div className="sum-label">تغيّر الوزن ({unit})</div>
            </div>
            <div className="glass sum-card" role="group" aria-label="الأرقام القياسية">
              <div className="sum-icon" style={{ background: "rgba(251, 191, 36, 0.16)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warn-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /></svg>
              </div>
              <div className="sum-val num">{summary.prCount}</div>
              <div className="sum-label">رقم قياسي جديد</div>
            </div>
          </div>

          <SectionTitle title="تطور الوزن" sub={period.long} />
          <WeightChart history={history} goal={goal} periodLabel={period.long} />

          <SectionTitle title="تطور القوة" sub="أفضل وزن: أول مرة مقابل دلوقتي" />
          <div className="glass chart-card" style={{ padding: "16px 14px" }}>
            {!strengthRows.length ? (
              <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", margin: "6px 0", lineHeight: 1.7 }}>
                سجّل نفس التمرين في يومين بينهم أسبوع على الأقل عشان نقدر نتابع تطورك فيه.
              </p>
            ) : (
              strengthRows.map((r, i) => {
                const width = Math.min(100, Math.max(6, (Math.abs(r.pct) / maxPct) * 100));
                return (
                  <div className="strength-row" key={r.exerciseId}>
                    <div className="strength-head">
                      <b>{r.name}</b>
                      <div className="strength-nums">
                        <span>من <bdi>{fmt(Store.toDisplayWeight(r.from))}</bdi> إلى <bdi>{fmt(Store.toDisplayWeight(r.to))}</bdi> {unit}</span>
                        <span className={"pct-badge " + (r.pct >= 0 ? "pos" : "neg")} dir="ltr">{capPct(r.pct)}</span>
                      </div>
                    </div>
                    <div className="strength-track">
                      <div className="strength-fill" style={{ width: `${width}%`, background: `linear-gradient(90deg,${STRENGTH_COLORS[i % STRENGTH_COLORS.length]})` }} />
                    </div>
                    <div className="strength-sub">تقدير أقصى وزن لمرة واحدة: <bdi>{fmt(Store.toDisplayWeight(r.e1rm))}</bdi> {unit}</div>
                  </div>
                );
              })
            )}
          </div>

          <SectionTitle title="أرقام قياسية جديدة (PRs)" />
          {!prs.length ? (
            <div className="glass" style={{ padding: 16, textAlign: "center", color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.7 }}>
              لسه مفيش أرقام قياسية. أول ما ترفع وزن أعلى من قبل في أي تمرين هيتسجل هنا تلقائيًا.
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
                  {pr.prevWeight > 0 && <div className="pr-old-label">كان <span className="pr-old">{Store.formatWeight(pr.prevWeight)}</span></div>}
                </div>
              </div>
            ))
          )}

          <SectionTitle title="توزيع المجموعات على العضلات" sub={period.long} />
          <div className="glass chart-card" style={{ padding: "16px 14px" }}>
            {!muscles.length ? (
              <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", margin: "6px 0" }}>مفيش تمارين متسجلة في الفترة دي.</p>
            ) : muscles.map((m) => (
              <div className="muscle-row" key={m.label}>
                <span className="m-name">{m.label}</span>
                <div className="m-track"><div className="m-fill" style={{ width: `${Math.max(6, (m.sets / maxMuscle) * 100)}%` }} /></div>
                <span className="m-val">{m.sets}</span>
              </div>
            ))}
          </div>

          <SectionTitle title="أيام التمرين" sub="آخر 28 يوم" />
          <div className="glass" style={{ padding: 14 }}>
            <div className="heat-grid" role="img" aria-label={`تمرنت ${heat.filter((h) => h.on).length} يوم من آخر 28 يوم`}>
              {heat.map((h) => (
                <div key={h.date} className={"heat-cell" + (h.on ? " on" : "") + (h.today ? " today" : "")}>{+h.date.slice(8)}</div>
              ))}
            </div>
          </div>

          <SectionTitle title="ملخص الفترة" sub={period.long} />
          <div className="glass" style={{ padding: "4px 14px" }}>
            <div className="mini-row">
              <div className="mini-left">
                <div className="mini-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="1.8" strokeLinecap="round"><path d="M6 7v10M18 7v10M2 10v4M22 10v4M6 12h12" /></svg></div>
                <div>
                  <div className="mini-name">إجمالي الأوزان المرفوعة</div>
                  <div className="mini-sub">من غير تمارين الثواني</div>
                </div>
              </div>
              <div className="mini-val" dir="ltr">{summary.tonnage}</div>
            </div>
            <div className="mini-row">
              <div className="mini-left">
                <div className="mini-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text-soft)" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2c1 3-2 4.2-2 7 0 1.7 1.3 3 3 3s3-1.3 3-3c1.5 1.5 2.5 3.6 2.5 5.8 0 3.6-2.9 6.7-6.5 6.7S5.5 19.4 5.5 15.8c0-2.6 1.2-4.4 2.4-6.1C9.2 7.7 10 5.3 12 2Z" /></svg></div>
                <div>
                  <div className="mini-name">أطول ستريك</div>
                  <div className="mini-sub">أيام متتالية على الإطلاق</div>
                </div>
              </div>
              <div className="mini-val">{Store.getBestStreak()} يوم</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
