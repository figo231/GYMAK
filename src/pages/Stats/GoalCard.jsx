import { useState } from "react";
import Store from "../../lib/store/gymakStore";
import { fmt } from "../../lib/format";
import { useToast } from "../../hooks/useToast";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { localISO } from "../../lib/dateKey";
import { goalTrajectory, goalProgress, GOAL_STATUS_LABEL } from "../../lib/stats/goalPath";

// Weight goal with a deadline: sets the target weight and date, shows the
// on-track verdict, and feeds WeightChart (via goalTrajectory) its end point.
export default function GoalCard({ history }) {
  const toast = useToast();
  const [, bump] = useStoreVersion();
  const today = localISO();
  const unit = Store.unitLabel();
  const goal = Store.getGoalWeight();
  const deadline = Store.getGoalDeadline();
  const [goalInput, setGoalInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [editing, setEditing] = useState(false);

  const traj = goalTrajectory(history, goal, deadline);
  const progress = goalProgress(history, goal, deadline, today);

  function save() {
    const g = goalInput.trim() ? Store.fromDisplayWeight(parseFloat(goalInput)) : goal;
    if (goalInput.trim() && !(g >= 30 && g <= 300)) { toast(`الوزن المستهدف لازم يكون بين 30 و 300 كجم.`); return; }
    if (dateInput && dateInput <= today) { toast("اختار معاد في المستقبل."); return; }
    if (goalInput.trim()) Store.setGoalWeight(g);
    if (dateInput) Store.setGoalDeadline(dateInput);
    setEditing(false); setGoalInput(""); setDateInput("");
    bump(); toast("اتحفظ الهدف ✅");
  }

  return (
    <div className="glass chart-card" style={{ marginBottom: 12 }}>
      <div className="chart-head" style={{ marginBottom: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>🎯 هدف الوزن</span>
        <button type="button" className="chip chip-btn sm" onClick={() => setEditing((v) => !v)}>{editing ? "إلغاء" : goal ? "تعديل" : "حدّد هدفك"}</button>
      </div>
      {goal ? (
        <div style={{ fontSize: 13, lineHeight: 1.9 }}>
          <div>
            الهدف: <b><bdi dir="ltr">{fmt(Store.toDisplayWeight(goal))}</bdi> {unit}</b>
            {deadline && <> · قبل <bdi dir="ltr">{deadline}</bdi></>}
          </div>
          {progress && (
            <div style={{ color: "var(--text-dim)" }}>
              {GOAL_STATUS_LABEL[progress.status]}
              {progress.status !== "done" && progress.remaining ? <> — فاضل <bdi dir="ltr">{fmt(Math.abs(Store.toDisplayWeight(goal) - Store.toDisplayWeight(history.at(-1).weight)))}</bdi> {unit}</> : null}
              {progress.requiredPerWeek ? <> · المطلوب <bdi dir="ltr">{fmt(Math.abs(Store.toDisplayWeight(goal) - Store.toDisplayWeight(goal - progress.requiredPerWeek)))}</bdi> {unit}/أسبوع</> : null}
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>حط وزنك المستهدف ومعاد الوصول، وهنرسم لك خط يوريك ماشي صح ولا لأ.</div>
      )}
      {editing && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <input type="number" inputMode="decimal" dir="ltr" aria-label="الوزن المستهدف" placeholder={goal ? fmt(Store.toDisplayWeight(goal)) : `الوزن (${unit})`} value={goalInput} onChange={(e) => setGoalInput(e.target.value)} style={{ flex: "1 1 110px" }} />
          <input type="date" dir="ltr" aria-label="معاد الوصول" min={today} value={dateInput} onChange={(e) => setDateInput(e.target.value)} style={{ flex: "1 1 140px" }} />
          <button type="button" className="btn btn-primary" onClick={save}>حفظ</button>
        </div>
      )}
    </div>
  );
}

export { goalTrajectory };
