import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { DetailTopBar } from "../../components/layout/DetailShell";
import { useToast } from "../../hooks/useToast";
import Store from "../../lib/store/gymakStore";
import { sentAssignments, assignProgram, latestAssignment, isCoach, myInvites, respondInvite, inviteTrainee, myTrainees, revokeLink, traineeReport } from "../../lib/coach/coachApi";
import { activityStrip, attention, filterTrainees, sortTrainees, summarize, weightTrend } from "../../lib/coach/dashboard";

const card = { padding: 12, borderRadius: 14, border: "1px solid var(--border-soft)", background: "rgba(var(--ink), .04)", marginBottom: 10 };
const ghost = { background: "none", border: "1px solid var(--border-soft)", borderRadius: 10, padding: "6px 12px", cursor: "pointer", color: "inherit", fontWeight: 700, fontSize: 12 };
const LEVEL = { ok: ["#4ade80", "ماشي كويس"], watch: ["#facc15", "محتاج متابعة"], risk: ["#f87171", "واقف"], unknown: ["#888", "..."] };
const dot = (level) => ({ width: 10, height: 10, borderRadius: 10, display: "inline-block", background: LEVEL[level]?.[0] || "#888", flexShrink: 0 });

function Spark({ trend }) {
  if (!trend) return null;
  const W = 260, H = 44, pts = trend.points.map((p) => `${(p.x * (W - 8) + 4).toFixed(1)},${(p.y * (H - 8) + 4).toFixed(1)}`).join(" ");
  return (
    <div style={{ marginTop: 8 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-label="منحنى الوزن"><polyline points={pts} fill="none" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <div style={{ fontSize: 12, opacity: 0.75 }}>التغيير في آخر 30 يوم: <b dir="ltr" style={{ unicodeBidi: "isolate" }}>{trend.change > 0 ? "+" : ""}{trend.change}</b> كجم</div>
    </div>
  );
}

function Detail({ trainee, onClose }) {
  const [r, setR] = useState(null);
  const toast = useToast();
  const [prog, setProg] = useState(() => Store.getPrograms()[0]?.id);
  const [sent, setSent] = useState([]);
  useEffect(() => { sentAssignments(trainee.trainee_id).then(setSent); }, [trainee.trainee_id]);
  async function send() {
    try { await assignProgram(trainee.trainee_id, prog); toast("اتبعت البرنامج للمتدرب ✅"); setSent(await sentAssignments(trainee.trainee_id)); }
    catch (e) { toast("فشل الإرسال: " + e.message); }
  }
  useEffect(() => { traineeReport(trainee.trainee_id).then(setR).catch(() => setR({ errors: true })); }, [trainee.trainee_id]);
  const Row = ({ k, v }) => (<div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-soft)", fontSize: 13 }}><span style={{ opacity: 0.7 }}>{k}</span><b>{v}</b></div>);
  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet" style={{ maxHeight: "86vh", overflowY: "auto" }}>
        <div className="edit-sheet-handle" />
        <h3>{r?.name || trainee.trainee_email}</h3>
        {!r ? <p className="notif-note">بيحمّل...</p> : r.errors && r.last7 === undefined ? <p className="notif-note">مقدرناش نجيب البيانات.</p> : (
          <>
            <div style={{ display: "flex", gap: 2, margin: "4px 0 8px" }} aria-label="نشاط آخر 30 يوم">
              {activityStrip(r.dayList, 30).map((d) => <span key={d.date} title={d.date} style={{ flex: 1, height: 14, borderRadius: 3, background: d.trained ? "var(--accent-text)" : "rgba(128,128,128,.25)" }} />)}
            </div>
            <Row k="آخر تمرين" v={r.lastWorkout || "لسه"} />
            <Row k="أيام التمرين آخر 7 أيام" v={`${r.last7} من 7`} />
            <Row k="أيام متتالية" v={r.streak} />
            <Row k="أيام التمرين آخر 30 يوم" v={r.days30} />
            <Row k="الوزن" v={r.weightLast ? `${r.weightLast.weight} كجم${r.weightFirst && r.weightFirst.date !== r.weightLast.date ? ` (من ${r.weightFirst.weight})` : ""}` : "مفيش"} />
            <Row k="متوسط السعرات" v={r.avgKcal != null ? `${r.avgKcal} سعر` : "مفيش"} />
            <Row k="متوسط البروتين" v={r.avgProtein != null ? `${r.avgProtein} جم` : "مفيش"} />
            <Spark trend={weightTrend(r.weights)} />
            {r.prs.length > 0 && <div style={{ marginTop: 10, fontWeight: 800, fontSize: 13 }}>آخر الأرقام القياسية</div>}
            {r.prs.map((p, i) => (<Row key={i} k={p.exercise_name} v={`${p.weight} كجم`} />))}
          </>
        )}
        <div style={{ marginTop: 14, fontWeight: 800, fontSize: 13 }}>ابعتله برنامج تدريب</div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <select value={prog} onChange={(e) => setProg(e.target.value)} style={{ flex: 1, padding: 9, borderRadius: 10, border: "1px solid var(--border-soft)", fontFamily: "inherit" }}>
            {Store.getPrograms().map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="button" className="btn btn-primary" style={{ padding: "9px 14px", borderRadius: 10 }} onClick={send}>إرسال</button>
        </div>
        {sent.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>اللي بعتّه قبل كده</div>
            {sent.map((a) => <div key={a.id} style={{ opacity: 0.8 }}>{Store.getPrograms().find((p) => p.id === a.program_id)?.name || a.program_id} · <span dir="ltr">{String(a.created_at).slice(0, 10)}</span></div>)}
          </div>
        )}
        <div className="edit-sheet-actions" style={{ marginTop: 12 }}><button type="button" onClick={onClose}>إغلاق</button></div>
      </div>
    </div>
  );
}

export default function Coach() {
  const toast = useToast();
  const [coach, setCoach] = useState(null);
  const [invites, setInvites] = useState([]);
  const [trainees, setTrainees] = useState([]);
  const [reports, setReports] = useState({});
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(null);
  const [assign, setAssign] = useState(null);
  const [q, setQ] = useState("");

  async function load() {
    try {
      const c = await isCoach();
      setCoach(c);
      setInvites(await myInvites());
      setAssign(await latestAssignment());
      if (c) {
        const t = await myTrainees();
        setTrainees(t);
        t.filter((x) => x.status === "active" && x.trainee_id).forEach((x) => traineeReport(x.trainee_id).then((r) => setReports((p) => ({ ...p, [x.id]: r }))).catch(() => {}));
      }
    } catch (e) { toast("فشل التحميل: " + e.message); }
  }
  useEffect(() => { load(); }, []);

  const sum = summarize(trainees, reports);
  const list = sortTrainees(filterTrainees(trainees, reports, q), reports);

  async function answer(id, ok) { try { await respondInvite(id, ok); load(); toast(ok ? "اتفعّل المدرب ✅" : "اتلغى"); } catch (e) { toast("فشل: " + e.message); } }
  async function invite() { try { await inviteTrainee(email); setEmail(""); load(); toast("اتبعتت الدعوة ✅"); } catch (e) { toast(e.message); } }
  async function revoke(id) { try { await revokeLink(id); load(); } catch (e) { toast("فشل: " + e.message); } }

  return (
    <>
      <DetailTopBar backTo="/training" title="المدربين" />
      <Link to="/professionals" className="btn btn-secondary" style={{display:"block",textAlign:"center",marginBottom:12,padding:12}}>المدربين المقترحين وطلبات التواصل ←</Link>
      <Link to="/messages" className="btn btn-primary" style={{ display: "block", textAlign: "center", marginBottom: 14 }}>رسائلي مع المدرب والدكتور ←</Link>
      <div style={{ fontWeight: 800, fontSize: 13.5, margin: "4px 0 8px" }}>مدربيني</div>
      {invites.length === 0 && <p className="notif-note">مفيش مدرب مربوط بحسابك. لو مدربك بعتلك دعوة هتظهر هنا.</p>}
      {invites.map((i) => (
        <div key={i.id} style={card}>
          <div dir="ltr" style={{ fontSize: 13, marginBottom: 6 }}>{i.coach_email || "مدرب"}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{i.status === "pending" ? "لو قبلت، المدرب هيشوف (للقراءة بس): اسمك وطولك، أيام تمرينك، وزنك، أكلك وسعراتك، وأرقامك القياسية. مش هيشوف إيميلك. تقدر توقف في أي وقت. تقبل؟" : "بيتابعك دلوقتي: بيشوف اسمك وطولك وتمرينك ووزنك وأكلك وأرقامك القياسية (للقراءة بس)."}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {i.status === "pending" && <button type="button" className="btn btn-primary" style={{ flex: 1, padding: 9, borderRadius: 10 }} onClick={() => answer(i.id, true)}>قبول</button>}
            <button type="button" style={{ ...ghost, flex: 1 }} onClick={() => answer(i.id, false)}>{i.status === "pending" ? "رفض" : "إيقاف المتابعة"}</button>
          </div>
        </div>
      ))}

      {assign && Store.getPrograms().some((p) => p.id === assign.program_id) && (
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>برنامج من مدربك</div>
          <div dir="ltr" style={{ fontSize: 12, opacity: 0.7 }}>{assign.coach_email}</div>
          <div style={{ fontSize: 14, fontWeight: 800, margin: "6px 0" }}>{Store.getPrograms().find((p) => p.id === assign.program_id).name}</div>
          {assign.note && <div style={{ fontSize: 12.5, marginBottom: 8 }}>{assign.note}</div>}
          <button type="button" className="btn btn-primary" style={{ width: "100%", padding: 9, borderRadius: 10 }}
            onClick={() => { Store.applyProgram(assign.program_id); toast("اتطبّق البرنامج على جدولك ✅"); }}>تطبيق البرنامج</button>
        </div>
      )}

      {coach && (
        <>
          <div style={{ fontWeight: 800, fontSize: 13.5, margin: "16px 0 8px" }}>المتدربين</div>
          <div style={card}>
            <div className="edit-field"><label>ضيف متدرب بإيميله (لازم يكون مسجل في GYMAK)</label><input dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={invite}>إرسال دعوة</button>
          </div>
          {trainees.length === 0 && <p className="notif-note">لسه مفيش متدربين.</p>}
          {trainees.length > 0 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 10 }} data-testid="coach-summary">
                {[["متدرب نشط", sum.active, null], ["ماشيين كويس", sum.ok, "ok"], ["محتاجين متابعة", sum.watch, "watch"], ["واقفين", sum.risk, "risk"]].map(([l, n, lv]) => (
                  <div key={l} style={{ ...card, marginBottom: 0, textAlign: "center", padding: "10px 4px" }}>
                    <b style={{ fontSize: 20, display: "block", color: lv ? LEVEL[lv][0] : "inherit" }}>{n}</b>
                    <span style={{ fontSize: 10.5, opacity: 0.75 }}>{l}</span>
                  </div>
                ))}
              </div>
              {(sum.avgLast7 != null || sum.pending > 0) && <p className="notif-note" style={{ marginTop: 0 }}>{sum.avgLast7 != null ? `متوسط الأسبوع: ${sum.avgLast7} أيام تمرين من 7` : ""}{sum.avgLast7 != null && sum.pending > 0 ? " · " : ""}{sum.pending > 0 ? `${sum.pending} دعوة في الانتظار` : ""}</p>}
              {trainees.length > 4 && <div className="edit-field"><input placeholder="دوّر باسم أو إيميل" value={q} onChange={(e) => setQ(e.target.value)} /></div>}
            </>
          )}
          {list.map((t) => {
            const r = reports[t.id];
            const level = t.status === "active" ? attention(r) : "unknown";
            return (
              <div key={t.id} style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={dot(level)} />
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => t.status === "active" && t.trainee_id && setOpen(t)}>
                  <div dir="ltr" style={{ fontSize: 13, fontWeight: 700 }}>{r?.name || t.trainee_email}</div>
                  <div style={{ fontSize: 11.5, opacity: 0.7 }}>{t.status === "pending" ? "في انتظار القبول" : r ? `${LEVEL[level][1]} · ${r.last7}/7 أيام، آخر تمرين ${r.lastWorkout || "لسه"}` : "..."}</div>
                </div>
                <button type="button" style={ghost} onClick={() => revoke(t.id)}>{t.status === "pending" ? "إلغاء" : "إزالة"}</button>
              </div>
            );
          })}
        </>
      )}
      {open && <Detail trainee={open} onClose={() => setOpen(null)} />}
    </>
  );
}
