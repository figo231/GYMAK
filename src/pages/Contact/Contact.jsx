import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { sendFeedback, PUBLIC_EMAIL } from "../../lib/feedback";
import { fetchMyFeedback } from "../../lib/admin";
import { reportContent } from "../../lib/moderation";
import ReportDialog from "../../components/ReportDialog";
import { tx } from "../../lib/i18n/tx";

export default function Contact() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  const [mine, setMine] = useState([]);
  const [report, setReport] = useState(null);
  const [reported, setReported] = useState("");
  useEffect(() => { if (user) fetchMyFeedback().then(setMine); }, [user?.id, done]);
  const replied = mine.filter((m) => m.admin_reply);

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
      <div className="section-head"><h1 className="section-title">{tx("تواصل معانا")}</h1></div>
      {replied.length > 0 && (
        <div className="glass ct-replies">
          <b>{tx("ردود علينا")}</b>
          {replied.map((m) => (
            <div key={m.id} className="ct-reply"><p className="ct-q">{m.message}</p><p className="ct-a">{m.admin_reply}</p>
              <button type="button" className="pc-report-link" onClick={() => { setReport(m); setReported(""); }}>{tx("إبلاغ عن الرد")}</button></div>
          ))}
          {reported && <p className="notif-note" role="status">{reported}</p>}
        </div>
      )}
      {done ? (
        <div className="glass ct-done" role="status">
          <b>{tx("وصلتنا رسالتك ✓")}</b>
          <p>{tx("شكرًا ليك. هنقراها، ولو فيه رد هيظهرلك هنا في الصفحة دي.")}</p>
          {done !== "ok" && <small dir="ltr">ref: {done}</small>}
          <button type="button" className="btn" style={{ width: "100%", marginTop: 12 }} onClick={() => setDone(null)}>{tx("ابعت رسالة تانية")}</button>
        </div>
      ) : user ? (
        <div className="glass ct-form">
          <p>{tx("مشكلة، فكرة، أو أي حاجة ناقصة؟ اكتب لنا.")}</p>
          <textarea className="food-input" rows={6} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder={tx("اكتب رسالتك هنا...")} aria-label={tx("رسالتك")} />
          <div className="ct-count" dir="ltr">{text.length} / 2000</div>
          {err && <div className="ct-err" role="alert">{err}</div>}
          <button type="button" className="btn btn-primary" style={{ width: "100%" }} disabled={busy || text.trim().length < 5} onClick={send}>{busy ? tx("بيتبعت...") : tx("ابعت")}</button>
        </div>
      ) : (
        <div className="glass ct-form">
          <p>{tx("سجّل دخولك عشان تبعت رسالة من جوه التطبيق، أو ابعت لنا على الإيميل.")}</p>
          <Link to="/auth/login" className="btn btn-primary" style={{ display: "block", textAlign: "center", marginBottom: 8 }}>{tx("تسجيل الدخول")}</Link>
          <a className="btn" style={{ display: "block", textAlign: "center" }} href={`mailto:${PUBLIC_EMAIL}`}>{PUBLIC_EMAIL}</a>
        </div>
      )}
      {report && <ReportDialog
        title={tx("إبلاغ عن رد الدعم")}
        hint={tx("نص الرد هيتبعت مع البلاغ لصاحب التطبيق للمراجعة.")}
        onClose={() => setReport(null)}
        submit={async (reason, details) => { await reportContent({ targetType: "support_reply", reason, feedbackId: report.id, details }); setReported(tx("وصل البلاغ. شكرًا ليك.")); }} />}
    </div>
  );
}
