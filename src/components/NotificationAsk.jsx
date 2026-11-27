import { useEffect, useState } from "react";
import { getNotificationPermission, requestNotificationPermission } from "../lib/push/nativeReminder";
import { tx } from "../lib/i18n/tx";
import { isEn } from "../lib/i18n/lang";
import "./notificationAsk.css";

const KEY = "gymak_notif_ask_v1";
const MAX_ASKS = 2;
const WAIT_MS = 3 * 24 * 3600 * 1000;

export function shouldAskAgain(raw, now = Date.now()) {
  try {
    const s = raw ? JSON.parse(raw) : null;
    if (!s) return true;
    if (s.done) return false;
    if (!(s.n < MAX_ASKS)) return false;
    return now - Number(s.at || 0) >= WAIT_MS;
  } catch { return true; }
}

const remember = (patch) => {
  try {
    const cur = JSON.parse(localStorage.getItem(KEY) || "{}");
    localStorage.setItem(KEY, JSON.stringify({ n: 0, ...cur, ...patch, at: Date.now() }));
  } catch { /* storage full or blocked: the ask simply shows again next time */ }
};

// One-time, friendly ask for notification permission after the first open.
// It never schedules anything by itself: reminders stay opt-in in Profile.
export default function NotificationAsk() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let live = true, tries = 0, timer;
    const check = async () => {
      if (!live) return;
      if (!shouldAskAgain(localStorage.getItem(KEY))) return;
      const busy = location.pathname.startsWith("/auth") || document.querySelector('[role="dialog"],[role="alertdialog"]');
      if (busy) { if (++tries < 12) timer = setTimeout(check, 5000); return; }
      const perm = await getNotificationPermission();
      if (!live) return;
      if (perm !== "prompt") { if (perm === "granted") remember({ done: true }); return; }
      setOpen(true);
    };
    timer = setTimeout(check, 4000);
    return () => { live = false; clearTimeout(timer); };
  }, []);

  if (!open) return null;
  const close = () => setOpen(false);
  async function allow() {
    const r = await requestNotificationPermission();
    remember({ done: true, result: r });
    setResult(r);
  }
  function later() {
    const cur = (() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } })();
    remember({ n: (cur.n || 0) + 1 });
    close();
  }
  return (
    <section className="nask" role="region" aria-label={tx("إشعارات GYMAK")} dir={isEn() ? "ltr" : "rtl"}>
      {result === null ? (
        <>
          <strong>{tx("تفعيل الإشعارات؟")}</strong>
          <p>{tx("تذكير بتمرينك وتنبيهات التطبيق. مجاني، وانت اللي بتختار الميعاد من حسابي. تقدر توقفها في أي وقت.")}</p>
          <div className="nask-row">
            <button type="button" className="btn btn-primary" onClick={allow}>{tx("تفعيل الإشعارات")}</button>
            <button type="button" className="btn" onClick={later}>{tx("مش دلوقتي")}</button>
          </div>
        </>
      ) : (
        <>
          <strong>{result === "granted" ? tx("الإشعارات اتفعلت") : tx("الإشعارات مقفولة")}</strong>
          <p>{result === "granted"
            ? tx("اختار ميعاد تذكير التمرين من حسابي، الإشعارات.")
            : tx("تقدر تفعّلها بعدين من إعدادات الموبايل أو من حسابي، الإشعارات.")}</p>
          <div className="nask-row"><button type="button" className="btn btn-primary" onClick={close}>{tx("تمام")}</button></div>
        </>
      )}
    </section>
  );
}
