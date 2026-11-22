import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { sendFeedback, PUBLIC_EMAIL } from "../../lib/feedback";

export default function Contact() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  async function send() {
    if (busy) return;
    setBusy(true); setErr("");
    const r = await sendFeedback(text);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setDone(r.id ? r.id.slice(0, 8) : "ok"); setText("");
  }
  return (
    <div className="ct-page">
      <div className="section-head"><h1 className="section-title">تواصل معانا</h1></div>
      {done ? (
        <div className="glass ct-done" role="status">
          <b>وصلتنا رسالتك ✓</b>
          <p>شكرًا ليك. هنقراها ونرد عليك على إيميل حسابك لو محتاجة رد.</p>
          {done !== "ok" && <small dir="ltr">ref: {done}</small>}
          <button type="button" className="btn" style={{ width: "100%", marginTop: 12 }} onClick={() => setDone(null)}>ابعت رسالة تانية</button>
        </div>
      ) : user ? (
        <div className="glass ct-form">
          <p>مشكلة، فكرة، أو أي حاجة ناقصة؟ اكتب لنا.</p>
          <textarea className="food-input" rows={6} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالتك هنا..." aria-label="رسالتك" />
          <div className="ct-count" dir="ltr">{text.length} / 2000</div>
          {err && <div className="ct-err" role="alert">{err}</div>}
          <button type="button" className="btn btn-primary" style={{ width: "100%" }} disabled={busy || text.trim().length < 5} onClick={send}>{busy ? "بيتبعت..." : "ابعت"}</button>
        </div>
      ) : (
        <div className="glass ct-form">
          <p>سجّل دخولك عشان تبعت رسالة من جوه التطبيق، أو ابعت لنا على الإيميل.</p>
          <Link to="/auth/login" className="btn btn-primary" style={{ display: "block", textAlign: "center", marginBottom: 8 }}>تسجيل الدخول</Link>
          <a className="btn" style={{ display: "block", textAlign: "center" }} href={`mailto:${PUBLIC_EMAIL}`}>{PUBLIC_EMAIL}</a>
        </div>
      )}
    </div>
  );
}
