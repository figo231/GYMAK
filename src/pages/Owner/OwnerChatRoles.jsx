import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CHAT_ROLE_LABELS, chatError, fetchOwnerUsers, fetchLegacyCoaches, setOwnerUserRole, setChatRole } from "../../lib/privateChat";
import "../PrivateChat/privateChat.css";
import { useAuth } from "../../hooks/useAuth";

function UserDirectory() {
  const [page, setPage] = useState(null), [rows, setRows] = useState([]), [search, setSearch] = useState(""), [query, setQuery] = useState(""), [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(true), [saving, setSaving] = useState(false), [err, setErr] = useState(""), [done, setDone] = useState("");
  const [editing, setEditing] = useState(null), [role, setRole] = useState("user"), [legacy, setLegacy] = useState([]), [legacyMore, setLegacyMore] = useState(false), [legacyLoaded, setLegacyLoaded] = useState(false);
  const request = useRef(0), alive = useRef(true);
  const load = useCallback(async (cursor = null) => {
    const n = ++request.current; setBusy(true); setErr("");
    try {
      const data = await fetchOwnerUsers(query, filter, cursor);
      if (!alive.current || n !== request.current) return;
      setPage(data); setRows((old) => cursor ? [...old, ...(data.users || []).filter((r) => !old.some((o) => o.user_id === r.user_id))] : data.users || []);
    } catch (e) { if (alive.current && n === request.current) setErr(chatError(e)); }
    finally { if (alive.current && n === request.current) setBusy(false); }
  }, [query, filter]);
  useEffect(() => { alive.current = true; setRows([]); setPage(null); load(); return () => { alive.current = false; request.current++; }; }, [load]);
  async function save(event) {
    event.preventDefault(); if (!editing || saving) return;
    setSaving(true); setErr(""); setDone("");
    try {
      const result = await setOwnerUserRole(editing.user_id, role);
      if (!alive.current) return;
      setDone(`اتحفظ دور ${CHAT_ROLE_LABELS[result.role]} للحساب ${editing.email || editing.label}.`); setEditing(null); await load();
    } catch (e) { if (alive.current) setErr(chatError(e)); }
    finally { if (alive.current) setSaving(false); }
  }
  async function loadLegacy(more = false) {
    if (busy || saving) return; setBusy(true); setErr("");
    try {
      const list = await fetchLegacyCoaches(more ? legacy[legacy.length - 1]?.email : null);
      if (!alive.current) return;
      setLegacy((old) => more ? [...old, ...(list || [])] : list || []); setLegacyMore(list?.length === 50); setLegacyLoaded(true);
    } catch (e) { if (alive.current) setErr(chatError(e)); }
    finally { if (alive.current) setBusy(false); }
  }
  async function revoke(email) {
    if (saving || busy) return; setSaving(true); setErr("");
    try { await setChatRole(email, "user"); if (alive.current) { setLegacy((old) => old.filter((r) => r.email !== email)); setDone(`اتلغت صلاحية المدرب للبريد ${email}.`); await load(); } }
    catch (e) { if (alive.current) setErr(chatError(e)); }
    finally { if (alive.current) setSaving(false); }
  }
  const counts = page?.counts;
  return <section className="pc-role-panel glass" aria-label="المستخدمون والأدوار">
    <h2>كل الحسابات المسجلة والأدوار</h2>
    <p>التطبيق والموقع بيستخدموا نفس حسابات التسجيل، مش قائمتين مختلفتين. القائمة تشمل الحسابات اللي لسه معملتش ملف شخصي. الضيف اللي بياناته على جهازه بس مش بيظهر هنا.</p>
    {counts && <div className="pc-directory-counts"><div><b>{counts.registered}</b><span>حساب مسجل</span></div><div><b>{counts.missing_profiles}</b><span>بدون ملف شخصي</span></div><div><b>{counts.coaches}</b><span>مدرب</span></div><div><b>{counts.doctors}</b><span>دكتور تغذية</span></div></div>}
    <form className="pc-directory-search" onSubmit={(e) => { e.preventDefault(); if (!saving) { setEditing(null); setQuery(search.trim()); if (search.trim() === query) load(); } }}>
      <label htmlFor="owner-user-search">بحث بالاسم أو البريد</label><input id="owner-user-search" type="search" maxLength={120} value={search} disabled={saving} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
      <label htmlFor="owner-user-filter">تصفية الدور</label><select id="owner-user-filter" value={filter} disabled={saving} onChange={(e) => { setFilter(e.target.value); setEditing(null); }}><option value="all">كل الأدوار</option>{Object.entries(CHAT_ROLE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
      <button type="submit" className="pc-small" disabled={busy || saving}>بحث وتحديث</button>
    </form>
    {err && <p className="pc-error" role="alert">{err}</p>}{done && <p className="pc-role-success" role="status">{done}</p>}
    {busy && <p role="status">بنحمّل الحسابات...</p>}
    {page && <p className="pc-hint">ظاهر {rows.length} من {page.matching_count} حساب مطابق للبحث. الترتيب حسب تاريخ التسجيل، الأحدث أولا.</p>}
    {rows.map((r) => <div className="pc-role-row" key={r.user_id}><div><strong>{r.label}</strong><small dir="ltr">{r.email || "بدون بريد مسجل"}</small><small>{CHAT_ROLE_LABELS[r.role]} · {r.has_profile ? "له ملف شخصي" : "بدون ملف شخصي"}</small><small>النوع: {r.gender === "male" ? "ذكر" : r.gender === "female" ? "أنثى" : "غير مسجل"}</small><small>تسجيل: {r.has_registered_at === false ? "غير متاح" : new Date(r.created_at).toLocaleDateString("ar-EG")}</small></div><button type="button" className="pc-small" disabled={busy || saving} onClick={() => { setEditing(r); setRole(r.role); setDone(""); }}>تعديل الدور</button>{editing?.user_id === r.user_id && <form className="pc-role-editor" onSubmit={save}><h3>تعديل دور {editing.label}</h3><p dir="ltr">{editing.email || editing.user_id}</p><label htmlFor="owner-edit-role">الدور الجديد</label><select id="owner-edit-role" value={role} disabled={saving} onChange={(e) => setRole(e.target.value)}>{Object.entries(CHAT_ROLE_LABELS).map(([k,v]) => <option key={k} value={k} disabled={k === "coach" && !editing.email}>{v}</option>)}</select><p className="pc-hint">تحويل المدرب لدكتور أو مستخدم يوقف وصوله لبيانات المتدربين وإرسال رسائل جديدة كمدرب. السجل القديم يفضل لطرفي المحادثة. الدور مش توثيق مهني ومش بيدي صلاحيات إدارة أو حق قراءة محادثات الناس. صلاحيات المالك والإدارة منفصلة ومش بتتغير من هنا.</p><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "بيتحفظ..." : "تأكيد وحفظ الدور"}</button><button type="button" className="pc-small" disabled={saving} onClick={() => setEditing(null)}>إلغاء</button></form>}</div>)}
    {!busy && page && rows.length === 0 && <p className="pc-hint">مفيش حسابات مطابقة للبحث.</p>}
    {page?.has_more && <button type="button" className="pc-small" disabled={busy || saving} onClick={() => load(rows[rows.length - 1])}>حسابات أقدم</button>}

    <p className="pc-hint">بعد تعيين دكتور أو مدرب، لازم يفتح رسائله ويوافق على تنبيه الخصوصية عشان يظهر في جهات المحادثة.</p>
    {Number(counts?.legacy_coaches) > 0 && <><h3>صلاحيات مدربين لبريد غير مسجل ({counts.legacy_coaches})</h3><p className="pc-hint">دي صلاحيات قديمة لبريد لسه ملوش حساب. مش محسوبة ضمن المستخدمين المسجلين، وتقدر تلغيها بدون حذف أي حساب.</p><button className="pc-small" type="button" disabled={busy || saving} onClick={() => loadLegacy(false)}>عرض وتحديث الصلاحيات القديمة</button>{legacyLoaded && legacy.map((r) => <div className="pc-role-row" key={r.email}><small dir="ltr">{r.email}</small><button type="button" className="pc-small" disabled={busy || saving} onClick={() => revoke(r.email)}>إلغاء صلاحية المدرب</button></div>)}{legacyMore && <button type="button" className="pc-small" disabled={busy || saving} onClick={() => loadLegacy(true)}>صلاحيات أقدم</button>}</>}
    <p><Link to="/messages">افتح رسائلك الشخصية ←</Link></p>
  </section>;
}

export default function OwnerChatRoles() {
  const { user } = useAuth();
  return user ? <UserDirectory key={user.id} /> : null;
}
