import { useMemo, useState } from "react";
import Store from "../../lib/store/gymakStore";
import { lastDays } from "../../lib/water/water";
import { buildWeekly, headline, weeklyCardData } from "../../lib/stats/weekly";
import ShareCardSheet from "../Profile/ShareCardSheet";
import { useStoreVersion } from "../../hooks/useStoreVersion";

export default function WeeklyCard() {
  const [version] = useStoreVersion();
  const [card, setCard] = useState(null);
  const w = useMemo(() => buildWeekly(Store, lastDays(7)), [version]);
  const conv = (x) => Store.toDisplayWeight(x);
  const unit = Store.unitLabel();
  const cell = { flex: 1, textAlign: "center", padding: "8px 2px" };
  const num = { fontWeight: 900, fontSize: 20, display: "block" };
  const lab = { fontSize: 11, opacity: 0.7 };
  const delta = w.daysDelta === 0 ? "" : (w.daysDelta > 0 ? "▲ " : "▼ ") + Math.abs(w.daysDelta);
  return (
    <div className="glass" style={{ padding: 14, marginBottom: 12 }} data-testid="weekly-card">
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>ملخص أسبوعك</div>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>{headline(w)}</div>
      <div style={{ display: "flex" }}>
        <div style={cell}><b style={num}>{w.days}</b><span style={lab}>أيام تمرين {delta && <span dir="ltr">({delta})</span>}</span></div>
        <div style={cell}><b style={num}>{w.sets}</b><span style={lab}>مجموعة</span></div>
        <div style={cell}><b style={num} dir="ltr">{Math.round(conv(w.tonnage)).toLocaleString("en-US")}</b><span style={lab}>حجم ({unit}){w.tonnageDelta != null && w.tonnageDelta !== 0 ? ` ${w.tonnageDelta > 0 ? "+" : ""}${w.tonnageDelta}%` : ""}</span></div>
      </div>
      <div style={{ display: "flex" }}>
        <div style={cell}><b style={num}>{w.prs}</b><span style={lab}>أرقام قياسية</span></div>
        <div style={cell}><b style={num}>{w.streak}</b><span style={lab}>ستريك</span></div>
        <div style={cell}><b style={num} dir="ltr">{w.weightDiff == null ? "—" : `${w.weightDiff > 0 ? "+" : ""}${Math.round(conv(w.weightDiff) * 10) / 10}`}</b><span style={lab}>وزن ({unit})</span></div>
      </div>
      {w.waterAvg > 0 && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>متوسط المياه {Math.round(w.waterAvg / 100) / 10} لتر/يوم · هدفك اتحقق {w.waterGoalDays} من 7 أيام</div>}
      {!w.empty && (
        <button type="button" className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => setCard(weeklyCardData(w, unit, conv))}>شارك أسبوعك</button>
      )}
      {card && <ShareCardSheet data={card} name={Store.getProfile().name} onClose={() => setCard(null)} />}
    </div>
  );
}
