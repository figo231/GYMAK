import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { DetailTopBar } from "../../components/layout/DetailShell";
import { useAuth } from "../../hooks/useAuth";
import { CHAT_HEALTH_NOTE, CHAT_MAX_LENGTH, CHAT_PRIVACY, CHAT_ROLE_LABELS, acceptChatTerms, chatBootstrap, chatError, fetchChatContacts, fetchChatInbox, fetchChatMessages, fetchChatThread, markChatRead, mergeChatMessages, newChatNonce, safeChatUrl, sendChatMessage, splitChatLinks, startChat, subscribeChat, validateChatMessage } from "../../lib/privateChat";
import "./privateChat.css";

function stamp(value) {
  try { return new Date(value).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
}
function ErrorBox({ text }) { return text ? <p className="pc-error" role="alert">{text}</p> : null; }
function PrivacyNote() { return <details className="pc-privacy"><summary>خصوصية الرسائل وحدود الخدمة</summary><p>{CHAT_PRIVACY}</p><p>{CHAT_HEALTH_NOTE}</p><p>مفيش مرفقات ولا اتصال فيديو داخل التطبيق. روابط المكالمات بتفتح خارج التطبيق لما تدوس عليها، وشروط خدمة المكالمة منفصلة.</p></details>; }

function Consent({ onAccept }) {
  const [agree, setAgree] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function accept() {
    if (!agree || busy) return;
    setBusy(true); setErr("");
    try { await acceptChatTerms(); onAccept(); } catch (e) { setErr(chatError(e)); setBusy(false); }
  }
  return <section className="pc-consent glass">
    <h2>قبل أول محادثة</h2><p>{CHAT_PRIVACY}</p><p>{CHAT_HEALTH_NOTE}</p>
    <p>بدء المحادثة بيشارك رسالتك واسمك الظاهر مع الطرف اللي اخترته بس. المتابعة مع مدرب ومشاركة بيانات التمرين ليها موافقة منفصلة.</p>
    <p>الرسايل بتتحفظ على السيرفر، ومش بتدخل في نسخة بيانات التمرين المحلية. حذف الحساب بيحذف محادثاته من الخدمة، لكن مش بيمسح نسخة أو لقطة شاشة احتفظ بيها الطرف التاني.</p>
    <label className="pc-check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />فهمت إن ده مش E2EE، وموافق على حفظ الرسائل ومشاركتها مع الطرف اللي هختاره.</label>
    <ErrorBox text={err} /><button type="button" className="btn btn-primary" disabled={!agree || busy} onClick={accept}>{busy ? "بيتحفظ..." : "موافق، افتح الرسائل"}</button>
  </section>;
}

function Inbox() {
  const nav = useNavigate(); const [rows, setRows] = useState([]); const [contacts, setContacts] = useState([]);
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
    try { const id = await startChat(c.user_id, c.kind); if (live.current) nav(`/messages/${id}`); }
    catch (e) { if (live.current) setErr(chatError(e)); }
    finally { if (live.current) setStarting(""); }
  }
  return <>
    <div className="pc-heading"><h2>محادثاتك</h2><button type="button" className="pc-small" disabled={busy} onClick={load}>{busy ? "بيحدّث..." : "تحديث"}</button></div>
    <p className="pc-hint">التنبيه هنا داخل التطبيق بس، مش إشعار في الخلفية. افتح الرسائل عشان تشوف الجديد. مفيش ضمان لرد فوري.</p>
    <ErrorBox text={err} />
    {!busy && !err && rows.length === 0 && <p className="pc-empty glass">لسه مفيش محادثات. اختار دكتور تغذية أو مدربك المقبول من تحت.</p>}
    <div className="pc-list">{rows.map((r) => <Link key={r.id} to={`/messages/${r.id}`} className="pc-thread glass">
      <span className="pc-avatar" aria-hidden="true">{r.peer_label?.slice(0, 1) || "؟"}</span>
      <span className="pc-thread-main"><strong>{r.peer_label}</strong><small>{r.kind === "doctor" ? "محادثة تغذية" : "متابعة تدريب"}{!r.writable ? " · للقراءة بس" : ""}</small><time dateTime={r.last_message_at}>{stamp(r.last_message_at)}</time></span>
      {Number(r.unread) > 0 && <span className="pc-unread" aria-label={`${r.unread} رسالة غير مقروءة`}>{r.unread}</span>}
    </Link>)}</div>
    {more && <button type="button" className="pc-small" disabled={busy} onClick={older}>محادثات أقدم</button>}
    <div className="pc-heading"><h2>ابدأ محادثة</h2></div>
    <p className="pc-hint">دكاترة التغذية اللي أضافهم المالك، ومدربيك اللي وافقت على متابعتهم. الصفة مش توثيق مهني.</p>
    <div className="pc-list">{contacts.map((c) => <button type="button" className="pc-contact glass" key={`${c.user_id}-${c.kind}`} disabled={!!starting} onClick={() => open(c)}>
      <span><strong>{c.label}</strong><small>{CHAT_ROLE_LABELS[c.kind]}</small></span><span>{starting === c.user_id ? "بيفتح..." : "افتح المحادثة ←"}</span>
    </button>)}</div>
    {contactsMore && <button type="button" className="pc-small" disabled={busy || contactsBusy} onClick={moreContacts}>جهات محادثة أكتر</button>}
    {!busy && !contacts.length && <p className="pc-empty glass">مفيش حد متاح تبدأ معاه محادثة دلوقتي. لقبول دعوة مدربك، افتح <Link to="/coach">مدربيني</Link>.</p>}
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
    catch { setErr("الرابط متفتحش. جرب تاني أو انسخه وافتحه بنفسك."); }
    finally { setOpening(false); }
  }
  return <><p className="pc-message-text">{splitChatLinks(body).map((part, i) => part.href ? <a key={i} href={part.href} target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer" onClick={(event) => open(event, part.href)}>{part.text}<small className="pc-link-host" dir="ltr">{part.host}</small></a> : <span key={i}>{part.text}</span>)}</p>{err && <small role="alert">{err}</small>}</>;
}

function Thread({ id, userId }) {
  const [thread, setThread] = useState(null); const [rows, setRows] = useState([]); const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(true); const [sending, setSending] = useState(false); const [olderBusy, setOlderBusy] = useState(false);
  const [more, setMore] = useState(false); const [err, setErr] = useState(""); const [sendErr, setSendErr] = useState("");
  const [online, setOnline] = useState(navigator.onLine); const live = useRef(true); const request = useRef(0); const pending = useRef(null); const end = useRef(null); const first = useRef(true);
  const load = useCallback(async () => {
    const n = ++request.current;
    try {
      const t = await fetchChatThread(id);
      if (!live.current || n !== request.current) return;
      if (!t) { setThread(null); setRows([]); setErr("المحادثة مش موجودة أو مش متاحة لحسابك."); setBusy(false); return; }
      const messages = await fetchChatMessages(id);
      if (!live.current || n !== request.current) return;
      setThread(t); setRows((old) => mergeChatMessages(old, messages)); setErr("");
      if (first.current) { setMore(messages.length === 50); first.current = false; }

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
      setRows((old) => mergeChatMessages(old, [row])); setDraft(""); pending.current = null; await load();
    } catch (e) { if (live.current) { setSendErr(`${chatError(e)} لو الإرسال مش مؤكد، اضغط إرسال بنفس النص لإعادة المحاولة من غير تكرار.`); if (/chat_read_only|chat_not_allowed|consent_required/.test(e?.message || "")) load(); } }
    finally { if (live.current) setSending(false); }
  }
  return <>
    <DetailTopBar title={thread?.peer_label || "المحادثة"} backTo="/messages" right={<button type="button" className="pc-small" disabled={busy} onClick={load}>تحديث</button>} />
    <PrivacyNote />
    {thread?.kind === "doctor" && <p className="pc-hint">إرشادات عامة، مش للطوارئ ولا بديل عن الكشف. صفة الحساب مش توثيق لترخيص طبي.</p>}
    {!online && <p className="pc-error" role="status">أنت غير متصل. الرسايل الجديدة محتاجة نت. النص اللي لسه متبعتش هيضيع لو قفلت الصفحة.</p>}
    <ErrorBox text={err} />
    {busy && <p className="pc-hint" role="status">بنحمّل المحادثة...</p>}
    <section className="pc-messages" aria-label="الرسائل" aria-live="polite" aria-relevant="additions">
      {more && <button type="button" className="pc-small" disabled={olderBusy} onClick={older}>{olderBusy ? "بيحمّل..." : "رسائل أقدم"}</button>}
      {!busy && thread && !rows.length && <p className="pc-empty">اكتب أول رسالة. متبعتش معلومات شخصية أو مستندات طبية مش ضرورية.</p>}
      {rows.map((m) => <article className={`pc-message ${m.author_id === userId ? "mine" : "theirs"}`} key={m.id}><span className="pc-author">{m.author_id === userId ? "أنت" : thread?.peer_label}</span><MessageText body={m.body} /><time dateTime={m.created_at}>{stamp(m.created_at)}</time></article>)}
      <div ref={end} />
    </section>
    {thread && !thread.writable && <p className="pc-error" role="status">المحادثة للقراءة بس: المتابعة أو الصفة اتغيّرت. الرسايل القديمة لسه ظاهرة للطرفين.</p>}
    {thread?.writable && <form className="pc-compose glass" onSubmit={send}>
      <label htmlFor="private-chat-draft">رسالتك</label><textarea id="private-chat-draft" rows={3} maxLength={CHAT_MAX_LENGTH} value={draft} disabled={sending} onChange={(e) => { setDraft(e.target.value); setSendErr(""); }} placeholder="اكتب سؤالك أو ردك..." />
      <div className="pc-compose-row"><small>{draft.length} / {CHAT_MAX_LENGTH}</small><button className="btn btn-primary" type="submit" disabled={sending || !online || !draft.trim()}>{sending ? "بيتأكد الإرسال..." : pending.current && sendErr ? "إعادة المحاولة" : "إرسال"}</button></div><ErrorBox text={sendErr} />
      <small>الروابط بتفتح بالضغط فقط. مفيش مرفقات أو معاينة تلقائية. الرد مش فوري.</small>
    </form>}
  </>;
}

function ChatSession({ userId }) {
  const { threadId } = useParams(); const [boot, setBoot] = useState(null); const [err, setErr] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => { let active = true; setBoot(null); setErr(""); chatBootstrap().then((b) => { if (active) setBoot(b); }).catch((e) => { if (active) setErr(chatError(e)); }); return () => { active = false; }; }, [userId, reload]);
  return <div className="pc-page" dir="rtl">
    {!threadId && <DetailTopBar title="رسائل الدكتور والمدرب" backTo="/profile" />}
    {err ? <><ErrorBox text={err} /><button type="button" className="pc-small" onClick={() => setReload((n) => n + 1)}>جرّب تاني</button><Link to="/profile" className="pc-small">حسابي</Link></> : !boot ? <p role="status" className="pc-hint">بنجهّز الرسائل...</p> : !boot.consent ? <Consent onAccept={() => setReload((n) => n + 1)} /> : threadId ? <Thread key={threadId} id={threadId} userId={userId} /> : <Inbox />}
  </div>;
}
export default function PrivateChat() {
  const { user } = useAuth();
  // Account changes remount all state: no old drafts/messages can flash for another user.
  return user ? <ChatSession key={user.id} userId={user.id} /> : null;
}
