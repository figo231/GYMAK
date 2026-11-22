// Body-map heatmap: front and back silhouettes (same visual language as
// MuscleIllustration) with each muscle group tinted by its share of logged
// sets in the selected period. Untrained groups stay faint, so neglect shows.
const ZONES = ["chest", "back", "shoulders", "arms", "core", "legs"];
const ZONE_LABEL = { chest: "صدر", back: "ظهر", shoulders: "أكتاف", arms: "ذراعين", core: "بطن", legs: "أرجل" };

function shade(ratio) {
  // 0 -> faint outline only, 1 -> full accent
  if (!ratio) return { fill: "currentColor", opacity: 0.08 };
  return { fill: "var(--accent)", opacity: 0.25 + 0.75 * ratio };
}

function Figure({ side, ratioOf }) {
  const z = (key) => shade(ratioOf(key));
  return (
    <svg viewBox="0 0 40 46" width="100%" height="100%" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="1.4">
        <circle cx="20" cy="7" r="4.6" />
        <path d="M20 11.6v13M11 16c1-2 4-2.6 9-2.6s8 .6 9 2.6M13 24.6 10 40M27 24.6 30 40M14 24.6v6M26 24.6v6" />
      </g>
      {side === "front" ? (
        <g>
          <path d="M13 15c2-1.6 5-1.6 7 0 2-1.6 5-1.6 7 0v6c-2 1.8-5 1.8-7 .4-2 1.4-5 1.4-7-.4v-6Z" {...z("chest")} />
          <circle cx="12.5" cy="15.5" r="3.4" {...z("shoulders")} />
          <circle cx="27.5" cy="15.5" r="3.4" {...z("shoulders")} />
          <path d="M11 16.5c-1.6.6-2.6 2.4-2.2 5.5l1 7 3-.6-.8-6.6c-.2-1.8.2-3.4 1-4.6Z" {...z("arms")} />
          <path d="M29 16.5c1.6.6 2.6 2.4 2.2 5.5l-1 7-3-.6.8-6.6c-.2-1.8.2-3.4 1-4.6Z" {...z("arms")} />
          <rect x="16" y="16" width="8" height="9" rx="1.6" {...z("core")} />
          <path d="M13 25 10.5 40h3.2L16 27Z" {...z("legs")} />
          <path d="M27 25l2.5 15h-3.2L24 27Z" {...z("legs")} />
        </g>
      ) : (
        <g>
          <path d="M14 14.5h12l-1.5 11-4.5 2-4.5-2-1.5-11Z" {...z("back")} />
          <circle cx="12.5" cy="15.5" r="3.4" {...z("shoulders")} />
          <circle cx="27.5" cy="15.5" r="3.4" {...z("shoulders")} />
          <path d="M11 16.5c-1.6.6-2.6 2.4-2.2 5.5l1 7 3-.6-.8-6.6c-.2-1.8.2-3.4 1-4.6Z" {...z("arms")} />
          <path d="M29 16.5c1.6.6 2.6 2.4 2.2 5.5l-1 7-3-.6.8-6.6c-.2-1.8.2-3.4 1-4.6Z" {...z("arms")} />
          <path d="M14 27c1.5 1.4 4.5 1.4 6 0 1.5 1.4 4.5 1.4 6 0v4c-1.5 1.2-4.5 1.2-6 0-1.5 1.2-4.5 1.2-6 0v-4Z" {...z("legs")} />
          <path d="M15 31l-1.5 9h3L18 31ZM25 31l1.5 9h-3L22 31Z" {...z("legs")} />
        </g>
      )}
    </svg>
  );
}

export default function MuscleHeatmap({ sets }) {
  const max = Math.max(0, ...ZONES.map((k) => sets[k] || 0));
  const ratioOf = (k) => (max ? (sets[k] || 0) / max : 0);
  const top = max ? ZONES.reduce((a, b) => ((sets[a] || 0) >= (sets[b] || 0) ? a : b)) : null;
  const bottom = max ? ZONES.filter((k) => (sets[k] || 0) > 0).sort((a, b) => (sets[a] || 0) - (sets[b] || 0))[0] : null;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", maxWidth: 240, margin: "0 auto", color: "var(--text)" }}>
        <div style={{ width: 110 }}><Figure side="front" ratioOf={ratioOf} /></div>
        <div style={{ width: 110 }}><Figure side="back" ratioOf={ratioOf} /></div>
      </div>
      {max ? (
        <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", margin: "8px 0 0", lineHeight: 1.8 }}>
          الأكثر تمرينًا: <b style={{ color: "var(--text)" }}>{ZONE_LABEL[top]} ({sets[top]} مجموعة)</b>
          {bottom && bottom !== top ? <> · الأقل: <b style={{ color: "var(--text)" }}>{ZONE_LABEL[bottom]}</b> — اديها شوية حب الأسبوع الجاي 💛</> : null}
        </p>
      ) : (
        <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", margin: "8px 0 0" }}>مفيش تمارين متسجلة في الفترة دي.</p>
      )}
    </div>
  );
}
