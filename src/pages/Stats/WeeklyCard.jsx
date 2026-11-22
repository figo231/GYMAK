import { useMemo, useState } from "react";
import Store from "../../lib/store/gymakStore";
import { lastDays } from "../../lib/water/water";
import { buildWeekly, headline, weeklyCardData } from "../../lib/stats/weekly";
import ShareCardSheet from "../Profile/ShareCardSheet";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { fmtVolume } from "../../lib/stats/format";

export default function WeeklyCard() {
  const [version] = useStoreVersion();
  const [card, setCard] = useState(null);
  const w = useMemo(() => buildWeekly(Store, lastDays(7)), [version]);
  const conv = (x) => Store.toDisplayWeight(x);
  const unit = Store.unitLabel();
  const delta = w.daysDelta === 0 ? "" : (w.daysDelta > 0 ? "▲ " : "▼ ") + Math.abs(w.daysDelta);
  const tdelta = w.tonnageDelta != null && w.tonnageDelta !== 0 ? `${w.tonnageDelta > 0 ? "+" : ""}${w.tonnageDelta}%` : "";
  return (
    <div className="glass weekly-card" data-testid="weekly-card">
      <div className="weekly-title">ملخص أسبوعك</div>
      <div className="weekly-head">{headline(w)}</div>
      <div className="weekly-grid">
        <div><b dir="ltr">{w.days}</b><span>أيام تمرين {delta && <bdi dir="ltr">({delta})</bdi>}</span></div>
        <div><b dir="ltr">{w.sets}</b><span>مجموعة</span></div>
        <div><b dir="ltr">{fmtVolume(conv(w.tonnage), unit)}</b><span>حجم التمرين {tdelta && <bdi dir="ltr">{tdelta}</bdi>}</span></div>
      </div>
      {w.waterAvg > 0 && <div className="weekly-water">متوسط المياه {Math.round(w.waterAvg / 100) / 10} لتر/يوم · هدفك اتحقق {w.waterGoalDays} من 7 أيام</div>}
      {!w.empty && (
        <button type="button" className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => setCard(weeklyCardData(w, unit, conv))}>شارك أسبوعك</button>
      )}
      {card && <ShareCardSheet data={card} name={Store.getProfile().name} onClose={() => setCard(null)} />}
    </div>
  );
}
