import { useEffect, useState } from "react";
import OwnerProfessionalCards from "./OwnerProfessionalCards";
import OwnerChatRoles from "./OwnerChatRoles";
import OwnerEncouragement from "./OwnerEncouragement";
import OwnerReports from "./OwnerReports";
import { DetailTopBar } from "../../components/layout/DetailShell";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { isOwnerAdmin } from "../../lib/push/ownerBroadcast";
import { supabase } from "../../lib/supabaseClient";
import { saveContent, setContentActive, refreshRemoteContent } from "../../lib/content/remoteContent";
import { tx } from "../../lib/i18n/tx";

const MUSCLES = [["chest", tx("صدر")], ["back", tx("ظهر")], ["shoulders", tx("أكتاف")], ["legs", tx("رجلين")], ["arms", tx("دراعات")], ["core", tx("بطن")]];
const slug = (s) => "x-" + (s || "").trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);
const card = { padding: 12, borderRadius: 14, border: "1px solid var(--border-soft)", background: "rgba(var(--ink), .04)", marginBottom: 10 };

function ExerciseForm({ onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: "", muscle: "chest", muscleLabel: "", sets: 3, reps: 10, equipment: "", description: "", steps: "", img1: "", img2: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    if (!f.name.trim()) return toast(tx("اكتب اسم التمرين"));
    const frames = [f.img1.trim(), f.img2.trim()].filter(Boolean);
    const data = {
      name: f.name.trim(), muscle: f.muscle, muscleLabel: f.muscleLabel.trim() || MUSCLES.find((m) => m[0] === f.muscle)[1], secondary: "",
      sets: Number(f.sets) || 3, reps: Number(f.reps) || 10, custom: false, equipment: f.equipment.trim(), difficulty: tx("متوسط"),
      description: f.description.trim(), instructions: f.steps.split("\n").map((x) => x.trim()).filter(Boolean),
      ...(frames.length ? { frames } : {}),
    };
    try { await saveContent("content_exercises", slug(f.name), data); toast(tx("اتحفظ ونزل لكل المستخدمين ✅")); onSaved(); setF({ ...f, name: "", description: "", steps: "", img1: "", img2: "" }); }
    catch (e) { toast("فشل الحفظ: " + e.message); }
  }
  return (
    <div style={card}>
      <div className="edit-field"><label>{tx("اسم التمرين")}</label><input value={f.name} onChange={set("name")} /></div>
      <div className="edit-field"><label>{tx("العضلة")}</label>
        <select value={f.muscle} onChange={set("muscle")}>{MUSCLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      <div className="edit-field"><label>{tx("المجموعات / العدّات")}</label>
        <div style={{ display: "flex", gap: 8 }}><input type="number" value={f.sets} onChange={set("sets")} /><input type="number" value={f.reps} onChange={set("reps")} /></div></div>
      <div className="edit-field"><label>{tx("الأداة")}</label><input value={f.equipment} onChange={set("equipment")} /></div>
      <div className="edit-field"><label>{tx("وصف قصير")}</label><input value={f.description} onChange={set("description")} /></div>
      <div className="edit-field"><label>{tx("خطوات التنفيذ (سطر لكل خطوة)")}</label><textarea rows={4} value={f.steps} onChange={set("steps")} style={{ width: "100%", font: "inherit" }} /></div>
      <div className="edit-field"><label>{tx("رابط صورة 1 (اختياري)")}</label><input dir="ltr" value={f.img1} onChange={set("img1")} /></div>
      <div className="edit-field"><label>{tx("رابط صورة 2 (اختياري)")}</label><input dir="ltr" value={f.img2} onChange={set("img2")} /></div>
      <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={save}>{tx("حفظ ونشر")}</button>
    </div>
  );
}

function FoodForm({ onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ names: "", kcal: "", protein: "", carbs: "", fat: "", piece: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    const names = f.names.split(/[,،]/).map((x) => x.trim()).filter(Boolean);
    if (!names.length || f.kcal === "") return toast(tx("اكتب الاسم والسعرات"));
    const data = { names, per100: { kcal: Number(f.kcal) || 0, protein: Number(f.protein) || 0, carbs: Number(f.carbs) || 0, fat: Number(f.fat) || 0 }, ...(Number(f.piece) ? { pieceWeight: Number(f.piece) } : {}) };
    try { await saveContent("content_foods", slug(names[0]), data); toast(tx("اتحفظ ونزل لكل المستخدمين ✅")); onSaved(); setF({ names: "", kcal: "", protein: "", carbs: "", fat: "", piece: "" }); }
    catch (e) { toast("فشل الحفظ: " + e.message); }
  }
  return (
    <div style={card}>
      <div className="edit-field"><label>{tx("الأسماء (مفصولة بفاصلة)")}</label><input value={f.names} onChange={set("names")} /></div>
      <div className="edit-field"><label>{tx("لكل 100 جرام: سعرات / بروتين / كارب / دهون")}</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input type="number" placeholder="kcal" value={f.kcal} onChange={set("kcal")} /><input type="number" placeholder="P" value={f.protein} onChange={set("protein")} />
          <input type="number" placeholder="C" value={f.carbs} onChange={set("carbs")} /><input type="number" placeholder="F" value={f.fat} onChange={set("fat")} /></div></div>
      <div className="edit-field"><label>{tx("وزن الحبة بالجرام (اختياري)")}</label><input type="number" value={f.piece} onChange={set("piece")} /></div>
      <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={save}>{tx("حفظ ونشر")}</button>
    </div>
  );
}

function PublishedList({ table, label }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const load = async () => {
    const { data } = await supabase.from(table).select("id,data,active,updated_at").order("updated_at", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { load(); }, [table]);
  async function toggle(r) {
    try { await setContentActive(table, r.id, !r.active); load(); } catch (e) { toast("فشل: " + e.message); }
  }
  if (!rows.length) return <p className="notif-note">{tx("لسه مفيش")} {label} {tx("منشورة من هنا.")}</p>;
  return rows.map((r) => (
    <div key={r.id} style={{ ...card, display: "flex", alignItems: "center", gap: 10, opacity: r.active ? 1 : 0.5 }}>
      <div style={{ flex: 1, fontWeight: 700, fontSize: 13 }}>{r.data.name || (r.data.names || [])[0]}</div>
      <button type="button" className="btn" onClick={() => toggle(r)} style={{ padding: "6px 12px", borderRadius: 10, border: "1px solid var(--border-soft)", background: "none", cursor: "pointer", color: "inherit" }}>{r.active ? tx("إخفاء") : tx("إظهار")}</button>
    </div>
  ));
}

function OwnerPanelSession() {
  const { user } = useAuth();
  const [ok, setOk] = useState(null);
  const [tab, setTab] = useState("exercises");
  const [bump, setBump] = useState(0);
  useEffect(() => { isOwnerAdmin(user?.id).then(setOk); }, [user?.id]);
  if (ok === null) return <DetailTopBar backTo="/profile" title={tx("لوحة المالك")} />;
  if (!ok) return (<><DetailTopBar backTo="/profile" title={tx("لوحة المالك")} /><p className="notif-note" style={{ padding: 16 }}>{tx("الصفحة دي لحساب المالك بس.")}</p></>);
  const tabs = [["exercises", tx("التمارين")], ["foods", tx("الأكل")], ["coaches", tx("المستخدمون")], ["suggestions", tx("المقترحين")], ["reports", tx("البلاغات")], ["encouragement", tx("التشجيع")]];
  return (
    <>
      <DetailTopBar backTo="/profile" title={tx("لوحة المالك")} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 12px" }}>
        {tabs.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={"btn" + (tab === k ? " btn-primary" : "")} style={{ flex: "1 0 28%", padding: 10, borderRadius: 12, border: "1px solid var(--border-soft)", cursor: "pointer", fontWeight: 800, background: tab === k ? undefined : "none", color: tab === k ? undefined : "inherit" }}>{l}</button>
        ))}
      </div>
      {tab === "exercises" && (<><ExerciseForm onSaved={() => setBump(bump + 1)} /><PublishedList key={bump} table="content_exercises" label={tx("تمارين")} /></>)}
      {tab === "foods" && (<><FoodForm onSaved={() => setBump(bump + 1)} /><PublishedList key={bump} table="content_foods" label={tx("أكلات")} /></>)}
      {tab === "coaches" && <OwnerChatRoles />}
      {tab === "suggestions" && <OwnerProfessionalCards />}
      {tab === "encouragement" && <OwnerEncouragement />}
      {tab === "reports" && <OwnerReports />}
      <button type="button" className="btn" onClick={() => refreshRemoteContent()} style={{ width: "100%", marginTop: 8, background: "none", border: "1px solid var(--border-soft)", padding: 10, borderRadius: 12, color: "inherit", cursor: "pointer" }}>{tx("تحديث المحتوى على جهازي")}</button>
    </>
  );
}

export default function OwnerPanel() {
  const { user } = useAuth();
  return <OwnerPanelSession key={user?.id || "guest"} />;
}
