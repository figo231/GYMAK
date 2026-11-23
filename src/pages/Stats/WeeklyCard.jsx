import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { lastDays } from "../../lib/water/water";
import { buildWeekly, headline, weeklyCardData } from "../../lib/stats/weekly";
import ShareCardSheet from "../Profile/ShareCardSheet";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { fmtLoggedWeight } from "../../lib/stats/format";
import { tx } from "../../lib/i18n/tx";

export default function WeeklyCard() {
  const [version] = useStoreVersion();
  const [card, setCard] = useState(null);
  const w = useMemo(() => buildWeekly(Store, lastDays(7)), [version]);
  const conv = (x) => Store.toDisplayWeight(x);
  const unit = Store.unitLabel();
  const delta = w.daysDelta === 0 ? "" : (w.daysDelta > 0 ? "▲ " : "▼ ") + Math.abs(w.daysDelta);
  return (
    <div className="glass weekly-card" data-testid="weekly-card">
      <div className="weekly-title">{tx("ملخص أسبوعك")}</div>
      <div className="weekly-head">{headline(w)}</div>
      <div className="weekly-grid">
        <div><b dir="ltr">{w.days}</b><span>{tx("أيام تمرين")} {delta && <bdi dir="ltr">({delta})</bdi>}</span></div>
        <div><b dir="ltr">{w.sets}</b><span>{tx("مجموعة")}</span></div>
        <div><b dir="ltr">{fmtLoggedWeight(w.peakWeight == null ? null : conv(w.peakWeight), unit)}</b><span>{tx("أعلى وزن شلته في مجموعة")}</span></div>
      </div>
      <p className="weekly-volume-note">{tx("أعلى وزن سجلته في مجموعة واحدة الأسبوع ده، من غير ضربه في التكرارات أو عدد المجموعات. مش وزن جسمك، وتمارين الثواني مش محسوبة.")}</p>
      {w.foodDays != null && <div className="weekly-water">{tx("🍎 التزام بالأكل")} {w.foodDays} {tx("من 7 أيام")}</div>}
      {w.weightDiff != null && <div className="weekly-water">{tx("⚖️ الوزن")} {w.weightDiff > 0 ? tx("زاد") : tx("نزل")} <bdi dir="ltr">{Math.abs(conv(w.weightDiff)).toFixed(1)}</bdi> {unit} {tx("الأسبوع ده")}</div>}
      {w.waterAvg > 0 && <div className="weekly-water">{tx("متوسط المياه")} {Math.round(w.waterAvg / 100) / 10} {tx("لتر/يوم · هدفك اتحقق")} {w.waterGoalDays} {tx("من 7 أيام")}</div>}
      {w.empty && <Link to="/" className="btn" style={{ marginTop: 10, display: "block", textAlign: "center" }}>{tx("شوف خطة النهارده")}</Link>}
      {!w.empty && (
        <button type="button" className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => setCard(weeklyCardData(w, unit, conv))}>{tx("شارك أسبوعك")}</button>
      )}
      {card && <ShareCardSheet data={card} name={Store.getProfile().name} onClose={() => setCard(null)} />}
    </div>
  );
}
