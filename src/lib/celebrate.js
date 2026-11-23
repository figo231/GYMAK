import { tx, txf } from "./i18n/tx";
// Tiny event bus for "moment" cards (PR, level-up, streak milestone).
export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 200, 365];
export const isStreakMilestone = (n) => STREAK_MILESTONES.includes(n);

const EVT = "gymak:celebrate";
export function celebrate(detail) {
  try { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT, { detail })); } catch { /* ignore */ }
}
export function onCelebrate(fn) {
  const h = (e) => fn(e.detail);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}

// Builds the card content. Priority when several happen at once: level-up > streak > PR.
export function momentsFor({ levelUp, level, streak, pr, unit = tx("كجم"), conv = (x) => x }) {
  const out = [];
  if (levelUp) out.push({ kind: "level", title: tx("مستوى جديد"), big: String(level), unit: "", sub: txf(`وصلت للمستوى {0}. كمّل كده.`, [level]) });
  if (streak && isStreakMilestone(streak)) out.push({ kind: "streak", title: tx("سلسلة قوية"), big: String(streak), unit: "يوم متتالي", sub: txf(`{0} يوم تمرين ورا بعض. ده التزام حقيقي.`, [streak]) });
  if (pr) {
    const w = Math.round(conv(pr.weight) * 10) / 10, p = Math.round(conv(pr.prevWeight) * 10) / 10;
    out.push({ kind: "pr", title: tx("رقم قياسي جديد"), big: String(w), unit, sub: txf(`{0}{1}`, [pr.exerciseName, p > 0 ? ` (كان ${p})` : ""]) });
  }
  return out;
}
