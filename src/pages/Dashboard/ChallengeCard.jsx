import { useMemo } from "react";
import Store from "../../lib/store/gymakStore";
import { weeklyChallenge, monthlyBadges } from "../../lib/challenges";

export default function ChallengeCard({ version }) {
  const { w, m } = useMemo(() => {
    const days = Store.getWorkoutDays();
    return { w: weeklyChallenge(days), m: monthlyBadges(days) };
  }, [version]);
  return (
    <div className="glass chal-card" data-testid="challenge-card">
      <div className="chal-top">
        <b>تحدي الأسبوع</b>
        <span className="chal-count" dir="ltr">{w.done}/{w.target}</span>
      </div>
      <div className="chal-sub">
        {w.complete ? "خلّصت التحدي. كمّل بنفس الحماس 🔥" : `${w.target} أيام تمرين قبل الجمعة. فاضل ${w.left} ${w.left === 1 ? "يوم" : "أيام"}.`}
      </div>
      <div className="chal-bar" role="progressbar" aria-valuenow={w.pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: w.pct + "%" }} /></div>
      <div className="chal-badges">
        {["bronze", "silver", "gold"].map((id, i) => {
          const t = [{ label: "برونز", d: 8 }, { label: "فضة", d: 12 }, { label: "ذهب", d: 20 }][i];
          const on = m.earned.some((e) => e.id === id);
          return <span key={id} className={"chal-badge " + id + (on ? " on" : "")}>{t.label} · {t.d}</span>;
        })}
      </div>
      <div className="chal-sub">{m.next ? `الشهر ده: ${m.days} يوم. فاضل ${m.toNext} للشارة ${m.next.label}.` : `الشهر ده: ${m.days} يوم. جبت الشارات كلها 🏅`}</div>
    </div>
  );
}
