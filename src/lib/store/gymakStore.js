/* =========================================================
   GYMAK — طبقة البيانات (Store)
   كل حاجة بتتخزن في localStorage تحت بادئة gymak_
   (المفتاح الداخلي فضل زي ما هو لتوافق بيانات المستخدمين الحاليين)
   ========================================================= */
import { normalizeReminders } from "../push/reminders";
import { EXTRA_EXERCISES } from "./extraExercises";
import { EGYPT_FOODS } from "./egyptFoods";
import { mergeExercises, activeRemoteFoods } from "../content/remoteContent";
import { normalizeExercise } from "../exerciseMeta";
import { localISO, shiftISO, windowStart } from "../dateKey";
import { celebrate, momentsFor } from "../celebrate";
import { deleteExerciseMedia } from "../exerciseMedia";
/* Ported verbatim from the original app-data.js — same localStorage key,
   same shape, same business logic. Only the module wrapper changed
   (IIFE -> ES module) so existing users' data loads unchanged. */
const KEY = "gymak_state_v1";

  function todayISO() {
    return localISO(); // YYYY-MM-DD, local calendar day
  }

  // Strictly increasing so same-millisecond logs keep their order.
  let lastStamp = 0;
  function nextLogStamp() { lastStamp = Math.max(Date.now(), lastStamp + 1); return lastStamp; }

  function daysBetween(a, b) {
    const d1 = new Date(a + "T00:00:00");
    const d2 = new Date(b + "T00:00:00");
    return Math.round((d2 - d1) / 86400000);
  }

  function defaultState() {
    return {
      profile: { name: "", username: "", bio: "", avatar: null, cover: null, coverGradient: "g1", level: 1, xp: 0, xpNext: 500, heightCm: null, gender: null, memberSince: todayISO() },
      weightLogs: [], // {date, weight, bodyFat}
      goalWeight: null,
      exerciseLogs: {}, // exerciseId: [{date, weight, sets, reps}]
      workoutDays: [],
      bestStreak: 0,
      exercises: SEED_EXERCISES.slice(),
      prHistory: [], // {exerciseId, exerciseName, weight, prevWeight, date}
      activeProgramId: null,
      cheatDays: [], // ISO dates: free days that don't break the streak
      savedMeals: [], // {id, name, items:[{name,grams,kcal,protein,carbs,fat}]}
      foodLog: [], // {date, items:[{name,grams,kcal,protein,carbs,fat}], totalKcal, totalProtein, totalCarbs, totalFat}
      settings: { unit: "kg", notifEnabled: false, notifTime: "19:00", lang: "ar" },
      // Local deletions not yet confirmed on the server (see Store.deleteXxx and sync/domains.js).
      // Stops a pull from resurrecting a row the user deleted while offline.
      pendingDeletes: { weight: [], food: [], exerciseLogs: [], prs: [] },
    };
  }

  const KG_PER_LB = 0.45359237;

  // ===== Ready-made program day templates =====
  // Maps each program to its actual training days, each day referencing real
  // exercise ids from SEED_EXERCISES — this is what lets "تطبيق البرنامج"
  // generate a real, ready-to-train schedule instead of just category labels.
  const PROGRAM_TEMPLATES = {
    "strength-5x5": [
      { title: "قوة A", exerciseIds: ["squat-barbell", "bench-press-barbell", "barbell-row"] },
      { title: "قوة B", exerciseIds: ["squat-barbell", "shoulder-press-barbell", "deadlift"] },
      { title: "قوة C", exerciseIds: ["squat-barbell", "bench-press-barbell", "barbell-row"] },
    ],
    "fat-loss": [
      { title: "جسم كامل 1", exerciseIds: ["goblet-squat", "pushup", "one-arm-dumbbell-row", "plank"] },
      { title: "جسم كامل 2", exerciseIds: ["leg-press", "dumbbell-bench-press", "lat-pulldown", "hanging-leg-raise"] },
      { title: "جسم كامل 3", exerciseIds: ["romanian-deadlift", "shoulder-press-barbell", "seated-cable-row", "cable-crunch"] },
      { title: "كور وتحمل", exerciseIds: ["dumbbell-lunges", "pushup", "plank", "hanging-leg-raise", "crunch"] },
    ],
    "arnold-split": [
      { title: "صدر وظهر", exerciseIds: ["bench-press-barbell", "incline-dumbbell-press", "cable-crossover", "dumbbell-fly", "lat-pulldown", "barbell-row", "seated-cable-row"] },
      { title: "أكتاف وذراعين", exerciseIds: ["shoulder-press-barbell", "lateral-raise", "rear-delt-fly", "front-raise", "barbell-curl", "tricep-pushdown", "skullcrusher"] },
      { title: "أرجل", exerciseIds: ["squat-barbell", "leg-press", "leg-extension", "lying-leg-curl", "calf-raise"] },
      { title: "صدر وظهر (تكرار)", exerciseIds: ["bench-press-barbell", "incline-dumbbell-press", "lat-pulldown", "deadlift"] },
      { title: "أكتاف وذراعين (تكرار)", exerciseIds: ["dumbbell-shoulder-press", "lateral-raise", "hammer-curl", "dips", "preacher-curl"] },
      { title: "أرجل (تكرار)", exerciseIds: ["squat-barbell", "dumbbell-lunges", "hip-thrust", "seated-calf-raise"] },
    ],
    "push-pull-legs": [
      { title: "دفع (صدر/أكتاف/ترايسبس)", exerciseIds: ["bench-press-barbell", "incline-dumbbell-press", "shoulder-press-barbell", "lateral-raise", "tricep-pushdown", "dumbbell-triceps-extension"] },
      { title: "سحب (ظهر/بايسبس)", exerciseIds: ["deadlift", "lat-pulldown", "barbell-row", "seated-cable-row", "face-pull", "barbell-curl", "hammer-curl"] },
      { title: "أرجل", exerciseIds: ["squat-barbell", "leg-press", "romanian-deadlift", "leg-extension", "calf-raise"] },
    ],
    "upper-lower": [
      { title: "علوي 1", exerciseIds: ["bench-press-barbell", "barbell-row", "shoulder-press-barbell", "barbell-curl", "tricep-pushdown"] },
      { title: "سفلي 1", exerciseIds: ["squat-barbell", "romanian-deadlift", "leg-press", "calf-raise"] },
      { title: "علوي 2", exerciseIds: ["incline-dumbbell-press", "lat-pulldown", "lateral-raise", "hammer-curl", "dips"] },
      { title: "سفلي 2", exerciseIds: ["leg-press", "romanian-deadlift", "hip-thrust", "calf-raise", "plank", "crunch"] },
    ],
    "glutes-tone": [
      { title: "أرداف وأرجل", exerciseIds: ["hip-thrust", "goblet-squat", "romanian-deadlift", "dumbbell-lunges", "glute-bridge"] },
      { title: "علوي وكور", exerciseIds: ["lat-pulldown", "dumbbell-shoulder-press", "seated-cable-row", "lateral-raise", "plank"] },
      { title: "أرداف وسمانة", exerciseIds: ["leg-press", "hip-thrust", "lying-leg-curl", "calf-raise", "crunch"] },
    ],
    "full-body": [
      { title: "جسم كامل A", exerciseIds: ["goblet-squat", "dumbbell-bench-press", "lat-pulldown", "plank"] },
      { title: "جسم كامل B", exerciseIds: ["leg-press", "shoulder-press-barbell", "barbell-row", "hanging-leg-raise"] },
      { title: "جسم كامل C", exerciseIds: ["romanian-deadlift", "pushup", "pullup", "one-arm-dumbbell-row", "cable-crunch"] },
    ],
  };

  const PROGRAMS = [
    {
      id: "arnold-split", goal: "bulk", name: "Arnold Split", level: "متقدم", daysPerWeek: "6 أيام / أسبوع",
      dayChips: ["صدر وظهر", "أكتاف وذراعين", "أرجل", "×2 تكرار"],
      desc: "برنامج آرنولد شوارزنيغر الكلاسيكي، يركّز على تدريب كل عضلة مرتين أسبوعيًا بحجم تدريبي عالي. مناسب لمن عنده خبرة سابقة وقادر على التمرين 6 أيام.",
    },
    {
      id: "push-pull-legs", goal: "bulk", name: "Push Pull Legs", level: "متوسط", daysPerWeek: "5-6 أيام / أسبوع",
      dayChips: ["دفع (صدر/أكتاف/ترايسبس)", "سحب (ظهر/بايسبس)", "أرجل"],
      desc: "تقسيم شائع وفعّال بيقسم التمارين حسب حركة العضلة (دفع/سحب/أرجل) بدل العضلة نفسها، وده بيدي راحة أفضل وتكرار مناسب.",
    },
    {
      id: "upper-lower", goal: "strength", name: "Upper Lower", level: "مبتدئ", daysPerWeek: "4 أيام / أسبوع",
      dayChips: ["علوي 1", "سفلي 1", "علوي 2", "سفلي 2"],
      desc: "تقسيم بسيط يناسب اللي وقته محدود — 4 أيام بس في الأسبوع، وبيدي توازن كويس بين الجزء العلوي والسفلي مع راحة كافية.",
    },
    {
      id: "glutes-tone", goal: "fitness", name: "أرداف وتشكيل", level: "مبتدئ", daysPerWeek: "3 أيام / أسبوع",
      dayChips: ["أرداف وأرجل", "علوي وكور", "أرداف وسمانة"],
      desc: "برنامج بيركز على الأرداف والأرجل مع يوم علوي وكور لتشكيل متوازن. مناسب للبنات وأي حد هدفه تشكيل الجزء السفلي.",
    },
    {
      id: "full-body", goal: "fitness", name: "Full Body", level: "مبتدئ", daysPerWeek: "3 أيام / أسبوع",
      dayChips: ["جسم كامل A", "جسم كامل B", "جسم كامل C"],
      desc: "أفضل اختيار لو بتبدأ لأول مرة أو وقتك محدود جدًا. كل جلسة بتشغّل الجسم كله بحركات أساسية مركّبة.",
    },
    {
      id: "strength-5x5", goal: "strength", name: "Strength 5x5", level: "متوسط", daysPerWeek: "3 أيام / أسبوع",
      dayChips: ["قوة A", "قوة B", "قوة C"],
      desc: "برنامج قوة بسيط: حركات تقيلة أساسية (سكوات، بنش، ديدلفت) وزيادة الوزن شوية كل جلسة. مناسب لو هدفك تزود قوتك بسرعة.",
    },
    {
      id: "fat-loss", goal: "cut", name: "تنشيف وحرق دهون", level: "مبتدئ", daysPerWeek: "4 أيام / أسبوع",
      dayChips: ["جسم كامل 1", "جسم كامل 2", "جسم كامل 3", "كور وتحمل"],
      desc: "تمارين مركبة براحة قليلة تحرق سعرات أكتر، مع يوم كور. اتبعه مع عجز بسيط في السعرات ومشي يومي عشان النتيجة تبان.",
    },
  ];

  // ===== Food database (approximate values per 100g, unless pieceWeight given) =====
  // kcal/protein/carbs/fat per 100g. pieceWeight (grams) used when someone counts by حبة/رغيف/etc.
  const FOOD_DB = [
    ...EGYPT_FOODS,
    { names: ["فراخ مشوية", "صدور فراخ", "صدر فراخ", "فراخ مسلوقة", "chicken grilled", "فراخ"], per100: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } },
    { names: ["فراخ مقلية", "فراخ بانيه"], per100: { kcal: 260, protein: 22, carbs: 12, fat: 15 } },
    { names: ["لحمة مفرومة", "كفتة", "لحمة"], per100: { kcal: 250, protein: 26, carbs: 0, fat: 17 } },
    { names: ["كباب", "كباب حلة"], per100: { kcal: 230, protein: 25, carbs: 1, fat: 14 } },
    { names: ["سمك بلطي", "سمك مشوي", "سمك", "بوري"], per100: { kcal: 128, protein: 26, carbs: 0, fat: 3 } },
    { names: ["تونة", "تونة معلبة"], per100: { kcal: 130, protein: 26, carbs: 0, fat: 3 } },
    { names: ["كبدة"], per100: { kcal: 175, protein: 26, carbs: 4, fat: 6 } },
    { names: ["سجق"], per100: { kcal: 300, protein: 15, carbs: 3, fat: 25 } },
    { names: ["بسطرمة"], per100: { kcal: 190, protein: 30, carbs: 2, fat: 7 } },
    { names: ["بيضة مسلوقة", "بيضة", "بيض", "بيضة مقلية"], pieceWeight: 50, per100: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 } },
    { names: ["زبادي", "زبادي كامل الدسم"], per100: { kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 } },
    { names: ["لبن", "لبن كامل الدسم"], per100: { kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3 } },
    { names: ["جبنة قريش"], per100: { kcal: 98, protein: 11, carbs: 3.4, fat: 4.3 } },
    { names: ["جبنة بيضاء", "جبنة فيتا"], per100: { kcal: 264, protein: 14, carbs: 4, fat: 21 } },
    { names: ["جبنة رومي"], per100: { kcal: 380, protein: 25, carbs: 2, fat: 30 } },
    { names: ["فول مدمس", "فول"], per100: { kcal: 110, protein: 7.6, carbs: 18, fat: 0.6 } },
    { names: ["طعمية", "فلافل"], pieceWeight: 25, per100: { kcal: 333, protein: 13, carbs: 32, fat: 18 } },
    { names: ["عدس", "شوربة عدس"], per100: { kcal: 116, protein: 9, carbs: 20, fat: 0.4 } },
    { names: ["كشري"], per100: { kcal: 180, protein: 5, carbs: 30, fat: 5 } },
    { names: ["ملوخية"], per100: { kcal: 65, protein: 4.5, carbs: 8, fat: 1.5 } },
    { names: ["بامية"], per100: { kcal: 55, protein: 2, carbs: 8, fat: 1.5 } },
    { names: ["حمام محشي", "حمام"], per100: { kcal: 210, protein: 20, carbs: 12, fat: 9 } },
    { names: ["رز أبيض", "رز", "أرز"], per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
    { names: ["مكرونة", "مكرونة بالبشاميل", "باستا"], per100: { kcal: 158, protein: 5.8, carbs: 31, fat: 1 } },
    { names: ["عيش بلدي", "خبز بلدي"], pieceWeight: 90, per100: { kcal: 265, protein: 9, carbs: 52, fat: 2 } },
    { names: ["عيش فينو", "خبز فينو"], pieceWeight: 70, per100: { kcal: 280, protein: 9, carbs: 55, fat: 3 } },
    { names: ["رغيف عيش", "رغيف", "عيش", "خبز"], pieceWeight: 90, per100: { kcal: 265, protein: 9, carbs: 52, fat: 2 } },
    { names: ["خبز توست", "توست"], pieceWeight: 25, per100: { kcal: 270, protein: 9, carbs: 50, fat: 3.5 } },
    { names: ["بطاطس مسلوقة", "بطاطس"], per100: { kcal: 87, protein: 2, carbs: 20, fat: 0.1 } },
    { names: ["بطاطس مقلية", "بطاطا مقلية"], per100: { kcal: 312, protein: 3.4, carbs: 41, fat: 15 } },
    { names: ["شيبسي", "شيبس"], per100: { kcal: 536, protein: 6.6, carbs: 53, fat: 34 } },
    { names: ["خضار مشكل", "خضار سوتيه"], per100: { kcal: 65, protein: 2.5, carbs: 10, fat: 1.5 } },
    { names: ["سلطة خضراء", "سلطة"], per100: { kcal: 25, protein: 1.2, carbs: 4, fat: 0.2 } },
    { names: ["موز", "موزة"], pieceWeight: 120, per100: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
    { names: ["تفاح", "تفاحة"], pieceWeight: 150, per100: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
    { names: ["برتقال", "برتقالة"], pieceWeight: 130, per100: { kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 } },
    { names: ["تمر"], pieceWeight: 8, per100: { kcal: 282, protein: 2.5, carbs: 75, fat: 0.4 } },
    { names: ["مانجو", "عصير مانجو"], per100: { kcal: 60, protein: 0.8, carbs: 15, fat: 0.4 } },
    { names: ["لوز"], per100: { kcal: 579, protein: 21, carbs: 22, fat: 50 } },
    { names: ["فول سوداني", "سوداني"], per100: { kcal: 567, protein: 26, carbs: 16, fat: 49 } },
    { names: ["زيت زيتون", "زيت"], per100: { kcal: 884, protein: 0, carbs: 0, fat: 100 } },
    { names: ["عسل"], per100: { kcal: 304, protein: 0.3, carbs: 82, fat: 0 } },
    { names: ["حلاوة طحينية", "طحينة"], per100: { kcal: 545, protein: 15, carbs: 47, fat: 34 } },
    { names: ["فطير مشلتت", "فطير"], per100: { kcal: 330, protein: 6, carbs: 40, fat: 16 } },
    { names: ["كنافة"], per100: { kcal: 350, protein: 5, carbs: 45, fat: 17 } },
    { names: ["بقلاوة"], per100: { kcal: 430, protein: 6, carbs: 50, fat: 23 } },
    { names: ["آيس كريم", "ايس كريم"], per100: { kcal: 207, protein: 3.5, carbs: 24, fat: 11 } },
    { names: ["شوكولاتة", "شيكولاتة"], per100: { kcal: 545, protein: 5, carbs: 60, fat: 31 } },
    { names: ["بيبسي", "كولا", "كوكاكولا", "مياه غازية"], per100: { kcal: 42, protein: 0, carbs: 10.6, fat: 0 } },
    { names: ["شاي بسكر", "شاي محلى"], per100: { kcal: 20, protein: 0, carbs: 5, fat: 0 } },
    { names: ["قهوة"], per100: { kcal: 5, protein: 0.3, carbs: 0.8, fat: 0 } },
    { names: ["ماء", "مياه"], per100: { kcal: 0, protein: 0, carbs: 0, fat: 0 } },

    // ===== لحوم وبروتينات إضافية =====
    { names: ["لحمة ضاني", "ضاني"], per100: { kcal: 294, protein: 25, carbs: 0, fat: 21 } },
    { names: ["لحمة بقري مشوية", "استيك"], per100: { kcal: 271, protein: 26, carbs: 0, fat: 18 } },
    { names: ["فراخ بانيه", "بانيه"], per100: { kcal: 290, protein: 20, carbs: 18, fat: 16 } },
    { names: ["شاورما فراخ", "شاورما"], per100: { kcal: 220, protein: 18, carbs: 8, fat: 13 } },
    { names: ["برجر لحمة", "برجر"], per100: { kcal: 250, protein: 17, carbs: 20, fat: 12 } },
    { names: ["هوت دوج"], per100: { kcal: 290, protein: 10, carbs: 22, fat: 18 } },
    { names: ["جمبري", "روبيان"], per100: { kcal: 99, protein: 24, carbs: 0.2, fat: 0.3 } },
    { names: ["سلمون"], per100: { kcal: 208, protein: 20, carbs: 0, fat: 13 } },
    { names: ["بط", "بطة"], per100: { kcal: 337, protein: 19, carbs: 0, fat: 28 } },
    { names: ["حبش", "ديك رومي"], per100: { kcal: 135, protein: 30, carbs: 0, fat: 1 } },
    { names: ["مسقعة"], per100: { kcal: 145, protein: 4, carbs: 12, fat: 9 } },
    { names: ["محشي كرنب", "محشي ورق عنب", "محشي"], per100: { kcal: 150, protein: 3, carbs: 22, fat: 6 } },
    { names: ["فتة"], per100: { kcal: 220, protein: 12, carbs: 20, fat: 10 } },

    // ===== ألبان ومشتقاتها =====
    { names: ["حليب قليل الدسم", "لبن خالي الدسم"], per100: { kcal: 42, protein: 3.4, carbs: 5, fat: 0.1 } },
    { names: ["جبنة موتزاريلا", "موتزاريلا"], per100: { kcal: 280, protein: 22, carbs: 2, fat: 22 } },
    { names: ["جبنة شيدر", "شيدر"], per100: { kcal: 402, protein: 25, carbs: 1.3, fat: 33 } },
    { names: ["زبادي يوناني", "يوناني"], per100: { kcal: 97, protein: 10, carbs: 4, fat: 5 } },
    { names: ["زبدة"], per100: { kcal: 717, protein: 0.9, carbs: 0.1, fat: 81 } },
    { names: ["قشطة", "كريمة"], per100: { kcal: 340, protein: 2.8, carbs: 2.9, fat: 36 } },
    { names: ["آيس كريم فانيليا"], per100: { kcal: 207, protein: 3.5, carbs: 24, fat: 11 } },
    { names: ["رايب"], per100: { kcal: 65, protein: 3.4, carbs: 4.5, fat: 3.5 } },

    // ===== حبوب ونشويات إضافية =====
    { names: ["شوفان"], per100: { kcal: 389, protein: 17, carbs: 66, fat: 7 } },
    { names: ["كورن فليكس"], per100: { kcal: 357, protein: 7.5, carbs: 84, fat: 0.9 } },
    { names: ["فريكة"], per100: { kcal: 340, protein: 12, carbs: 70, fat: 2.5 } },
    { names: ["برغل"], per100: { kcal: 342, protein: 12, carbs: 76, fat: 1.3 } },
    { names: ["حمص", "حمص بالطحينة"], per100: { kcal: 164, protein: 8, carbs: 27, fat: 2.6 } },
    { names: ["فاصوليا بيضاء", "فاصوليا"], per100: { kcal: 127, protein: 8.7, carbs: 23, fat: 0.5 } },
    { names: ["بيتزا"], per100: { kcal: 266, protein: 11, carbs: 33, fat: 10 } },
    { names: ["ساندوتش جبنة", "ساندوتش"], per100: { kcal: 250, protein: 10, carbs: 30, fat: 10 } },
    { names: ["كرواسون"], per100: { kcal: 406, protein: 8, carbs: 46, fat: 21 } },
    { names: ["دونات"], per100: { kcal: 452, protein: 5, carbs: 51, fat: 25 } },
    { names: ["بسكويت"], per100: { kcal: 435, protein: 6, carbs: 68, fat: 16 } },

    // ===== خضار وفاكهة إضافية =====
    { names: ["طماطم", "طماطم مقطعة"], per100: { kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
    { names: ["خيار", "خيارة"], pieceWeight: 100, per100: { kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 } },
    { names: ["جزر", "جزرة"], pieceWeight: 60, per100: { kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 } },
    { names: ["فلفل ألوان", "فلفل"], per100: { kcal: 31, protein: 1, carbs: 6, fat: 0.3 } },
    { names: ["كوسة"], per100: { kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3 } },
    { names: ["باذنجان"], per100: { kcal: 25, protein: 1, carbs: 6, fat: 0.2 } },
    { names: ["جوافة"], pieceWeight: 100, per100: { kcal: 68, protein: 2.6, carbs: 14, fat: 1 } },
    { names: ["بطيخ"], per100: { kcal: 30, protein: 0.6, carbs: 8, fat: 0.2 } },
    { names: ["شمام"], per100: { kcal: 34, protein: 0.8, carbs: 8, fat: 0.2 } },
    { names: ["عنب"], per100: { kcal: 69, protein: 0.7, carbs: 18, fat: 0.2 } },
    { names: ["فراولة"], per100: { kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 } },
    { names: ["مانجا", "مانجو حبة"], pieceWeight: 200, per100: { kcal: 60, protein: 0.8, carbs: 15, fat: 0.4 } },
    { names: ["أفوكادو", "افوكادو"], pieceWeight: 150, per100: { kcal: 160, protein: 2, carbs: 8.5, fat: 15 } },
    { names: ["كيوي"], pieceWeight: 75, per100: { kcal: 61, protein: 1.1, carbs: 15, fat: 0.5 } },
    { names: ["أناناس", "اناناس"], per100: { kcal: 50, protein: 0.5, carbs: 13, fat: 0.1 } },

    // ===== مكسرات وزيوت إضافية =====
    { names: ["جوز", "عين جمل"], per100: { kcal: 654, protein: 15, carbs: 14, fat: 65 } },
    { names: ["كاجو"], per100: { kcal: 553, protein: 18, carbs: 30, fat: 44 } },
    { names: ["بندق"], per100: { kcal: 628, protein: 15, carbs: 17, fat: 61 } },
    { names: ["فستق"], per100: { kcal: 560, protein: 20, carbs: 28, fat: 45 } },
    { names: ["زبدة فول سوداني"], per100: { kcal: 588, protein: 25, carbs: 20, fat: 50 } },

    // ===== مشروبات ومكملات =====
    { names: ["عصير برتقال طبيعي", "عصير برتقال"], per100: { kcal: 45, protein: 0.7, carbs: 10.4, fat: 0.2 } },
    { names: ["عصير قصب"], per100: { kcal: 60, protein: 0.2, carbs: 15, fat: 0 } },
    { names: ["حليب صويا", "لبن صويا"], per100: { kcal: 33, protein: 3.3, carbs: 1.8, fat: 1.8 } },
    { names: ["بروتين شيك", "بروتين واي", "واي بروتين"], per100: { kcal: 400, protein: 80, carbs: 8, fat: 5 } },
    { names: ["جينر", "مشروب طاقة"], per100: { kcal: 45, protein: 0, carbs: 11, fat: 0 } },
    { names: ["نسكافيه", "قهوة بالحليب"], per100: { kcal: 40, protein: 1.5, carbs: 5, fat: 1.5 } },

    // ===== حلويات ووجبات خفيفة إضافية =====
    { names: ["رز باللبن"], per100: { kcal: 120, protein: 3.5, carbs: 20, fat: 3 } },
    { names: ["أم علي", "ام علي"], per100: { kcal: 250, protein: 5, carbs: 30, fat: 12 } },
    { names: ["بسبوسة"], per100: { kcal: 350, protein: 4, carbs: 55, fat: 13 } },
    { names: ["كيك", "كيكة"], per100: { kcal: 371, protein: 5, carbs: 55, fat: 15 } },
    { names: ["بوظة", "جيلاتي"], per100: { kcal: 207, protein: 3.5, carbs: 24, fat: 11 } },
    { names: ["كورن دوج"], per100: { kcal: 300, protein: 9, carbs: 25, fat: 18 } },
    { names: ["بوشار", "فشار"], per100: { kcal: 387, protein: 12, carbs: 78, fat: 4.5 } },
  ];

  const UNIT_GRAMS = {
    "جم": 1, "جرام": 1, "غرام": 1, "g": 1,
    "كيلو": 1000, "كجم": 1000,
    "كوب": 200, "كوباية": 200,
    "معلقة كبيرة": 15, "ملعقة كبيرة": 15,
    "معلقة صغيرة": 5, "ملعقة صغيرة": 5,
  };
  const AR_NUMBER_WORDS = { "واحد": 1, "واحدة": 1, "اتنين": 2, "أتنين": 2, "تلاتة": 3, "ثلاثة": 3, "أربعة": 4, "اربعة": 4, "خمسة": 5, "زوج": 2 };
  const DUAL_SUFFIX = /(تين|ين)$/; // e.g. حبتين، رغيفين → 2

  function normalizeDigits(text) {
    const map = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
    return text.replace(/[٠-٩]/g, (d) => map[d]);
  }

  function parseFoodText(rawText) {
    const items = [];
    const usedRanges = [];
    const lower = normalizeDigits(rawText);
    for (const food of [...activeRemoteFoods(), ...FOOD_DB]) {
      for (const alias of food.names) {
        let idx = lower.indexOf(alias);
        if (idx === -1) continue;
        // avoid double-matching overlapping ranges
        const overlaps = usedRanges.some((r) => idx < r.end && idx + alias.length > r.start);
        if (overlaps) continue;
        usedRanges.push({ start: idx, end: idx + alias.length });

        // look at a small window before the match for a quantity/unit
        // the alias may carry a one-letter Arabic prefix (أرز, بالرز, وبيض): read the quantity before the whole word
        const tokStart = Math.max(lower.lastIndexOf(" ", idx - 1), lower.lastIndexOf("،", idx - 1), lower.lastIndexOf(",", idx - 1)) + 1;
        const prefix = lower.slice(tokStart, idx);
        const wordStart = prefix.length <= 3 && /^[وبلكفاأ]*$/.test(prefix) ? tokStart : idx;
        const windowStart = Math.max(0, wordStart - 18);
        const before = lower.slice(windowStart, wordStart);
        let grams = null;

        const numMatch = before.match(/(\d+(\.\d+)?)\s*(جم|جرام|غرام|g|كيلو|كجم|كوب|كوباية|معلقة كبيرة|ملعقة كبيرة|معلقة صغيرة|ملعقة صغيرة|حبة|حبات|رغيف|رغفان|قطعة)?\s*$/);
        // quantity written after the food: "رز 200 جم", "بيض 3"
        const afterMatch = numMatch ? null : lower.slice(idx + alias.length, idx + alias.length + 16).match(/^\s*(\d+(\.\d+)?)\s*(جم|جرام|غرام|g|كيلو|كجم|كوب|كوباية|معلقة كبيرة|ملعقة كبيرة|معلقة صغيرة|ملعقة صغيرة|حبة|حبات|رغيف|رغفان|قطعة)?(?=\s|$|[،,و])/);
        const qty = numMatch || afterMatch;
        if (qty) {
          const n = parseFloat(qty[1]);
          const unit = qty[3];
          if (unit && UNIT_GRAMS[unit] !== undefined) grams = n * UNIT_GRAMS[unit];
          else if (food.pieceWeight) grams = n * food.pieceWeight;
          else grams = n * 100; // fallback: treat bare number as "×100g servings"
        } else {
          // check for dual/plural word forms like "حبتين" or Arabic number words
          const wordMatch = before.match(/(واحد[ة]?|اتنين|أتنين|تلاتة|ثلاثة|أربعة|اربعة|خمسة|زوج|\S*تين|\S*ين)\s*$/);
          if (wordMatch) {
            const w = wordMatch[1];
            let n = AR_NUMBER_WORDS[w];
            if (n === undefined && DUAL_SUFFIX.test(w)) n = 2;
            if (n && food.pieceWeight) grams = n * food.pieceWeight;
          }
        }
        if (grams === null) {
          grams = food.pieceWeight || 100; // default: 1 piece or 100g serving
        }

        const factor = grams / 100;
        items.push({
          name: alias,
          grams: Math.round(grams),
          kcal: Math.round(food.per100.kcal * factor),
          protein: Math.round(food.per100.protein * factor * 10) / 10,
          carbs: Math.round(food.per100.carbs * factor * 10) / 10,
          fat: Math.round(food.per100.fat * factor * 10) / 10,
        });
        break; // move to next food after first alias match
      }
    }
    return items;
  }

  const XP_DAILY_CAP = 10;
  const GOAL_MODES = {
    bulk: { label: "ضخامة", kcal: 300, protein: 1.8, tip: "فائض سعرات خفيف وبروتين كفاية. ركّز على زيادة الأوزان تدريجيًا." },
    cut: { label: "تنشيف", kcal: -400, protein: 2.0, tip: "عجز سعرات معقول وبروتين عالي عشان تحافظ على العضل." },
    tone: { label: "تشكيل", kcal: -150, protein: 1.8, only: "female", tip: "عجز بسيط وبروتين كفاية، مع تمارين مقاومة عشان الجسم يتشكّل من غير ما تخسّي بشكل زيادة." },
    glutes: { label: "بناء الأرداف", kcal: 150, protein: 1.8, only: "female", tip: "فائض بسيط وبروتين كفاية. ركّز على هيب ثراست وسكوات وزوّد الأوزان تدريجيًا." },
    recomp: { label: "نحت", kcal: -100, protein: 2.2, tip: "سعرات قريبة من احتياجك وبروتين عالي. حدّ أدنى من التغيّر في الوزن مع تحسّن الشكل." },
  };

  // Goal counts as reached when within 0.5 kg, or passed in the direction of the goal.
  function goalReached(goal, logs) {
    if (goal == null || !logs.length) return false;
    const first = logs[0].weight, last = logs.at(-1).weight;
    if (Math.abs(last - goal) <= 0.5) return true;
    return goal < first ? last < goal : last > goal;
  }
  function shiftDate(iso, delta) {
    return shiftISO(iso, delta);
  }

  const SEED_EXERCISES = [
    // ===== صدر =====
    { id: "bench-press-barbell", name: "بنش برس بار", muscle: "chest", muscleLabel: "صدر", secondary: "ترايسبس", sets: 4, reps: 8, custom: false, equipment: "بار", difficulty: "متوسط", description: "الحركة الأساسية لبناء الصدر بالكامل، وأفضل حركة لقياس تقدمك في قوة الدفع.", instructions: ["استلقِ على البنش والقدمين ثابتين على الأرض.", "امسك البار بمسافة أعرض من الكتفين قليلًا.", "أنزل البار ببطء لمنتصف الصدر.", "ادفع البار لأعلى بقوة حتى فرد الذراعين بالكامل."] },
    { id: "incline-dumbbell-press", name: "بنش برس دمبل مائل", muscle: "chest", muscleLabel: "صدر علوي", secondary: "أكتاف", sets: 3, reps: 10, custom: false, equipment: "دمبل", difficulty: "متوسط", description: "يستهدف الجزء العلوي من الصدر بزاوية ميل 30-45 درجة.", instructions: ["اضبط البنش بزاوية 30-45 درجة.", "امسك الدمبلين فوق الصدر العلوي.", "أنزل الدمبلين ببطء لجانب الصدر.", "ادفع لأعلى مع الحفاظ على انقباض الصدر."] },
    { id: "cable-crossover", name: "كابل كروس أوفر", muscle: "chest", muscleLabel: "صدر داخلي", secondary: "", sets: 3, reps: 12, custom: false, equipment: "كابل", difficulty: "متوسط", description: "حركة عزل ممتازة لنحت الخط الداخلي للصدر.", instructions: ["اضبط البكرات لأعلى نقطة.", "اسحب المقابض لأسفل وللداخل أمام الجسم.", "اضغط في منتصف الصدر لثانية.", "ارجع ببطء لوضع البداية."] },
    { id: "pushup", name: "ضغط (Push-up)", muscle: "chest", muscleLabel: "صدر", secondary: "ترايسبس", sets: 3, reps: 15, custom: false, equipment: "وزن الجسم", difficulty: "مبتدئ", description: "حركة أساسية لا تحتاج معدات، رائعة للمبتدئين وللإحماء.", instructions: ["ابدأ في وضع اللوح الخشبي (Plank).", "اليدين أعرض من الكتفين قليلًا.", "انزل بجسمك كله كوحدة واحدة.", "ادفع لأعلى حتى فرد الذراعين."] },

    // ===== ظهر =====
    { id: "lat-pulldown", name: "سحب أمامي (Lat Pulldown)", muscle: "back", muscleLabel: "ظهر علوي", secondary: "بايسبس", sets: 4, reps: 10, custom: false, equipment: "جهاز", difficulty: "مبتدئ", description: "بديل ممتاز للعقلة، يبني عرض الظهر (اللاتس).", instructions: ["امسك البار بمسافة أعرض من الكتفين.", "اجلس وثبّت الركبتين تحت الوسادة.", "اسحب البار لأعلى الصدر مع فتح الصدر.", "ارجع ببطء لوضع البداية دون ارتداد."] },
    { id: "deadlift", name: "ديدليفت", muscle: "back", muscleLabel: "ظهر سفلي", secondary: "أرجل خلفية", sets: 4, reps: 6, custom: false, equipment: "بار", difficulty: "متقدم", description: "من أقوى حركات بناء القوة الكلية، تشغّل الظهر والأرجل والجذع معًا.", instructions: ["قف والبار قريب من قصبة الرجل.", "امسك البار والظهر مستقيم تمامًا.", "ادفع بالأرض وارفع البار قريبًا من الجسم.", "قف بشكل كامل ثم أنزل ببطء وتحكم."] },
    { id: "barbell-row", name: "باربل رو (انحناء)", muscle: "back", muscleLabel: "ظهر أوسط", secondary: "بايسبس", sets: 4, reps: 10, custom: false, equipment: "بار", difficulty: "متوسط", description: "يبني سمك الظهر الأوسط ويحسّن القوة السحبية بشكل عام.", instructions: ["انحنِ للأمام بزاوية 45 درجة والظهر مستقيم.", "امسك البار بيد مقلوبة قليلًا.", "اسحب البار تجاه البطن.", "أنزل ببطء وتحكم تام."] },
    { id: "pullup", name: "عقلة (Pull-up)", muscle: "back", muscleLabel: "ظهر علوي", secondary: "بايسبس", sets: 3, reps: 8, custom: false, equipment: "وزن الجسم", difficulty: "متقدم", description: "من أفضل حركات وزن الجسم لبناء عرض الظهر والقوة السحبية.", instructions: ["علّق نفسك من البار بمسك أعرض من الكتفين.", "اسحب جسمك لأعلى حتى الذقن فوق البار.", "انزل ببطء وتحكم كامل.", "حافظ على الجذع مشدود طول الحركة."] },

    // ===== أكتاف =====
    { id: "shoulder-press-barbell", name: "ضغط أكتاف بار", muscle: "shoulders", muscleLabel: "أكتاف أمامية", secondary: "", sets: 3, reps: 10, custom: false, equipment: "بار", difficulty: "متوسط", description: "الحركة الأساسية لبناء حجم وقوة الأكتاف بالكامل.", instructions: ["اجلس أو قف والبار عند مستوى الأكتاف.", "ادفع البار لأعلى حتى فرد الذراعين.", "تجنب قوس الظهر الزائد.", "أنزل ببطء لمستوى الأكتاف."] },
    { id: "lateral-raise", name: "رفرفة جانبية دمبل", muscle: "shoulders", muscleLabel: "أكتاف جانبية", secondary: "", sets: 4, reps: 15, custom: false, equipment: "دمبل", difficulty: "مبتدئ", description: "حركة عزل لتوسيع الكتف الجانبي وإعطاء شكل أعرض للجسم.", instructions: ["قف والدمبلين بجانب الجسم.", "ارفع الذراعين للجانب حتى مستوى الكتف.", "لا تستخدم زخم الجسم.", "أنزل ببطء وتحكم."] },
    { id: "rear-delt-fly", name: "رفرفة خلفية (Rear Delt Fly)", muscle: "shoulders", muscleLabel: "أكتاف خلفية", secondary: "ظهر أوسط", sets: 3, reps: 15, custom: false, equipment: "دمبل", difficulty: "مبتدئ", description: "تستهدف الكتف الخلفي المهمل غالبًا، وتحسّن وضعية الظهر.", instructions: ["انحنِ للأمام قليلًا والذراعين متدليتين.", "ارفع الذراعين للجانب مع الشد على الكتف الخلفي.", "اضغط الكتفين معًا لثانية.", "أنزل ببطء."] },

    // ===== أرجل =====
    { id: "squat-barbell", name: "سكوات بار", muscle: "legs", muscleLabel: "أرجل (كواد)", secondary: "مؤخرة", sets: 4, reps: 8, custom: false, equipment: "بار", difficulty: "متوسط", description: "ملك حركات الأرجل، يبني القوة والحجم لكامل الجزء السفلي.", instructions: ["ضع البار على أعلى الظهر (Traps).", "انزل بالمؤخرة للخلف وللأسفل.", "حافظ على الركبتين في اتجاه القدمين.", "ادفع بالأرض للصعود لوضع الوقوف."] },
    { id: "leg-press", name: "ليج برس (Leg Press)", muscle: "legs", muscleLabel: "أرجل (كواد)", secondary: "مؤخرة", sets: 4, reps: 12, custom: false, equipment: "جهاز", difficulty: "مبتدئ", description: "بديل آمن للسكوات، ممتاز لزيادة الحجم بدون ضغط كبير على الظهر.", instructions: ["اجلس والقدمين على المنصة بعرض الكتفين.", "افرد الركبتين دون قفل كامل.", "انزل حتى زاوية 90 درجة.", "ادفع للأعلى بالكعبين."] },
    { id: "romanian-deadlift", name: "رومانيان ديدليفت", muscle: "legs", muscleLabel: "أرجل خلفية", secondary: "مؤخرة", sets: 3, reps: 10, custom: false, equipment: "بار", difficulty: "متوسط", description: "يستهدف عضلات الفخذ الخلفية (Hamstrings) والمؤخرة بشكل مباشر.", instructions: ["امسك البار والركبتين مثنيّة قليلًا فقط.", "انزل البار مع دفع المؤخرة للخلف.", "حافظ على الظهر مستقيم طول الحركة.", "ارجع للوقوف بالضغط على المؤخرة."] },
    { id: "calf-raise", name: "رفرفة سمانة (Calf Raise)", muscle: "legs", muscleLabel: "سمانة", secondary: "", sets: 4, reps: 15, custom: false, equipment: "جهاز", difficulty: "مبتدئ", description: "حركة عزل لبناء عضلة السمانة السفلية.", instructions: ["قف وأطراف القدم على حافة مرتفعة.", "انزل الكعبين لأقصى مدى.", "ارتفع على أطراف الأصابع لأعلى نقطة.", "اثبت لثانية ثم انزل ببطء."] },

    // ===== ذراعين =====
    { id: "barbell-curl", name: "كيرل بار (Barbell Curl)", muscle: "arms", muscleLabel: "بايسبس", secondary: "", sets: 3, reps: 10, custom: false, equipment: "بار", difficulty: "مبتدئ", description: "الحركة الأساسية والأشهر لبناء حجم البايسبس.", instructions: ["قف والبار ممسوك بمسافة الكتفين.", "ارفع البار لأعلى مع تثبيت المرفقين.", "اضغط البايسبس في القمة.", "أنزل ببطء وتحكم."] },
    { id: "tricep-pushdown", name: "تراي بوش داون (كابل)", muscle: "arms", muscleLabel: "ترايسبس", secondary: "", sets: 3, reps: 12, custom: false, equipment: "كابل", difficulty: "مبتدئ", description: "حركة عزل فعّالة لبناء الرأس الجانبي للترايسبس.", instructions: ["قف قريبًا من البكرة والمرفقين ثابتين بجانب الجسم.", "ادفع البار لأسفل حتى فرد الذراعين.", "اضغط الترايسبس في الأسفل.", "ارجع ببطء للأعلى."] },
    { id: "hammer-curl", name: "هامر كيرل (Hammer Curl)", muscle: "arms", muscleLabel: "بايسبس وساعد", secondary: "", sets: 3, reps: 12, custom: false, equipment: "دمبل", difficulty: "مبتدئ", description: "يستهدف البايسبس والساعد معًا بمسكة محايدة.", instructions: ["امسك الدمبلين بمسكة محايدة (كف لكف).", "ارفع الذراعين مع تثبيت المرفقين.", "اضغط لثانية في القمة.", "أنزل ببطء وتحكم."] },
    { id: "dips", name: "ديبس (Dips)", muscle: "arms", muscleLabel: "ترايسبس وصدر", secondary: "صدر", sets: 3, reps: 10, custom: false, equipment: "وزن الجسم", difficulty: "متقدم", description: "حركة مركبة قوية لبناء الترايسبس والصدر السفلي.", instructions: ["ارفع جسمك على متوازي القضبان بذراعين مفرودتين.", "انزل ببطء حتى زاوية 90 درجة بالمرفق.", "ادفع لأعلى حتى فرد الذراعين بالكامل.", "حافظ على الجذع منتصبًا قليلًا لاستهداف الترايسبس."] },

    // ===== بطن =====
    { id: "plank", name: "بلانك (Plank)", muscle: "core", muscleLabel: "بطن", secondary: "", sets: 3, reps: 30, custom: false, equipment: "وزن الجسم", difficulty: "مبتدئ", description: "حركة ثبات أساسية لبناء قوة الجذع والاستقرار.", instructions: ["استلقِ على البطن ثم ارتفع على الساعدين.", "حافظ على الجسم في خط مستقيم واحد.", "شد عضلات البطن طول الوقت.", "تنفس بشكل طبيعي وثبّت المدة المطلوبة (بالثواني)."] },
    { id: "hanging-leg-raise", name: "رفع أرجل معلق", muscle: "core", muscleLabel: "بطن سفلي", secondary: "", sets: 3, reps: 12, custom: false, equipment: "وزن الجسم", difficulty: "متقدم", description: "يستهدف البطن السفلي بشكل مباشر وفعّال جدًا.", instructions: ["علّق نفسك من البار بذراعين مفرودتين.", "ارفع الأرجل لأعلى دون تأرجح.", "اضغط البطن في القمة.", "أنزل ببطء وتحكم تام."] },
    { id: "cable-crunch", name: "كرانش كابل", muscle: "core", muscleLabel: "بطن علوي", secondary: "", sets: 3, reps: 15, custom: false, equipment: "كابل", difficulty: "متوسط", description: "يسمح بإضافة مقاومة تدريجية على البطن العلوي.", instructions: ["اركع أمام البكرة وامسك الحبل خلف الرقبة.", "انحنِ للأمام بالانقباض على البطن فقط.", "لا تستخدم الذراعين أو الوركين للسحب.", "ارجع ببطء للوضع المستقيم."] },
    ...EXTRA_EXERCISES,
  ];

  const MUSCLE_META = {
    chest: { label: "صدر", color: "#E6C877", light: "#F4E6B8" },
    back: { label: "ظهر", color: "#7FB58A", light: "#BFE0C5" },
    shoulders: { label: "أكتاف", color: "#D08B5B", light: "#EBC2A3" },
    legs: { label: "أرجل", color: "#B8923F", light: "#E0C885" },
    arms: { label: "ذراعين", color: "#C27C8A", light: "#E6B8C1" },
    core: { label: "بطن", color: "#6FB5AE", light: "#B5DDD9" },
  };

  // ===== i18n dictionary (interface chrome — labels/buttons/nav) =====
  const I18N = {
    nav_home: { ar: "الرئيسية", en: "Home" },
    nav_exercises: { ar: "التمارين", en: "Exercises" },
    nav_stats: { ar: "الإحصائيات", en: "Stats" },
    nav_profile: { ar: "حسابي", en: "Profile" },

    ex_title: { ar: "التمارين", en: "Exercises" },
    ex_search_ph: { ar: "دور على تمرين...", en: "Search exercises..." },
    ex_filter_all: { ar: "الكل", en: "All" },
    ex_filter_chest: { ar: "صدر", en: "Chest" },
    ex_filter_back: { ar: "ظهر", en: "Back" },
    ex_filter_shoulders: { ar: "أكتاف", en: "Shoulders" },
    ex_filter_legs: { ar: "أرجل", en: "Legs" },
    ex_filter_arms: { ar: "ذراعين", en: "Arms" },
    ex_filter_core: { ar: "بطن", en: "Core" },
    ex_empty: { ar: 'مفيش تمارين في القسم ده لسه.<br/>دوس على + فوق عشان تضيف تمرين جديد.', en: 'No exercises in this section yet.<br/>Tap + above to add a new exercise.' },
    ex_add_title: { ar: "إضافة تمرين جديد", en: "Add New Exercise" },
    ex_add_name_label: { ar: "اسم التمرين", en: "Exercise name" },
    ex_add_muscle_label: { ar: "العضلة الأساسية", en: "Primary muscle" },
    ex_add_secondary_label: { ar: "عضلات مساعدة (اختياري)", en: "Secondary muscles (optional)" },
    ex_add_sets_label: { ar: "مجموعات", en: "Sets" },
    ex_add_reps_label: { ar: "تكرارات", en: "Reps" },
    ex_add_cancel: { ar: "إلغاء", en: "Cancel" },
    ex_add_save: { ar: "إضافة التمرين", en: "Add Exercise" },
    ex_delete_hint: { ar: "اضغط مطوّل على أي تمرين لحذفه", en: "Long-press any exercise to delete it" },
    ex_active_program: { ar: "البرنامج الحالي", en: "Active Program" },
    ex_change_program: { ar: "تغيير", en: "Change" },

    detail_media_tag: { ar: "توضيح الحركة", en: "Movement guide" },
    detail_steps_title: { ar: "طريقة الأداء الصحيح", en: "How to perform it" },
    detail_log_title: { ar: "تسجيل الأداء", en: "Log Performance" },
    detail_log_btn: { ar: "تسجيل هذه المجموعة", en: "Log this set" },
    detail_muscles_primary: { ar: "أساسية", en: "Primary" },
    detail_muscles_secondary: { ar: "مساعدة", en: "Secondary" },

    prog_title: { ar: "برامج التدريب الجاهزة", en: "Ready Training Programs" },
    prog_sub: { ar: "اختار برنامج وطبّقه تلقائيًا على جدولك", en: "Pick a program and apply it to your schedule" },
    prog_apply: { ar: "تطبيق البرنامج", en: "Apply Program" },
    prog_applied: { ar: "مطبّق حاليًا ✓", en: "Currently Applied ✓" },
    prog_details: { ar: "التفاصيل", en: "Details" },
    prog_close: { ar: "إغلاق", en: "Close" },
    prog_recommended: { ar: "موصى به لك", en: "Recommended for you" },

    settings_title: { ar: "الإعدادات", en: "Settings" },
    settings_lang: { ar: "اللغة والوحدات", en: "Language & Units" },
    settings_notif: { ar: "الإشعارات والتذكيرات", en: "Notifications & Reminders" },
    settings_programs: { ar: "برامج التدريب الجاهزة", en: "Ready Training Programs" },
    settings_contact_dev: { ar: "تواصل مع المطور", en: "Contact Developer" },
    settings_reset: { ar: "إعادة تعيين كل البيانات", en: "Reset All Data" },
    edit_profile_btn: { ar: "تعديل الملف الشخصي", en: "Edit Profile" },
    edit_gender_label: { ar: "الجنس", en: "Gender" },
    edit_gender_male: { ar: "راجل", en: "Male" },
    edit_gender_female: { ar: "ست", en: "Female" },

    ai_title: { ar: "المدرّب الذكي", en: "AI Coach" },
    ai_status: { ar: "متصل الآن", en: "Online now" },
    ai_input_ph: { ar: "اسأل مدربك الذكي...", en: "Ask your AI coach..." },

    home_day_streak: { ar: "يوم متتالي", en: "day streak" },
    home_best: { ar: "أعلى رقم", en: "Best" },
    home_fat: { ar: "الدهون", en: "Fat" },
    home_goal: { ar: "الهدف", en: "Goal" },
    home_log_exercise: { ar: "تسجيل تمرين", en: "Log Exercise" },
    home_log_weight: { ar: "تسجيل وزن", en: "Log Weight" },
    home_body_measurements: { ar: "قياسات الجسم", en: "Body Measurements" },
    home_details: { ar: "التفاصيل", en: "Details" },
    home_body_fat: { ar: "دهون الجسم", en: "Body Fat" },
    home_month_change: { ar: "تغيّر الشهر", en: "Month Change" },
    home_recent_workout: { ar: "آخر تمرين مسجّل", en: "Recent Workout" },
    home_view_all: { ar: "عرض الكل", en: "View All" },
    home_empty_workout: { ar: 'لسه ما سجلتش أي تمرين. دوس "تسجيل تمرين" وابدأ.', en: 'No workouts logged yet. Tap "Log Exercise" to start.' },
    home_log_today_weight: { ar: "تسجيل وزن اليوم", en: "Log Today's Weight" },
    home_body_fat_optional: { ar: "نسبة الدهون % (اختياري)", en: "Body fat % (optional)" },
    home_cancel: { ar: "إلغاء", en: "Cancel" },
    home_save: { ar: "حفظ", en: "Save" },
  };

  function tr(key) {
    const lang = load().settings.lang || "ar";
    const entry = I18N[key];
    if (!entry) return key;
    return entry[lang] || entry.ar;
  }

  function applyI18n() {
    const lang = load().settings.lang || "ar";
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
    // textContent, not innerHTML — this whole function is legacy/unused in the
    // React app (see useI18n.jsx), kept only so the ported store still matches
    // its original public API 1:1. Using textContent here means even if
    // something ever calls it again, it can't inject markup.
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = tr(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.placeholder = tr(el.getAttribute("data-i18n-ph"));
    });
  }

  function slugify(name) {
    return "ex-" + name.trim().toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);
  }

  // =========================================================
  // In-memory cache (Sprint 3 — performance).
  //
  // Lifecycle: `cachedState` is the single in-memory representation of the
  // current state once populated. It starts `null` (cold — nothing loaded
  // yet). The first load() call parses localStorage once, runs the same
  // migration/backfill logic as before, and populates the cache. Every
  // subsequent load() call — from any getter, any mutator, any sync merge —
  // returns that same cached object directly: zero JSON.parse.
  //
  // Synchronization guarantee: save() is the ONLY path that persists to
  // localStorage, and it updates `cachedState` to the exact state object
  // being saved BEFORE notifying changeListeners (Sprint 1's useStoreVersion
  // and syncManager's push-scheduling both rely on listeners firing only
  // after the cache already reflects the new state). Since mutators do
  // `const s = load(); /* mutate s */ ; save(s);`, and load() now returns
  // the live cached object, `s` IS `cachedState` — mutations are visible
  // immediately, and save() simply confirms/persists them.
  //
  // Getters must never be given a reason to mutate what they read (none in
  // this file do — verified: every getter that builds a list allocates its
  // own new array before sorting/pushing into it). Consuming code (pages)
  // must treat anything returned from a Store getter as read-only for the
  // same reason — this was already implicitly true before caching (mutating
  // a stale snapshot did nothing), and is now load-bearing.
  //
  // Invalidation: normally never needed — every mutation path in this file
  // already flows through save(), which keeps the cache correct across
  // local writes, remote sync merges (mergeXFromRemote), migration, and
  // resetAllData() (all of them end in save()). If save() itself fails
  // (e.g. localStorage quota exceeded), the cache is invalidated so the
  // next load() re-derives from whatever is actually on disk, rather than
  // keeping an in-memory mutation that never made it to persistent storage.
  // For any other exceptional case (tests, future direct-storage tooling),
  // call invalidateCache() below instead of resetting cache state ad hoc
  // elsewhere in the codebase.
  let cachedState = null;

  /** Explicit escape hatch: forces the next load() to re-read from
      localStorage instead of serving the in-memory cache. Not used by any
      normal code path in this file today (every mutation already goes
      through save(), which keeps the cache correct) — this exists as the
      single, documented place to invalidate the cache for exceptional
      cases, instead of scattering `cachedState = null` throughout. */
  function invalidateCache() {
    cachedState = null;
  }

  function load() {
    if (cachedState) return cachedState;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const s = defaultState();
        save(s);
        return s;
      }
      const parsed = JSON.parse(raw);
      if (!parsed.exercises) parsed.exercises = SEED_EXERCISES.slice();
      if (!parsed.profile) parsed.profile = defaultState().profile;
      if (parsed.profile.heightCm === undefined) parsed.profile.heightCm = null;
      if (!parsed.profile.memberSince) parsed.profile.memberSince = todayISO();
      if (parsed.profile.username === undefined) parsed.profile.username = "";
      if (parsed.profile.bio === undefined) parsed.profile.bio = "";
      if (parsed.profile.avatar === undefined) parsed.profile.avatar = null;
      if (parsed.profile.cover === undefined) parsed.profile.cover = null;
      if (parsed.profile.coverGradient === undefined) parsed.profile.coverGradient = "g1";
      if (parsed.profile.gender === undefined) parsed.profile.gender = null;
      if (!parsed.prHistory) parsed.prHistory = [];
      if (parsed.activeProgramId === undefined) parsed.activeProgramId = null;
      if (!parsed.settings) parsed.settings = { unit: "kg", notifEnabled: false, notifTime: "19:00", lang: "ar" };
      if (parsed.settings.unit === undefined) parsed.settings.unit = "kg";
      if (parsed.settings.notifEnabled === undefined) parsed.settings.notifEnabled = false;
      if (parsed.settings.notifTime === undefined) parsed.settings.notifTime = "19:00";
      if (parsed.settings.lang === undefined) parsed.settings.lang = "ar";
      if (!parsed.foodLog) parsed.foodLog = [];
      if (!Array.isArray(parsed.savedMeals)) parsed.savedMeals = [];
      if (!Array.isArray(parsed.cheatDays)) parsed.cheatDays = [];
      if (!parsed.deletedExerciseIds) parsed.deletedExerciseIds = [];
      if (!parsed.pendingDeletes) parsed.pendingDeletes = { weight: [], food: [], exerciseLogs: [], prs: [] };
      for (const k of ["weight", "food", "exerciseLogs", "prs"]) if (!parsed.pendingDeletes[k]) parsed.pendingDeletes[k] = [];
      // Backfill: merge any newly-added built-in exercises (and new fields on
      // already-known ones) into existing users' libraries. Never touches
      // custom exercises the user added themselves, and respects exercises
      // they deliberately deleted (deletedExerciseIds tombstones).
      {
        const tombstoned = new Set(parsed.deletedExerciseIds);
        const byId = new Map(parsed.exercises.map((e) => [e.id, e]));
        SEED_EXERCISES.forEach((seed) => {
          if (tombstoned.has(seed.id)) return;
          const existing = byId.get(seed.id);
          if (!existing) {
            parsed.exercises.push({ ...seed });
          } else {
            // add any new metadata fields (equipment/difficulty/etc.) without
            // overwriting anything the user may have customized.
            for (const k of ["equipment", "difficulty", "description", "instructions"]) {
              if (existing[k] === undefined && seed[k] !== undefined) existing[k] = seed[k];
            }
          }
        });
      }
      return (cachedState = parsed);
    } catch (e) {
      const s = defaultState();
      save(s);
      return s;
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      // Update the cache BEFORE notifying listeners (Sprint 1's
      // useStoreVersion and syncManager both react to onChange, and must
      // see the new state as already-current when they do).
      cachedState = state;
      changeListeners.forEach((fn) => {
        try { fn(state); } catch (e) { console.error("gymak store change listener failed", e); }
      });
      return true;
    } catch (e) {
      console.error("gymak store save failed", e);
      // The write to localStorage did not happen, so the in-memory cache
      // must not be trusted as "the current state" either — invalidate it
      // so the next load() re-derives from whatever is actually persisted
      // on disk, instead of silently keeping an unpersisted mutation live
      // in memory until the app is closed and reopened.
      invalidateCache();
      return false;
    }
  }

  // Sync-support: every save() call notifies subscribers. The sync engine
  // uses this to debounce a push after local writes — added here (one hook
  // point) instead of touching each of the 40+ individual mutator methods.
  const changeListeners = new Set();

  const Store = {
    get() {
      return load();
    },

    // ===== Exercise catalog =====
    getExercises() {
      return mergeExercises(load().exercises || SEED_EXERCISES.slice()).map(normalizeExercise);
    },

    getExerciseById(id) {
      const list = this.getExercises();
      return list.find((e) => e.id === id) || null;
    },

    addExercise({ name, muscle, secondary, sets, reps, mediaUrl, equipment, difficulty, unit, localMedia }) {
      const s = load();
      if (!s.exercises) s.exercises = SEED_EXERCISES.slice();
      const meta = MUSCLE_META[muscle] || MUSCLE_META.chest;
      const ex = {
        id: slugify(name),
        name: name.trim(),
        muscle,
        muscleLabel: meta.label,
        secondary: secondary || "",
        sets: Math.min(20, Math.max(1, Math.round(Number(sets)) || 3)),
        reps: Math.min(unit === "sec" ? 600 : 100, Math.max(1, Math.round(Number(reps)) || 10)),
        custom: true,
        mediaUrl: (mediaUrl || "").trim() || null,
        equipment: equipment || "",
        difficulty: difficulty || "",
        unit: unit === "sec" ? "sec" : "reps",
        localMedia: localMedia === "image" || localMedia === "video" ? localMedia : null,
      };
      s.exercises.push(ex);
      save(s);
      return ex;
    },

    // ===== Favourite exercises (synced, last-write-wins by updatedMs) =====
    getFavoriteIds() {
      const f = load().favorites;
      return f && Array.isArray(f.ids) ? f.ids.slice() : [];
    },
    getFavoritesMeta() {
      const f = load().favorites;
      return { ids: f && Array.isArray(f.ids) ? f.ids.slice() : [], updatedMs: f && Number.isFinite(f.updatedMs) ? f.updatedMs : 0 };
    },
    toggleFavorite(id) {
      if (typeof id !== "string" || !id || id.length > 120) return false;
      const s = load();
      const cur = s.favorites && Array.isArray(s.favorites.ids) ? s.favorites.ids : [];
      const has = cur.includes(id);
      s.favorites = { ids: has ? cur.filter((x) => x !== id) : cur.concat(id).slice(-500), updatedMs: Date.now() };
      save(s);
      return !has;
    },
    // Remote wins only when it is strictly newer than local.
    mergeFavoritesFromRemote(ids, updatedMs) {
      const s = load();
      const localMs = s.favorites && Number.isFinite(s.favorites.updatedMs) ? s.favorites.updatedMs : 0;
      if (!(updatedMs > localMs)) return false;
      s.favorites = { ids: ids.slice(0, 500), updatedMs };
      save(s);
      return true;
    },

    // ===== Today's list (device-local) =====
    getTodayKey() { return todayISO(); },
    getTodayPlanIds() {
      const t = load().todayPlan;
      return t && t.date === todayISO() && Array.isArray(t.ids) ? t.ids.slice() : [];
    },
    toggleTodayPlan(id) {
      const s = load();
      const today = todayISO();
      const cur = s.todayPlan && s.todayPlan.date === today && Array.isArray(s.todayPlan.ids) ? s.todayPlan.ids : [];
      const has = cur.includes(id);
      s.todayPlan = { date: today, ids: has ? cur.filter((x) => x !== id) : cur.concat(id) };
      save(s);
      return !has;
    },
    addManyToTodayPlan(ids) {
      const s = load();
      const today = todayISO();
      const cur = s.todayPlan && s.todayPlan.date === today && Array.isArray(s.todayPlan.ids) ? s.todayPlan.ids : [];
      s.todayPlan = { date: today, ids: cur.concat((ids || []).filter((x) => !cur.includes(x))) };
      save(s);
    },
    getExerciseLogs(exerciseId) {
      return (load().exerciseLogs[exerciseId] || []).slice();
    },
    isLoggedToday(exerciseId) {
      const logs = load().exerciseLogs[exerciseId] || [];
      const today = todayISO();
      return logs.some((l) => l.date === today);
    },

    setExerciseLocalMedia(id, kind) {
      const s = load();
      const ex = (s.exercises || []).find((e) => e.id === id && e.custom);
      if (!ex) return;
      ex.localMedia = kind === "image" || kind === "video" ? kind : null;
      save(s);
    },

    deleteExercise(id) {
      const s = load();
      if (!s.exercises) s.exercises = SEED_EXERCISES.slice();
      s.exercises = s.exercises.filter((e) => e.id !== id);
      deleteExerciseMedia(id); // device-local photo/video of a custom exercise, if any
      if (!s.deletedExerciseIds) s.deletedExerciseIds = [];
      if (!s.deletedExerciseIds.includes(id)) s.deletedExerciseIds.push(id);
      save(s);
    },

    getMuscleMeta(muscle) {
      return MUSCLE_META[muscle] || MUSCLE_META.chest;
    },

    getAllMuscles() {
      return MUSCLE_META;
    },

    // ===== Settings (units / notifications) =====
    getSettings() {
      return load().settings;
    },

    setUnit(unit) {
      const s = load();
      s.settings.unit = unit === "lb" ? "lb" : "kg";
      save(s);
      return s.settings.unit;
    },

    getReminderPrefs() { return normalizeReminders(load().settings.reminders); },
    setReminderPrefs(patch) {
      const s = load();
      const cur = normalizeReminders(s.settings.reminders);
      for (const k of Object.keys(cur)) if (patch && patch[k]) cur[k] = { ...cur[k], ...patch[k] };
      s.settings.reminders = normalizeReminders(cur);
      save(s);
      return s.settings.reminders;
    },
    trainedOn(date = todayISO()) { return load().workoutDays.includes(date); },
    setNotifSettings({ enabled, time }) {
      const s = load();
      if (enabled !== undefined) s.settings.notifEnabled = !!enabled;
      if (time) s.settings.notifTime = time;
      save(s);
      return s.settings;
    },

    // ===== Language =====
    getLang() {
      return load().settings.lang || "ar";
    },

    setLang(lang) {
      const s = load();
      s.settings.lang = lang === "en" ? "en" : "ar";
      save(s);
      return s.settings.lang;
    },

    // ===== Developer contact =====
    getDeveloperWhatsAppUrl() {
      const lang = this.getLang();
      const msg = lang === "en"
        ? "Hi! I'm using GYMAK app and I'd like to reach the developer 👋"
        : "السلام عليكم، بستخدم تطبيق GYMAK وحابب أتواصل مع المطور 👋";
      return "https://wa.me/201022390517?text=" + encodeURIComponent(msg);
    },

    // ===== Reminder notification (shared across pages so it stays armed) =====
    _reminderTimerId: null,
    scheduleReminder() {
      if (typeof Notification === "undefined") return;
      if (this._reminderTimerId) { clearTimeout(this._reminderTimerId); this._reminderTimerId = null; }
      const s = load().settings;
      if (!s.notifEnabled || Notification.permission !== "granted") return;
      const [h, m] = (s.notifTime || "19:00").split(":").map(Number);
      const now = new Date();
      let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const delay = next - now;
      const lang = this.getLang();
      this._reminderTimerId = setTimeout(() => {
        try {
          new Notification(lang === "en" ? "GYMAK — workout time 💪" : "GYMAK — وقت التمرين 💪", {
            body: lang === "en" ? "Don't forget to log today's workout." : "متنساش تسجل تمرينك النهاردة.",
            icon: "icon-192.png",
          });
        } catch (e) {}
        this.scheduleReminder();
      }, delay);
    },

    // كل الأوزان بتتخزن دايمًا بالكيلوجرام؛ الدوال دي بس للعرض/الإدخال حسب وحدة المستخدم
    toDisplayWeight(kg) {
      if (kg == null) return null;
      const unit = load().settings.unit;
      const v = unit === "lb" ? Number(kg) / KG_PER_LB : Number(kg);
      return Math.round(v * 10) / 10;
    },

    fromDisplayWeight(val) {
      const unit = load().settings.unit;
      const n = Number(val);
      if (isNaN(n)) return n;
      const kg = unit === "lb" ? n * KG_PER_LB : n;
      return Math.round(kg * 100) / 100;
    },

    unitLabel() {
      return load().settings.unit === "lb" ? "رطل" : "كجم";
    },

    formatWeight(kg) {
      if (kg == null) return "—";
      const disp = this.toDisplayWeight(kg);
      return disp.toLocaleString("en-US", { maximumFractionDigits: 1 }) + " " + this.unitLabel();
    },

    // ===== Weight =====
    // Weighing in is not a workout: it must not touch the streak or workout days.
    // weight in kg. bodyFat blank/null = not measured (never copied from an older day).
    saveWeight(weight, bodyFat, date) {
      const w = Number(weight);
      if (!(w >= 20 && w <= 400)) return { ok: false, error: "weight" };
      const hasBf = bodyFat != null && bodyFat !== "";
      const bf = hasBf ? Number(bodyFat) : null;
      if (hasBf && !(bf >= 2 && bf <= 70)) return { ok: false, error: "bodyFat" };
      const s = load();
      const today = todayISO();
      const day = date || today;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > today) return { ok: false, error: "date" };
      const existingIdx = s.weightLogs.findIndex((x) => x.date === day);
      const prev = existingIdx >= 0 ? { ...s.weightLogs[existingIdx] } : null;
      const entry = { date: day, weight: w, bodyFat: bf };
      if (existingIdx >= 0) s.weightLogs[existingIdx] = entry;
      else s.weightLogs.push(entry);
      s.weightLogs.sort((a, b) => (a.date > b.date ? 1 : -1));
      this._untomb(s, "weight", day);
      save(s);
      return { ok: true, date: day, prev };
    },
    undoSaveWeight(res) {
      if (!res || !res.ok) return false;
      if (res.prev) return this.restore({ kind: "weight-edit", entry: res.prev });
      return !!this.deleteWeightEntry(res.date);
    },
    addWeight(weight, bodyFat) {
      this.saveWeight(weight, bodyFat);
      return load();
    },

    /** Last real body-fat reading and the first day of that value (older builds copied it forward). */
    getLatestBodyFat() {
      const logs = load().weightLogs;
      let i = logs.length - 1;
      while (i >= 0 && logs[i].bodyFat == null) i--;
      if (i < 0) return null;
      const value = logs[i].bodyFat;
      let j = i;
      while (j > 0 && logs[j - 1].bodyFat === value) j--;
      return { value, date: logs[j].date };
    },

    getLatestWeight() {
      const s = load();
      return s.weightLogs.at(-1) || null;
    },

    getWeightDiffVsLastWeek() {
      const s = load();
      const latest = s.weightLogs.at(-1);
      if (!latest) return null;
      const weekAgoTarget = shiftDate(latest.date, -7);
      // find closest log on/before weekAgoTarget
      let ref = null;
      for (const w of s.weightLogs) {
        if (w.date <= weekAgoTarget) ref = w;
      }
      if (!ref) ref = s.weightLogs[0];
      if (ref === latest) return null;
      return { diff: +(latest.weight - ref.weight).toFixed(1), from: ref.weight, to: latest.weight, span: daysBetween(ref.date, latest.date) };
    },

    // ===== Exercises =====
    logSet(exerciseId, weight, sets, reps) {
      const s = load();
      const today = todayISO();
      const levelBefore = s.profile.level;
      const streakBefore = this.getStreak();
      let newPr = null;
      const w = Number(weight);
      const prevLogs = s.exerciseLogs[exerciseId] || [];
      const prevMax = prevLogs.reduce((m, l) => Math.max(m, l.weight), 0);
      if (!s.exerciseLogs[exerciseId]) s.exerciseLogs[exerciseId] = [];
      const awarded = this._awardDailyXP(s, today);
      s.exerciseLogs[exerciseId].push({ date: today, weight: w, sets: Number(sets), reps: Number(reps), at: nextLogStamp(), ...(awarded ? { xp: true } : {}) });
      if (w > prevMax && prevLogs.length > 0) {
        const ex = (s.exercises || []).find((e) => e.id === exerciseId);
        s.prHistory.unshift({
          exerciseId, exerciseName: ex ? ex.name : exerciseId,
          weight: w, prevWeight: prevMax, date: today,
        });
        newPr = s.prHistory[0];
        s.prHistory = s.prHistory.slice(0, 30);
      }
      this._markWorkoutDay(s, today);
      save(s);
      const streakAfter = this.getStreak();
      const moments = momentsFor({
        levelUp: s.profile.level > levelBefore, level: s.profile.level,
        streak: streakAfter > streakBefore ? streakAfter : 0, pr: newPr,
        unit: this.unitLabel(), conv: (x) => this.toDisplayWeight(x),
      });
      moments.forEach((m) => celebrate(m));
      return s;
    },

    // XP: +25 per logged exercise, at most XP_DAILY_CAP awards a day.
    _awardDailyXP(s, today) {
      const day = s.profile.xpDay && s.profile.xpDay.date === today ? s.profile.xpDay : { date: today, n: 0 };
      if (day.n >= XP_DAILY_CAP) { s.profile.xpDay = day; return false; }
      day.n += 1; s.profile.xpDay = day;
      this._addXP(s, 25);
      return true;
    },
    _addXP(s, delta) {
      const p = s.profile;
      p.xp += delta;
      while (p.xp >= p.xpNext) { p.xp -= p.xpNext; p.level += 1; p.xpNext = Math.round(p.xpNext * 1.15); }
      while (p.xp < 0 && p.level > 1) { p.xpNext = Math.max(500, Math.round(p.xpNext / 1.15)); p.level -= 1; p.xp += p.xpNext; }
      if (p.xp < 0) p.xp = 0;
    },

    getLastExerciseLog(exerciseId) {
      const s = load();
      const logs = s.exerciseLogs[exerciseId];
      if (!logs || !logs.length) return null;
      return logs.at(-1);
    },

    getPreviousBest(exerciseId) {
      const s = load();
      const logs = s.exerciseLogs[exerciseId] || [];
      if (logs.length < 2) return null;
      return logs[logs.length - 2];
    },

    // ===== Streak =====
    _markWorkoutDay(s, dateISO) {
      if (!s.workoutDays.includes(dateISO)) {
        s.workoutDays.push(dateISO);
        s.workoutDays.sort();
      }
      // recompute current streak against this updated set and persist the best
      const set = new Set(s.workoutDays);
      let streak = 0;
      let cursor = todayISO();
      if (!set.has(cursor)) cursor = shiftDate(cursor, -1);
      while (set.has(cursor)) { streak++; cursor = shiftDate(cursor, -1); }
      s.bestStreak = Math.max(s.bestStreak || 0, streak);
    },

    getStreak() {
      const s = load();
      const set = new Set(s.workoutDays);
      let streak = 0;
      let cursor = todayISO();
      // if today not logged yet, streak counts up to yesterday still (don't break it)
      if (!set.has(cursor)) cursor = shiftDate(cursor, -1);
      const cheat = new Set(s.cheatDays || []);
      // a cheat/rest day bridges the streak: it neither counts nor breaks it
      while (set.has(cursor) || cheat.has(cursor)) {
        if (set.has(cursor)) streak++;
        cursor = shiftDate(cursor, -1);
      }
      return streak;
    },

    getBestStreak() {
      const s = load();
      const current = this.getStreak();
      return Math.max(s.bestStreak || 0, current);
    },

    getLast7DaysStatus() {
      const s = load();
      const set = new Set(s.workoutDays);
      const today = todayISO();
      const out = [];
      for (let i = 6; i >= 0; i--) {
        const d = shiftDate(today, -i);
        out.push({ date: d, done: set.has(d) });
      }
      return out;
    },

    // ===== Profile / XP =====
    getProfile() {
      return load().profile;
    },

    setProfileName(name) {
      const s = load();
      s.profile.name = (name || "").trim().slice(0, 40);
      save(s);
      return s.profile;
    },

    setUsername(username) {
      const s = load();
      const clean = (username || "").trim().replace(/^@+/, "").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "");
      s.profile.username = clean.slice(0, 30);
      save(s);
      return s.profile;
    },

    setBio(bio) {
      const s = load();
      s.profile.bio = (bio || "").trim().slice(0, 150);
      save(s);
      return s.profile;
    },

    setAvatar(dataUrl) {
      const s = load();
      const prev = s.profile.avatar;
      s.profile.avatar = dataUrl || null;
      const ok = save(s);
      if (!ok) s.profile.avatar = prev;
      return { ok, profile: s.profile };
    },

    setCover(dataUrl) {
      const s = load();
      const prev = { cover: s.profile.cover, coverGradient: s.profile.coverGradient };
      s.profile.cover = dataUrl || null;
      if (dataUrl) s.profile.coverGradient = null;
      const ok = save(s);
      if (!ok) { s.profile.cover = prev.cover; s.profile.coverGradient = prev.coverGradient; }
      return { ok, profile: s.profile };
    },

    setCoverGradient(gradientId) {
      const s = load();
      s.profile.coverGradient = gradientId || null;
      s.profile.cover = null;
      save(s);
      return s.profile;
    },

    getRamadan() { return !!load().profile.ramadan; },
    setRamadan(on) { const s = load(); s.profile.ramadan = !!on; save(s); return s.profile.ramadan; },
    setGender(g) {
      const s = load();
      s.profile.gender = (g === "male" || g === "female") ? g : null;
      save(s);
      return s.profile;
    },

    // ===== Recommended program based on gender (personalization hint, not a rule) =====
    getRecommendedProgramId() {
      const s = load();
      if (s.profile.gender === "female") return "glutes-tone";
      if (s.profile.gender === "male") return "push-pull-legs";
      return null;
    },

    setHeight(cm) {
      const s = load();
      const n = Number(cm);
      if (cm && !(n >= 100 && n <= 250)) return s.profile;
      s.profile.heightCm = cm ? n : null;
      save(s);
      return s.profile;
    },

    getBMI() {
      const s = load();
      const h = s.profile.heightCm;
      const latest = s.weightLogs.at(-1);
      if (!h || !latest) return null;
      const m = h / 100;
      return +(latest.weight / (m * m)).toFixed(1);
    },

    getGoalWeight() {
      return load().goalWeight;
    },

    setGoalWeight(kg) {
      const s = load();
      const n = Number(kg);
      if (kg && !(n >= 30 && n <= 300)) return s.goalWeight;
      s.goalWeight = kg ? n : null;
      save(s);
      return s.goalWeight;
    },

    // ===== Food / calorie tracking =====
    parseFood(text) {
      return parseFoodText(text);
    },

    logFoodEntries(items) {
      if (!items || !items.length) return null;
      const s = load();
      const date = todayISO();
      const totals = items.reduce((acc, it) => {
        acc.kcal += it.kcal; acc.protein += it.protein; acc.carbs += it.carbs; acc.fat += it.fat;
        return acc;
      }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
      let dayEntry = s.foodLog.find((f) => f.date === date);
      if (!dayEntry) {
        dayEntry = { date, items: [], totalKcal: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
        s.foodLog.push(dayEntry);
      }
      dayEntry.items.push(...items);
      dayEntry.totalKcal += totals.kcal;
      dayEntry.totalProtein = Math.round((dayEntry.totalProtein + totals.protein) * 10) / 10;
      dayEntry.totalCarbs = Math.round((dayEntry.totalCarbs + totals.carbs) * 10) / 10;
      dayEntry.totalFat = Math.round((dayEntry.totalFat + totals.fat) * 10) / 10;
      save(s);
      return dayEntry;
    },

    isCheatDay(date = todayISO()) { return load().cheatDays.includes(date); },
    // One free day per rolling 7 days. Returns { ok, on, reason? }.
    setCheatDay(date, on) {
      const s = load();
      const has = s.cheatDays.includes(date);
      if (!on) { if (has) { s.cheatDays = s.cheatDays.filter((d) => d !== date); save(s); } return { ok: true, on: false }; }
      if (has) return { ok: true, on: true };
      const near = s.cheatDays.some((d) => Math.abs((new Date(d) - new Date(date)) / 86400000) < 7);
      if (near) return { ok: false, on: false, reason: "limit" };
      s.cheatDays.push(date); s.cheatDays.sort();
      save(s);
      return { ok: true, on: true };
    },
    getSavedMeals() { return load().savedMeals.slice(); },
    saveMeal(name, items) {
      const nm = String(name || "").trim().slice(0, 40);
      if (!nm || !Array.isArray(items) || !items.length) return null;
      const s = load();
      if (s.savedMeals.length >= 30) return null;
      const meal = { id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: nm, items: items.map((it) => ({ name: String(it.name), grams: Number(it.grams) || 0, kcal: Number(it.kcal) || 0, protein: Number(it.protein) || 0, carbs: Number(it.carbs) || 0, fat: Number(it.fat) || 0 })) };
      s.savedMeals.push(meal);
      save(s);
      return meal;
    },
    deleteSavedMeal(id) {
      const s = load();
      const i = s.savedMeals.findIndex((m) => m.id === id);
      if (i < 0) return null;
      const [gone] = s.savedMeals.splice(i, 1);
      save(s);
      return gone;
    },
    logSavedMeal(id) {
      const m = load().savedMeals.find((x) => x.id === id);
      if (!m) return null;
      return this.logFoodEntries(m.items.map((it) => ({ ...it })));
    },

    getTodayFoodLog() {
      const s = load();
      return s.foodLog.find((f) => f.date === todayISO()) || { date: todayISO(), items: [], totalKcal: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
    },

    getDailyCalorieTarget() {
      const s = load();
      const latest = s.weightLogs.at(-1);
      if (!latest) return null;
      const perKgFactor = s.profile.gender === "female" ? 29 : 32;
      let base = latest.weight * perKgFactor;
      const mode = this.getGoalMode();
      const goal = s.goalWeight;
      if (mode && GOAL_MODES[mode]) base += GOAL_MODES[mode].kcal;
      else if (goal != null) {
        if (goal < latest.weight - 1) base -= 400; // cutting
        else if (goal > latest.weight + 1) base += 300; // bulking
      }
      return Math.round(base);
    },

    getGoalModes() {
      const g = load().profile.gender;
      return Object.fromEntries(Object.entries(GOAL_MODES).filter(([, v]) => !v.only || v.only === g));
    },
    getGoalMode() { const p = load().profile; const m = p.goalMode; return m && GOAL_MODES[m] && (!GOAL_MODES[m].only || GOAL_MODES[m].only === p.gender) ? m : null; },
    setGoalMode(m) {
      const s = load();
      if (m && !GOAL_MODES[m]) return s.profile.goalMode || null;
      s.profile.goalMode = m || null;
      save(s);
      return s.profile.goalMode;
    },
    getProteinTarget() {
      const s = load();
      const latest = s.weightLogs.at(-1);
      if (!latest) return null;
      const m = s.profile.goalMode;
      const gm = this.getGoalMode();
      const perKg = gm ? GOAL_MODES[gm].protein : 1.8;
      return Math.round(latest.weight * perKg);
    },

    // ===== Weight diff over an arbitrary window =====
    getWeightDiffOverDays(days) {
      const s = load();
      const latest = s.weightLogs.at(-1);
      if (!latest) return null;
      const target = shiftDate(latest.date, -days);
      let ref = null;
      for (const w of s.weightLogs) { if (w.date <= target) ref = w; }
      if (!ref) ref = s.weightLogs[0];
      if (ref === latest) return null;
      return { diff: +(latest.weight - ref.weight).toFixed(1), from: ref.weight, to: latest.weight, span: daysBetween(ref.date, latest.date) };
    },

    getWeightHistory(limit = 12) {
      const s = load();
      return s.weightLogs.slice(-limit);
    },

    // ===== PRs =====
    getRecentPRs(limit = 5) {
      const s = load();
      const timed = this._timedChecker(s);
      return s.prHistory
        .filter((p) => p.weight > 0 && !timed(p.exerciseId))
        .slice(0, limit)
        .map((p) => ({ ...p, exerciseName: normalizeExercise({ id: p.exerciseId, name: p.exerciseName }).name }));
    },

    getWorkoutDays() {
      return load().workoutDays.slice();
    },

    getTotalWorkoutDays() {
      return load().workoutDays.length;
    },

    // ===== Tonnage & activity within a window =====
    getTonnage(days = null) {
      const s = load();
      const cutoff = days != null ? windowStart(todayISO(), days) : null;
      const timed = this._timedChecker(s);
      let total = 0;
      Object.entries(s.exerciseLogs).forEach(([id, logs]) => {
        if (timed(id)) return;
        logs.forEach((l) => {
          if (!cutoff || l.date >= cutoff) total += l.weight * l.sets * l.reps;
        });
      });
      return total;
    },

    _timedChecker(s) {
      const byId = new Map((s.exercises || []).map((e) => [e.id, e]));
      return (id) => normalizeExercise(byId.get(id) || { id }).unit === "sec";
    },

    // Real number of sets (each log entry holds `sets`), window includes today.
    getSetsInRange(days) {
      const s = load();
      const cutoff = windowStart(todayISO(), days);
      let count = 0;
      Object.values(s.exerciseLogs).forEach((logs) => {
        logs.forEach((l) => { if (l.date >= cutoff) count += Math.max(1, Number(l.sets) || 1); });
      });
      return count;
    },

    getWorkoutDaysInRange(days) {
      const s = load();
      const cutoff = windowStart(todayISO(), days);
      return s.workoutDays.filter((d) => d >= cutoff).length;
    },

    getLast28DaysDone() {
      const cutoff = windowStart(todayISO(), 28);
      return load().workoutDays.filter((d) => d >= cutoff);
    },

    getPRCountInRange(days) {
      const cutoff = windowStart(todayISO(), days);
      return this.getRecentPRs(100000).filter((p) => p.date >= cutoff).length;
    },

    // Weight entries inside the window (null when days is not given -> last 12).
    getWeightHistoryInRange(days) {
      const cutoff = windowStart(todayISO(), days);
      return load().weightLogs.filter((w) => w.date >= cutoff);
    },

    // Sets per muscle group inside the window, biggest first.
    getMuscleSetsInRange(days, offsetDays = 0) {
      const s = load();
      const end = shiftISO(todayISO(), -offsetDays);
      const cutoff = windowStart(end, days);
      const byId = new Map((s.exercises || []).map((e) => [e.id, e]));
      const totals = new Map();
      Object.entries(s.exerciseLogs).forEach(([id, logs]) => {
        const ex = normalizeExercise(byId.get(id) || { id });
        const label = ex.muscleLabel || ex.muscle;
        if (!label) return;
        logs.forEach((l) => {
          if (l.date >= cutoff && l.date <= end) totals.set(label, (totals.get(label) || 0) + Math.max(1, Number(l.sets) || 1));
        });
      });
      return [...totals.entries()].map(([label, sets]) => ({ label, sets })).sort((a, b) => b.sets - a.sets);
    },

    // ===== Strength progress: best weight on the first day vs best weight ever =====
    // Needs two logged days at least a week apart; weightless and timed
    // exercises are skipped. A deload never shows as a loss.
    getStrengthProgress(limit = 3) {
      const s = load();
      const timed = this._timedChecker(s);
      const rows = [];
      Object.keys(s.exerciseLogs).forEach((exerciseId) => {
        const logs = (s.exerciseLogs[exerciseId] || []).filter((l) => l.weight > 0);
        if (logs.length < 2 || timed(exerciseId)) return;
        const firstDate = logs[0].date;
        const lastDate = logs.at(-1).date;
        if (daysBetween(firstDate, lastDate) < 7) return;
        const from = Math.max(...logs.filter((l) => l.date === firstDate).map((l) => l.weight));
        const bestLog = logs.reduce((b, l) => (l.weight > b.weight ? l : b), logs[0]);
        const to = bestLog.weight;
        if (from <= 0) return;
        const ex = (s.exercises || []).find((e) => e.id === exerciseId);
        const name = ex ? normalizeExercise(ex).name : exerciseId;
        const e1rm = Math.round(to * (1 + (Number(bestLog.reps) || 1) / 30));
        rows.push({ exerciseId, name, from, to, e1rm, pct: Math.round(((to - from) / from) * 100) });
      });
      rows.sort((a, b) => b.pct - a.pct);
      return rows.slice(0, limit);
    },

    // ===== Programs =====
    getPrograms() {
      return PROGRAMS;
    },

    getActiveProgram() {
      const s = load();
      if (!s.activeProgramId) return null;
      return PROGRAMS.find((p) => p.id === s.activeProgramId) || null;
    },

    // Resolves a program's day-by-day template into real exercise records
    // (name, muscle, sets, reps, equipment...) so the UI can render a ready
    // "start training now" schedule instead of just category labels.
    // Exercises the user has deliberately deleted are respected here too —
    // they won't reappear just because a program template references them.
    getProgramDays(id) {
      const s = load();
      const byId = new Map(s.exercises.map((e) => [e.id, e]));
      const tombstoned = new Set(s.deletedExerciseIds || []);
      const template = PROGRAM_TEMPLATES[id] || [];
      return template.map((day) => ({
        title: day.title,
        exercises: day.exerciseIds
          .filter((eid) => !tombstoned.has(eid))
          .map((eid) => byId.get(eid) || SEED_EXERCISES.find((e) => e.id === eid))
          .filter(Boolean)
          .map(normalizeExercise),
      }));
    },

    // Flat set of every exercise id that belongs to a given program's
    // template — used to scope the Exercises tab to "this program + my own
    // custom exercises" instead of the entire library.
    getProgramExerciseIds(id) {
      const template = PROGRAM_TEMPLATES[id] || [];
      return new Set(template.flatMap((d) => d.exerciseIds));
    },

    applyProgram(id) {
      const s = load();
      s.activeProgramId = id;
      // Auto-generate: make sure every exercise this program's days call for
      // actually exists (and isn't tombstoned) in the user's library, so they
      // can start logging sets immediately with no manual setup.
      const template = PROGRAM_TEMPLATES[id] || [];
      const neededIds = new Set(template.flatMap((d) => d.exerciseIds));
      const byId = new Map(s.exercises.map((e) => [e.id, e]));
      const tombstoned = new Set(s.deletedExerciseIds || []);
      neededIds.forEach((eid) => {
        tombstoned.delete(eid);
        if (!byId.has(eid)) {
          const seed = SEED_EXERCISES.find((e) => e.id === eid);
          if (seed) s.exercises.push({ ...seed });
        }
      });
      s.deletedExerciseIds = Array.from(tombstoned);
      save(s);
      return this.getActiveProgram();
    },

    stopProgram() {
      const s = load();
      const prev = s.activeProgramId || null;
      s.activeProgramId = null;
      save(s);
      return prev;
    },

    // ===== Achievements (computed live from real data, never hardcoded) =====
    getAchievements() {
      const s = load();
      const totalSets = Object.values(s.exerciseLogs).reduce((sum, arr) => sum + arr.reduce((a, l) => a + Math.max(1, Number(l.sets) || 1), 0), 0);
      const bestStreak = this.getBestStreak();
      const level = s.profile.level;
      const goalHit = goalReached(s.goalWeight, s.weightLogs);

      const days = s.workoutDays.length;
      const foodDays = (s.foodLog || []).length;
      const weighIns = s.weightLogs.length;
      const prs = this.getRecentPRs(100000).length;
      const tier = (id, name, cur, target) => ({ id, name, unlocked: cur >= target, progress: Math.min(cur, target), target });
      return [
        tier("streak7", "أسبوع كامل", bestStreak, 7),
        tier("streak14", "14 يوم متتالي", bestStreak, 14),
        tier("streak30", "30 يوم متتالي", bestStreak, 30),
        tier("sets10", "10 مجموعات مسجّلة", totalSets, 10),
        tier("sets50", "50 مجموعة مسجّلة", totalSets, 50),
        tier("sets100", "100 مجموعة مسجّلة", totalSets, 100),
        tier("days10", "10 أيام تمرين", days, 10),
        tier("days30", "30 يوم تمرين", days, 30),
        tier("days100", "100 يوم تمرين", days, 100),
        tier("food7", "سجّلت أكلك 7 أيام", foodDays, 7),
        tier("weigh7", "7 مرات وزن", weighIns, 7),
        tier("level5", "مستوى 5", level, 5),
        tier("firstPR", "أول رقم قياسي", prs, 1),
        tier("pr5", "5 أرقام قياسية", prs, 5),
        { id: "goal", name: "تحقيق هدف الوزن", unlocked: goalHit },
      ];
    },

    getRecentExerciseLogs(limit = 3) {
      const s = load();
      const rows = [];
      Object.keys(s.exerciseLogs).forEach((exerciseId) => {
        const ex = normalizeExercise((s.exercises || []).find((e) => e.id === exerciseId));
        (s.exerciseLogs[exerciseId] || []).forEach((l, li) => {
          rows.push({
            exerciseId, li, at: l.at || 0, date: l.date, weight: l.weight, sets: l.sets, reps: l.reps, unit: ex ? ex.unit : "reps",
            name: ex ? ex.name : exerciseId,
            muscle: ex ? ex.muscle : "chest",
            muscleLabel: ex ? ex.muscleLabel : "",
          });
        });
      });
      // Newest day first. Within a day the log order is not comparable across exercises, so keep it stable.
      rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.at - a.at) || (b.li - a.li)));
      return rows.slice(0, limit);
    },

    // ===== i18n =====
    t(key) { return tr(key); },
    applyI18n() { applyI18n(); },

    // =========================================================
    // Edit / delete log entries (with undo)
    // Every delete* returns an undo snapshot; pass it to restore(). Deletes
    // are also recorded in s.pendingDeletes so the sync layer can remove the
    // remote row and so a pull can't bring the row back in the meantime.
    // =========================================================
    _tomb(s, list, key) {
      if (!s.pendingDeletes[list].includes(key)) s.pendingDeletes[list].push(key);
    },
    _untomb(s, list, key) {
      s.pendingDeletes[list] = s.pendingDeletes[list].filter((k) => k !== key);
    },
    getPendingDeletes() {
      return load().pendingDeletes;
    },
    clearPendingDeletes(list, keys) {
      const s = load();
      const drop = new Set(keys);
      s.pendingDeletes[list] = s.pendingDeletes[list].filter((k) => !drop.has(k));
      save(s);
    },

    /** Newest first. */
    getWeightEntries() {
      return load().weightLogs.slice().reverse();
    },
    deleteWeightEntry(date) {
      const s = load();
      const entry = s.weightLogs.find((w) => w.date === date);
      if (!entry) return null;
      s.weightLogs = s.weightLogs.filter((w) => w.date !== date);
      this._tomb(s, "weight", date);
      save(s);
      return { kind: "weight", entry: { ...entry } };
    },
    updateWeightEntry(date, weight, bodyFat) {
      const s = load();
      const entry = s.weightLogs.find((w) => w.date === date);
      const w = Number(weight);
      if (!entry || !(w > 0)) return null;
      const before = { ...entry };
      entry.weight = w;
      if (bodyFat !== undefined) entry.bodyFat = bodyFat == null || bodyFat === "" ? null : Number(bodyFat);
      save(s);
      return { kind: "weight-edit", entry: before };
    },

    /** Today and past days that have food entries, newest first, with each item's index. */
    getFoodDays() {
      return load().foodLog.filter((f) => f.items && f.items.length).slice().reverse();
    },
    _recalcFoodDay(day) {
      const sum = (k) => day.items.reduce((a, i) => a + (Number(i[k]) || 0), 0);
      day.totalKcal = Math.round(sum("kcal"));
      day.totalProtein = Math.round(sum("protein") * 10) / 10;
      day.totalCarbs = Math.round(sum("carbs") * 10) / 10;
      day.totalFat = Math.round(sum("fat") * 10) / 10;
    },
    deleteFoodItem(date, index) {
      const s = load();
      const day = s.foodLog.find((f) => f.date === date);
      if (!day || !day.items[index]) return null;
      const item = day.items[index];
      day.items.splice(index, 1);
      if (day.items.length === 0) {
        s.foodLog = s.foodLog.filter((f) => f.date !== date);
        this._tomb(s, "food", date);
      } else {
        this._recalcFoodDay(day);
      }
      save(s);
      return { kind: "food", date, index, item: { ...item } };
    },
    /** Change the grams of one item; kcal/macros scale linearly. */
    updateFoodItemGrams(date, index, grams) {
      const s = load();
      const day = s.foodLog.find((f) => f.date === date);
      const g = Number(grams);
      if (!day || !day.items[index] || !(g > 0)) return null;
      const item = day.items[index];
      const before = { ...item };
      const ratio = item.grams > 0 ? g / item.grams : 1;
      item.grams = g;
      item.kcal = Math.round(item.kcal * ratio);
      item.protein = Math.round(item.protein * ratio * 10) / 10;
      item.carbs = Math.round(item.carbs * ratio * 10) / 10;
      item.fat = Math.round(item.fat * ratio * 10) / 10;
      this._recalcFoodDay(day);
      save(s);
      return { kind: "food-edit", date, index, item: before };
    },

    /** Edit any field of one food item. Validates ranges; returns an undo snapshot or null. */
    updateFoodItem(date, index, patch) {
      const s = load();
      const day = s.foodLog.find((f) => f.date === date);
      if (!day || !day.items[index] || !patch) return null;
      const num = (v, max) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= max ? n : null; };
      const name = String(patch.name ?? "").trim().slice(0, 60);
      const grams = num(patch.grams, 5000), kcal = num(patch.kcal, 5000);
      const protein = num(patch.protein ?? 0, 500), carbs = num(patch.carbs ?? 0, 1000), fat = num(patch.fat ?? 0, 500);
      if (!name || !(grams > 0) || kcal == null || protein == null || carbs == null || fat == null) return null;
      const item = day.items[index];
      const before = { ...item };
      Object.assign(item, { name, grams, kcal: Math.round(kcal), protein: Math.round(protein * 10) / 10, carbs: Math.round(carbs * 10) / 10, fat: Math.round(fat * 10) / 10 });
      this._recalcFoodDay(day);
      save(s);
      return { kind: "food-edit", date, index, item: before };
    },

    /** Flat list of every logged set, newest first. `i` is the index in that exercise's array. */
    getExerciseLogEntries(limit = 200) {
      const s = load();
      const out = [];
      Object.entries(s.exerciseLogs).forEach(([exerciseId, logs]) => {
        const ex = (s.exercises || []).find((e) => e.id === exerciseId);
        logs.forEach((l, i) => out.push({ exerciseId, name: ex ? ex.name : exerciseId, i, ...l }));
      });
      out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.i - a.i));
      return out.slice(0, limit);
    },
    _logKey(exerciseId, l) {
      return `${exerciseId}|${l.date}|${l.weight}|${l.sets}|${l.reps}`;
    },
    deleteExerciseLog(exerciseId, index) {
      const s = load();
      const logs = s.exerciseLogs[exerciseId];
      if (!logs || !logs[index]) return null;
      const [removed] = logs.splice(index, 1);
      if (!logs.length) delete s.exerciseLogs[exerciseId];
      const key = this._logKey(exerciseId, removed);
      // another identical set may remain; only tombstone when none are left
      const stillThere = (s.exerciseLogs[exerciseId] || []).some((l) => this._logKey(exerciseId, l) === key);
      if (!stillThere) this._tomb(s, "exerciseLogs", key);
      // drop the PR this set created, if any
      let removedPR = null;
      const pi = s.prHistory.findIndex((p) => p.exerciseId === exerciseId && p.date === removed.date && p.weight === removed.weight);
      if (pi >= 0 && !stillThere) {
        [removedPR] = s.prHistory.splice(pi, 1);
        this._tomb(s, "prs", `${removedPR.exerciseId}|${removedPR.date}|${removedPR.weight}|${removedPR.prevWeight}`);
      }
      if (removed.xp) {
        this._addXP(s, -25);
        if (s.profile.xpDay && s.profile.xpDay.date === removed.date && s.profile.xpDay.n > 0) s.profile.xpDay.n -= 1;
      }
      save(s);
      return { kind: "exerciseLog", exerciseId, index, log: { ...removed }, pr: removedPR };
    },
    updateExerciseLog(exerciseId, index, { weight, sets, reps }) {
      const s = load();
      const logs = s.exerciseLogs[exerciseId];
      if (!logs || !logs[index]) return null;
      const w = Number(weight), st = Number(sets), r = Number(reps);
      if (!(w >= 0) || !(st > 0) || !(r > 0)) return null;
      const old = { ...logs[index] };
      // delete the old row (tombstoned for sync), then write the new values in place
      const oldKey = this._logKey(exerciseId, old);
      logs[index] = { date: old.date, weight: w, sets: st, reps: r };
      const stillThere = logs.some((l) => this._logKey(exerciseId, l) === oldKey);
      if (!stillThere) this._tomb(s, "exerciseLogs", oldKey);
      this._untomb(s, "exerciseLogs", this._logKey(exerciseId, logs[index]));
      save(s);
      return { kind: "exerciseLog-edit", exerciseId, index, log: old };
    },

    /** Undo anything returned by the delete and update methods above. */
    restore(snap) {
      if (!snap) return false;
      const s = load();
      if (snap.kind === "weight") {
        s.weightLogs.push(snap.entry);
        s.weightLogs.sort((a, b) => (a.date > b.date ? 1 : -1));
        this._untomb(s, "weight", snap.entry.date);
      } else if (snap.kind === "weight-edit") {
        const e = s.weightLogs.find((w) => w.date === snap.entry.date);
        if (e) Object.assign(e, snap.entry);
      } else if (snap.kind === "food") {
        let day = s.foodLog.find((f) => f.date === snap.date);
        if (!day) {
          day = { date: snap.date, items: [], totalKcal: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
          s.foodLog.push(day);
          s.foodLog.sort((a, b) => (a.date > b.date ? 1 : -1));
        }
        day.items.splice(Math.min(snap.index, day.items.length), 0, snap.item);
        this._recalcFoodDay(day);
        this._untomb(s, "food", snap.date);
      } else if (snap.kind === "food-edit") {
        const day = s.foodLog.find((f) => f.date === snap.date);
        if (day && day.items[snap.index]) {
          day.items[snap.index] = snap.item;
          this._recalcFoodDay(day);
        }
      } else if (snap.kind === "exerciseLog") {
        if (!s.exerciseLogs[snap.exerciseId]) s.exerciseLogs[snap.exerciseId] = [];
        const arr = s.exerciseLogs[snap.exerciseId];
        arr.splice(Math.min(snap.index, arr.length), 0, snap.log);
        if (snap.log.xp) {
          this._addXP(s, 25);
          if (s.profile.xpDay && s.profile.xpDay.date === snap.log.date) s.profile.xpDay.n += 1;
        }
        this._untomb(s, "exerciseLogs", this._logKey(snap.exerciseId, snap.log));
        if (snap.pr) {
          s.prHistory.push(snap.pr);
          s.prHistory.sort((a, b) => (a.date < b.date ? 1 : -1));
          this._untomb(s, "prs", `${snap.pr.exerciseId}|${snap.pr.date}|${snap.pr.weight}|${snap.pr.prevWeight}`);
        }
      } else if (snap.kind === "exerciseLog-edit") {
        const arr = s.exerciseLogs[snap.exerciseId];
        if (arr && arr[snap.index]) {
          const cur = arr[snap.index];
          arr[snap.index] = snap.log;
          this._untomb(s, "exerciseLogs", this._logKey(snap.exerciseId, snap.log));
          const curKey = this._logKey(snap.exerciseId, cur);
          if (!arr.some((l) => this._logKey(snap.exerciseId, l) === curKey)) this._tomb(s, "exerciseLogs", curKey);
        }
      } else return false;
      save(s);
      return true;
    },

    // ===== Danger zone =====
    resetAllData() {
      const fresh = defaultState();
      save(fresh);
      return fresh;
    },

    // =========================================================
    // Sync support (Phase 3) — additive only. Nothing above this
    // line was touched to build these; they read/write the same
    // `state` shape via the same load()/save() the rest of the
    // store already uses.
    // =========================================================

    /** Subscribe to local writes. Returns an unsubscribe function. */
    onChange(fn) {
      changeListeners.add(fn);
      return () => changeListeners.delete(fn);
    },

    /** Sprint 3: explicit escape hatch to force the next read to re-parse
        from localStorage instead of serving the in-memory cache. Not
        needed by any normal flow (every mutation already goes through
        save(), which keeps the cache correct) — this exists so any future
        exceptional case has one documented place to invalidate, instead of
        resetting cache state ad hoc elsewhere in the codebase. */
    invalidateCache() {
      cachedState = null;
    },

    /** True if there's nothing a first-login migration would need to upload. */
    isLocalDataEmpty() {
      const s = load();
      return (
        !s.weightLogs.length &&
        !s.foodLog.length &&
        Object.keys(s.exerciseLogs).length === 0 &&
        !s.prHistory.length &&
        !s.workoutDays.length &&
        s.exercises.length === SEED_EXERCISES.length &&
        !s.profile.name && !s.profile.username && !s.profile.bio
      );
    },

    /** Raw local state for the sync engine to read — push-shaping happens in sync/domains.js, not here. */
    getRawStateForSync() {
      return load();
    },

    // --- Merge (pull direction) ---------------------------------------
    // Profile/weight/food: server is authoritative once fetched (push
    // always runs before pull in the sync cycle — see syncManager.js —
    // so by the time we merge, any local edit has already been sent).
    // Exercise logs/PRs/workout days: union merge, keyed by the
    // deterministic id the sync layer computed for each local row.

    mergeProfileFromRemote(remote) {
      if (!remote) return;
      const s = load();
      s.profile.name = remote.name ?? s.profile.name;
      s.profile.username = remote.username ?? s.profile.username;
      s.profile.bio = remote.bio ?? s.profile.bio;
      s.profile.avatar = remote.avatar ?? s.profile.avatar;
      s.profile.cover = remote.cover ?? s.profile.cover;
      s.profile.coverGradient = remote.cover_gradient ?? s.profile.coverGradient;
      s.profile.gender = remote.gender ?? s.profile.gender;
      s.profile.heightCm = remote.height_cm ?? s.profile.heightCm;
      s.profile.level = remote.level ?? s.profile.level;
      s.profile.xp = remote.xp ?? s.profile.xp;
      s.profile.xpNext = remote.xp_next ?? s.profile.xpNext;
      s.goalWeight = remote.goal_weight ?? s.goalWeight;
      s.activeProgramId = remote.active_program_id ?? s.activeProgramId;
      s.bestStreak = Math.max(s.bestStreak, remote.best_streak ?? 0);
      s.settings.unit = remote.unit ?? s.settings.unit;
      s.settings.lang = remote.lang ?? s.settings.lang;
      s.settings.notifEnabled = remote.notif_enabled ?? s.settings.notifEnabled;
      s.settings.notifTime = remote.notif_time ?? s.settings.notifTime;
      save(s);
    },

    mergeWeightLogsFromRemote(remoteRows) {
      const s = load();
      const byDate = new Map(s.weightLogs.map((w) => [w.date, w]));
      const gone = new Set(s.pendingDeletes.weight);
      remoteRows.forEach((r) => {
        if (gone.has(r.date)) return; // deleted locally, delete not yet confirmed remotely
        byDate.set(r.date, { date: r.date, weight: Number(r.weight), bodyFat: r.body_fat != null ? Number(r.body_fat) : null });
      });
      s.weightLogs = Array.from(byDate.values()).sort((a, b) => (a.date > b.date ? 1 : -1));
      save(s);
    },

    mergeFoodLogFromRemote(remoteRows) {
      const s = load();
      const byDate = new Map(s.foodLog.map((f) => [f.date, f]));
      const gone = new Set(s.pendingDeletes.food);
      remoteRows.forEach((r) => {
        if (gone.has(r.date)) return;
        byDate.set(r.date, {
          date: r.date, items: r.items || [],
          totalKcal: Number(r.total_kcal) || 0, totalProtein: Number(r.total_protein) || 0,
          totalCarbs: Number(r.total_carbs) || 0, totalFat: Number(r.total_fat) || 0,
        });
      });
      s.foodLog = Array.from(byDate.values()).sort((a, b) => (a.date > b.date ? 1 : -1));
      save(s);
    },

    /** Custom exercise ids deleted locally but not yet confirmed deleted on the server. */
    getDeletedExerciseIds() {
      return load().deletedExerciseIds || [];
    },

    /** Called by the sync layer once a tombstoned id's remote row is actually gone. */
    clearDeletedExerciseId(id) {
      const s = load();
      s.deletedExerciseIds = (s.deletedExerciseIds || []).filter((x) => x !== id);
      save(s);
    },

    mergeExercisesFromRemote(remoteRows) {
      const s = load();
      const tombstoned = new Set(s.deletedExerciseIds || []);
      const byId = new Map(s.exercises.map((e) => [e.id, e]));
      remoteRows.forEach((r) => {
        if (tombstoned.has(r.id)) return; // deleted locally, not yet pushed/confirmed — don't resurrect it
        const meta = this.getMuscleMeta(r.muscle);
        byId.set(r.id, { id: r.id, name: r.name, muscle: r.muscle, muscleLabel: meta.label, secondary: r.secondary || "", sets: r.sets, reps: r.reps, custom: true });
      });
      s.exercises = Array.from(byId.values());
      save(s);
    },

    /** Union-merge by content match (exerciseId+date+weight+sets+reps) — local
        entries never carried an id (see the original shape in defaultState()),
        so dedup compares content, not a stored key. The id<->row mapping only
        exists in the sync layer (deterministic, derived from this same content),
        never in local storage — see src/lib/sync/domains.js. */
    mergeExerciseLogsFromRemote(remoteRows) {
      const s = load();
      const seen = new Set();
      Object.entries(s.exerciseLogs).forEach(([exId, arr]) => {
        arr.forEach((l) => seen.add(`${exId}|${l.date}|${l.weight}|${l.sets}|${l.reps}`));
      });
      const gone = new Set(s.pendingDeletes.exerciseLogs);
      remoteRows.forEach((r) => {
        const key = `${r.exercise_id}|${r.date}|${r.weight}|${r.sets}|${r.reps}`;
        if (gone.has(key)) return;
        if (seen.has(key)) return;
        seen.add(key);
        if (!s.exerciseLogs[r.exercise_id]) s.exerciseLogs[r.exercise_id] = [];
        s.exerciseLogs[r.exercise_id].push({ date: r.date, weight: Number(r.weight), sets: r.sets, reps: r.reps });
        s.exerciseLogs[r.exercise_id].sort((a, b) => (a.date > b.date ? 1 : -1));
        this._markWorkoutDay(s, r.date);
      });
      save(s);
    },

    mergePRHistoryFromRemote(remoteRows) {
      const s = load();
      const seen = new Set(s.prHistory.map((p) => `${p.exerciseId}|${p.date}|${p.weight}|${p.prevWeight}`));
      const gone = new Set(s.pendingDeletes.prs);
      remoteRows.forEach((r) => {
        const key = `${r.exercise_id}|${r.date}|${r.weight}|${r.prev_weight}`;
        if (gone.has(key)) return;
        if (seen.has(key)) return;
        seen.add(key);
        s.prHistory.push({ exerciseId: r.exercise_id, exerciseName: r.exercise_name, weight: Number(r.weight), prevWeight: Number(r.prev_weight), date: r.date });
      });
      s.prHistory.sort((a, b) => (a.date < b.date ? 1 : -1));
      save(s);
    },

    mergeWorkoutDaysFromRemote(remoteDates) {
      const s = load();
      const existing = new Set(s.workoutDays);
      remoteDates.forEach((d) => existing.add(d));
      s.workoutDays = Array.from(existing).sort();
      save(s);
    },
  };

export const GymakStore = Store;
export default Store;
