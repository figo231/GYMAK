import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState";
import EditFoodSheet from "../Food/EditFoodSheet";
import EditSetSheet from "./EditSetSheet";
import { localISO } from "../../lib/dateKey";
import { dayLabel, groupWorkoutsByDay, weightRowsWithDelta } from "../../lib/historyLogic";
import Store from "../../lib/store/gymakStore";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { useToast } from "../../hooks/useToast";
import { useConfirm, usePrompt } from "../../hooks/useDialog";
import WorkoutCalendar from "./WorkoutCalendar";
import SectionNav from "../../components/layout/SectionNav";
import { tx, txf } from "../../lib/i18n/tx";

const TABS = [
  { id: "workouts", label: tx("التمارين") },
  { id: "food", label: tx("الأكل") },
  { id: "weight", label: tx("الوزن") },
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
  const allDays = useMemo(() => groupWorkoutsByDay(workouts), [workouts]);
  const [selDay, setSelDay] = useState(null);
  const dayStats = useMemo(() => Object.fromEntries(allDays.map((d) => [d.date, { sets: d.sets, exercises: d.exercises }])), [allDays]);
  const days = selDay ? allDays.filter((d) => d.date === selDay) : allDays;

  function withUndo(snap, message) {
    if (!snap) return;
    toast(message, { duration: 6000, action: { label: tx("تراجع"), onClick: () => Store.restore(snap) } });
  }

  async function removeWorkout(w) {
    const ok = await confirm({ title: tx("مسح المجموعة؟"), label: txf(`{0} · {1} · {2}×{3}`, [w.name, w.weight > 0 ? Store.formatWeight(w.weight) : tx("وزن الجسم"), w.sets, w.reps]), confirmLabel: tx("مسح"), danger: true });
    if (ok) withUndo(Store.deleteExerciseLog(w.exerciseId, w.i), tx("تم مسح المجموعة"));
  }
  function editWorkout(w) { setEditing(w); }
  function saveWorkout(vals) {
    const w = editing;
    setEditing(null);
    const snap = Store.updateExerciseLog(w.exerciseId, w.i, vals);
    snap ? withUndo(snap, tx("تم التعديل")) : toast(tx("القيم مش صحيحة"));
  }

  async function removeFood(day, idx) {
    const it = day.items[idx];
    const ok = await confirm({ title: tx("مسح الأكلة؟"), label: txf(`{0} ({1}جم)`, [it.name, it.grams]), confirmLabel: tx("مسح"), danger: true });
    if (ok) withUndo(Store.deleteFoodItem(day.date, idx), tx("تم مسح الأكلة"));
  }
  const [editingFood, setEditingFood] = useState(null);
  function editFood(day, idx) { setEditingFood({ date: day.date, idx, it: day.items[idx] }); }
  function saveFood(vals) {
    const { date, idx } = editingFood; setEditingFood(null);
    const snap = Store.updateFoodItem(date, idx, vals);
    snap ? withUndo(snap, tx("تم التعديل")) : toast(tx("القيم مش صحيحة"));
  }

  async function removeWeight(w) {
    const ok = await confirm({ title: tx("مسح الوزن؟"), label: `${dayLabel(w.date, today)} · ${Store.formatWeight(w.weight)}`, confirmLabel: tx("مسح"), danger: true });
    if (ok) withUndo(Store.deleteWeightEntry(w.date), tx("تم مسح الوزن"));
  }
  async function editWeight(w) {
    const v = await prompt({ title: tx("تعديل الوزن"), label: `${dayLabel(w.date, today)} (${Store.unitLabel()})`, inputType: "number", defaultValue: Store.toDisplayWeight(w.weight) });
    if (v == null) return;
    const bf = await prompt({ title: tx("نسبة الدهون % (اختياري)"), label: tx("سيبها فاضية لو مش عايز تسجلها"), inputType: "number", defaultValue: w.bodyFat ?? "" });
    if (bf === null || bf === undefined) return;
    const bfNum = bf === "" ? null : Number(bf);
    if (bfNum !== null && !(bfNum >= 3 && bfNum <= 70)) { toast(tx("نسبة الدهون لازم تكون بين 3 و 70.")); return; }
    const snap = Store.updateWeightEntry(w.date, Store.fromDisplayWeight(Number(v)), bfNum);
    snap ? withUndo(snap, tx("تم التعديل")) : toast(tx("القيمة مش صحيحة"));
  }

  const trash = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" /></svg>;
  const pen = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
  const rowActions = (onEdit, onDel, what) => (
    <div className="hist-actions">
      <button type="button" className="hist-btn" aria-label={txf(`تعديل {0}`, [what])} onClick={onEdit}>{pen}</button>
      <button type="button" className="hist-btn danger" aria-label={txf(`مسح {0}`, [what])} onClick={onDel}>{trash}</button>
    </div>
  );
  const fmtKg = (kg) => Store.formatWeight(kg);

  return (
    <>
      <SectionNav group="progress" title={tx("تقدّمي")} />
      <div className="period-tabs" role="tablist" aria-label={tx("نوع السجل")} style={{ marginTop: 4 }}>
        {TABS.map((t) => (
          <button type="button" role="tab" aria-selected={tab === t.id} key={t.id} className={"p-tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "workouts" && (days.length === 0 ? (
        <EmptyState type="dumbbell" title={tx("لسه مسجلتش أي تمرين")} subtitle={tx("أول مجموعة تسجلها هتظهر هنا.")} ctaLabel={tx("ابدأ من التمارين")} onCta={() => { navigate("/exercises"); }} />
      ) : (
        <>
          <div className="th-summary" data-testid="hist-summary">
            <div><b>{days.length}</b><span>{tx("يوم تمرين")}</span></div>
            <div><b>{days.reduce((a, d) => a + d.sets, 0)}</b><span>{tx("مجموعة")}</span></div>
            <div><b>{new Set(workouts.map((w) => w.exerciseId)).size}</b><span>{tx("تمرين مختلف")}</span></div>
          </div>
          <WorkoutCalendar dayStats={dayStats} today={today} selected={selDay} onSelect={setSelDay} />
          <div className="th-rail">
          {days.map((d) => {
            const dt = new Date(d.date + "T00:00:00");
            const groups = [];
            for (const w of d.items) {
              let g = groups.find((x) => x.id === w.exerciseId);
              if (!g) { g = { id: w.exerciseId, name: w.name, sets: [] }; groups.push(g); }
              g.sets.push(w);
            }
            return (
            <section key={d.date} className="th-day" aria-label={dayLabel(d.date, today)}>
              <div className="th-date"><b>{dt.getDate()}</b><span>{dt.toLocaleDateString("ar-EG", { month: "short" })}</span></div>
              <div className="th-card">
                <div className="th-head"><span className="th-name">{dayLabel(d.date, today)}</span><span className="th-sum">{d.exercises} {d.exercises === 1 ? tx("تمرين") : tx("تمارين")} · {d.sets} {tx("مجموعة")}{d.volume > 0 ? ` · ${fmtKg(d.volume)}` : ""}</span></div>
                {groups.map((g) => (
                  <div className="th-ex" key={g.id}>
                    <Link to={`/exercise/${g.id}`} className="th-ex-name">{g.name}</Link>
                    {g.sets.map((w) => (
                      <div className="th-set" key={w.i}>
                        <span className="th-set-v"><b dir="ltr">{w.weight > 0 ? fmtKg(w.weight) : tx("وزن الجسم")}</b><i dir="ltr">{w.sets}×{w.reps}</i></span>
                        {rowActions(() => editWorkout(w), () => removeWorkout(w), txf(`مجموعة {0}`, [w.name]))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
            );
          })}
          </div>
          {workouts.length >= limit && <button type="button" className="btn hist-more" onClick={() => setLimit((l) => l + 200)}>{tx("عرض أقدم")}</button>}
        </>
      ))}

      {tab === "food" && (foodDays.length === 0 ? (
        <EmptyState type="chat" title={tx("لسه مسجلتش أي أكل")} subtitle="اكتب للمدرب الذكي اللي أكلته وهو يحسب السعرات." ctaLabel="افتح المدرب" onCta={() => { navigate("/ai-coach"); }} />
      ) : foodDays.map((day) => (
        <section key={day.date} className="hist-day" aria-label={dayLabel(day.date, today)}>
          <div className="hist-day-head">
            <span className="hist-day-name">{dayLabel(day.date, today)}</span>
            <span className="hist-day-sum">{day.totalKcal} {tx("سعرة · بروتين")} {Math.round(day.totalProtein || 0)}{tx("جم")}</span>
          </div>
          {day.items.map((it, idx) => (
            <div className="glass hist-row" key={idx}>
              <div className="hist-main">
                <div className="hist-name">{it.name}</div>
                <div className="hist-meta">{it.grams}{tx("جم ·")} {it.kcal} {tx("سعرة · بروتين")} {it.protein}</div>
              </div>
              {rowActions(() => editFood(day, idx), () => removeFood(day, idx), it.name)}
            </div>
          ))}
        </section>
      )))}

      {tab === "weight" && (weights.length === 0 ? (
        <EmptyState type="trophy" title={tx("لسه مسجلتش وزنك")} subtitle="سجّل وزنك من الصفحة الرئيسية وهتشوف تغييرك هنا." />
      ) : weights.map((w) => (
        <div className="glass hist-row" key={w.date}>
          <div className="hist-main">
            <div className="hist-name">{fmtKg(w.weight)}{w.delta != null && w.delta !== 0 && (
              <span className="hist-delta" dir="ltr">{w.delta > 0 ? "+" : "−"}{Math.abs(+(Store.toDisplayWeight(w.weight) - Store.toDisplayWeight(w.weight - w.delta)).toFixed(1))}</span>
            )}</div>
            <div className="hist-meta">{dayLabel(w.date, today)}{w.bodyFat != null ? txf(` · دهون {0}%`, [w.bodyFat]) : ""}</div>
          </div>
          {rowActions(() => editWeight(w), () => removeWeight(w), tx("الوزن"))}
        </div>
      )))}

      {editingFood && <EditFoodSheet item={editingFood.it} onClose={() => setEditingFood(null)} onSave={saveFood} />}
      {editing && <EditSetSheet entry={editing} onClose={() => setEditing(null)} onSave={saveWorkout} />}
    </>
  );
}
