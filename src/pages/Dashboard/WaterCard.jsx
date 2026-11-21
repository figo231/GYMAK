import { useState } from "react";
import { addWater, getWater, lastDays, setWaterGoal, STEP } from "../../lib/water/water";
import { usePrompt } from "../../hooks/useDialog";

export default function WaterCard() {
  const promptAsync = usePrompt();
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const { ml, goal } = getWater();
  const days = lastDays(7);
  const pct = Math.min(100, Math.round((ml / goal) * 100));
  const liters = (v) => String(Number((v / 1000).toFixed(2)));

  async function editGoal() {
    const v = await promptAsync({ title: "هدفك اليومي من المياه (مللي):", inputType: "number", defaultValue: goal });
    if (v && !setWaterGoal(v)) { /* invalid: ignore */ }
    refresh();
  }
  const btn = { flex: 1, padding: "9px 0", borderRadius: 12, border: "1px solid var(--border-soft)", background: "none", color: "inherit", fontWeight: 800, fontSize: 13, cursor: "pointer" };
  return (
    <div className="glass" style={{ padding: 14, marginBottom: 12 }} data-testid="water-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="#0ea5e9"><path d="M12 2.5c3.5 4.2 6 7.3 6 10.5a6 6 0 0 1-12 0c0-3.2 2.5-6.300 6-10.500Z" /></svg>المياه النهاردة</div>
        <button type="button" onClick={editGoal} style={{ background: "none", border: "none", color: "inherit", opacity: 0.7, fontSize: 12, cursor: "pointer" }}>
          {liters(ml)} / {liters(goal)} لتر
        </button>
      </div>
      <div style={{ height: 10, borderRadius: 10, background: "rgba(128,128,128,.2)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#38bdf8,#0ea5e9)", transition: "width .3s" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" style={btn} onClick={() => { addWater(-STEP); refresh(); }} aria-label="شيل كوباية">−{STEP}</button>
        <button type="button" style={btn} onClick={() => { addWater(STEP); refresh(); }}>+{STEP} مل</button>
        <button type="button" style={btn} onClick={() => { addWater(500); refresh(); }}>+500 مل</button>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 38, marginTop: 12 }}>
        {days.map((d) => (
          <div key={d.date} title={`${d.date}: ${d.ml} مل`} style={{ flex: 1, height: `${Math.max(6, Math.min(100, (d.ml / d.goal) * 100))}%`, borderRadius: 4, background: d.ml >= d.goal ? "#0ea5e9" : "rgba(14,165,233,.35)" }} />
        ))}
      </div>
    </div>
  );
}
