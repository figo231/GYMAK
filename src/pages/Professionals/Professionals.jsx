import VerifiedBadge from "../../components/VerifiedBadge";
import ChatAvatar from "../../components/ChatAvatar";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DetailTopBar } from '../../components/layout/DetailShell';
import { useAuth } from '../../hooks/useAuth';
import { CHAT_ROLE_LABELS, startChat } from '../../lib/privateChat';
import { answerProfessionalRequest, listProfessionalRequests, listProfessionals, professionalError, requestProfessional, REQUEST_LABELS } from '../../lib/professionals';
import '../PrivateChat/privateChat.css';
import './professionals.css';
import { tx, txf } from "../../lib/i18n/tx";

function Requests({ userId }) {
  const nav = useNavigate(), [rows, setRows] = useState([]), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [more, setMore] = useState(false);
  const live = useRef(true), epoch = useRef(0);
  const load = useCallback(async (cursor = null) => {
    const n = ++epoch.current; setBusy(true); setErr('');
    try { const r = await listProfessionalRequests(cursor); if (live.current && n === epoch.current) { setRows(old => cursor ? [...old, ...(r || []).filter(x => !old.some(o => o.id === x.id))] : r || []); setMore(r?.length === 50); } }
    catch (e) { if (live.current && n === epoch.current) setErr(professionalError(e)); }
    finally { if (live.current && n === epoch.current) setBusy(false); }
  }, []);
  useEffect(() => { live.current = true; load(); const update = () => { if (!document.hidden) load(); }; document.addEventListener('visibilitychange', update); window.addEventListener('online', update); return () => { live.current = false; epoch.current++; document.removeEventListener('visibilitychange', update); window.removeEventListener('online', update); }; }, [load]);
  async function answer(r, action) { if (busy) return; setBusy(true); setErr(''); try { await answerProfessionalRequest(r.id, action); if (live.current) await load(); } catch (e) { if (live.current) { setErr(professionalError(e)); setBusy(false); } } }
  async function open(r) { if (busy) return; setBusy(true); setErr(''); try { const id = await startChat(r.peer_id, r.kind); if (live.current) nav(`/messages/${id}`); } catch (e) { if (live.current) { setErr(professionalError(e)); setBusy(false); } } }
  return <section aria-label={tx("طلبات التواصل")} className="pro-requests">
    <div className="pc-heading"><h2>{tx("طلبات التواصل")}</h2><button className="pc-small" disabled={busy} onClick={() => load()}>{tx("تحديث الطلبات")}</button></div>
    <p className="pc-hint">{tx("الطلب بيشارك الاسم الظاهر بس، من غير إيميل أو بيانات تمرين. القبول بيفتح رسائل خاصة فقط، ومش بيفعّل متابعة التمرين. مفيش إشعارات خلفية أو ضمان لرد فوري.")}</p>
    {err && <p className="pc-error" role="alert">{err}</p>}
    {busy && <p role="status">{tx("بنحدّث الطلبات...")}</p>}
    {!busy && !err && !rows.length && <p className="pc-empty glass">{tx("لسه مفيش طلبات تواصل.")}</p>}
    <div className="pc-list">{rows.map(r => <article className="pro-card glass" key={r.id}>
      <small>{r.incoming ? tx('طلب وارد من') : tx('طلبك إلى')}</small><h3>{r.peer_label}</h3><p className="pc-hint">{CHAT_ROLE_LABELS[r.kind]} · {REQUEST_LABELS[r.status]}{!r.available ? tx(' · الصفة أو خدمة الرسائل غير متاحة حاليا') : ''}</p>
      {r.incoming && r.status === 'pending' && <p className="pc-hint">{tx("قبولك بيسمح للطرف ده يراسلك داخل التطبيق بس. راجع")} <Link to="/messages">{tx("تنبيه خصوصية الرسائل")}</Link> {tx("الأول.")}</p>}
      <div className="pro-actions">
        {r.incoming && r.status === 'pending' && <><button className="btn btn-primary" disabled={busy || !r.available} onClick={() => answer(r, 'accept')}>{tx("قبول التواصل")}</button><button className="pc-small" disabled={busy} onClick={() => answer(r, 'decline')}>{tx("رفض الطلب")}</button></>}
        {r.incoming && r.status === 'accepted' && r.available && <Link className="pc-small" to="/messages">{tx("افتح رسائلي")}</Link>}
        {!r.incoming && r.status === 'accepted' && r.available && <button className="btn btn-primary" disabled={busy} onClick={() => open(r)}>{tx("افتح المحادثة")}</button>}
        {r.status === 'accepted' || (!r.incoming && r.status === 'pending') ? <button className="pc-small" disabled={busy} onClick={() => answer(r, 'cancel')}>{r.status === 'pending' ? tx('إلغاء الطلب') : tx('إيقاف التواصل')}</button> : null}
      </div>
      {r.status === 'accepted' && <small className="pc-hint">{tx("إيقاف التواصل بيوقف الرسائل الجديدة من الطلب ده، والسجل بيفضل للطرفين. لو بينكم متابعة تمرين نشطة، إيقافها منفصل من مدربيني.")}</small>}
    </article>)}</div>
    {more && <button className="pc-small" disabled={busy} onClick={() => load(rows.at(-1))}>{tx("طلبات أقدم")}</button>}
  </section>;
}

