import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState";
import EditSetSheet from "./EditSetSheet";
import { localISO } from "../../lib/dateKey";
import { dayLabel, groupWorkoutsByDay, weightRowsWithDelta } from "../../lib/historyLogic";
import Store from "../../lib/store/gymakStore";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { useToast } from "../../hooks/useToast";
import { useConfirm, usePrompt } from "../../hooks/useDialog";
import { DetailTopBar } from "../../components/layout/DetailShell";

const TABS = [
  { id: "workouts", label: "التمارين" },
  { id: "food", label: "الأكل" },
  { id: "weight", label: "الوزن" },
];

export default function History() {
  const [version] = useStoreVersion();
  const [tab, setTab] = useState("workouts");
  const toast = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);
  const [limit, setLimit] = useState(200);
  const today = localISO();

  const workouts = useMemo(() => Store.getExerciseLogEntries(limit), [version, limit]);
  const foodDays = useMemo(() => Store.getFoodDays(), [version]);
  const weights = useMemo(() => weightRowsWithDelta(Store.getWeightEntries()), [version]);
  const days = useMemo(() => groupWorkoutsByDay(workouts), [workouts]);

  function withUndo(snap, message) {
    if (!snap) return;
    toast(message, { duration: 6000, action: { label: "تراجع", onClick: () => Store.restore(snap) } });
  }

  async function removeWorkout(w) {
    const ok = await confirm({ title: "مسح المجموعة؟", label: `${w.name} · ${w.weight > 0 ? Store.formatWeight(w.weight) : "وزن الجسم"} · ${w.sets}×${w.reps}`, confirmLabel: "مسح", danger: true });
    if (ok) withUndo(Store.deleteExerciseLog(w.exerciseId, w.i), "تم مسح المجموعة");
  }
  function editWorkout(w) { setEditing(w); }
  function saveWorkout(vals) {
    const w = editing;
    setEditing(null);
    const snap = Store.updateExerciseLog(w.exerciseId, w.i, vals);
    snap ? withUndo(snap, "تم التعديل") : toast("القيم مش صحيحة");
  }

  async function removeFood(day, idx) {
    const it = day.items[idx];
    const ok = await confirm({ title: "مسح الأكلة؟", label: `${it.name} (${it.grams}جم)`, confirmLabel: "مسح", danger: true });
    if (ok) withUndo(Store.deleteFoodItem(day.date, idx), "تم مسح الأكلة");
  }
  async function editFood(day, idx) {
    const it = day.items[idx];
    const g = await prompt({ title: it.name, label: "الكمية بالجرام", inputType: "number", defaultValue: it.grams });
    if (g == null) return;
    const snap = Store.updateFoodItemGrams(day.date, idx, g);
    snap ? withUndo(snap, "تم التعديل") : toast("القيمة مش صحيحة");
  }

  async function removeWeight(w) {
    const ok = await confirm({ title: "مسح الوزن؟", label: `${dayLabel(w.date, today)} · ${Store.formatWeight(w.weight)}`, confirmLabel: "مسح", danger: true });
    if (ok) withUndo(Store.deleteWeightEntry(w.date), "تم مسح الوزن");
  }
  async function editWeight(w) {
    const v = await prompt({ title: "تعديل الوزن", label: `${dayLabel(w.date, today)} (${Store.unitLabel()})`, inputType: "number", defaultValue: Store.toDisplayWeight(w.weight) });
    if (v == null) return;
    const snap = Store.updateWeightEntry(w.date, Store.fromDisplayWeight(Number(v)));
    snap ? withUndo(snap, "تم التعديل") : toast("القيمة مش صحيحة");
  }

  const trash = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" /></svg>;
  const pen = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
  const rowActions = (onEdit, onDel, what) => (
    <div className="hist-actions">
      <button type="button" className="hist-btn" aria-label={`تعديل ${what}`} onClick={onEdit}>{pen}</button>
      <button type="button" className="hist-btn danger" aria-label={`مسح ${what}`} onClick={onDel}>{trash}</button>
    </div>
  );
  const fmtKg = (kg) => Store.formatWeight(kg);

  return (
    <>
      <DetailTopBar backTo="/profile" title="السجل" />
      <div className="period-tabs" role="tablist" aria-label="نوع السجل" style={{ marginTop: 4 }}>
        {TABS.map((t) => (
          <button type="button" role="tab" aria-selected={tab === t.id} key={t.id} className={"p-tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "workouts" && (days.length === 0 ? (
        <EmptyState type="dumbbell" title="لسه مسجلتش أي تمرين" subtitle="أول مجموعة تسجلها هتظهر هنا." ctaLabel="ابدأ من التمارين" onCta={() => { navigate("/exercises"); }} />
      ) : (
        <>
          {days.map((d) => (
            <section key={d.date} className="hist-day" aria-label={dayLabel(d.date, today)}>
              <div className="hist-day-head">
                <span className="hist-day-name">{dayLabel(d.date, today)}</span>
                <span className="hist-day-sum">{d.exercises} {d.exercises === 1 ? "تمرين" : "تمارين"} · {d.sets} مجموعة{d.volume > 0 ? ` · ${fmtKg(d.volume)}` : ""}</span>
              </div>
              {d.items.map((w) => (
                <div className="glass hist-row" key={`${w.exerciseId}-${w.i}`}>
                  <div className="hist-main">
                    <Link to={`/exercise/${w.exerciseId}`} className="hist-name">{w.name}</Link>
                    <div className="hist-meta">{w.weight > 0 ? fmtKg(w.weight) : "وزن الجسم"} · <bdi dir="ltr">{w.sets}×{w.reps}</bdi></div>
                  </div>
                  {rowActions(() => editWorkout(w), () => removeWorkout(w), `مجموعة ${w.name}`)}
                </div>
              ))}
            </section>
          ))}
          {workouts.length >= limit && <button type="button" className="btn hist-more" onClick={() => setLimit((l) => l + 200)}>عرض أقدم</button>}
        </>
      ))}

      {tab === "food" && (foodDays.length === 0 ? (
        <EmptyState type="chat" title="لسه مسجلتش أي أكل" subtitle="اكتب للمدرب الذكي اللي أكلته وهو يحسب السعرات." ctaLabel="افتح المدرب" onCta={() => { navigate("/ai-coach"); }} />
      ) : foodDays.map((day) => (
        <section key={day.date} className="hist-day" aria-label={dayLabel(day.date, today)}>
          <div className="hist-day-head">
            <span className="hist-day-name">{dayLabel(day.date, today)}</span>
            <span className="hist-day-sum">{day.totalKcal} سعرة · بروتين {Math.round(day.totalProtein || 0)}جم</span>
          </div>
          {day.items.map((it, idx) => (
            <div className="glass hist-row" key={idx}>
              <div className="hist-main">
                <div className="hist-name">{it.name}</div>
                <div className="hist-meta">{it.grams}جم · {it.kcal} سعرة · بروتين {it.protein}</div>
              </div>
              {rowActions(() => editFood(day, idx), () => removeFood(day, idx), it.name)}
            </div>
          ))}
        </section>
      )))}

      {tab === "weight" && (weights.length === 0 ? (
        <EmptyState type="trophy" title="لسه مسجلتش وزنك" subtitle="سجّل وزنك من الصفحة الرئيسية وهتشوف تغييرك هنا." />
      ) : weights.map((w) => (
        <div className="glass hist-row" key={w.date}>
          <div className="hist-main">
            <div className="hist-name">{fmtKg(w.weight)}{w.delta != null && w.delta !== 0 && (
              <span className="hist-delta" dir="ltr">{w.delta > 0 ? "+" : "−"}{Math.abs(+(Store.toDisplayWeight(w.weight) - Store.toDisplayWeight(w.weight - w.delta)).toFixed(1))}</span>
            )}</div>
            <div className="hist-meta">{dayLabel(w.date, today)}{w.bodyFat != null ? ` · دهون ${w.bodyFat}%` : ""}</div>
          </div>
          {rowActions(() => editWeight(w), () => removeWeight(w), "الوزن")}
        </div>
      )))}

      {editing && <EditSetSheet entry={editing} onClose={() => setEditing(null)} onSave={saveWorkout} />}
    </>
  );
}
