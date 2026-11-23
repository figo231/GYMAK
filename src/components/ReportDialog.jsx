import { useState } from "react";
import { REPORT_REASONS, moderationError, validateReportDetails } from "../lib/moderation";
import { tx } from "../lib/i18n/tx";

// Shared report sheet: pick a reason, optional details, submit. The parent passes
// submit(reason, details) and decides what target gets reported.
export default function ReportDialog({ title, hint, onClose, submit }) {
  const [reason, setReason] = useState("abuse");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function send() {
    if (busy) return;
    const v = validateReportDetails(details);
    if (!v.ok) { setErr(v.error); return; }
    setBusy(true); setErr("");
    try { await submit(reason, v.details); onClose(); }
    catch (e) { setErr(moderationError(e)); setBusy(false); }
  }
  return (
    <div className="report-sheet-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <section className="report-sheet glass" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {hint && <p className="report-sheet-hint">{hint}</p>}
        <div className="report-reasons" role="radiogroup" aria-label={tx("سبب البلاغ")}>
          {REPORT_REASONS.map(([code, label]) => (
            <label key={code} className="report-reason">
              <input type="radio" name="report-reason" value={code} checked={reason === code} onChange={() => setReason(code)} />
              {label}
            </label>
          ))}
        </div>
        <textarea rows={3} maxLength={1000} value={details} onChange={(e) => { setDetails(e.target.value); setErr(""); }} placeholder={tx("تفاصيل إضافية (اختياري)")} aria-label={tx("تفاصيل إضافية")} />
        {err && <p className="pc-error" role="alert">{err}</p>}
        <div className="report-sheet-actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={send}>{busy ? tx("بيتبعت...") : tx("إرسال البلاغ")}</button>
          <button type="button" className="pc-small" disabled={busy} onClick={onClose}>{tx("إلغاء")}</button>
        </div>
        <small>{tx("البلاغ بيوصل لصاحب التطبيق مع المحتوى المُبلَّغ عنه بس، وبيراجعه في أقرب وقت.")}</small>
      </section>
    </div>
  );
}
