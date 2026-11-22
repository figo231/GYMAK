import { BADGE_STYLE } from "./badgeData";

function BadgePaths({ path, fill }) {
  return path.split("|").map((d, i) =>
    fill
      ? <path key={i} fill="var(--text-primary)" d={d} />
      : <path key={i} fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d={d} />
  );
}

const FALLBACK = { days10: "sets10", days30: "sets50", days100: "sets100", food7: "streak7", weigh7: "streak14", pr5: "firstPR" };

export default function AchievementsGrid({ achievements, onShare = null }) {
  return (
    <div className="badge-grid">
      {achievements.map((a) => {
        const style = BADGE_STYLE[a.id] || BADGE_STYLE[FALLBACK[a.id]] || BADGE_STYLE.streak7;
        if (a.unlocked) {
          if (onShare) {
            return (
              <button type="button" className="badge-card" key={a.id} onClick={() => onShare(a)} aria-label={`شارك وسام ${a.name}`} style={{ cursor: "pointer", border: "none", font: "inherit" }}>
                <div className="badge-ic" style={{ background: style.grad }}>
                  <svg width="20" height="20" viewBox="0 0 24 24"><BadgePaths path={style.path} fill={style.fill} /></svg>
                </div>
                <div className="badge-name">{a.name}</div>
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>شارك 📤</div>
              </button>
            );
          }
          return (
            <div className="badge-card" key={a.id}>
              <div className="badge-ic" style={{ background: style.grad }}>
                <svg width="20" height="20" viewBox="0 0 24 24"><BadgePaths path={style.path} fill={style.fill} /></svg>
              </div>
              <div className="badge-name">{a.name}</div>
            </div>
          );
        }
        return (
          <div className="badge-card locked" key={a.id}>
            <div className="badge-ic" style={{ background: "rgba(17,24,39,0.055)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="var(--text-dim)" strokeWidth="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="badge-name">{a.name}</div>
            {a.target > 1 && <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{a.progress}/{a.target}</div>}
          </div>
        );
      })}
    </div>
  );
}
