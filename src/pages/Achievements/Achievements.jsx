import { useMemo, useState } from "react";
import SectionNav from "../../components/layout/SectionNav";
import Store from "../../lib/store/gymakStore";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { monthlyBadges, weeklyChallenge } from "../../lib/challenges";
import { achievementCardData } from "../../lib/share/shareCard";
import AchievementsGrid from "../Profile/AchievementsGrid";
import ShareCardSheet from "../Profile/ShareCardSheet";

// Full achievements page: weekly challenge, this month's tiers, and every
// badge with its progress. Tapping an unlocked badge opens the share card
// (1080x1350 PNG, ready for WhatsApp status).
export default function Achievements() {
  const [version] = useStoreVersion();
  const [share, setShare] = useState(null);
  const achievements = useMemo(() => Store.getAchievements(), [version]);
  const workoutDays = useMemo(() => Store.getWorkoutDays(), [version]);
  const challenge = useMemo(() => weeklyChallenge(workoutDays), [workoutDays]);
  const month = useMemo(() => monthlyBadges(workoutDays), [workoutDays]);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <>
      <SectionNav group="progress" title="تقدّمي" />
      <div className="mx-head">
        <div>
          <div className="mx-title">الإنجازات 🏅</div>
          <div className="mx-sub">{unlocked} من {achievements.length} وسام مفتوح — دوس على أي وسام مفتوح عشان تشاركه</div>
        </div>
      </div>

      <div className="glass ms-card" style={{ marginBottom: 12 }}>
        <div className="ms-card-title">تحدي الأسبوع</div>
        <div style={{ fontSize: 13, lineHeight: 1.9 }}>
          {challenge.complete
            ? <>خلصت تحدي الأسبوع 🎉 ({challenge.done}/{challenge.target} أيام)</>
            : <>تمرنت {challenge.done} من {challenge.target} أيام الأسبوع ده — فاضل {challenge.left} {challenge.left === 1 ? "يوم" : "أيام"} في {challenge.daysLeft} {challenge.daysLeft === 1 ? "يوم" : "أيام"}</>}
        </div>
        <div className="hero-track" role="progressbar" aria-valuemin={0} aria-valuemax={challenge.target} aria-valuenow={challenge.done} style={{ marginTop: 8 }}>
          <div style={{ width: `${challenge.pct}%` }} />
        </div>
      </div>

      <div className="glass ms-card" style={{ marginBottom: 12 }}>
        <div className="ms-card-title">أوسمة الشهر</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["bronze", "silver", "gold"].map((id) => {
            const t = { bronze: "🥉 برونز (8 أيام)", silver: "🥈 فضة (12 يوم)", gold: "🥇 ذهب (20 يوم)" }[id];
            const has = month.earned.some((e) => e.id === id);
            return <span key={id} className={"chip chip-btn sm" + (has ? " active" : "")} style={has ? {} : { opacity: 0.55 }}>{t}</span>;
          })}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
          {month.next ? `تمرنت ${month.days} يوم الشهر ده — فاضل ${month.toNext} على ${month.next.label === "برونز" ? "🥉 برونز" : month.next.label === "فضة" ? "🥈 فضة" : "🥇 ذهب"}` : `أخدت كل أوسمة الشهر 👑 (${month.days} يوم)`}
        </div>
      </div>

      <AchievementsGrid achievements={achievements} onShare={(a) => setShare(achievementCardData(a))} />

      {share && <ShareCardSheet data={share} name={Store.getProfile().name} onClose={() => setShare(null)} />}
    </>
  );
}
