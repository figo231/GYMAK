import Store from "../../lib/store/gymakStore";
import { fmt } from "../../lib/format";

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function welcomeMessage() {
  const streak = Store.getStreak();
  const progress = Store.getStrengthProgress(1)[0];
  const profile = Store.getProfile();
  const namePart = profile.name ? `يا ${profile.name}` : "";
  if (streak >= 3 && progress) {
    return `أهلاً ${namePart}! مكمّل ${streak} يوم متتالي، وقوتك في ${progress.name} زادت من ${progress.from} لـ ${progress.to} كجم. حابب أساعدك في إيه النهاردة؟`;
  }
  if (streak >= 1) {
    return `أهلاً ${namePart}! مكمّل ${streak} يوم متتالي، استمر كده. حابب أساعدك في إيه؟`;
  }
  return `أهلاً ${namePart}! دوّن أول تمرين أو وزن عشان أقدر أحلل تقدمك وأساعدك أكتر. حابب أساعدك في إيه؟`;
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
      "أهلاً بيك! جاهز نشتغل على تمرينك النهاردة؟",
      "هاي! حابب أساعدك في البرنامج، الأكل، ولا تحليل تقدمك؟",
    ]);
  }
  if (text.includes("شكرا") || text.includes("متشكر") || text.includes("thanks")) {
    return "العفو! أنا موجود أي وقت محتاجني، كمّل كده 💪";
  }

  const foodTriggerWords = ["سعرات", "احسب", "إحسب", "اكلت", "أكلت", "هاكل", "فطار", "فطاري", "غدا", "غدائي", "عشا", "عشائي", "وجبة", "كام سعرة"];
  const hasFoodTrigger = foodTriggerWords.some((w) => text.includes(w));
  const foodItems = Store.parseFood(q);
  if (hasFoodTrigger || foodItems.length >= 2) {
    if (!foodItems.length) {
      return 'اكتبلي الأكلات بوضوح زي: "فطاري 2 بيضة ورغيف عيش بلدي وكوب لبن" وأنا هحسبلك السعرات والبروتين تلقائي.';
    }
    const dayEntry = Store.logFoodEntries(foodItems);
    const target = Store.getDailyCalorieTarget();
    const breakdown = foodItems.map((it) => `• ${it.name} (${it.grams}جم) — ${it.kcal} سعرة`).join("\n");
    const mealKcal = foodItems.reduce((a, i) => a + i.kcal, 0);
    let msg = `حسبتلك الوجبة دي:\n${breakdown}\n\nإجمالي الوجبة: ${mealKcal} سعرة (بروتين ${foodItems.reduce((a, i) => a + i.protein, 0).toFixed(1)} جم)\n\nإجمالي سعراتك النهاردة: ${dayEntry.totalKcal} سعرة`;
    if (target) {
      const remaining = target - dayEntry.totalKcal;
      msg += remaining >= 0 ? ` من أصل ${target} — باقيلك ${remaining} سعرة.` : ` من أصل ${target} — زودت ${Math.abs(remaining)} سعرة عن هدفك.`;
    } else {
      msg += `. سجّل وزنك من الصفحة الرئيسية عشان أقدرلك أحدد هدف سعرات يومي دقيق.`;
    }
    return msg;
  }

  const foundEx = findExerciseByName(text);
  if (foundEx && (text.includes("ازاي") || text.includes("طريقة") || text.includes("إزاي") || text.includes("اداء") || text.includes("أداء"))) {
    const last = Store.getLastExerciseLog(foundEx.id);
    let msg = `${foundEx.name} بيستهدف ${foundEx.muscleLabel}${foundEx.secondary ? " ومعاه " + foundEx.secondary : ""}. الرينج المقترح ${foundEx.sets}×${foundEx.reps}.`;
    if (last) msg += ` آخر مرة سجلت ${last.weight} كجم بـ ${last.sets}×${last.reps}.`;
    msg += " تقدر تشوف خطوات الأداء بالتفصيل في صفحة التمرين نفسه.";
    return msg;
  }

  if (text.includes("برنامج")) {
    const active = Store.getActiveProgram();
    if (active) return `عندك حاليًا برنامج ${active.name} مطبّق (${active.daysPerWeek}). لو عايز تغيّره ادخل على "برامج التدريب الجاهزة" من صفحة حسابي.`;
    const recId = Store.getRecommendedProgramId();
    const recProg = recId ? Store.getPrograms().find((p) => p.id === recId) : null;
    if (recProg) return `لسه ما اخترتش برنامج. بناءً على بياناتك أقترحلك تجرب "${recProg.name}" (${recProg.daysPerWeek})، تقدر تطبّقه من "برامج التدريب الجاهزة" في صفحة حسابي.`;
    return `لسه ما اخترتش برنامج تدريب. تقدر تختار واحد من "برامج التدريب الجاهزة" في صفحة حسابي حسب مستواك وعدد أيامك المتاحة.`;
  }

  if (text.includes("أكل") || text.includes("اكل") || text.includes("غذائ") || text.includes("تغذية") || text.includes("بروتين") || text.includes("دايت")) {
    const latest = Store.getLatestWeight();
    if (latest) {
      const protein = Math.round(latest.weight * 1.8);
      const cutting = text.includes("تنشيف") || text.includes("خس") || text.includes("نزل وزن");
      const bulking = text.includes("تضخيم") || text.includes("زياد") || text.includes("بلك");
      let extra = "";
      if (cutting) extra = " ولو هدفك تنشيف، خلي عجز السعرات معقول (300-500 سعرة تحت احتياجك) عشان محتفظش بالعضل.";
      if (bulking) extra = " ولو هدفك تضخيم، زوّد 250-400 سعرة فوق احتياجك مع تدريب مقاومة منتظم.";
      return `بوزنك الحالي (${fmt(latest.weight)} كجم)، هدف بروتين معقول يوميًا حوالي ${protein} جم. وزّعه على 3-4 وجبات، وخلي الكارب حوالين وقت التمرين.${extra}`;
    }
    return "سجّل وزنك الأول من الصفحة الرئيسية عشان أقدر أحسبلك احتياجك من البروتين بدقة.";
  }

  if (text.includes("وجع") || text.includes("ألم") || text.includes("الم ") || text.includes("إصاب") || text.includes("اصاب")) {
    return "لو حاسس بألم فعلي (مش مجرد تعب عضلي عادي)، وقف التمرين اللي بيوجعك فورًا ولا تكمل عليه. الراحة والثلج بيساعدوا في أول 48 ساعة، ولو الألم استمر أو كان قوي، لازم تشوف دكتور عظام أو مختص علاج طبيعي بدل ما تكمل تمرين. أنا مش بديل عن استشارة طبية.";
  }

  if (text.includes("كسل") || text.includes("مش قادر") || text.includes("تعبان") || text.includes("motivation") || text.includes("مش عايز اكمل")) {
    const streak = Store.getStreak();
    if (streak >= 1) return `إنت فعلاً مكمّل ${streak} يوم متتالي، متكسرش السلسلة دلوقتي. جرب تمرين خفيف اليوم بدل ما تسيبه خالص، أحسن من إنك توقف كليًا.`;
    return "كل بطل بدأ بيوم واحد بس. مش لازم تمرين قوي، ابدأ بربع ساعة بسيطة وسجلها هنا، وهتلاقي نفسك عايز تكمل.";
  }

  if (text.includes("نوم") || text.includes("راحة") || text.includes("recovery")) {
    return "النوم من أهم عوامل بناء العضل — حاول تاخد 7-8 ساعات، وخلي بين كل تمرين لنفس العضلة يوم أو يومين راحة على الأقل عشان تسترجع صح.";
  }

  if (text.includes("حلل") || text.includes("تقدم") || text.includes("إحصائ") || text.includes("احصائ")) {
    const streak = Store.getStreak();
    const best = Store.getBestStreak();
    const tonnage = Math.round(Store.getTonnage(30));
    const top = Store.getStrengthProgress(1)[0];
    const bmi = Store.getBMI();
    let msg = `ستريكك الحالي ${streak} يوم (أعلى رقم ${best}). إجمالي الأوزان المرفوعة آخر 30 يوم: ${fmt(tonnage)} كجم.`;
    if (top) msg += ` أكتر تمرين تحسّن فيه: ${top.name} (${top.pct > 0 ? "+" : ""}${top.pct}%).`;
    if (bmi) msg += ` مؤشر كتلة جسمك حاليًا ${bmi}.`;
    return msg;
  }

  if (text.includes("هدف")) {
    return { needsGoalPrompt: true };
  }

  if (text.includes("وزن")) {
    const diff = Store.getWeightDiffOverDays(7);
    if (diff) return `وزنك اتغيّر ${diff.diff > 0 ? "+" : ""}${diff.diff} كجم آخر أسبوع (من ${diff.from} لـ ${diff.to}).`;
    return "سجّل وزنك أكتر من مرة عشان أقدر أتابع تغيّره معاك.";
  }

  if (text.includes("انجاز") || text.includes("إنجاز") || text.includes("مستوى") || text.includes("لفل") || text.includes("level")) {
    const ach = Store.getAchievements();
    const unlocked = ach.filter((a) => a.unlocked).length;
    return `فاتح ${unlocked} من ${ach.length} إنجاز لحد دلوقتي، وإنت في المستوى ${profile.level}. كمّل تسجيل تمارينك عشان تفتح الباقي.`;
  }

  return pick([
    "تقدر تسألني عن: البرنامج، النصايح الغذائية، تحليل تقدمك، تعديل هدف الوزن، أو حتى ازاي تأدي تمرين معين.",
    "أنا هنا أساعدك في التمرين، الأكل، أو أي سؤال عن تقدمك — قولي محتاج إيه بالظبط؟",
  ]);
}

/** Called after the async goal-weight dialog resolves, to produce the same text the original returned post-prompt(). */
export function resolveGoalAnswer(val) {
  if (val && !isNaN(parseFloat(val))) {
    Store.setGoalWeight(parseFloat(val));
    return `تمام، هدفك الجديد هو ${fmt(parseFloat(val))} كجم. هتلاقيه محدث في الصفحة الرئيسية.`;
  }
  return "محدّش أي تغيير في الهدف.";
}
