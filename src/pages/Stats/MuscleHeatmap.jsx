import MuscleFigure from "../../lib/muscleFigure";
import { tx } from "../../lib/i18n/tx";
// Body-map heatmap: front and back silhouettes (same visual language as
// MuscleIllustration) with each muscle group tinted by its share of logged
// sets in the selected period. Untrained groups stay faint, so neglect shows.
const ZONES = ["chest", "back", "shoulders", "arms", "core", "legs"];
const ZONE_LABEL = { chest: tx("صدر"), back: tx("ظهر"), shoulders: tx("أكتاف"), arms: tx("ذراعين"), core: tx("بطن"), legs: tx("أرجل") };

export default function MuscleHeatmap({ sets }) {
  const max = Math.max(0, ...ZONES.map((k) => sets[k] || 0));
  const ratios = Object.fromEntries(ZONES.map(k => [k, max ? (sets[k] || 0) / max : 0]));
  const top = max ? ZONES.reduce((a, b) => ((sets[a] || 0) >= (sets[b] || 0) ? a : b)) : null;
  const bottom = max ? ZONES.filter((k) => (sets[k] || 0) > 0).sort((a, b) => (sets[a] || 0) - (sets[b] || 0))[0] : null;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", maxWidth: 240, margin: "0 auto", color: "var(--text-primary)" }}>
        <div style={{ width: 110 }}><MuscleFigure view="front" width={110} ratios={ratios} label={tx("خريطة العضلات من الأمام حسب المجموعات المسجلة")} /></div>
        <div style={{ width: 110 }}><MuscleFigure view="back" width={110} ratios={ratios} label={tx("خريطة العضلات من الخلف حسب المجموعات المسجلة")} /></div>
      </div>
      {max ? (
        <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", margin: "8px 0 0", lineHeight: 1.8 }}>
          {tx("الأكثر تمرينًا:")} <b style={{ color: "var(--text-primary)" }}>{ZONE_LABEL[top]} ({sets[top]} {tx("مجموعة)")}</b>
          {bottom && bottom !== top ? <> {tx("· الأقل:")} <b style={{ color: "var(--text-primary)" }}>{ZONE_LABEL[bottom]}</b> {tx("— اديها شوية حب الأسبوع الجاي 💛")}</> : null}
        </p>
      ) : (
        <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", margin: "8px 0 0" }}>{tx("مفيش تمارين متسجلة في الفترة دي.")}</p>
      )}
    </div>
  );
}
