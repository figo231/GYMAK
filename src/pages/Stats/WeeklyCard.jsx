import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { lastDays } from "../../lib/water/water";
import { buildWeekly, headline, weeklyCardData } from "../../lib/stats/weekly";
import ShareCardSheet from "../Profile/ShareCardSheet";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { fmtLoggedWeight } from "../../lib/stats/format";

export default function WeeklyCard() {
  const [version] = useStoreVersion();
  const [card, setCard] = useState(null);
  const w = useMemo(() => buildWeekly(Store, lastDays(7)), [version]);
  const conv = (x) => Store.toDisplayWeight(x);
  const unit = Store.unitLabel();
  const delta = w.daysDelta === 0 ? "" : (w.daysDelta > 0 ? "▲ " : "▼ ") + Math.abs(w.daysDelta);
  return (
    <div className="glass weekly-card" data-testid="weekly-card">
      <div className="weekly-title">ملخص أسبوعك</div>
      <div className="weekly-head">{headline(w)}</div>
      <div className="weekly-grid">
        <div><b dir="ltr">{w.days}</b><span>أيام تمرين {delta && <bdi dir="ltr">({delta})</bdi>}</span></div>
        <div><b dir="ltr">{w.sets}</b><span>مجموعة</span></div>
        <div><b dir="ltr">{fmtLoggedWeight(w.peakWeight == null ? null : conv(w.peakWeight), unit)}</b><span>أعلى وزن شلته في مجموعة</span></div>
      </div>
      <p className="weekly-volume-note">أعلى وزن سجلته في مجموعة واحدة الأسبوع ده، من غير ضربه في التكرارات أو عدد المجموعات. مش وزن جسمك، وتمارين الثواني مش محسوبة.</p>
      {w.foodDays != null && <div className="weekly-water">🍎 التزام بالأكل {w.foodDays} من 7 أيام</div>}
      {w.weightDiff != null && <div className="weekly-water">⚖️ الوزن {w.weightDiff > 0 ? "زاد" : "نزل"} <bdi dir="ltr">{Math.abs(conv(w.weightDiff)).toFixed(1)}</bdi> {unit} الأسبوع ده</div>}
      {w.waterAvg > 0 && <div className="weekly-water">متوسط المياه {Math.round(w.waterAvg / 100) / 10} لتر/يوم · هدفك اتحقق {w.waterGoalDays} من 7 أيام</div>}
      {w.empty && <Link to="/" className="btn" style={{ marginTop: 10, display: "block", textAlign: "center" }}>شوف خطة النهارده</Link>}
      {!w.empty && (
        <button type="button" className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => setCard(weeklyCardData(w, unit, conv))}>شارك أسبوعك</button>
      )}
      {card && <ShareCardSheet data={card} name={Store.getProfile().name} onClose={() => setCard(null)} />}
    </div>
  );
}
