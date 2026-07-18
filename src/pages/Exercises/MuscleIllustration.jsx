/* Small body-silhouette illustrations that highlight the trained muscle
   group in its accent color. Presentation only — driven purely by the
   `muscle` key that already exists on every exercise record. */

function Body({ highlight, children }) {
  return (
    <svg viewBox="0 0 40 46" width="100%" height="100%">
      {/* faint full-body silhouette for context */}
      <g fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="1.4">
        <circle cx="20" cy="7" r="4.6" />
        <path d="M20 11.6v13M11 16c1-2 4-2.6 9-2.6s8 .6 9 2.6M13 24.6 10 40M27 24.6 30 40M14 24.6v6M26 24.6v6" />
      </g>
      <g fill={highlight} opacity="0.92">{children}</g>
    </svg>
  );
}

const VARIANTS = {
  chest: (c) => (
    <Body highlight={c}>
      <path d="M13 15c2-1.6 5-1.6 7 0 2-1.6 5-1.6 7 0v6c-2 1.8-5 1.8-7 .4-2 1.4-5 1.4-7-.4v-6Z" />
    </Body>
  ),
  back: (c) => (
    <Body highlight={c}>
      <path d="M14 14.5h12l-1.5 11-4.5 2-4.5-2-1.5-11Z" opacity="0.85" />
      <rect x="19" y="14.5" width="2" height="13" opacity="0.4" />
    </Body>
  ),
  shoulders: (c) => (
    <Body highlight={c}>
      <circle cx="12.5" cy="15.5" r="3.4" />
      <circle cx="27.5" cy="15.5" r="3.4" />
    </Body>
  ),
  legs: (c) => (
    <Body highlight={c}>
      <path d="M13 25 10.5 40h3.2L16 27ZM27 25l2.5 15h-3.2L24 27Z" />
      <path d="M15 24.6c1.6 1 7.8 1 10 0v3c-2.2 1-7.8 1-10 0v-3Z" />
    </Body>
  ),
  arms: (c) => (
    <Body highlight={c}>
      <path d="M11 16.5c-1.6.6-2.6 2.4-2.2 5.5l1 7 3-.6-.8-6.6c-.2-1.8.2-3.4 1-4.6ZM29 16.5c1.6.6 2.6 2.4 2.2 5.5l-1 7-3-.6.8-6.6c.2-1.8-.2-3.4-1-4.6Z" />
    </Body>
  ),
  core: (c) => (
    <Body highlight={c}>
      <rect x="16" y="16" width="8" height="9" rx="1.6" opacity="0.85" />
      <line x1="20" y1="16" x2="20" y2="25" stroke={c} strokeWidth="0.8" opacity="0.5" />
      <line x1="16" y1="20.5" x2="24" y2="20.5" stroke={c} strokeWidth="0.8" opacity="0.5" />
    </Body>
  ),
};

export default function MuscleIllustration({ muscle, color, size = 28 }) {
  const render = VARIANTS[muscle] || VARIANTS.chest;
  return (
    <div style={{ width: size, height: size, color }} className="muscle-illo">
      {render(color)}
    </div>
  );
}
