import { useCallback, useEffect, useRef, useState } from "react";
import { REPORT_REASONS, REPORT_STATUS_LABELS, REPORT_TYPE_LABELS, fetchModerationReports, moderationError, setModerationReportStatus } from "../../lib/moderation";
import "../PrivateChat/privateChat.css";

const reasonLabel = (code) => REPORT_REASONS.find(([k]) => k === code)?.[1] || code;
function stamp(value) {
  try { return new Date(value).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
}

// Owner-only moderation queue. Lists exactly the content users reported; nothing else
// from user conversations is readable here by design.
export default function OwnerReports() {
  const [status, setStatus] = useState("open");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const [more, setMore] = useState(false);
  const request = useRef(0); const alive = useRef(true);

  const load = useCallback(async (cursor = null) => {
    const n = ++request.current; setBusy(true); setErr("");
    try {
      const list = await fetchModerationReports(status, cursor);
      if (!alive.current || n !== request.current) return;
      setRows((old) => cursor ? [...old, ...(list || []).filter((r) => !old.some((o) => o.id === r.id))] : list || []);
      setMore(list?.length === 50);
    } catch (e) { if (alive.current && n === request.current) setErr(moderationError(e)); }
    finally { if (alive.current && n === request.current) setBusy(false); }
  }, [status]);
  useEffect(() => { alive.current = true; setRows([]); load(); return () => { alive.current = false; request.current++; }; }, [load]);

  async function update(id, next) {
    if (saving) return; setSaving(id); setErr(""); setDone("");
    try {
      await setModerationReportStatus(id, next);
      if (!alive.current) return;
      setDone(`اتحفظت حالة البلاغ: ${REPORT_STATUS_LABELS[next]}.`);
      setRows((old) => old.map((r) => r.id === id ? { ...r, status: next } : r));
      if (status !== "all" && next !== status) setRows((old) => old.filter((r) => r.id !== id));
    } catch (e) { if (alive.current) setErr(moderationError(e)); }
    finally { if (alive.current) setSaving(""); }
  }

  return <section className="pc-role-panel glass" aria-label="بلاغات المستخدمين">
    <h2>بلاغات المستخدمين</h2>
    <p>هنا بيظهر بس المحتوى اللي مستخدم بلّغ عنه بالظبط (رسالة، مستخدم، أو رد دعم). مفيش قراءة عامة لمحادثات الناس. راجع البلاغات الجديدة بانتظام وخد إجراء: تحذير، سحب صفة من تبويب المستخدمون، أو حذف حساب لما يلزم.</p>
    <div className="pc-directory-search">
      <label htmlFor="owner-report-filter">الحالة</label>
      <select id="owner-report-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
        {[...Object.entries(REPORT_STATUS_LABELS), ["all", "الكل"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <button type="button" className="pc-small" disabled={busy} onClick={() => load()}>تحديث</button>
    </div>
    {err && <p className="pc-error" role="alert">{err}</p>}
    {done && <p className="pc-role-success" role="status">{done}</p>}
    {busy && !rows.length && <p role="status">بنحمّل البلاغات...</p>}
    {!busy && !rows.length && <p className="pc-hint">مفيش بلاغات في الحالة دي.</p>}
    {rows.map((r) => <article className="pc-role-row" key={r.id}>
      <div>
        <strong>{REPORT_TYPE_LABELS[r.target_type] || r.target_type} · {reasonLabel(r.reason)}</strong>
        <small>المُبلِغ: {r.reporter_label}{r.target_label ? ` · المُبلَّغ عنه: ${r.target_label}` : ""}</small>
        {r.content_snapshot && <small style={{ whiteSpace: "pre-wrap" }}>المحتوى: {r.content_snapshot}</small>}
        {r.details && <small style={{ whiteSpace: "pre-wrap" }}>تفاصيل المُبلِغ: {r.details}</small>}
        <small>{stamp(r.created_at)} · {REPORT_STATUS_LABELS[r.status] || r.status}</small>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {r.status === "open" && <button type="button" className="pc-small" disabled={!!saving} onClick={() => update(r.id, "reviewed")}>{saving === r.id ? "..." : "اتراجع"}</button>}
        {(r.status === "open" || r.status === "reviewed") && <button type="button" className="pc-small" disabled={!!saving} onClick={() => update(r.id, "actioned")}>{saving === r.id ? "..." : "اتخذ إجراء"}</button>}
        {r.status !== "dismissed" && <button type="button" className="pc-small" disabled={!!saving} onClick={() => update(r.id, "dismissed")}>{saving === r.id ? "..." : "رفض البلاغ"}</button>}
      </div>
    </article>)}
    {more && <button type="button" className="pc-small" disabled={busy} onClick={() => load(rows[rows.length - 1])}>بلاغات أقدم</button>}
  </section>;
}
