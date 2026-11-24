import {REVIEW_BACKEND_GATED,reviewBackendMessage} from "../../lib/reviewBuild";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { DetailTopBar } from "../../components/layout/DetailShell";
import { useAuth } from "../../hooks/useAuth";
import { CHAT_HEALTH_NOTE, CHAT_MAX_LENGTH, CHAT_PRIVACY, CHAT_ROLE_LABELS, acceptChatTerms, chatBootstrap, chatError, fetchChatContacts, fetchChatInbox, fetchChatMessages, fetchChatThread, markChatRead, mergeChatMessages, newChatNonce, safeChatUrl, sendChatMessage, editChatMessage, refreshChatMessages, splitChatLinks, startChat, subscribeChat, validateChatMessage } from "../../lib/privateChat";
import { TERMS_URL, blockChatUser, fetchMyChatBlocks, reportContent, unblockChatUser } from "../../lib/moderation";
import ChatSearchPins, { chatToolsRpc } from "./ChatSearchPins";
import TrainingHistory from "./TrainingHistory";
import AppointmentsPanel from "./AppointmentsPanel";
import CarePlanPanel from "./CarePlanPanel";
import ReportDialog from "../../components/ReportDialog";
import "./privateChat.css";
import { tx, txf } from "../../lib/i18n/tx";

