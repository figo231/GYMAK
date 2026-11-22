import { useEffect, useRef, useState } from "react";
import { onCelebrate } from "../lib/celebrate";
import { drawCard, canvasToBlob } from "../lib/share/shareCard";
import { buzz } from "../lib/haptics";
import Store from "../lib/store/gymakStore";

const ICONS = {
  level: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3Z" />,
  streak: <path d="M12 2c1 3-2 4.2-2 7 0 1.7 1.3 3 3 3s3-1.3 3-3c1.5 1.5 2.5 3.6 2.5 5.8 0 3.6-2.9 6.7-6.5 6.7S5.5 19.4 5.5 15.8c0-2.6 1.2-4.4 2.4-6.1C9.2 7.7 10 5.3 12 2Z" />,
  pr: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />,
};

// One calm full-screen card at a time. Queue drains as the user dismisses.
export default function Celebration() {
  const [queue, setQueue] = useState([]);
  const doneRef = useRef(null);
  useEffect(() => onCelebrate((m) => { buzz([12, 40, 12]); setQueue((q) => [...q, m]); }), []);
  const cur = queue[0];
  useEffect(() => { if (cur && doneRef.current) doneRef.current.focus(); }, [cur]);
  if (!cur) return null;

  async function share() {
    try {
      const c = drawCard(document.createElement("canvas"), { kind: cur.kind, title: cur.title, big: cur.big, unit: cur.unit, sub: cur.sub }, Store.getProfile().name || "");
      const blob = await canvasToBlob(c);
      const file = new File([blob], "gymak-moment.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
      if (navigator.share) { await navigator.share({ text: `${cur.title}: ${cur.big} ${cur.unit} 💪 GYMAK` }); return; }
    } catch { /* cancelled or unsupported */ }
  }
  const next = () => setQueue((q) => q.slice(1));
  const pct = cur.kind === "streak" ? 100 : cur.kind === "level" ? 100 : 100;
  return (
    <div className="cele" role="dialog" aria-modal="true" aria-label={cur.title} onKeyDown={(e) => { if (e.key === "Escape") next(); }}>
      <div className="cele-card">
        <div className="cele-ring">
          <svg viewBox="0 0 120 120" width="150" height="150" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className="cele-track" />
            <circle cx="60" cy="60" r="52" className="cele-fill" style={{ "--p": pct }} />
          </svg>
          <svg className="cele-ic" viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[cur.kind] || ICONS.pr}</svg>
        </div>
        <div className="cele-title">{cur.title}</div>
        <div className="cele-big" dir="ltr">{cur.big}{cur.unit ? <small>{cur.unit}</small> : null}</div>
        <div className="cele-sub">{cur.sub}</div>
        <div className="cele-actions">
          <button type="button" className="btn btn-secondary" onClick={share}>مشاركة</button>
          <button type="button" className="btn btn-primary" ref={doneRef} onClick={next}>تمام</button>
        </div>
      </div>
    </div>
  );
}
