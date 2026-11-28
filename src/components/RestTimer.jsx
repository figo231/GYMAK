import { useEffect, useRef, useState } from "react";
import { fmtClock, remaining, getRestSettings } from "../lib/rest/restTimer";
import { tx } from "../lib/i18n/tx";

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

async function notifyIfHidden() {
  try {
    if (typeof document === "undefined" || !document.hidden) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const title = tx("الراحة خلصت، كمّل المجموعة الجاية 💪");
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.showNotification) await reg.showNotification(title, { icon: "/icon-192.png", tag: "gymak-rest" });
  } catch { /* optional */ }
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
    const tick = () => {
      const r = remaining(endAt);
      setLeft(r);
      if (r <= 0 && !done.current) {
        done.current = true;
        beep();
        notifyIfHidden();
        setTimeout(() => setEndAt(0), 4000);
      }
    };
    const id = setInterval(tick, 250);
    // Background tabs throttle timers; the end time is absolute, so re-check as soon as the app is visible again.
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [endAt]);

  if (!endAt) return null;
  const finished = left <= 0;
  const pct = Math.min(100, Math.max(0, ((total - left) / total) * 100));
  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", insetInline: 12, bottom: "calc(84px + env(safe-area-inset-bottom, 0px))", zIndex: 60,
      background: "rgba(20,18,12,.96)", color: "#f6efdc", border: "1px solid rgba(217,184,99,.35)", borderRadius: 16, padding: "10px 14px",
      display: "flex", alignItems: "center", gap: 12, backdropFilter: "blur(12px)", boxShadow: "0 8px 30px rgba(0,0,0,.45)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, opacity: 0.75 }}>{finished ? tx("الراحة خلصت، كمّل المجموعة الجاية 💪") : tx("وقت الراحة")}</div>
        <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#e3c06a" }}>{fmtClock(left)}</div>
        <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,.1)", marginTop: 4 }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: "#e3c06a", transition: "width .25s linear" }} />
        </div>
      </div>
      {!finished && (
        <button type="button" onClick={() => { const n = endAt + 15000; setEndAt(n); setTotal((t) => t + 15); }}
          style={{ background: "none", border: "1px solid rgba(217,184,99,.5)", color: "#f6efdc", borderRadius: 10, padding: "6px 10px", fontWeight: 700, cursor: "pointer" }}>+15</button>
      )}
      <button type="button" onClick={() => setEndAt(0)}
        style={{ background: "none", border: "1px solid rgba(217,184,99,.5)", color: "#f6efdc", borderRadius: 10, padding: "6px 10px", fontWeight: 700, cursor: "pointer" }}>{finished ? tx("تمام") : tx("تخطي")}</button>
    </div>
  );
}