function Directory({ userId }) {
  const [rows, setRows] = useState([]), [kind, setKind] = useState('all'), [busy, setBusy] = useState(true), [more, setMore] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(''), [confirm, setConfirm] = useState(null), [sending, setSending] = useState(false), [bump, setBump] = useState(0);
  const live = useRef(true), epoch = useRef(0);
  const load = useCallback(async (after = null) => {
    const n = ++epoch.current; setBusy(true); setErr('');
    try { const r = await listProfessionals(kind, after); if (live.current && n === epoch.current) { setRows(old => after ? [...old, ...(r || []).filter(x => !old.some(o => o.user_id === x.user_id))] : r || []); setMore(r?.length === 50); } }
    catch (e) { if (live.current && n === epoch.current) setErr(professionalError(e)); }
    finally { if (live.current && n === epoch.current) setBusy(false); }
  }, [kind]);
  useEffect(() => { live.current = true; setRows([]); setConfirm(null); load(); return () => { live.current = false; epoch.current++; }; }, [load]);
  useEffect(()=>{const update=()=>{if(!document.hidden)load();};document.addEventListener('visibilitychange',update);window.addEventListener('online',update);window.addEventListener('focus',update);return()=>{document.removeEventListener('visibilitychange',update);window.removeEventListener('online',update);window.removeEventListener('focus',update);};},[load]);
  async function send() { if (!confirm || sending) return; setSending(true); setErr(''); setDone(''); try { await requestProfessional(confirm.user_id, confirm.kind); if (live.current) { setDone(txf(`اتبعت طلب التواصل إلى {0}. استنى قبوله قبل المحادثة.`, [confirm.name])); setConfirm(null); setBump(x => x + 1); await load(); } } catch (e) { if (live.current) setErr(professionalError(e)); } finally { if (live.current) setSending(false); } }
  return <>
    <div className="pro-intro glass"><span className="pro-eyebrow">{tx("تواصل مع شخص حقيقي")}</span><h1>{tx("المدربين المقترحين")}</h1><p>{tx("مدربين ودكاترة تغذية وثّقهم صاحب التطبيق. القائمة بتتحدث تلقائيًا حسب الصفة والتوثيق. اختار الشخص المناسب، وابعت طلب تواصل.")}</p><p className="pc-hint">{tx("الصفة مش توثيق لشهادة أو ترخيص، ومش ضمان لنتيجة أو رد فوري. إرشادات عامة فقط، مش للطوارئ ولا بديل عن الكشف الطبي.")}</p></div>
    <div className="pro-filters" role="group" aria-label={tx("نوع المختص")}>{[['all',tx('الكل')],['coach',tx('مدربين')],['doctor',tx('دكاترة تغذية')]].map(([k,label]) => <button key={k} className="pc-small" aria-pressed={kind === k} disabled={sending} onClick={() => setKind(k)}>{label}</button>)}<button className="pc-small" disabled={busy || sending} onClick={() => load()}>{tx("تحديث")}</button></div>
    {err && <p className="pc-error" role="alert">{err} <Link to="/messages">{tx("افتح رسائلي")}</Link></p>}{done && <p className="pc-role-success" role="status">{done}</p>}
    {busy && <p role="status">{tx("بنحمّل الاقتراحات...")}</p>}
    {!busy && !err && !rows.length && <div className="pc-empty glass"><h2>{tx("الاقتراحات هتظهر هنا")}</h2><p>{tx("لسه مفيش مدربين أو دكاترة موثّقين. الحسابات الموثّقة بتظهر تلقائيًا.")}</p></div>}
    <div className="pc-list">{rows.map(r => <article className="pro-card glass" key={r.user_id}>
      <div className="pro-card-head">{userId?<Link to={`/chat-profile/${r.user_id}`} aria-label="الملف الشخصي"><ChatAvatar className="pc-avatar" userId={r.user_id} label={r.name}/></Link>:<span className="pc-avatar" aria-hidden="true">{r.name.slice(0,1)}</span>}<div><small>{CHAT_ROLE_LABELS[r.kind]}</small><h2>{r.name} {r.verified&&<VerifiedBadge/>}</h2></div></div><p className="pro-bio">{r.bio || tx('مفيش وصف مضاف لسه.')}</p>
      {r.request_status && <p className="pc-hint">{tx("طلب التواصل:")} {REQUEST_LABELS[r.request_status]}</p>}
      {!userId ? <Link className="pc-small" to="/auth/login">{tx("سجل الدخول لطلب التواصل")}</Link> : userId === r.user_id ? <p className="pc-hint">{tx("دي بطاقتك الظاهرة للمستخدمين.")}</p> : !r.ready ? <p className="pc-hint">{tx("التواصل لسه مش مفعّل للحساب ده.")}</p> : !r.request_status ? <button className="btn btn-primary" disabled={sending || busy} onClick={() => { setConfirm(r); setDone(''); }}>{tx("طلب تواصل")}</button> : <a className="pc-small" href="#contact-requests">{tx("شوف حالة طلبك ↓")}</a>}
      {confirm?.user_id === r.user_id && <div className="pro-confirm"><h3>{tx("تأكيد الطلب إلى")} {r.name}</h3><p>{tx("هيشوف اسمك الظاهر بس. لا إيميلك ولا بيانات تمرينك. مفيش رسالة أو التزام مدفوع في الطلب. المحادثة تبدأ بعد القبول، ومشاركة بيانات التمرين ليها موافقة منفصلة.")}</p><p>{tx("لازم تكون وافقت على")} <Link to="/messages">{tx("تنبيه خصوصية الرسائل")}</Link> {tx("الأول.")}</p><button className="btn btn-primary" disabled={sending} onClick={send}>{sending ? tx('بيتبعت...') : tx('تأكيد إرسال الطلب')}</button><button className="pc-small" disabled={sending} onClick={() => setConfirm(null)}>{tx("رجوع")}</button></div>}
    </article>)}</div>
    {more && <button className="pc-small" disabled={busy || sending} onClick={() => load(rows.at(-1).user_id)}>{tx("اقتراحات أكتر")}</button>}
    {userId && <div id="contact-requests"><Requests key={`${userId}-${bump}`} userId={userId} /></div>}
    <p className="pc-hint"><Link to="/messages">{tx("رسائلي")}</Link> · <Link to="/coach">{tx("متابعة التمرين مع مدربيني")}</Link>{tx(". خدمات مختلفة، وبيانات التمرين مش بتتشارك بمجرد طلب التواصل.")}</p>
  </>;
}
export default function Professionals() { const { user } = useAuth(); return <div className="pc-page pro-page" dir="rtl"><DetailTopBar title={tx("المدربين المقترحين")} backTo="/profile" /><Directory key={user?.id || 'guest'} userId={user?.id} /></div>; }
