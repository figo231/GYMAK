import { useMemo, useState } from "react";
import Store from "../../lib/store/gymakStore";
import { fmt } from "../../lib/format";
import WeightChart from "./WeightChart";

const PERIODS = [
  { days: 7, label: "أسبوع" },
  { days: 30, label: "شهر" },
  { days: 90, label: "3 شهور" },
  { days: 365, label: "سنة" },
];

const STRENGTH_COLORS = ["#FF7A3D,#FFC9A3", "#22C55E,#86EFAC", "#FFA35E,#FFE0C7", "#F59E0B,#FDE68A", "#EC4899,#FBCFE8"];

export default function Stats() {
  const [periodDays, setPeriodDays] = useState(30);

  const history = useMemo(() => Store.getWeightHistory(12), []);
  const strengthRows = useMemo(() => Store.getStrengthProgress(5), []);
  const prs = useMemo(() => Store.getRecentPRs(5), []);

  const summary = useMemo(() => {
    const days = Store.getWorkoutDaysInRange(periodDays);
    const sets = Store.getSetsInRange(periodDays);
    const cutoff = new Date(Date.now() - periodDays * 86400000).toISOString().slice(0, 10);
    const prCount = Store.getRecentPRs(1000).filter((p) => p.date >= cutoff).length;
    const diffInfo = Store.getWeightDiffOverDays(periodDays);
    const diffDisp = diffInfo ? +(Store.toDisplayWeight(diffInfo.to) - Store.toDisplayWeight(diffInfo.from)).toFixed(1) : null;
    const tonnage = fmt(Math.round(Store.toDisplayWeight(Store.getTonnage(periodDays)))) + " " + Store.unitLabel();
    return { days, sets, prCount, diffDisp, tonnage };
  }, [periodDays]);

  const maxPct = strengthRows.length ? Math.max(...strengthRows.map((r) => Math.abs(r.pct)), 1) : 1;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">الإحصائيات</h1>
        <div className="page-count">تقدمك خلال آخر 3 أشهر</div>
      </div>

      <div className="period-tabs">
        {PERIODS.map((p) => (
          <div
            key={p.days}
            className={"p-tab" + (periodDays === p.days ? " active" : "")}
            onClick={() => setPeriodDays(p.days)}
            style={{ cursor: "pointer" }}
          >
            {p.label}
          </div>
        ))}
      </div>

      <div className="summary-grid">
        <div className="glass sum-card">
          <div className="sum-val">{summary.sets}</div>
          <div className="sum-label">مجموعة منجزة</div>
        </div>
        <div className="glass sum-card">
          <div className="sum-val">{summary.days}</div>
          <div className="sum-label">يوم تمرين</div>
        </div>
        <div className="glass sum-card">
          <div className="sum-val">{summary.diffDisp != null ? (summary.diffDisp > 0 ? "+" : "") + summary.diffDisp.toFixed(1) : "—"}</div>
          <div className="sum-label">{Store.unitLabel()} هذه الفترة</div>
        </div>
        <div className="glass sum-card">
          <div className="sum-val">{summary.prCount}</div>
          <div className="sum-label">أرقام قياسية</div>
        </div>
      </div>

      <div className="section-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 4px 12px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>تطور الوزن</h2>
        <span className="sub" style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>آخر القياسات المسجّلة</span>
      </div>
      <WeightChart history={history} />

      <div className="section-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 4px 12px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>تطور القوة</h2>
        <span className="sub" style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>أول تسجيل مقابل آخر تسجيل</span>
      </div>
      <div className="glass chart-card" style={{ padding: "16px 14px" }}>
        {!strengthRows.length ? (
          <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", margin: "6px 0" }}>
            سجّل نفس التمرين مرتين على الأقل عشان نقدر نتابع تطورك فيه.
          </p>
        ) : (
          strengthRows.map((r, i) => {
            const width = Math.min(100, Math.max(6, (Math.abs(r.pct) / maxPct) * 100));
            return (
              <div className="strength-row" key={i}>
                <div className="strength-head">
                  <b>{r.name}</b>
                  <span>{fmt(Store.toDisplayWeight(r.from))} ← {fmt(Store.toDisplayWeight(r.to))} {Store.unitLabel()} ({r.pct > 0 ? "+" : ""}{r.pct}%)</span>
                </div>
                <div className="strength-track">
                  <div className="strength-fill" style={{ width: `${width}%`, background: `linear-gradient(90deg,${STRENGTH_COLORS[i % STRENGTH_COLORS.length]})` }} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="section-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 4px 12px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>أرقام قياسية جديدة (PRs)</h2>
      </div>
      {!prs.length ? (
        <div className="glass" style={{ padding: 16, textAlign: "center", color: "var(--text-dim)", fontSize: 12.5 }}>
          لسه مفيش أرقام قياسية. أول ما ترفع وزن أعلى من قبل في أي تمرين هيتسجل هنا تلقائيًا.
        </div>
      ) : (
        prs.map((pr, i) => (
          <div className="glass pr-card" key={i}>
            <div className="pr-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h2a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3M7 5H5a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3" /></svg>
            </div>
            <div className="pr-info">
              <p className="pr-name">{pr.exerciseName}</p>
              <p className="pr-date">{pr.date}</p>
            </div>
            <div className="pr-value">
              <div className="pr-num">{Store.formatWeight(pr.weight)}</div>
              <div className="pr-old">{Store.formatWeight(pr.prevWeight)}</div>
            </div>
          </div>
        ))
      )}

      <div className="section-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 4px 12px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>ملخص الفترة</h2>
      </div>
      <div className="glass" style={{ padding: "4px 14px" }}>
        <div className="mini-row">
          <div className="mini-left">
            <div className="mini-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FFC9A3" strokeWidth="1.8" strokeLinecap="round"><path d="M6 7v10M18 7v10M2 10v4M22 10v4M6 12h12" /></svg></div>
            <div>
              <div className="mini-name">إجمالي الأوزان المرفوعة</div>
              <div className="mini-sub">في الفترة المختارة</div>
            </div>
          </div>
          <div className="mini-val">{summary.tonnage}</div>
        </div>
        <div className="mini-row">
          <div className="mini-left">
            <div className="mini-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#86EFAC" strokeWidth="1.8" strokeLinecap="round"><path d="M4 19V5M10 19v-8M16 19V9M22 19V3" /></svg></div>
            <div>
              <div className="mini-name">أيام تمرين</div>
              <div className="mini-sub">في الفترة المختارة</div>
            </div>
          </div>
          <div className="mini-val">{summary.days}</div>
        </div>
        <div className="mini-row">
          <div className="mini-left">
            <div className="mini-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FDBA74" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2c1 3-2 4.2-2 7 0 1.7 1.3 3 3 3s3-1.3 3-3c1.5 1.5 2.5 3.6 2.5 5.8 0 3.6-2.9 6.7-6.5 6.7S5.5 19.4 5.5 15.8c0-2.6 1.2-4.4 2.4-6.1C9.2 7.7 10 5.3 12 2Z" /></svg></div>
            <div>
              <div className="mini-name">أطول ستريك</div>
              <div className="mini-sub">أيام متتالية</div>
            </div>
          </div>
          <div className="mini-val">{Store.getBestStreak()} يوم</div>
        </div>
      </div>
    </>
  );
}
