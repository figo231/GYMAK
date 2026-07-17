import { BADGE_STYLE } from "./badgeData";

function BadgePaths({ path, fill }) {
  return path.split("|").map((d, i) =>
    fill
      ? <path key={i} fill="#111827" d={d} />
      : <path key={i} fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d={d} />
  );
}

export default function AchievementsGrid({ achievements }) {
  return (
    <div className="badge-grid">
      {achievements.map((a) => {
        const style = BADGE_STYLE[a.id];
        if (a.unlocked) {
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
                <rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="#64748B" strokeWidth="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="badge-name">{a.name}</div>
          </div>
        );
      })}
    </div>
  );
}
