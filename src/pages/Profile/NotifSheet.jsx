import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getInbox, importDelivered, getPushPermission, initBroadcastPush, deleteInboxItem, clearInbox } from "../../lib/push/pushService";
import { BROADCAST_ENABLED, isOwnerAdmin, sendBroadcast } from "../../lib/push/ownerBroadcast";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { tx } from "../../lib/i18n/tx";

/* Notifications only: a clean inbox (delete one / clear all). The daily
   reminder lives in its own settings row (ReminderSheet). Owners also get a
   compose box to broadcast a notification from inside the app. */
export default function NotifSheet({ onClose }) {
  const toast = useToast();
  const { user } = useAuth();
  const [inbox, setInbox] = useState(getInbox());
  const [perm, setPerm] = useState(null);
  const [owner, setOwner] = useState(false);
  const [compose, setCompose] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const upd = () => setInbox(getInbox());
    window.addEventListener("gymak-inbox", upd);
    importDelivered().then(upd);
    getPushPermission().then(setPerm);
    return () => window.removeEventListener("gymak-inbox", upd);
  }, []);
  useEffect(() => { if (BROADCAST_ENABLED) isOwnerAdmin(user?.id).then(setOwner); }, [user?.id]);

  async function enablePush() {
    await initBroadcastPush();
    setPerm(await getPushPermission());
  }

  async function send() {
    if (!title.trim() || !body.trim() || sending) return;
    setSending(true);
    try {
      await sendBroadcast({ title: title.trim(), body: body.trim() });
      toast(tx("اتبعت الإشعار لكل المستخدمين ✅"));
      setTitle(""); setBody(""); setCompose(false);
    } catch (e) {
      toast("معرفناش نبعت الإشعار: " + (e?.message || tx("خطأ")));
    } finally { setSending(false); }
  }

  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet" style={{ maxHeight: "86vh", overflowY: "auto" }}>
        <div className="edit-sheet-handle" />
        <h3>{tx("الإشعارات")}</h3>
        <p className="notif-note">{perm === null ? tx("بنتحقق من إذن الإشعارات...") : perm === "unsupported" ? tx("إشعارات الدفع متاحة في تطبيق الأندرويد، مش المتصفح. إعدادات التذكير منفصلة عن الرسائل الواردة.") : perm === "granted" ? tx("إذن الإشعارات مفعّل على الجهاز. ده مش تأكيد إن إشعار تجريبي وصل أو إن الإرسال من السيرفر شغّال.") : tx("حالة إذن الإشعارات على الجهاز:")}</p>
        <Link className="btn btn-secondary" style={{ display: "block", textAlign: "center", marginBottom: 10 }} to="/notifications" onClick={onClose}>{tx("إعدادات التذكير والتنبيهات")}</Link>
        <h4>{tx("الرسائل الواردة")}</h4>

        {perm === "denied" && <p className="notif-note">{tx("الإشعارات مقفولة للتطبيق. فعّلها من إعدادات الموبايل.")}</p>}
        {(perm === "prompt" || perm === "prompt-with-rationale") && <button type="button" className="btn-apply" style={{ width: "100%", marginBottom: 10 }} onClick={enablePush}>{tx("تفعيل إشعارات التطبيق")}</button>}

        {owner && (
          <div style={{ marginBottom: 12 }}>
            {!compose ? (
              <button type="button" className="btn-apply" style={{ width: "100%" }} onClick={() => setCompose(true)}>{tx("+ إشعار جديد لكل المستخدمين")}</button>
            ) : (
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border-soft)", background: "rgba(var(--ink), .04)" }}>
                <div className="edit-field"><label>{tx("العنوان")}</label><input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} /></div>
                <div className="edit-field"><label>{tx("النص")}</label><textarea rows={3} maxLength={240} value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", font: "inherit" }} /></div>
                <div className="edit-sheet-actions">
                  <button type="button" onClick={() => setCompose(false)}>{tx("إلغاء")}</button>
                  <button type="button" disabled={sending || !title.trim() || !body.trim()} onClick={send} style={{ background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "var(--on-acc, #111)" }}>{sending ? tx("بيتبعت...") : tx("إرسال")}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {inbox.length === 0 ? (
          <p className="notif-note">{tx("مفيش إشعارات محفوظة لسه. الإشعارات اللي يقدر التطبيق يلتقطها أو يستوردها من الجهاز هتظهر هنا.")}</p>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {inbox.map((n) => (
                <div key={n.id} style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(var(--ink), .05)", border: "1px solid var(--border-soft)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{n.body}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 4 }}>{new Date(n.ts).toLocaleString("ar-EG")}</div>
                  </div>
                  <button type="button" aria-label={tx("مسح الإشعار")} onClick={() => deleteInboxItem(n.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", padding: 4 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="edit-sheet-actions" style={{ marginTop: 12 }}>
              <button type="button" onClick={clearInbox}>{tx("مسح الكل")}</button>
              <button type="button" onClick={onClose}>{tx("إغلاق")}</button>
            </div>
          </>
        )}
        {inbox.length === 0 && (
          <div className="edit-sheet-actions" style={{ marginTop: 12 }}><button type="button" onClick={onClose}>{tx("إغلاق")}</button></div>
        )}
      </div>
    </div>
  );
}
