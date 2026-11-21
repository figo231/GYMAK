import { useEffect, useRef, useState } from "react";
import { fmtClock, remaining, getRestSettings } from "../lib/rest/restTimer";

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      [0, 0.25, 0.5].forEach((d) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.value = 880; g.gain.value = 0.15;
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.15);
      });
    }
  } catch { /* sound is optional */ }
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch { /* optional */ }
}

export default function RestTimer() {
  const [endAt, setEndAt] = useState(0);
  const [left, setLeft] = useState(0);
  const [total, setTotal] = useState(90);
  const done = useRef(false);

  useEffect(() => {
    function onStart(e) {
      const sec = e.detail?.sec || getRestSettings().sec;
      done.current = false;
      setTotal(sec);
      setEndAt(Date.now() + sec * 1000);
      setLeft(sec);
    }
    window.addEventListener("gymak-rest-start", onStart);
    return () => window.removeEventListener("gymak-rest-start", onStart);
  }, []);

  useEffect(() => {
    if (!endAt) return undefined;
    const id = setInterval(() => {
      const r = remaining(endAt);
      setLeft(r);
      if (r <= 0 && !done.current) {
        done.current = true;
        beep();
        setTimeout(() => setEndAt(0), 4000);
      }
    }, 250);
    return () => clearInterval(id);
  }, [endAt]);

  if (!endAt) return null;
  const finished = left <= 0;
  const pct = Math.min(100, Math.max(0, ((total - left) / total) * 100));
  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", insetInline: 12, bottom: "calc(84px + env(safe-area-inset-bottom, 0px))", zIndex: 60,
      background: "rgba(20,18,12,.94)", border: "1px solid var(--border-soft)", borderRadius: 16, padding: "10px 14px",
      display: "flex", alignItems: "center", gap: 12, backdropFilter: "blur(12px)", boxShadow: "0 8px 30px rgba(0,0,0,.45)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, opacity: 0.75 }}>{finished ? "الراحة خلصت، كمّل المجموعة الجاية 💪" : "وقت الراحة"}</div>
        <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "var(--accent-text)" }}>{fmtClock(left)}</div>
        <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,.1)", marginTop: 4 }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: "var(--accent-text)", transition: "width .25s linear" }} />
        </div>
      </div>
      {!finished && (
        <button type="button" onClick={() => { const n = endAt + 15000; setEndAt(n); setTotal((t) => t + 15); }}
          style={{ background: "none", border: "1px solid var(--border-soft)", color: "inherit", borderRadius: 10, padding: "6px 10px", fontWeight: 700, cursor: "pointer" }}>+15</button>
      )}
      <button type="button" onClick={() => setEndAt(0)}
        style={{ background: "none", border: "1px solid var(--border-soft)", color: "inherit", borderRadius: 10, padding: "6px 10px", fontWeight: 700, cursor: "pointer" }}>{finished ? "تمام" : "تخطي"}</button>
    </div>
  );
}
