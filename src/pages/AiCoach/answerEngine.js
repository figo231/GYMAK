import Store from "../../lib/store/gymakStore";
import { fmt } from "../../lib/format";
import { setsRepsFull } from "../../lib/exerciseMeta";
import { tx, txf } from "../../lib/i18n/tx";

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function welcomeMessage() {
  const streak = Store.getStreak();
  const progress = Store.getStrengthProgress(1)[0];
  const profile = Store.getProfile();
  const namePart = profile.name ? txf(`يا {0}`, [profile.name]) : "";
  if (streak >= 3 && progress) {
    return txf(`أهلاً {0}! مكمّل {1} يوم متتالي، وقوتك في {2} زادت من {3} لـ {4} كجم. حابب أساعدك في إيه النهاردة؟`, [namePart, streak, progress.name, progress.from, progress.to]);
  }
  if (streak >= 1) {
    return txf(`أهلاً {0}! مكمّل {1} يوم متتالي، استمر كده. حابب أساعدك في إيه؟`, [namePart, streak]);
  }
  return txf(`أهلاً {0}! دوّن أول تمرين أو وزن عشان أقدر أحلل تقدمك وأساعدك أكتر. حابب أساعدك في إيه؟`, [namePart]);
}

function findExerciseByName(text) {
  const all = Store.getExercises();
  const norm = (s) => s.toLowerCase().trim();
  return all.find((ex) => norm(text).includes(norm(ex.name))) || null;
}

/**
 * Pure-ish answer engine. The one original branch that needed window.prompt()
 * (goal weight) is handled by the caller: if this function returns the special
 * { needsGoalPrompt: true } marker, AiCoach.jsx opens the async dialog and
 * calls resolveGoalAnswer() with the result.
 */
