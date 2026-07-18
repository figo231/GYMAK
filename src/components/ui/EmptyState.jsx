/* Reusable illustrated empty state — used wherever a list/section has
   nothing to show yet (exercises filter, chat, programs, etc). Presentation
   only: no data fetching, no business logic. */

const ILLUSTRATIONS = {
  search: (
    <svg viewBox="0 0 120 120" width="88" height="88">
      <circle cx="60" cy="60" r="52" fill="url(#es-grad-1)" opacity="0.5" />
      <circle cx="54" cy="54" r="24" fill="none" stroke="var(--glow-blue)" strokeWidth="5" opacity="0.85" />
      <line x1="72" y1="72" x2="88" y2="88" stroke="var(--glow-purple)" strokeWidth="6" strokeLinecap="round" />
      <defs>
        <radialGradient id="es-grad-1" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--glow-blue)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--glow-blue)" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 120 120" width="88" height="88">
      <circle cx="60" cy="60" r="52" fill="url(#es-grad-2)" opacity="0.55" />
      <rect x="30" y="38" width="60" height="40" rx="14" fill="none" stroke="var(--glow-blue)" strokeWidth="5" />
      <path d="M46 78v10l14-10" fill="none" stroke="var(--glow-blue)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="46" cy="58" r="3.5" fill="var(--glow-purple)" />
      <circle cx="60" cy="58" r="3.5" fill="var(--glow-purple)" />
      <circle cx="74" cy="58" r="3.5" fill="var(--glow-purple)" />
      <defs>
        <radialGradient id="es-grad-2" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--glow-purple)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--glow-purple)" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  ),
  dumbbell: (
    <svg viewBox="0 0 120 120" width="88" height="88">
      <circle cx="60" cy="60" r="52" fill="url(#es-grad-3)" opacity="0.55" />
      <rect x="22" y="50" width="14" height="20" rx="4" fill="var(--glow-blue)" opacity="0.9" />
      <rect x="84" y="50" width="14" height="20" rx="4" fill="var(--glow-blue)" opacity="0.9" />
      <rect x="36" y="57" width="48" height="6" rx="3" fill="var(--glow-purple)" opacity="0.8" />
      <defs>
        <radialGradient id="es-grad-3" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--glow-blue)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--glow-blue)" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 120 120" width="88" height="88">
      <circle cx="60" cy="60" r="52" fill="url(#es-grad-4)" opacity="0.55" />
      <path d="M46 38h28v18a14 14 0 0 1-28 0V38Z" fill="none" stroke="var(--warn-text)" strokeWidth="5" strokeLinejoin="round" />
      <path d="M46 42h-8a6 6 0 0 0 0 12h8M74 42h8a6 6 0 0 1 0 12h-8" fill="none" stroke="var(--warn-text)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M60 70v10M50 86h20" stroke="var(--warn-text)" strokeWidth="5" strokeLinecap="round" />
      <defs>
        <radialGradient id="es-grad-4" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--warn-text)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--warn-text)" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  ),
};

export default function EmptyState({ type = "dumbbell", title, subtitle, ctaLabel, onCta, compact = false }) {
  return (
    <div className={"empty-state" + (compact ? " compact" : "")}>
      <div className="empty-state-illo">{ILLUSTRATIONS[type] || ILLUSTRATIONS.dumbbell}</div>
      {title && <p className="empty-state-title">{title}</p>}
      {subtitle && <p className="empty-state-sub">{subtitle}</p>}
      {ctaLabel && (
        <div className="empty-state-cta" onClick={onCta} role="button">
          {ctaLabel}
        </div>
      )}
    </div>
  );
}
