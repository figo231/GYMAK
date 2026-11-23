import { useMemo, useState } from "react";
import Store from "../../lib/store/gymakStore";
import { weeklyChallenge, monthlyBadges } from "../../lib/challenges";
import { challengeStatus, joinChallenge, leaveChallenge, CHALLENGE_DAYS } from "../../lib/challenge30";
import { tx, txf } from "../../lib/i18n/tx";

export default function ChallengeCard({ version }) {
  const [challengeVersion, setChallengeVersion] = useState(0);
  function startChallenge() { joinChallenge(); setChallengeVersion(v => v + 1); }
  const { w, m, c30 } = useMemo(() => {
    const days = Store.getWorkoutDays();
    return { w: weeklyChallenge(days), m: monthlyBadges(days), c30: challengeStatus(days, Store.getCheatDays()) };
  }, [version, challengeVersion]);
  return (
    <div className="glass chal-card" data-testid="challenge-card">
      <div className="chal-top">
        <b>{tx("تحدي الأسبوع")}</b>
        <span className="chal-count" dir="ltr">{w.done}/{w.target}</span>
      </div>
      <div className="chal-sub">
        {w.complete ? tx("خلّصت التحدي. كمّل بنفس الحماس 🔥") : txf(`{0} أيام تمرين قبل الجمعة. فاضل {1} {2}.`, [w.target, w.left, w.left === 1 ? "يوم" : "أيام"])}
      </div>
      <div className="chal-bar" role="progressbar" aria-valuenow={w.pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: w.pct + "%" }} /></div>
      <div className="chal-badges">
        {["bronze", "silver", "gold"].map((id, i) => {
          const t = [{ label: tx("برونز"), d: 8 }, { label: tx("فضة"), d: 12 }, { label: tx("ذهب"), d: 20 }][i];
          const on = m.earned.some((e) => e.id === id);
          return <span key={id} className={"chal-badge " + id + (on ? " on" : "")}>{t.label} · {t.d}</span>;
        })}
      </div>
      <div className="chal-sub">{m.next ? txf(`الشهر ده: {0} يوم. فاضل {1} للشارة {2}.`, [m.days, m.toNext, m.next.label]) : txf(`الشهر ده: {0} يوم. جبت الشارات كلها 🏅`, [m.days])}</div>
      <div style={{ borderTop: "1px solid rgba(var(--ink),0.08)", marginTop: 10, paddingTop: 10 }}>
        <div className="chal-top"><b>{tx("تحدي الـ")}{CHALLENGE_DAYS} {tx("يوم")}</b>
          {c30 && !c30.complete && !c30.failed && <span className="chal-count" dir="ltr">{c30.done}/{CHALLENGE_DAYS}</span>}
        </div>
        {!c30 && (
          <>
            <div className="chal-sub">{tx("تمرّن كل يوم لمدة 30 يوم متتاليين واكسب وسام التحدي 🔥")}</div>
            <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={startChallenge}>{tx("ابدأ التحدي")}</button>
          </>
        )}
        {c30 && !c30.complete && !c30.failed && (
          <>
            <div className="chal-sub">{tx("يوم")} {c30.day} {tx("من")} {CHALLENGE_DAYS} — {c30.done} {tx("يوم تمام، فاضل")} {c30.left} 🔥</div>
            <div className="chal-bar" role="progressbar" aria-valuenow={Math.round((c30.done / CHALLENGE_DAYS) * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: (c30.done / CHALLENGE_DAYS) * 100 + "%" }} /></div>
          </>
        )}
        {c30 && c30.complete && <div className="chal-sub">{tx("كسبت تحدي الـ")}{CHALLENGE_DAYS} {tx("يوم 👑 الوسام اتفتح في صفحة الإنجازات!")}</div>}
        {c30 && c30.failed && (
          <>
            <div className="chal-sub">{tx("التحدي خلص بـ")}{c30.done} {tx("يوم. جرّب تاني — المرة الجاية 👊")}</div>
            <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={() => { leaveChallenge(); startChallenge(); }}>{tx("ابدأ من الأول")}</button>
          </>
        )}
      </div>
    </div>
  );
}
