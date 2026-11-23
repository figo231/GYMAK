import { useState } from "react";
import { localISO } from "../../lib/dateKey";
import { tipOfTheDay } from "../../lib/content/tips";
import { tx } from "../../lib/i18n/tx";

const KEY = "gymak_tip_dismissed_v1";

// Tip of the day: one Egyptian-Arabic nutrition/training tip per calendar day,
// dismissible until tomorrow. Purely local, nothing synced.
export default function TipCard() {
  const today = localISO();
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(KEY) === today; } catch { return false; } });
  if (dismissed) return null;
  return (
    <div className="glass tip-card" data-testid="tip-card" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px" }}>
      <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1.4 }}>💡</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-dim)", marginBottom: 2 }}>{tx("نصيحة اليوم")}</div>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>{tipOfTheDay(today)}</div>
      </div>
      <button type="button" className="hist-btn" aria-label={tx("إخفاء نصيحة اليوم")} onClick={() => { try { localStorage.setItem(KEY, today); } catch { /* private mode */ } setDismissed(true); }}>✕</button>
    </div>
  );
}
