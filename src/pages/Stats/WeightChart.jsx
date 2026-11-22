import Store from "../../lib/store/gymakStore";
import { fmt } from "../../lib/format";
import { arDate, signed, timeFractions, weightTone } from "../../lib/stats/format";

const TONE = {
  good: { color: "var(--success)", bg: "rgba(34,197,94,0.13)" },
  bad: { color: "var(--danger)", bg: "rgba(244,63,94,0.13)" },
  neutral: { color: "var(--text-dim)", bg: "rgba(var(--ink), 0.07)" },
};

export default function WeightChart({ history, goal = null, periodLabel = "" }) {
  const unit = Store.unitLabel();
  const disp = (kg) => Store.toDisplayWeight(kg);
  if (history.length < 2) {
    const last = history.length ? fmt(disp(history.at(-1).weight)) : "—";
    return (
      <div className="glass chart-card">
        <div className="chart-head">
          <span className="chart-now">{last} <small style={{ fontSize: 12, color: "var(--text-dim)" }}>{unit}</small></span>
        </div>
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 12 }}>
          {history.length ? `محتاج قياسين على الأقل في ${periodLabel || "الفترة دي"} عشان يظهر الرسم.` : "سجّل وزنك مرتين على الأقل عشان يظهر الرسم البياني."}
        </div>
      </div>
    );
  }

  const weights = history.map((h) => h.weight);
  const goalIn = goal != null ? goal : null;
  const lo = Math.min(...weights, ...(goalIn != null ? [goalIn] : []));
  const hi = Math.max(...weights, ...(goalIn != null ? [goalIn] : []));
  const range = hi - lo || 1;
  const W = 320, H = 120, pad = 10;
  const fr = timeFractions(history.map((h) => h.date));
  const yOf = (w) => pad + (1 - (w - lo) / range) * (H - pad * 2);
  const pts = weights.map((w, i) => [fr[i] * W, yOf(w)]);
  const linePath = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const areaPath = linePath + ` L${W},${H} L0,${H} Z`;
  const lastPt = pts.at(-1);

  const diff = +(disp(weights.at(-1)) - disp(weights[0])).toFixed(1);
  const tone = TONE[weightTone(diff, weights[0], goal)];
  const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
  const mid = history.length > 2 ? history[Math.floor((history.length - 1) / 2)] : null;

  return (
    <div className="glass chart-card">
      <div className="chart-head">
        <span className="chart-now">{fmt(disp(weights.at(-1)))} <small style={{ fontSize: 12, color: "var(--text-dim)" }}>{unit}</small></span>
        <span className="chart-diff" style={{ display: "inline-flex", gap: 4, direction: "ltr", unicodeBidi: "isolate", color: tone.color, background: tone.bg }}>
          <span>{arrow}</span><span>{signed(diff)}</span><span>{unit}</span>
        </span>
      </div>
      {/* Chart is always drawn oldest on the left, newest on the right; labels follow the same direction. */}
      <div dir="ltr" className="wchart">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`رسم تطور الوزن، من ${fmt(disp(weights[0]))} إلى ${fmt(disp(weights.at(-1)))} ${unit}`}>
          <defs>
            <linearGradient id="wArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--glow-blue)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--glow-blue)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--border-soft)" strokeWidth="1" strokeDasharray="3 4" />
          ))}
          {goalIn != null && (
            <line x1="0" x2={W} y1={yOf(goalIn)} y2={yOf(goalIn)} stroke="var(--success)" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.8" />
          )}
          <path d={areaPath} fill="url(#wArea)" />
          <path d={linePath} fill="none" stroke="var(--glow-blue)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={Math.min(lastPt[0], W - 5)} cy={lastPt[1]} r="4.5" fill="var(--bg-deep-2)" stroke="var(--glow-blue)" strokeWidth="2.5" />
        </svg>
        <span className="wchart-y top">{fmt(disp(hi))}</span>
        <span className="wchart-y bot">{fmt(disp(lo))}</span>
        {goalIn != null && <span className="wchart-goal" style={{ top: `${(yOf(goalIn) / H) * 100}%` }}>الهدف {fmt(disp(goalIn))}</span>}
      </div>
      <div className="chart-labels" dir="ltr">
        <span>{arDate(history[0].date)}</span>
        {mid && <span>{arDate(mid.date)}</span>}
        <span>{arDate(history.at(-1).date)}</span>
      </div>
    </div>
  );
}
