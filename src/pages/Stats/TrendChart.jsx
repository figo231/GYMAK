import { arDate, signed, timeFractions } from "../../lib/stats/format";
import { tx, txf } from "../../lib/i18n/tx";

// Small line chart for any dated series. Always drawn oldest-left, newest-right.
export default function TrendChart({ points, unit = "", label }) {
  if (points.length < 2) {
    return <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", margin: "10px 0", lineHeight: 1.7 }}>{tx("سجّل قياسين على الأقل في الفترة دي عشان يظهر الرسم.")}</p>;
  }
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals), hi = Math.max(...vals), range = hi - lo || 1;
  const W = 320, H = 90, pad = 10;
  const fr = timeFractions(points.map((p) => p.date));
  const pts = vals.map((v, i) => [fr[i] * W, pad + (1 - (v - lo) / range) * (H - pad * 2)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const last = pts.at(-1);
  const diff = +(vals.at(-1) - vals[0]).toFixed(1);
  return (
    <div>
      <div className="chart-head" style={{ marginBottom: 6 }}>
        <span className="chart-now" style={{ fontSize: 20 }}><bdi dir="ltr">{vals.at(-1)}{unit === "%" ? "%" : ""}</bdi> {unit !== "%" && <small style={{ fontSize: 12, color: "var(--text-dim)" }}>{unit}</small>}</span>
        <span className="chart-diff" style={{ direction: "ltr", unicodeBidi: "isolate", color: "var(--text-dim)", background: "rgba(var(--ink), 0.07)" }}>{signed(diff)} {unit}</span>
      </div>
      <div dir="ltr" className="wchart">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={txf(`{0} من {1} إلى {2} {3}`, [label || "", vals[0], vals.at(-1), unit])}>
          <path d={d} fill="none" stroke="var(--glow-blue)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={Math.min(last[0], W - 5)} cy={last[1]} r="4" fill="var(--bg-deep-2)" stroke="var(--glow-blue)" strokeWidth="2.4" />
        </svg>
        <span className="wchart-y top">{hi}</span>
        <span className="wchart-y bot">{lo}</span>
      </div>
      <div className="chart-labels" dir="ltr"><span>{arDate(points[0].date)}</span><span>{arDate(points.at(-1).date)}</span></div>
    </div>
  );
}
