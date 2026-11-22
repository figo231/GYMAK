import { useMemo } from "react";
import Store from "../../lib/store/gymakStore";
import { weeklyChallenge, monthlyBadges } from "../../lib/challenges";
import { challengeStatus, joinChallenge, leaveChallenge, CHALLENGE_DAYS } from "../../lib/challenge30";

export default function ChallengeCard({ version }) {
  const { w, m, c30 } = useMemo(() => {
    const days = Store.getWorkoutDays();
    return { w: weeklyChallenge(days), m: monthlyBadges(days), c30: challengeStatus(days, Store.getCheatDays()) };
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
      <div style={{ borderTop: "1px solid rgba(var(--ink),0.08)", marginTop: 10, paddingTop: 10 }}>
        <div className="chal-top"><b>تحدي الـ{CHALLENGE_DAYS} يوم</b>
          {c30 && !c30.complete && !c30.failed && <span className="chal-count" dir="ltr">{c30.done}/{CHALLENGE_DAYS}</span>}
        </div>
        {!c30 && (
          <>
            <div className="chal-sub">تمرّن كل يوم لمدة 30 يوم متتاليين واكسب وسام التحدي 🔥</div>
            <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={() => joinChallenge()}>ابدأ التحدي</button>
          </>
        )}
        {c30 && !c30.complete && !c30.failed && (
          <>
            <div className="chal-sub">يوم {c30.day} من {CHALLENGE_DAYS} — {c30.done} يوم تمام، فاضل {c30.left} 🔥</div>
            <div className="chal-bar" role="progressbar" aria-valuenow={Math.round((c30.done / CHALLENGE_DAYS) * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: (c30.done / CHALLENGE_DAYS) * 100 + "%" }} /></div>
          </>
        )}
        {c30 && c30.complete && <div className="chal-sub">كسبت تحدي الـ{CHALLENGE_DAYS} يوم 👑 الوسام اتفتح في صفحة الإنجازات!</div>}
        {c30 && c30.failed && (
          <>
            <div className="chal-sub">التحدي خلص بـ{c30.done} يوم. جرّب تاني — المرة الجاية 👊</div>
            <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={() => { leaveChallenge(); joinChallenge(); }}>ابدأ من الأول</button>
          </>
        )}
      </div>
    </div>
  );
}
