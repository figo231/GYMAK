import { fetchAppActivity } from '../../lib/appActivity';
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DetailTopBar } from "../../components/layout/DetailShell";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { isOwnerAdmin } from "../../lib/push/ownerBroadcast";
import { fetchFeedback, setFeedbackStatus, replyFeedback, countByStatus, filterFeedback, STATUS_LABEL } from "../../lib/admin";
import { fetchOwnerStats } from "../../lib/privateChat";
import OwnerChatRoles from "../Owner/OwnerChatRoles";
import { dayLabel } from "../../lib/historyLogic";
import { tx } from "../../lib/i18n/tx";

const FILTERS = [["all", tx("الكل")], ["new", tx("جديدة")], ["read", tx("اتقرأت")], ["replied", tx("اترد عليها")]];

function AdminSession() {
  const { user } = useAuth();
  const toast = useToast();
  const [allowed, setAllowed] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity,setActivity]=useState(null);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("new");
  const [replying, setReplying] = useState(null);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try{setActivity(await fetchAppActivity());}catch{setActivity(null);}
    try { setRows(await fetchFeedback()); setErr(""); } catch { setErr(tx("معرفناش نحمّل الرسايل.")); }
    try { setStats(await fetchOwnerStats()); } catch { setErr(tx("معرفناش نحمّل الإحصائيات. جرّب تحديث الصفحة.")); }
  }
  useEffect(() => { isOwnerAdmin(user?.id).then((ok) => { setAllowed(ok); if (ok) load(); }); }, [user?.id]);

  const counts = useMemo(() => countByStatus(rows), [rows]);
  const shown = filterFeedback(rows, filter);

  async function mark(r, status) {
    const ok = await setFeedbackStatus(r.id, status);
    if (!ok) { toast(tx("معرفناش نحدّث الحالة")); return; }
    setRows((x) => x.map((y) => (y.id === r.id ? { ...y, status } : y)));
  }
  async function sendReply(r) {
    const res = await replyFeedback(r.id, draft);
    if (!res.ok) { toast(res.error); return; }
    toast(tx("الرد اتبعت")); setReplying(null); setDraft(""); load();
  }

  if (allowed === null) return <div className="help-page"><DetailTopBar title={tx("الإدارة")} backTo="/profile" /></div>;
  if (!allowed) return <div className="help-page"><DetailTopBar title={tx("الإدارة")} backTo="/profile" /><p className="notif-note">{tx("الصفحة دي للمالك بس.")}</p></div>;
  const n = (v) => (v == null ? "–" : v);
  return (
    <div className="help-page ad-page">
      <DetailTopBar title={tx("لوحة الإدارة")} backTo="/profile" />
      <div className="th-stats ad-stats">
        <div><b>{n(stats?.total)}</b><span>{tx("ملف شخصي على السيرفر")}</span></div>
        <div><b>{n(stats?.week)}</b><span>{tx("بروفايلات اتعملت آخر 7 أيام")}</span></div>
        <div><b>{counts.new}</b><span>{tx("رسايل جديدة")}</span></div>
      </div>
      <p className="notif-note">{tx("راجل")} {n(stats?.male)} {tx("· ست")} {n(stats?.female)}</p>
      <h2>{tx("حسابات فعّلت المشاركة وفتحت التطبيق (اختياري)")}</h2><p className="notif-note">{tx("ده مش عدد المسجلين. بيعدّ بس الحسابات اللي فعّلت زر المشاركة من البروفايل وفتحت التطبيق في اليوم (حسب UTC). طبيعي يكون أقل بكتير من عدد المسجلين. يبدأ من تفعيل الميزة، مفيش أرقام تاريخية.")}</p>
      {activity ? <div className="th-stats ad-stats"><div><b>{activity.today}</b><span>{tx("اليوم")}</span></div><div><b>{activity.week}</b><span>{tx("آخر 7 أيام")}</span></div><div><b>{activity.month}</b><span>{tx("آخر 30 يوم")}</span></div></div> : <p className="notif-note">{tx("القياس غير متاح الآن.")}</p>}
      <OwnerChatRoles />
      <h2 style={{ fontSize: 18, marginTop: 28 }}>{tx("رسائل الدعم")}</h2>
      <p className="notif-note">{tx("آخر 100 رسالة دعم، مش قائمة كل المستخدمين.")}</p>
      <div className="goal-tabs" role="tablist">
        {FILTERS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} className={"goal-tab" + (filter === k ? " on" : "")} onClick={() => setFilter(k)}>{l}{k !== "all" ? ` (${counts[k]})` : ""}</button>
        ))}
      </div>
      {err && <div className="ct-err" role="alert">{err}</div>}
      {!err && shown.length === 0 && <p className="notif-note">{tx("مفيش رسايل هنا.")}</p>}
      {shown.map((r) => (
        <div key={r.id} className="glass ad-msg">
          <div className="ad-meta"><b>{r.who}</b><span>{dayLabel(r.created_at.slice(0, 10))} · {STATUS_LABEL[r.status]}{r.app_version ? ` · v${r.app_version}` : ""}</span></div>
          <p className="ad-text">{r.message}</p>
          {r.admin_reply && <p className="ad-reply"><b>{tx("ردك:")}</b> {r.admin_reply}</p>}
          {replying === r.id ? (
            <div>
              <textarea className="food-input" rows={4} maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tx("اكتب الرد...")} aria-label={tx("الرد")} />
              <div className="ad-actions">
                <button type="button" className="btn btn-primary" onClick={() => sendReply(r)}>{tx("ابعت الرد")}</button>
                <button type="button" className="btn" onClick={() => { setReplying(null); setDraft(""); }}>{tx("إلغاء")}</button>
              </div>
            </div>
          ) : (
            <div className="ad-actions">
              <button type="button" className="btn btn-primary" onClick={() => { setReplying(r.id); setDraft(r.admin_reply || ""); }}>{r.admin_reply ? tx("عدّل الرد") : tx("رد")}</button>
              {r.status === "new" && <button type="button" className="btn" onClick={() => mark(r, "read")}>{tx("علّم كمقروءة")}</button>}
              {r.status === "read" && <button type="button" className="btn" onClick={() => mark(r, "new")}>{tx("رجّعها جديدة")}</button>}
            </div>
          )}
        </div>
      ))}
      <Link to="/owner" className="btn" style={{ display: "block", textAlign: "center", marginTop: 12 }}>{tx("لوحة المالك (إشعارات ومحتوى)")}</Link>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  return <AdminSession key={user?.id || "guest"} />;
}
