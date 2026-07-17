import Store from "../../lib/store/gymakStore";
import { fmt } from "../../lib/format";

export default function WeightChart({ history }) {
  if (history.length < 2) {
    const last = history.length ? fmt(Store.toDisplayWeight(history.at(-1).weight)) : "—";
    return (
      <div className="glass chart-card">
        <div className="chart-head">
          <span className="chart-now">{last} <small style={{ fontSize: 12, color: "var(--text-dim)" }}>{Store.unitLabel()}</small></span>
        </div>
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 12 }}>
          سجّل وزنك مرتين على الأقل عشان يظهر الرسم البياني.
        </div>
      </div>
    );
  }

  const weights = history.map((h) => h.weight);
  const min = Math.min(...weights), max = Math.max(...weights);
  const range = max - min || 1;
  const W = 320, H = 110, pad = 8;
  const stepX = W / (history.length - 1);
  const pts = weights.map((w, i) => {
    const x = i * stepX;
    const y = pad + (1 - (w - min) / range) * (H - pad * 2);
    return [x, y];
  });
  const linePath = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const areaPath = linePath + ` L${W},${H} L0,${H} Z`;

  const nowDisp = fmt(Store.toDisplayWeight(weights.at(-1)));
  const diff = +(Store.toDisplayWeight(weights.at(-1)) - Store.toDisplayWeight(weights[0])).toFixed(1);
  const diffUp = diff > 0;

  return (
    <div className="glass chart-card">
      <div className="chart-head">
        <span className="chart-now">{nowDisp} <small style={{ fontSize: 12, color: "var(--text-dim)" }}>{Store.unitLabel()}</small></span>
        <span
          className="chart-diff"
          style={{ display: "inline-flex", color: diffUp ? "#F43F5E" : "#22C55E", background: diffUp ? "rgba(244,63,94,0.13)" : "rgba(34,197,94,0.13)" }}
        >
          {(diff > 0 ? "↑ +" : diff < 0 ? "↓ " : "→ ") + Math.abs(diff) + " " + Store.unitLabel()}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="110" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B2C" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FF6B2C" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF9457" />
            <stop offset="100%" stopColor="#FF6B2C" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#wArea)" />
        <path d={linePath} fill="none" stroke="url(#wLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="4.5" fill="#111827" stroke="#FFC9A3" strokeWidth="2.5" />
      </svg>
      <div className="chart-labels">
        {history.map((h, i) => <span key={i}>{h.date.slice(5)}</span>)}
      </div>
    </div>
  );
}