function stamp(value) {
  try { return new Date(value).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
}
function ErrorBox({ text }) { return text ? <p className="pc-error" role="alert">{text}</p> : null; }
function PrivacyNote() { return <details className="pc-privacy"><summary>{tx("خصوصية الرسائل وحدود الخدمة")}</summary><p>{CHAT_PRIVACY}</p><p>{tx("التعديل هيظهر للطرفين بعلامة معدّلة. أي بلاغ اتبعت قبل التعديل بيحتفظ بالنص وقت البلاغ.")}</p><p>{CHAT_HEALTH_NOTE}</p><p>خطط التغذية ونسخ التمرين والمواعيد واختيار نسخة الخطة بتتحفظ على السيرفر لطرفي المحادثة. بتشوف مراجعة قبل كل مشاركة أو طلب أو قبول. حذف ملخص محلي مش بيسحب رسالة اتبعتت. إيقاف المتابعة مش بيمسح السجل القديم، وحذف حساب أحد الطرفين بيحذف بيانات المحادثة من الخدمة، مش النسخ اللي احتفظ بيها الطرف التاني.</p><p>{tx("مفيش مرفقات ولا اتصال فيديو داخل التطبيق. روابط المكالمات بتفتح خارج التطبيق لما تدوس عليها، وشروط خدمة المكالمة منفصلة.")}</p></details>; }

export function Consent({ onAccept }) {
  const [agree, setAgree] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function accept() {
    if (!agree || busy) return;
    setBusy(true); setErr("");
    try { await acceptChatTerms(); onAccept(); } catch (e) { setErr(chatError(e)); setBusy(false); }
  }
  return <section className="pc-consent glass">
    <h2>{tx("قبل أول محادثة")}</h2>
    <p><b>{tx("شروط الاستخدام (باختصار):")}</b> {tx("ممنوع التحرش أو الإساءة أو المحتوى غير اللائق أو الاحتيال أو انتحال الشخصية أو مشاركة بيانات الغير. الرسائل للإرشادات العامة ومش للطوارئ. تقدر تبلّغ عن أي رسالة أو مستخدم، وتحظر أي طرف من محادثتك معاه، وصاحب التطبيق بيراجع المحتوى المُبلَّغ عنه بس.")} <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">{tx("اقرأ شروط الاستخدام كاملة")}</a>.</p>
    <p>{CHAT_PRIVACY}</p><p>{tx("التعديل هيظهر للطرفين بعلامة معدّلة. أي بلاغ اتبعت قبل التعديل بيحتفظ بالنص وقت البلاغ.")}</p><p>{CHAT_HEALTH_NOTE}</p><p>خطط التغذية ونسخ التمرين والمواعيد واختيار نسخة الخطة بتتحفظ على السيرفر لطرفي المحادثة. بتشوف مراجعة قبل كل مشاركة أو طلب أو قبول. حذف ملخص محلي مش بيسحب رسالة اتبعتت. إيقاف المتابعة مش بيمسح السجل القديم، وحذف حساب أحد الطرفين بيحذف بيانات المحادثة من الخدمة، مش النسخ اللي احتفظ بيها الطرف التاني.</p>
    <p>{tx("بدء المحادثة بيشارك رسالتك واسمك الظاهر مع الطرف اللي اخترته بس. المتابعة مع مدرب ومشاركة بيانات التمرين ليها موافقة منفصلة.")}</p>
    <p>{tx("الرسايل بتتحفظ على السيرفر، ومش بتدخل في نسخة بيانات التمرين المحلية. حذف الحساب بيحذف محادثاته من الخدمة، لكن مش بيمسح نسخة أو لقطة شاشة احتفظ بيها الطرف التاني.")}</p>
    <label className="pc-check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />{tx("قرأت")} <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">{tx("شروط الاستخدام")}</a> {tx("وموافق عليها، وفاهم إن ده مش E2EE، وموافق على حفظ الرسائل ومشاركتها مع الطرف اللي هختاره.")}</label>
    <ErrorBox text={err} /><button type="button" className="btn btn-primary" disabled={!agree || busy} onClick={accept}>{busy ? tx("بيتحفظ...") : tx("موافق، افتح الرسائل")}</button>
  </section>;
}

function Inbox() {
  const nav = useNavigate(); const location = useLocation(); const [rows, setRows] = useState([]); const [contacts, setContacts] = useState([]);
  const [busy, setBusy] = useState(true); const [more, setMore] = useState(false); const [err, setErr] = useState(""); const [starting, setStarting] = useState("");
  const [contactsMore, setContactsMore] = useState(false), [contactsBusy, setContactsBusy] = useState(false);
  const contactEpoch = useRef(0);
  const live = useRef(true); const request = useRef(0);
  const load = useCallback(async () => {
    const n = ++request.current; contactEpoch.current++; setBusy(true);
    try {
      const [r, c] = await Promise.all([fetchChatInbox(), fetchChatContacts()]);
      if (!live.current || n !== request.current) return;
      setRows(r || []); setContacts(c || []); setContactsMore(c?.length === 50); setMore(r?.length === 50); setErr("");
    } catch (e) { if (live.current && n === request.current) setErr(chatError(e)); }
    finally { if (live.current && n === request.current) setBusy(false); }
  }, []);
  useEffect(() => {
    live.current = true; load();
    const onFocus = () => { if (!document.hidden) load(); };
    const off = subscribeChat(null, onFocus);
    document.addEventListener("visibilitychange", onFocus); window.addEventListener("online", onFocus);
    return () => { live.current = false; request.current++; off(); document.removeEventListener("visibilitychange", onFocus); window.removeEventListener("online", onFocus); };
  }, [load]);
  async function older() {
    if (busy || !rows.length) return;
    setBusy(true); const n = ++request.current;
    try {
      const next = await fetchChatInbox(rows[rows.length - 1]);
      if (!live.current || n !== request.current) return;
      setRows((old) => [...old, ...(next || []).filter((r) => !old.some((x) => x.id === r.id))]); setMore(next?.length === 50); setErr("");
    } catch (e) { if (live.current) setErr(chatError(e)); } finally { if (live.current) setBusy(false); }
  }
  async function moreContacts() {
    if (contactsBusy || busy || !contacts.length) return;
    setContactsBusy(true); const n = ++contactEpoch.current;
    try {
      const c = await fetchChatContacts(contacts[contacts.length - 1]);
      if (live.current && n === contactEpoch.current) {
        setContacts((old) => [...old, ...(c || []).filter((r) => !old.some((x) => x.user_id === r.user_id && x.kind === r.kind))]);
        setContactsMore(c?.length === 50);
      }
    } catch (e) { if (live.current) setErr(chatError(e)); }
    finally { if (live.current) setContactsBusy(false); }
  }
  async function open(c) {
    if (starting) return; setStarting(c.user_id); setErr("");
    try { const id = await startChat(c.user_id, c.kind); if (live.current) nav(`/messages/${id}`, { state: location.state }); }
    catch (e) { if (live.current) setErr(chatError(e)); }
    finally { if (live.current) setStarting(""); }
  }
  return <>
    <div className="pc-heading"><h2>{tx("محادثاتك")}</h2><button type="button" className="pc-small" disabled={busy} onClick={load}>{busy ? tx("بيحدّث...") : tx("تحديث")}</button></div>
    <p className="pc-hint">{tx("التنبيه هنا داخل التطبيق بس، مش إشعار في الخلفية. افتح الرسائل عشان تشوف الجديد. مفيش ضمان لرد فوري.")}</p>
    <ErrorBox text={err} />
    {!busy && !err && rows.length === 0 && <p className="pc-empty glass">{tx("لسه مفيش محادثات. افتح المدربين المقترحين لطلب تواصل، أو اختار جهة مقبولة من تحت.")}</p>}
    <div className="pc-list">{rows.map((r) => <Link key={r.id} to={`/messages/${r.id}`} state={location.state} className="pc-thread glass">
      <span className="pc-avatar" aria-hidden="true">{r.peer_label?.slice(0, 1) || tx("؟")}</span>
      <span className="pc-thread-main"><strong>{r.peer_label}</strong><small>{r.kind === "doctor" ? tx("محادثة تغذية") : tx("متابعة تدريب")}{!r.writable ? (r.blocked ? tx(" · محظور") : tx(" · للقراءة بس")) : ""}</small><time dateTime={r.last_message_at}>{stamp(r.last_message_at)}</time></span>
      {Number(r.unread) > 0 && <span className="pc-unread" aria-label={txf(`{0} رسالة غير مقروءة`, [r.unread])}>{r.unread}</span>}
    </Link>)}</div>
    {more && <button type="button" className="pc-small" disabled={busy} onClick={older}>{tx("محادثات أقدم")}</button>}
    <div className="pc-heading"><h2>{tx("ابدأ محادثة")}</h2></div>
    <p className="pc-hint">{tx("الأشخاص اللي قبلوا طلب تواصلك، ومدربيك اللي وافقت على متابعتهم. الصفة مش توثيق مهني.")}</p>
    <div className="pc-list">{contacts.map((c) => <button type="button" className="pc-contact glass" key={`${c.user_id}-${c.kind}`} disabled={!!starting} onClick={() => open(c)}>
      <span><strong>{c.label}</strong><small>{CHAT_ROLE_LABELS[c.kind]}</small></span><span>{starting === c.user_id ? tx("بيفتح...") : tx("افتح المحادثة ←")}</span>
    </button>)}</div>
    {contactsMore && <button type="button" className="pc-small" disabled={busy || contactsBusy} onClick={moreContacts}>{tx("جهات محادثة أكتر")}</button>}
    {!busy && !contacts.length && <p className="pc-empty glass">{tx("مفيش حد متاح تبدأ معاه محادثة دلوقتي. لقبول دعوة مدربك، افتح")} <Link to="/coach">{tx("مدربيني")}</Link>.</p>}
    <PrivacyNote />
  </>;
}

function MessageText({ body }) {
  const [opening, setOpening] = useState(false); const [err, setErr] = useState("");
  async function open(event, href) {
    const safe = safeChatUrl(href);
    if (!safe) { event.preventDefault(); return; }
    // No preview or request is made before this deliberate tap.
    if (!Capacitor.isNativePlatform()) return;
    event.preventDefault(); if (opening) return; setOpening(true); setErr("");
    try { const { Browser } = await import("@capacitor/browser"); await Browser.open({ url: safe.href }); }
    catch { setErr(tx("الرابط متفتحش. جرب تاني أو انسخه وافتحه بنفسك.")); }
    finally { setOpening(false); }
  }
  return <><p className="pc-message-text">{splitChatLinks(body).map((part, i) => part.href ? <a key={i} href={part.href} target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer" onClick={(event) => open(event, part.href)}>{part.text}<small className="pc-link-host" dir="ltr">{part.host}</small></a> : <span key={i}>{part.text}</span>)}</p>{err && <small role="alert">{err}</small>}</>;
}

function chatDay(value) { return new Date(value).toLocaleDateString("ar-EG", {day:"numeric",month:"long",year:"numeric"}); }
function chatTime(value) { return new Date(value).toLocaleTimeString("ar-EG", {hour:"2-digit",minute:"2-digit"}); }
function Thread({ id, userId }) {
  const location = useLocation(); const nav=useNavigate();
  useEffect(()=>{if(location.state?.proposedDraft)nav(location.pathname,{replace:true,state:null});},[]);
  const [thread, setThread] = useState(null); const [rows, setRows] = useState([]); const [draft, setDraft] = useState(() => String(location.state?.draftOwner===userId ? location.state?.proposedDraft || "" : "").slice(0,CHAT_MAX_LENGTH));
  const [busy, setBusy] = useState(true); const [sending, setSending] = useState(false); const [olderBusy, setOlderBusy] = useState(false);
  const [more, setMore] = useState(false); const [err, setErr] = useState(""); const [sendErr, setSendErr] = useState("");
  const [myBlocks, setMyBlocks] = useState([]); const [blockBusy, setBlockBusy] = useState(false);
  const [showTools,setShowTools]=useState(false);
  const [showAppointments,setShowAppointments]=useState(false);
  const [showHistory,setShowHistory]=useState(false);
  const [showPlan,setShowPlan]=useState(false);
  const [showSearch,setShowSearch]=useState(false);
  const [pinBusy,setPinBusy]=useState(false);
  const [editing,setEditing]=useState(null),[editText,setEditText]=useState(""),[editBusy,setEditBusy]=useState(false),[editErr,setEditErr]=useState("");
  const loadedRows=useRef([]); loadedRows.current=rows;
  const [report, setReport] = useState(null); const [note, setNote] = useState("");
  const [online, setOnline] = useState(navigator.onLine); const live = useRef(true); const request = useRef(0); const pending = useRef(null); const end = useRef(null); const first = useRef(true);
  const load = useCallback(async () => {
    const n = ++request.current;
    try {
      const t = await fetchChatThread(id);
      if (!live.current || n !== request.current) return;
      if (!t) { setThread(null); setRows([]); setErr(tx("المحادثة مش موجودة أو مش متاحة لحسابك.")); setBusy(false); return; }
      const messages = await fetchChatMessages(id);
      const olderIds = loadedRows.current.filter(m => !messages.some(x => x.id === m.id)).map(m => m.id);
      if (olderIds.length) messages.push(...await refreshChatMessages(id, olderIds));
      if (!live.current || n !== request.current) return;
      setThread(t); setRows((old) => mergeChatMessages(old, messages)); setErr("");
      if (first.current) { setMore(messages.length === 50); first.current = false; }
      fetchMyChatBlocks().then((b) => { if (live.current && n === request.current) setMyBlocks(b || []); }).catch(() => {});

    } catch (e) { if (live.current && n === request.current) setErr(chatError(e)); }
    finally { if (live.current && n === request.current) setBusy(false); }
  }, [id]);
  useEffect(() => {
    live.current = true; load();
    const update = () => { setOnline(navigator.onLine); if (!document.hidden && navigator.onLine) load(); };
    const off = subscribeChat(id, update);
    document.addEventListener("visibilitychange", update); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { live.current = false; request.current++; off(); document.removeEventListener("visibilitychange", update); window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, [id, load]);
  useEffect(() => { if (!olderBusy) end.current?.scrollIntoView({ block: "end", behavior: "auto" }); }, [rows[rows.length - 1]?.id, olderBusy]);
  useEffect(() => {
    const markDisplayed = () => {
      const last = rows[rows.length - 1];
      if (last && !document.hidden) markChatRead(id, last.seq).catch(() => {});
    };
    markDisplayed(); document.addEventListener("visibilitychange", markDisplayed);
    return () => document.removeEventListener("visibilitychange", markDisplayed);
  }, [id, rows[rows.length - 1]?.seq]);
  async function older() {
    if (olderBusy || !rows.length) return; setOlderBusy(true);
    try { const msgs = await fetchChatMessages(id, rows[0].seq); if (live.current) { setRows((old) => mergeChatMessages(msgs, old)); setMore(msgs.length === 50); } }
    catch (e) { if (live.current) setErr(chatError(e)); } finally { if (live.current) setOlderBusy(false); }
  }
  async function send(event) {
    event.preventDefault(); if (sending || !thread?.writable || !online) return;
    const v = validateChatMessage(draft); if (!v.ok) { setSendErr(v.error); return; }
    if (!pending.current || pending.current.body !== v.body) pending.current = { body: v.body, id: newChatNonce() };
    setSending(true); setSendErr("");
    try {
      const row = await sendChatMessage(id, v.body, pending.current.id);
      if (!live.current) return;
      setRows((old) => mergeChatMessages(old, [row])); setDraft(""); const input=document.getElementById("private-chat-draft");if(input)input.style.height="46px"; pending.current = null; await load();
    } catch (e) { if (live.current) { setSendErr(txf(`{0} لو الإرسال مش مؤكد، اضغط إرسال بنفس النص لإعادة المحاولة من غير تكرار.`, [chatError(e)])); if (/chat_read_only|chat_blocked|chat_not_allowed|consent_required/.test(e?.message || "")) load(); } }
    finally { if (live.current) setSending(false); }
  }
  async function saveEdit(event) {
    event.preventDefault(); if (editBusy || !editing || !thread?.writable || !online) return;
    const valid=validateChatMessage(editText); if(!valid.ok){setEditErr(valid.error);return;}
    setEditBusy(true); setEditErr("");
    try { const updated=await editChatMessage(id,editing,valid.body); if(!live.current)return;
      setRows(old=>mergeChatMessages(old,[updated])); setEditing(null); setNote(tx("اتحفظ التعديل. الطرف التاني هيشوف علامة معدّلة."));
    } catch(e) { if(live.current){setEditErr(chatError(e));if(/message_edit_conflict/.test(e?.message||""))load();} }
    finally {if(live.current)setEditBusy(false);}
  }
  const blockedByMe = !!thread && myBlocks.some((b) => b.blocked_id === thread.peer_id);
  async function toggleBlock() {
    if (blockBusy || !thread) return; setBlockBusy(true); setNote("");
    try {
      if (blockedByMe) { await unblockChatUser(thread.peer_id); setNote(tx("اتلغى الحظر. الرسايل الجديدة رجعت متاحة لو المتابعة لسه شغالة.")); }
      else { await blockChatUser(thread.peer_id); setNote(tx("اتحظر المستخدم. الرسايل الجديدة بينكم متوقفة في الاتجاهين.")); }
      await load();
    } catch (e) { if (live.current) setErr(chatError(e)); }
    finally { if (live.current) setBlockBusy(false); }
  }
  return <div className="pc-conversation">
    <header className="pc-chat-header">
      <Link to="/messages" className="pc-icon-button pc-chat-back" aria-label={tx("رجوع")}><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></Link>
      <span className="pc-chat-avatar" aria-hidden="true">{(thread?.peer_label||"G").slice(0,1)}</span>
      <div className="pc-chat-person"><h1>{thread?.peer_label||tx("المحادثة")}</h1><span>{CHAT_ROLE_LABELS[thread?.kind]||tx("رسائل خاصة")}</span></div>
      <button className="pc-icon-button" type="button" aria-label={tx("تحديث")} disabled={busy} onClick={load}><svg viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></svg></button>
      <button className={`pc-icon-button ${showTools?"active":""}`} type="button" aria-label={tx("أدوات المحادثة")} aria-expanded={showTools} onClick={()=>setShowTools(x=>!x)}><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>
    </header>
    {showTools && <aside className="pc-chat-tools">
    {thread && <div className="pc-thread-actions">
      <button type="button" className="pc-small" onClick={()=>{setShowAppointments(x=>!x);setShowSearch(false);setShowPlan(false);setShowHistory(false);}}>مواعيد المتابعة</button>
      <button type="button" className="pc-small" onClick={()=>{setShowSearch(x=>!x);setShowAppointments(false);setShowPlan(false);setShowHistory(false);}}>بحث والمثبتة</button>
      {thread.kind === "coach" && <button type="button" className="pc-small" onClick={()=>{setShowHistory(x=>!x);setShowAppointments(false);setShowSearch(false);setShowPlan(false);}}>سجل خطة التمرين</button>}
      {thread.kind === "doctor" && <button type="button" className="pc-small" onClick={()=>{setShowPlan(x=>!x);setShowAppointments(false);setShowSearch(false);setShowHistory(false);}}>خطة التغذية</button>}
      <button type="button" className="pc-small" onClick={() => setReport({ kind: "user" })}>{tx("إبلاغ")}</button>
      <button type="button" className="pc-small" disabled={blockBusy} onClick={toggleBlock}>{blockBusy ? "..." : blockedByMe ? tx("إلغاء الحظر") : tx("حظر")}</button>
    </div>}
    <PrivacyNote />
    </aside>}
    <div className="pc-chat-scroll">
    {note && <p className="pc-hint" role="status">{note}</p>}
    {thread?.blocked && <p className="pc-blocked-note" role="status">{blockedByMe ? tx("حظرت المستخدم ده. الرسايل الجديدة متوقفة في الاتجاهين، والسجل القديم ظاهر للقراءة بس.") : tx("المحادثة متوقفة بسبب حظر. الرسايل القديمة ظاهرة للقراءة بس.")}</p>}
    {showHistory && thread?.kind === "coach" && <TrainingHistory key={`history-${id}`} threadId={id} writable={thread.writable} onClose={()=>setShowHistory(false)}/>}
    {showAppointments && thread && <AppointmentsPanel key={`appointments-${id}`} threadId={id} writable={thread.writable} onClose={()=>setShowAppointments(false)}/>}
    {showSearch && thread && <ChatSearchPins key={`search-${id}`} threadId={id} onClose={()=>setShowSearch(false)}/>}
    {showPlan && thread?.kind === "doctor" && <CarePlanPanel key={`plan-${id}`} threadId={id} writable={thread.writable} onClose={()=>setShowPlan(false)}/>}
    {thread?.kind === "doctor" && <p className="pc-hint">{tx("إرشادات عامة، مش للطوارئ ولا بديل عن الكشف. صفة الحساب مش توثيق لترخيص طبي.")}</p>}
    {!online && <p className="pc-error" role="status">{tx("أنت غير متصل. الرسايل الجديدة محتاجة نت. النص اللي لسه متبعتش هيضيع لو قفلت الصفحة.")}</p>}
    <ErrorBox text={err} />
    {busy && <p className="pc-hint" role="status">{tx("بنحمّل المحادثة...")}</p>}
    <section className="pc-messages" aria-label={tx("الرسائل")} aria-live="polite" aria-relevant="additions">
      {more && <button type="button" className="pc-small" disabled={olderBusy} onClick={older}>{olderBusy ? tx("بيحمّل...") : tx("رسائل أقدم")}</button>}
      {!busy && thread && !rows.length && <p className="pc-empty">{tx("اكتب أول رسالة. متبعتش معلومات شخصية أو مستندات طبية مش ضرورية.")}</p>}
      <div className="pc-watermark" aria-hidden="true"><svg viewBox="0 0 100 100"><path d="M50 15 L19.6 32.5 L19.6 67.5 L50 85 L80.4 67.5 L80.4 50 L53 50"/></svg><span>GYMAK</span></div>
      {rows.map((m,index) => <div className="pc-message-row" key={m.id}>
        {(index===0||chatDay(rows[index-1].created_at)!==chatDay(m.created_at)) && <div className="pc-day"><span>{chatDay(m.created_at)}</span></div>}
        <article aria-label={m.author_id===userId?tx("أنت"):thread?.peer_label} className={`pc-message ${m.author_id === userId ? "mine" : "theirs"} ${index>0&&rows[index-1].author_id===m.author_id&&chatDay(rows[index-1].created_at)===chatDay(m.created_at)?"grouped":""}`}>

        <MessageText body={m.body} />
        <div className="pc-bubble-footer"><time dateTime={m.created_at}>{chatTime(m.created_at)}{m.edited_at && <span className="pc-edited" title={stamp(m.edited_at)}> · {tx("معدّلة")}</span>}</time>
        <details className="pc-bubble-menu" onClick={e=>{if(e.target.closest("button"))e.currentTarget.open=false;}}><summary aria-label={tx("خيارات الرسالة")}>•••</summary><div>
          {m.author_id === userId && thread?.writable && <button type="button" disabled={!online || editBusy} onClick={()=>{setEditing(m);setEditText(m.body);setEditErr("");setNote("");}}>{tx("تعديل الرسالة")}</button>}
          <button type="button" disabled={pinBusy} onClick={async()=>{if(pinBusy)return;setPinBusy(true);try{await chatToolsRpc("care_chat_pin",{p_thread:id,p_message:m.id,p_pin:true});if(live.current)setNote("اتثبتت عندك بس. افتح بحث والمثبتة عشان ترجع لها.");}catch{if(live.current)setNote("التثبيت متعملش. محتاج تفعيل السيرفر، والحد 30 رسالة للمحادثة.");}finally{if(live.current)setPinBusy(false);}}}>{tx("ثبّت عندي")}</button>
          {m.author_id !== userId && <button type="button" onClick={() => setReport({ kind: "message", message: m })}>{tx("إبلاغ")}</button>}
        </div></details></div>
      </article></div>)}
      <div ref={end} />
    </section>
    {thread && !thread.writable && !thread.blocked && <p className="pc-error" role="status">{tx("المحادثة للقراءة بس: المتابعة أو الصفة اتغيّرت. الرسايل القديمة لسه ظاهرة للطرفين.")}</p>}
    </div>
    {thread?.writable && <div className="pc-composer-dock"><form className="pc-compose" onSubmit={send}>
      <div className="pc-input-wrap"><label className="pc-visually-hidden" htmlFor="private-chat-draft">{tx("رسالتك")}</label><textarea id="private-chat-draft" rows={1} maxLength={CHAT_MAX_LENGTH} value={draft} disabled={sending} onChange={(e) => { setDraft(e.target.value); setSendErr("");e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,130)+"px"; }} placeholder={tx("اكتب رسالة...")} />
      {draft.length>1800&&<small className="pc-char-count">{draft.length}/{CHAT_MAX_LENGTH}</small>}</div>
      <button className="pc-send" type="submit" aria-label={sending?tx("بيتأكد الإرسال..."):pending.current&&sendErr?tx("إعادة المحاولة"):tx("إرسال")} disabled={sending || !online || !draft.trim()}>{sending?<span className="pc-send-wait">···</span>:<svg viewBox="0 0 24 24"><path d="m21 3-7.5 18-3.8-7.7L2 9.5 21 3Z"/><path d="m21 3-11.3 10.3"/></svg>}</button>
    </form><ErrorBox text={sendErr}/><span className="pc-compose-hint">{tx("محادثة خاصة · الرد مش فوري")}</span></div>}
    {editing && <div className="pc-edit-backdrop"><section className="pc-edit-dialog glass" role="dialog" aria-modal="true" aria-labelledby="pc-edit-title" onKeyDown={e=>{if(e.key==="Escape"&&!editBusy)setEditing(null);if(e.key==="Tab"){const nodes=[...e.currentTarget.querySelectorAll("button:not(:disabled),textarea:not(:disabled)")];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
      <h2 id="pc-edit-title">{tx("تعديل الرسالة")}</h2><p className="pc-hint">{tx("التعديل هيظهر للطرفين بعلامة معدّلة. أي بلاغ اتبعت قبل التعديل بيحتفظ بالنص وقت البلاغ.")}</p>
      <form onSubmit={saveEdit}><label htmlFor="pc-edit-text">{tx("نص الرسالة")}</label><textarea autoFocus id="pc-edit-text" rows={5} maxLength={CHAT_MAX_LENGTH} value={editText} disabled={editBusy} onChange={e=>{setEditText(e.target.value);setEditErr("");}}/><small>{editText.length} / {CHAT_MAX_LENGTH}</small><ErrorBox text={editErr}/><div className="pc-edit-buttons"><button className="btn btn-primary" disabled={editBusy||!online||!thread?.writable||!editText.trim()} type="submit">{editBusy?tx("بنحفظ..."):tx("حفظ التعديل")}</button><button className="pc-small" disabled={editBusy} type="button" onClick={()=>setEditing(null)}>{tx("إلغاء")}</button></div></form>
    </section></div>}
    {report && thread && <ReportDialog
      title={report.kind === "user" ? txf(`إبلاغ عن {0}`, [thread.peer_label]) : tx("إبلاغ عن رسالة")}
      hint={report.kind === "user" ? tx("البلاغ بيوصل لصاحب التطبيق. لو عاوز توقف الرسايل فورًا، استخدم زرار الحظر كمان.") : tx("نص الرسالة دي هيتبعت مع البلاغ لصاحب التطبيق للمراجعة.")}
      onClose={() => setReport(null)}
      submit={(reason, details) => report.kind === "user"
        ? reportContent({ targetType: "chat_user", reason, targetUserId: thread.peer_id, conversationId: id, details })
        : reportContent({ targetType: "chat_message", reason, messageId: report.message.id, conversationId: id, details })} />}
  </div>;}

function ChatSession({ userId }) {
  const { threadId } = useParams(); const [boot, setBoot] = useState(null); const [err, setErr] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => { let active = true; setBoot(null); setErr(""); chatBootstrap().then((b) => { if (active) setBoot(b); }).catch((e) => { if (active) setErr(chatError(e)); }); return () => { active = false; }; }, [userId, reload]);
  return <div className="pc-page" dir="rtl">
    {!threadId && <><DetailTopBar title={tx("رسائل الدكتور والمدرب")} backTo="/profile" /><Link to="/professionals" className="pc-contact glass"><span><strong>{tx("المدربين المقترحين")}</strong><small>{tx("مدربين ودكاترة تغذية، وطلبات التواصل")}</small></span><span>{tx("شوف الاقتراحات ←")}</span></Link></>}
    {err ? <><ErrorBox text={err} /><button type="button" className="pc-small" onClick={() => setReload((n) => n + 1)}>{tx("جرّب تاني")}</button><Link to="/profile" className="pc-small">{tx("حسابي")}</Link></> : !boot ? <p role="status" className="pc-hint">{tx("بنجهّز الرسائل...")}</p> : !boot.consent ? <Consent onAccept={() => setReload((n) => n + 1)} /> : threadId ? <Thread key={threadId} id={threadId} userId={userId} /> : <Inbox />}
  </div>;
}
export default function PrivateChat() {
  const { user } = useAuth();
  if(REVIEW_BACKEND_GATED)return <p role="status" style={{padding:20}}>{reviewBackendMessage(document.documentElement.lang)}</p>;
  // Account changes remount all state: no old drafts/messages can flash for another user.
  return user ? <ChatSession key={user.id} userId={user.id} /> : null;
}

import "./conversation.css";
