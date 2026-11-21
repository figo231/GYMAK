import { useEffect, useState } from "react";
import { DetailTopBar } from "../../components/layout/DetailShell";
import { useToast } from "../../hooks/useToast";
import { isCoach, myInvites, respondInvite, inviteTrainee, myTrainees, revokeLink, traineeReport } from "../../lib/coach/coachApi";

const card = { padding: 12, borderRadius: 14, border: "1px solid var(--border-soft)", background: "rgba(var(--ink), .04)", marginBottom: 10 };
const ghost = { background: "none", border: "1px solid var(--border-soft)", borderRadius: 10, padding: "6px 12px", cursor: "pointer", color: "inherit", fontWeight: 700, fontSize: 12 };
const dot = (n) => ({ width: 10, height: 10, borderRadius: 10, display: "inline-block", background: n >= 4 ? "#4ade80" : n >= 2 ? "#facc15" : "#f87171" });

function Detail({ trainee, onClose }) {
  const [r, setR] = useState(null);
  useEffect(() => { traineeReport(trainee.trainee_id).then(setR).catch(() => setR({ errors: true })); }, [trainee.trainee_id]);
  const Row = ({ k, v }) => (<div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-soft)", fontSize: 13 }}><span style={{ opacity: 0.7 }}>{k}</span><b>{v}</b></div>);
  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet" style={{ maxHeight: "86vh", overflowY: "auto" }}>
        <div className="edit-sheet-handle" />
        <h3>{r?.name || trainee.trainee_email}</h3>
        {!r ? <p className="notif-note">بيحمّل...</p> : r.errors && r.last7 === undefined ? <p className="notif-note">مقدرناش نجيب البيانات.</p> : (
          <>
            <Row k="آخر تمرين" v={r.lastWorkout || "لسه"} />
            <Row k="أيام التمرين آخر 7 أيام" v={`${r.last7} / 7`} />
            <Row k="أيام متتالية" v={r.streak} />
            <Row k="أيام التمرين آخر 30 يوم" v={r.days30} />
            <Row k="الوزن" v={r.weightLast ? `${r.weightLast.weight} كجم${r.weightFirst && r.weightFirst.date !== r.weightLast.date ? ` (من ${r.weightFirst.weight})` : ""}` : "مفيش"} />
            <Row k="متوسط السعرات" v={r.avgKcal != null ? `${r.avgKcal} سعر` : "مفيش"} />
            <Row k="متوسط البروتين" v={r.avgProtein != null ? `${r.avgProtein} جم` : "مفيش"} />
            {r.prs.length > 0 && <div style={{ marginTop: 10, fontWeight: 800, fontSize: 13 }}>آخر الأرقام القياسية</div>}
            {r.prs.map((p, i) => (<Row key={i} k={p.exercise_name} v={`${p.weight} كجم`} />))}
          </>
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

  async function load() {
    try {
      const c = await isCoach();
      setCoach(c);
      setInvites(await myInvites());
      if (c) {
        const t = await myTrainees();
        setTrainees(t);
        t.filter((x) => x.status === "active" && x.trainee_id).forEach((x) => traineeReport(x.trainee_id).then((r) => setReports((p) => ({ ...p, [x.id]: r }))).catch(() => {}));
      }
    } catch (e) { toast("فشل التحميل: " + e.message); }
  }
  useEffect(() => { load(); }, []);

  async function answer(id, ok) { try { await respondInvite(id, ok); load(); toast(ok ? "اتفعّل المدرب ✅" : "اتلغى"); } catch (e) { toast("فشل: " + e.message); } }
  async function invite() { try { await inviteTrainee(email); setEmail(""); load(); toast("اتبعتت الدعوة ✅"); } catch (e) { toast(e.message); } }
  async function revoke(id) { try { await revokeLink(id); load(); } catch (e) { toast("فشل: " + e.message); } }

  return (
    <>
      <DetailTopBar backTo="/profile" title="المدربين" />
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

      {coach && (
        <>
          <div style={{ fontWeight: 800, fontSize: 13.5, margin: "16px 0 8px" }}>المتدربين</div>
          <div style={card}>
            <div className="edit-field"><label>ضيف متدرب بإيميله (لازم يكون مسجل في GYMAK)</label><input dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={invite}>إرسال دعوة</button>
          </div>
          {trainees.length === 0 && <p className="notif-note">لسه مفيش متدربين.</p>}
          {trainees.map((t) => {
            const r = reports[t.id];
            return (
              <div key={t.id} style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
                {t.status === "active" && r ? <span style={dot(r.last7)} /> : <span style={{ ...dot(0), background: "#888" }} />}
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => t.status === "active" && t.trainee_id && setOpen(t)}>
                  <div dir="ltr" style={{ fontSize: 13, fontWeight: 700 }}>{r?.name || t.trainee_email}</div>
                  <div style={{ fontSize: 11.5, opacity: 0.7 }}>{t.status === "pending" ? "في انتظار القبول" : r ? `${r.last7}/7 أيام، آخر تمرين ${r.lastWorkout || "لسه"}` : "..."}</div>
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
