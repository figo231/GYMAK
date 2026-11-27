// English display overrides for built-in program templates. Raw Arabic stays
// in the store; applied at render time only when English is active.
import { isEn } from "./lang";
import { WOMEN_PROGRAMS_EN, WOMEN_TEMPLATES } from "../content/womenContent";

const PROGRAMS_EN = {
  ...WOMEN_PROGRAMS_EN,
  "arnold-split": { name: "Arnold Split", level: "Advanced", daysPerWeek: "6 days / week",
    dayChips: ["Chest & back", "Shoulders & arms", "Legs", "x2 repeat"],
    desc: "Arnold Schwarzenegger's classic split: each muscle trained twice a week at high volume. Best if you have training experience and can work out 6 days a week." },
  "push-pull-legs": { name: "Push Pull Legs", level: "Intermediate", daysPerWeek: "5-6 days / week",
    dayChips: ["Push (chest/shoulders/triceps)", "Pull (back/biceps)", "Legs"],
    desc: "A popular, effective split that groups exercises by movement (push/pull/legs) instead of by muscle, giving better rest and frequency." },
  "upper-lower": { name: "Upper Lower", level: "Beginner", daysPerWeek: "4 days / week",
    dayChips: ["Upper 1", "Lower 1", "Upper 2", "Lower 2"],
    desc: "A simple split for limited time: just 4 days a week, balancing upper and lower body with enough rest." },
  "glutes-tone": { name: "Glutes & Tone", level: "Beginner", daysPerWeek: "3 days / week",
    dayChips: ["Glutes & legs", "Upper & core", "Glutes & calves"],
    desc: "A program focused on glutes and legs, plus an upper-body and core day for balanced shaping." },
  "full-body": { name: "Full Body", level: "Beginner", daysPerWeek: "3 days / week",
    dayChips: ["Full body A", "Full body B", "Full body C"],
    desc: "The best pick if you're just starting out or short on time. Every session trains the whole body with basic compound moves." },
  "strength-5x5": { name: "Strength 5x5", level: "Intermediate", daysPerWeek: "3 days / week",
    dayChips: ["Strength A", "Strength B", "Strength C"],
    desc: "A simple strength program: heavy basics (squat, bench, deadlift) with a small weight increase every session. Great for getting stronger fast." },
  "fat-loss": { name: "Fat Loss & Burn", level: "Beginner", daysPerWeek: "4 days / week",
    dayChips: ["Full body 1", "Full body 2", "Full body 3", "Core & conditioning"],
    desc: "Compound moves with short rests to burn more calories, plus a core day. Pair with a small calorie deficit and daily walking to see results." },
};

export function programDisplay(p) {
  if (!p || !isEn()) return p;
  const en = PROGRAMS_EN[p.id];
  return en ? { ...p, ...en } : p;
}

// Arabic program-day/chip title -> English (applied to stored active-program
// day titles at display time).
const DAY_TITLE_EN = {};
for (const en of Object.values(PROGRAMS_EN)) for (const chip of en.dayChips) DAY_TITLE_EN[chip] = chip;
const DAY_TITLE_AR = {
  "صدر وظهر": "Chest & back", "أكتاف وذراعين": "Shoulders & arms", "أرجل": "Legs", "×2 تكرار": "x2 repeat",
  "صدر وظهر 2": "Chest & back 2", "أكتاف وذراعين 2": "Shoulders & arms 2", "أرجل 2": "Legs 2",
  "دفع 2 (صدر/أكتاف/ترايسبس)": "Push 2 (chest/shoulders/triceps)", "سحب 2 (ظهر/بايسبس)": "Pull 2 (back/biceps)",
  "دفع (صدر/أكتاف/ترايسبس)": "Push (chest/shoulders/triceps)", "سحب (ظهر/بايسبس)": "Pull (back/biceps)",
  "علوي 1": "Upper 1", "سفلي 1": "Lower 1", "علوي 2": "Upper 2", "سفلي 2": "Lower 2",
  "أرداف وأرجل": "Glutes & legs", "علوي وكور": "Upper & core", "أرداف وسمانة": "Glutes & calves",
  "جسم كامل A": "Full body A", "جسم كامل B": "Full body B", "جسم كامل C": "Full body C",
  "قوة A": "Strength A", "قوة B": "Strength B", "قوة C": "Strength C",
  "جسم كامل 1": "Full body 1", "جسم كامل 2": "Full body 2", "جسم كامل 3": "Full body 3", "كور وتحمل": "Core & conditioning",
};
export function dayTitleEn(title) {
  if (!isEn() || !title) return title;
  return DAY_TITLE_AR[title] || title;
}

// Translate the new program day titles without changing saved schedules.
for (const [id, days] of Object.entries(WOMEN_TEMPLATES)) {
  days.forEach((day, i) => { DAY_TITLE_AR[day.title] = WOMEN_PROGRAMS_EN[id].dayChips[i]; });
}
