import { useMemo, useState } from "react";
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

const rowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", marginBottom: 8 };
const iconBtn = {
  background: "rgba(var(--ink),0.06)", border: "1px solid var(--border-soft)", borderRadius: 10,
  padding: "7px 10px", fontSize: 12, fontWeight: 800, color: "var(--text-primary)", fontFamily: "inherit", cursor: "pointer",
};

export default function History() {
  const [version] = useStoreVersion();
  const [tab, setTab] = useState("workouts");
  const toast = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();

  const workouts = useMemo(() => Store.getExerciseLogEntries(200), [version]);
  const foodDays = useMemo(() => Store.getFoodDays(), [version]);
  const weights = useMemo(() => Store.getWeightEntries(), [version]);

  function withUndo(snap, message) {
    if (!snap) return;
    toast(message, { duration: 6000, action: { label: "تراجع", onClick: () => Store.restore(snap) } });
  }

  async function removeWorkout(w) {
    const ok = await confirm({ title: "مسح المجموعة؟", label: `${w.name} — ${Store.formatWeight(w.weight)} × ${w.sets}×${w.reps}`, confirmLabel: "مسح", danger: true });
    if (ok) withUndo(Store.deleteExerciseLog(w.exerciseId, w.i), "تم مسح المجموعة");
  }
  async function editWorkout(w) {
    const wt = await prompt({ title: "تعديل الوزن", label: `الوزن (${Store.unitLabel()})`, inputType: "number", defaultValue: Store.toDisplayWeight(w.weight) });
    if (wt == null) return;
    const sr = await prompt({ title: "المجموعات × التكرارات", label: "اكتبها زي 3x10", defaultValue: `${w.sets}x${w.reps}` });
    if (sr == null) return;
    const m = String(sr).toLowerCase().match(/^\s*(\d+)\s*[x×*]\s*(\d+)\s*$/);
    if (!m || !(Number(wt) >= 0)) { toast("القيم مش صحيحة"); return; }
    const snap = Store.updateExerciseLog(w.exerciseId, w.i, { weight: Store.fromDisplayWeight(Number(wt)), sets: m[1], reps: m[2] });
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
    const ok = await confirm({ title: "مسح الوزن؟", label: `${w.date} — ${Store.formatWeight(w.weight)}`, confirmLabel: "مسح", danger: true });
    if (ok) withUndo(Store.deleteWeightEntry(w.date), "تم مسح الوزن");
  }
  async function editWeight(w) {
    const v = await prompt({ title: "تعديل الوزن", label: `${w.date} (${Store.unitLabel()})`, inputType: "number", defaultValue: Store.toDisplayWeight(w.weight) });
    if (v == null) return;
    const snap = Store.updateWeightEntry(w.date, Store.fromDisplayWeight(Number(v)));
    snap ? withUndo(snap, "تم التعديل") : toast("القيمة مش صحيحة");
  }

  const empty = (text) => <div className="glass" style={{ padding: 24, textAlign: "center", color: "var(--text-dim)", fontWeight: 700, fontSize: 13 }}>{text}</div>;

  return (
    <>
      <DetailTopBar backTo="/profile" title="السجل" />
      <div className="period-tabs" style={{ marginTop: 4 }}>
        {TABS.map((t) => (
          <div key={t.id} className={"p-tab" + (tab === t.id ? " active" : "")} style={{ cursor: "pointer" }} onClick={() => setTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {tab === "workouts" && (workouts.length === 0 ? empty("لسه مسجلتش أي تمرين") : workouts.map((w) => (
        <div className="glass" style={rowStyle} key={`${w.exerciseId}-${w.i}-${w.date}`}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{w.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600, marginTop: 2 }}>{w.date} · {Store.formatWeight(w.weight)} · {w.sets}×{w.reps}</div>
          </div>
          <button style={iconBtn} onClick={() => editWorkout(w)}>تعديل</button>
          <button style={{ ...iconBtn, color: "var(--danger)" }} onClick={() => removeWorkout(w)}>مسح</button>
        </div>
      )))}

      {tab === "food" && (foodDays.length === 0 ? empty("لسه مسجلتش أي أكل") : foodDays.map((day) => (
        <div key={day.date} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--text-secondary)", margin: "4px 4px 8px" }}>{day.date} · {day.totalKcal} سعرة</div>
          {day.items.map((it, idx) => (
            <div className="glass" style={rowStyle} key={idx}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{it.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600, marginTop: 2 }}>{it.grams}جم · {it.kcal} سعرة · بروتين {it.protein}</div>
              </div>
              <button style={iconBtn} onClick={() => editFood(day, idx)}>تعديل</button>
              <button style={{ ...iconBtn, color: "var(--danger)" }} onClick={() => removeFood(day, idx)}>مسح</button>
            </div>
          ))}
        </div>
      )))}

      {tab === "weight" && (weights.length === 0 ? empty("لسه مسجلتش وزنك") : weights.map((w) => (
        <div className="glass" style={rowStyle} key={w.date}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{Store.formatWeight(w.weight)}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600, marginTop: 2 }}>{w.date}{w.bodyFat != null ? ` · دهون ${w.bodyFat}%` : ""}</div>
          </div>
          <button style={iconBtn} onClick={() => editWeight(w)}>تعديل</button>
          <button style={{ ...iconBtn, color: "var(--danger)" }} onClick={() => removeWeight(w)}>مسح</button>
        </div>
      )))}
    </>
  );
}