export function answerFor(q) {
  const text = q.toLowerCase().trim();
  const profile = Store.getProfile();

  if (/^(أهلا|اهلا|هاي|هلا|صباح|مساء|hi|hello)/.test(text)) {
    return pick([
      tx("أهلاً بيك! جاهز نشتغل على تمرينك النهاردة؟"),
      tx("هاي! حابب أساعدك في البرنامج، الأكل، ولا تحليل تقدمك؟"),
    ]);
  }
  if (text.includes("شكرا") || text.includes("متشكر") || text.includes("thanks")) {
    return tx("العفو! أنا موجود أي وقت محتاجني، كمّل كده 💪");
  }

  // Matches the user's typed Arabic - keep raw, never translate.
  const foodTriggerWords = ["سعرات", "احسب", "إحسب", "اكلت", "أكلت", "هاكل", "فطار", "فطاري", "غدا", "غدائي", "عشا", "عشائي", "وجبة", "كام سعرة"];
  const hasFoodTrigger = foodTriggerWords.some((w) => text.includes(w));
  const foodItems = Store.parseFood(q);
  if (hasFoodTrigger || foodItems.length >= 2) {
    if (!foodItems.length) {
      return tx('اكتبلي الأكلات بوضوح زي: "فطاري 2 بيضة ورغيف عيش بلدي وكوب لبن" وأنا هحسبلك السعرات والبروتين تلقائي.');
    }
    const dayEntry = Store.logFoodEntries(foodItems);
    const target = Store.getDailyCalorieTarget();
    const breakdown = foodItems.map((it) => txf(`• {0} ({1}جم) — {2} سعرة`, [Store.foodDisplayName(it.name), it.grams, it.kcal])).join("\n");
    const mealKcal = foodItems.reduce((a, i) => a + i.kcal, 0);
    let msg = txf(`حسبتلك الوجبة دي:\n{0}\n\nإجمالي الوجبة: {1} سعرة (بروتين {2} جم)\n\nإجمالي سعراتك النهاردة: {3} سعرة`, [breakdown, mealKcal, foodItems.reduce((a, i) => a + i.protein, 0).toFixed(1), dayEntry.totalKcal]);
    if (target) {
      const remaining = target - dayEntry.totalKcal;
      msg += remaining >= 0 ? txf(` من أصل {0} — باقيلك {1} سعرة.`, [target, remaining]) : txf(` من أصل {0} — زودت {1} سعرة عن هدفك.`, [target, Math.abs(remaining)]);
    } else {
      msg += tx(`. سجّل وزنك من الصفحة الرئيسية عشان أقدرلك أحدد هدف سعرات يومي دقيق.`);
    }
    return msg;
  }

  const foundEx = findExerciseByName(text);
  if (foundEx && (text.includes("ازاي") || text.includes("طريقة") || text.includes("إزاي") || text.includes("اداء") || text.includes("أداء"))) {
    const last = Store.getLastExerciseLog(foundEx.id);
    let msg = txf(`{0} بيستهدف {1}{2}. الرينج المقترح {3}.`, [foundEx.name, foundEx.muscleLabel, foundEx.secondary ? " ومعاه " + foundEx.secondary : "", setsRepsFull(foundEx)]);
    if (last) msg += txf(` آخر مرة سجلت {0} كجم بـ {1}.`, [last.weight, setsRepsFull(foundEx, last.sets, last.reps)]);
    msg += tx(" تقدر تشوف خطوات الأداء بالتفصيل في صفحة التمرين نفسه.");
    return msg;
  }

  if (text.includes("برنامج")) {
    const active = Store.getActiveProgram();
    if (active) return txf(`عندك حاليًا برنامج {0} مطبّق ({1}). لو عايز تغيّره ادخل على "برامج التدريب الجاهزة" من صفحة حسابي.`, [active.name, active.daysPerWeek]);
    const recId = Store.getRecommendedProgramId();
    const recProg = recId ? Store.getPrograms().find((p) => p.id === recId) : null;
    if (recProg) return txf(`لسه ما اخترتش برنامج. بناءً على بياناتك أقترحلك تجرب "{0}" ({1})، تقدر تطبّقه من "برامج التدريب الجاهزة" في صفحة حسابي.`, [recProg.name, recProg.daysPerWeek]);
    return tx(`لسه ما اخترتش برنامج تدريب. تقدر تختار واحد من "برامج التدريب الجاهزة" في صفحة حسابي حسب مستواك وعدد أيامك المتاحة.`);
  }

  if (text.includes("أكل") || text.includes("اكل") || text.includes("غذائ") || text.includes("تغذية") || text.includes("بروتين") || text.includes("دايت")) {
    const latest = Store.getLatestWeight();
    if (latest) {
      const protein = Math.round(latest.weight * 1.8);
      const cutting = text.includes("تنشيف") || text.includes("خس") || text.includes("نزل وزن");
      const bulking = text.includes("تضخيم") || text.includes("زياد") || text.includes("بلك");
      let extra = "";
      if (cutting) extra = tx(" ولو هدفك تنشيف، خلي عجز السعرات معقول (300-500 سعرة تحت احتياجك) عشان محتفظش بالعضل.");
      if (bulking) extra = tx(" ولو هدفك تضخيم، زوّد 250-400 سعرة فوق احتياجك مع تدريب مقاومة منتظم.");
      return txf(`بوزنك الحالي ({0} كجم)، هدف بروتين معقول يوميًا حوالي {1} جم. وزّعه على 3-4 وجبات، وخلي الكارب حوالين وقت التمرين.{2}`, [fmt(latest.weight), protein, extra]);
    }
    return tx("سجّل وزنك الأول من الصفحة الرئيسية عشان أقدر أحسبلك احتياجك من البروتين بدقة.");
  }

  if (text.includes("وجع") || text.includes("ألم") || text.includes("الم ") || text.includes("إصاب") || text.includes("اصاب")) {
    return tx("لو حاسس بألم فعلي (مش مجرد تعب عضلي عادي)، وقف التمرين اللي بيوجعك فورًا ولا تكمل عليه. الراحة والثلج بيساعدوا في أول 48 ساعة، ولو الألم استمر أو كان قوي، لازم تشوف دكتور عظام أو مختص علاج طبيعي بدل ما تكمل تمرين. أنا مش بديل عن استشارة طبية.");
  }

  if (text.includes("كسل") || text.includes("مش قادر") || text.includes("تعبان") || text.includes("motivation") || text.includes("مش عايز اكمل")) {
    const streak = Store.getStreak();
    if (streak >= 1) return txf(`إنت فعلاً مكمّل {0} يوم متتالي، متكسرش السلسلة دلوقتي. جرب تمرين خفيف اليوم بدل ما تسيبه خالص، أحسن من إنك توقف كليًا.`, [streak]);
    return tx("كل بطل بدأ بيوم واحد بس. مش لازم تمرين قوي، ابدأ بربع ساعة بسيطة وسجلها هنا، وهتلاقي نفسك عايز تكمل.");
  }

  if (text.includes("نوم") || text.includes("راحة") || text.includes("recovery")) {
    return tx("النوم من أهم عوامل بناء العضل — حاول تاخد 7-8 ساعات، وخلي بين كل تمرين لنفس العضلة يوم أو يومين راحة على الأقل عشان تسترجع صح.");
  }

  if (text.includes("حلل") || text.includes("تقدم") || text.includes("إحصائ") || text.includes("احصائ")) {
    const streak = Store.getStreak();
    const best = Store.getBestStreak();
    const tonnage = Math.round(Store.getTonnage(30));
    const top = Store.getStrengthProgress(1)[0];
    const bmi = Store.getBMI();
    let msg = txf(`ستريكك الحالي {0} يوم (أعلى رقم {1}). إجمالي الأوزان المرفوعة آخر 30 يوم: {2} كجم.`, [streak, best, fmt(tonnage)]);
    if (top) msg += txf(` أكتر تمرين تحسّن فيه: {0} ({1}{2}%).`, [top.name, top.pct > 0 ? "+" : "", top.pct]);
    if (bmi) msg += txf(` مؤشر كتلة جسمك حاليًا {0}.`, [bmi]);
    return msg;
  }

  if (text.includes("هدف")) {
    return { needsGoalPrompt: true };
  }

  if (text.includes("وزن")) {
    const diff = Store.getWeightDiffOverDays(7);
    if (diff) return txf(`وزنك اتغيّر {0}{1} كجم آخر أسبوع (من {2} لـ {3}).`, [diff.diff > 0 ? "+" : "", diff.diff, diff.from, diff.to]);
    return tx("سجّل وزنك أكتر من مرة عشان أقدر أتابع تغيّره معاك.");
  }

  if (text.includes("انجاز") || text.includes("إنجاز") || text.includes("مستوى") || text.includes("لفل") || text.includes("level")) {
    const ach = Store.getAchievements();
    const unlocked = ach.filter((a) => a.unlocked).length;
    return txf(`فاتح {0} من {1} إنجاز لحد دلوقتي، وإنت في المستوى {2}. كمّل تسجيل تمارينك عشان تفتح الباقي.`, [unlocked, ach.length, profile.level]);
  }

  return pick([
    tx("تقدر تسألني عن: البرنامج، النصايح الغذائية، تحليل تقدمك، تعديل هدف الوزن، أو حتى ازاي تأدي تمرين معين."),
    tx("أنا هنا أساعدك في التمرين، الأكل، أو أي سؤال عن تقدمك — قولي محتاج إيه بالظبط؟"),
  ]);
}

/** Called after the async goal-weight dialog resolves, to produce the same text the original returned post-prompt(). */
export function resolveGoalAnswer(val) {
  if (val && !isNaN(parseFloat(val))) {
    Store.setGoalWeight(parseFloat(val));
    return txf(`تمام، هدفك الجديد هو {0} كجم. هتلاقيه محدث في الصفحة الرئيسية.`, [fmt(parseFloat(val))]);
  }
  return tx("محدّش أي تغيير في الهدف.");
}
