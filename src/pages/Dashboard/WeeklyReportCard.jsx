import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { buildWeekly } from "../../lib/stats/weekly";
import { weekStart } from "../../lib/challenges";
import { localISO } from "../../lib/dateKey";

const KEY = "gymak_weekly_report_v1";

// Friday weekly report: one compact card on the Dashboard every Friday
// (Egypt's week wraps up) with workouts, food adherence and weight change.
// Dismissible for the week; the full card lives on the Stats page.
export default function WeeklyReportCard() {
  const today = localISO();
  const isFriday = new Date(today + "T00:00:00").getDay() === 5;
  const week = weekStart(today);
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(KEY) === week; } catch { return false; } });
  const w = useMemo(() => (isFriday && !dismissed ? buildWeekly(Store, []) : null), [isFriday, dismissed]);
  if (!w || w.empty) return null;
  const conv = (x) => Store.toDisplayWeight(x);
  const unit = Store.unitLabel();
  return (
    <div className="glass tip-card" data-testid="weekly-report" style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>📋 تقرير أسبوعك</div>
        <button type="button" className="hist-btn" aria-label="إخفاء تقرير الأسبوع" onClick={() => { try { localStorage.setItem(KEY, week); } catch { /* private mode */ } setDismissed(true); }}>✕</button>
      </div>
      <div style={{ fontSize: 13, lineHeight: 2 }}>
        🏋️ تمرنت <b>{w.days}</b> {w.days === 1 ? "يوم" : "أيام"}
        {w.foodDays != null && <> · 🍎 التزام بالأكل <b>{w.foodDays}/7</b></>}
        {w.weightDiff != null && <> · ⚖️ الوزن {w.weightDiff > 0 ? "زاد" : "نزل"} <bdi dir="ltr"><b>{Math.abs(conv(w.weightDiff)).toFixed(1)}</b></bdi> {unit}</>}
      </div>
      <Link to="/stats" className="btn btn-secondary" style={{ display: "block", textAlign: "center", marginTop: 8 }}>التفاصيل والمشاركة</Link>
    </div>
  );
}
