import { useState } from "react";
import { addWater, getWater, lastDays, setWaterGoal, setWaterTotal, STEP } from "../../lib/water/water";
import { usePrompt } from "../../hooks/useDialog";
import { buzz } from "../../lib/haptics";
import { useToast } from "../../hooks/useToast";
import { tx, txf } from "../../lib/i18n/tx";

export default function WaterCard() {
  const promptAsync = usePrompt();
  const toast = useToast();
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const { ml, goal } = getWater();
  const days = lastDays(7);
  const pct = Math.min(100, Math.round((ml / goal) * 100));
  const liters = (v) => String(Number((v / 1000).toFixed(2)));

  async function editGoal() {
    const v = await promptAsync({ title: tx("هدفك اليومي من المياه (مللي):"), inputType: "number", defaultValue: goal });
    if (v === null || v === undefined || v === "") return;
    if (!setWaterGoal(v)) { toast(tx("هدف المياه لازم يكون بين 500 و 10000 مل.")); return; }
    refresh();
  }
  async function editTotal() {
    const v = await promptAsync({ title: tx("إجمالي مياه النهارده (مللي):"), inputType: "number", defaultValue: ml });
    if (v === null || v === undefined || v === "") return;
    if (!setWaterTotal(v)) { toast(tx("اكتب كمية بين 0 و 10000 مل.")); return; }
    refresh();
  }
  async function addCustom() {
    const v = await promptAsync({ title: tx("كمية المياه (مللي):"), inputType: "number", defaultValue: "" });
    if (v === null || v === undefined || v === "") return;
    const n = Math.round(Number(v));
    if (!(n >= 1 && n <= 5000)) { toast(tx("اكتب كمية بين 1 و 5000 مل.")); return; }
    addWater(n); buzz(10); refresh();
  }
  const AR_DAYS = [tx("الأحد"), tx("الاتنين"), tx("التلات"), tx("الأربع"), tx("الخميس"), tx("الجمعة"), tx("السبت")];
  const dayName = (iso) => AR_DAYS[new Date(iso + "T00:00:00").getDay()];
  const btn = { flex: 1, padding: "9px 0", borderRadius: 12, border: "1px solid var(--border-soft)", background: "none", color: "inherit", fontWeight: 800, fontSize: 13, cursor: "pointer" };
  return (
    <div className="glass" style={{ padding: 16 }} data-testid="water-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="#0ea5e9"><path d="M12 2.5c3.5 4.2 6 7.3 6 10.5a6 6 0 0 1-12 0c0-3.2 2.5-6.300 6-10.500Z" /></svg>{tx("المياه النهاردة")}</div>
        <button type="button" onClick={editGoal} aria-label={txf(`غيّر هدف المياه، حاليًا {0} لتر`, [liters(goal)])} style={{ background: "none", border: "none", color: "inherit", opacity: 0.7, fontSize: 12, cursor: "pointer" }}>
          {liters(ml)} / {liters(goal)} {tx("لتر")}
        </button>
      </div>
      <div style={{ height: 10, borderRadius: 10, background: "rgba(128,128,128,.2)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#38bdf8,#0ea5e9)", transition: "width .3s" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" style={btn} onClick={() => { addWater(-STEP); refresh(); }} aria-label={txf(`شيل {0} مل`, [STEP])}>−{STEP} {tx("مل")}</button>
        <button type="button" style={btn} onClick={() => { addWater(STEP); buzz(10); refresh(); }}>+{STEP} {tx("مل")}</button>
        <button type="button" style={btn} onClick={() => { addWater(500); buzz(10); refresh(); }}>{tx("+500 مل")}</button>
        <button type="button" style={btn} onClick={addCustom} aria-label={tx("كمية تانية")}>{tx("أكتر")}</button>
        <button type="button" style={btn} onClick={editTotal} aria-label={tx("عدّل إجمالي اليوم")}>✎</button>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 38, marginTop: 12 }}>
        {days.map((d) => (
          <div key={d.date} role="img" aria-label={txf(`{0}: {1} مل من {2}`, [dayName(d.date), d.ml, d.goal])} title={txf(`{0}: {1} مل`, [dayName(d.date), d.ml])} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
            <div style={{ height: `${Math.max(6, Math.min(100, (d.ml / d.goal) * 100))}%`, borderRadius: 4, background: d.ml >= d.goal ? "#0ea5e9" : "rgba(14,165,233,.35)" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }} aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.date} style={{ flex: 1, textAlign: "center", fontSize: 9.5, fontWeight: i === days.length - 1 ? 800 : 600, color: i === days.length - 1 ? "var(--text-primary)" : "var(--text-dim)" }}>{[tx("ح"), tx("ن"), tx("ث"), tx("ر"), tx("خ"), tx("ج"), tx("س")][new Date(d.date + "T00:00:00").getDay()]}</span>
        ))}
      </div>
    </div>
  );
}
