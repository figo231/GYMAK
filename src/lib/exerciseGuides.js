import { GYM_EXPANSION_MORE_GUIDES } from "./exerciseGuidesGymExpansionMore";
import {GYM_EXPANSION_GUIDES} from "./exerciseGuidesGymExpansion";
import { APK23_WOMEN_STEP_WALL_SIDE_GUIDES } from "./exerciseGuidesApk23WomenStepWallSide";
import { APK23_WOMEN_INNER_PUMP_CURTSY_GUIDES } from "./exerciseGuidesApk23WomenInnerPumpCurtsy";
import { APK23_WOMEN_LOADED_LEG_GUIDES } from "./exerciseGuidesApk23WomenLoadedLeg";
import { APK23_WOMEN_FLOOR_HIP_GUIDES } from "./exerciseGuidesApk23WomenFloorHip";
import { APK23_PULL_KICK_SKILL_GUIDES } from "./exerciseGuidesApk23PullKickSkill";
import { APK23_CABLE_SHOULDER_GUIDES } from "./exerciseGuidesApk23CableShoulder";
import { APK23_CROSS_DIP_TBAR_GUIDES } from "./exerciseGuidesApk23CrossDipTbar";
import { APK23_HANG_CRUNCH_WRIST_GUIDES } from "./exerciseGuidesApk23HangCrunchWrist";
import { APK23_UPRIGHT_PUSH_GUIDES } from "./exerciseGuidesApk23UprightPush";
import { APK23_CRUNCH_VARIANT_GUIDES } from "./exerciseGuidesApk23CrunchVariants";
import { APK23_MACHINE_CABLE_CURL_GUIDES } from "./exerciseGuidesApk23MachineCableCurl";
import { APK23_DIP_GUIDES } from "./exerciseGuidesApk23Dips";
import { APK23_CABLE_FLY_GUIDES } from "./exerciseGuidesApk23CableFly";
import { APK23_DEADLIFT_VARIANT_GUIDES } from "./exerciseGuidesApk23DeadliftVariants";
import { APK23_POSTERIOR_CONTROL_GUIDES } from "./exerciseGuidesApk23PosteriorControl";
import { APK23_CARRY_ROLL_CHOP_GUIDES } from "./exerciseGuidesApk23CarryRollChop";
import { APK23_FLOOR_CORE_GUIDES } from "./exerciseGuidesApk23FloorCore";
import { APK23_SMITH_WIDE_GUIDES } from "./exerciseGuidesApk23SmithWide";
import { APK23_PRESS_VARIANT_GUIDES } from "./exerciseGuidesApk23PressVariants";
import { APK23_ROW_VARIANT_GUIDES } from "./exerciseGuidesApk23RowVariants";
import { APK23_SEATED_SHRUG_GUIDES } from "./exerciseGuidesApk23SeatedShrug";
import { APK23_HIP_CALF_GUIDES } from "./exerciseGuidesApk23HipCalf";
import { APK23_HACK_CALF_GUIDES } from "./exerciseGuidesApk23HackCalf";
import { APK23_LUNGE_GUIDES } from "./exerciseGuidesApk23Lunges";
import { APK23_SHOULDER_SUPPORT_GUIDES } from "./exerciseGuidesApk23ShoulderSupport";
import { APK23_CURL_VARIATION_GUIDES } from "./exerciseGuidesApk23CurlVariations";
import { APK23_CABLE_TRICEPS_GUIDES } from "./exerciseGuidesApk23CableTriceps";
import { APK23_CURL_REVERSE_GUIDES } from "./exerciseGuidesApk23CurlReverse";
import { APK23_MACHINE_PULL_GUIDES } from "./exerciseGuidesApk23MachinePull";
import { APK23_SQUAT_BRIDGE_GUIDES } from "./exerciseGuidesApk23SquatBridge";
import { APK23_PUSHUP_GUIDES } from "./exerciseGuidesApk23Pushups";
import { APK23_STABILITY_GUIDES } from "./exerciseGuidesApk23Stability";
import { APK23_LOWER_GUIDES } from "./exerciseGuidesApk23Lower";
import { APK23_TRICEPS_GUIDES } from "./exerciseGuidesApk23Triceps";
import { APK23_SUPPORTED_GUIDES } from "./exerciseGuidesApk23Supported";
import { APK23_CURL_GUIDES } from "./exerciseGuidesApk23Curls";
import { APK23_UPPER_GUIDES } from "./exerciseGuidesApk23Upper";
import { APK23_CORE_GUIDES } from "./exerciseGuidesApk23Core";
import { APK23_LEG_GUIDES } from "./exerciseGuidesApk23Legs";
import { APK23_PULL_GUIDES } from "./exerciseGuidesApk23Pull";
import { WOMEN_GYM_GUIDES } from "./exerciseGuidesWomenGym";
import { WOMEN_GUIDES } from "./exerciseGuidesWomen";
import { PRESS_GUIDES } from "./exerciseGuidesBatch4";
import { THIRD_GUIDES } from "./exerciseGuidesBatch3";
import { SECOND_GUIDES } from "./exerciseGuidesBatch2";
import { BASIC_GUIDES } from "./exerciseGuidesBatch1";
// Source-grounded coaching copy. Only built-in exercises use this layer;
// saved custom descriptions and instructions always win in the detail page.
// Technique reference: https://www.acefitness.org/certifiednewsarticle/3003/what-are-the-top-3-most-effective-chest-exercises/
export const EXERCISE_GUIDES = {
...GYM_EXPANSION_GUIDES,
  ...GYM_EXPANSION_MORE_GUIDES,
  ...APK23_WOMEN_STEP_WALL_SIDE_GUIDES,
  ...APK23_WOMEN_INNER_PUMP_CURTSY_GUIDES,
  ...APK23_WOMEN_LOADED_LEG_GUIDES,
  ...APK23_WOMEN_FLOOR_HIP_GUIDES,
  ...APK23_PULL_KICK_SKILL_GUIDES,
  ...APK23_CABLE_SHOULDER_GUIDES,
  ...APK23_CROSS_DIP_TBAR_GUIDES,
  ...APK23_HANG_CRUNCH_WRIST_GUIDES,
  ...APK23_UPRIGHT_PUSH_GUIDES,
  ...APK23_CRUNCH_VARIANT_GUIDES,
  ...APK23_MACHINE_CABLE_CURL_GUIDES,
  ...APK23_DIP_GUIDES,
  ...APK23_CABLE_FLY_GUIDES,
  ...APK23_DEADLIFT_VARIANT_GUIDES,
  ...APK23_POSTERIOR_CONTROL_GUIDES,
  ...APK23_CARRY_ROLL_CHOP_GUIDES,
  ...APK23_FLOOR_CORE_GUIDES,
  ...APK23_SMITH_WIDE_GUIDES,
  ...APK23_PRESS_VARIANT_GUIDES,
  ...APK23_ROW_VARIANT_GUIDES,
  ...APK23_SEATED_SHRUG_GUIDES,
  ...APK23_HIP_CALF_GUIDES,
  ...APK23_HACK_CALF_GUIDES,
  ...APK23_LUNGE_GUIDES,
  ...APK23_SHOULDER_SUPPORT_GUIDES,
  ...APK23_CURL_VARIATION_GUIDES,
  ...APK23_CABLE_TRICEPS_GUIDES,
  ...APK23_CURL_REVERSE_GUIDES,
  ...APK23_MACHINE_PULL_GUIDES,
  ...APK23_SQUAT_BRIDGE_GUIDES,
  ...APK23_PUSHUP_GUIDES,
  ...APK23_STABILITY_GUIDES,
  ...APK23_LOWER_GUIDES,
  ...APK23_TRICEPS_GUIDES,
  ...APK23_SUPPORTED_GUIDES,
  ...APK23_CURL_GUIDES,
  ...APK23_UPPER_GUIDES,
  ...APK23_CORE_GUIDES,
  ...APK23_LEG_GUIDES,
  ...APK23_PULL_GUIDES,
  ...BASIC_GUIDES,
  ...SECOND_GUIDES,
  ...THIRD_GUIDES,
  ...PRESS_GUIDES,
  ...WOMEN_GUIDES,
  ...WOMEN_GYM_GUIDES,
  "bench-press-barbell": {
    ar: {
      summary: "تمرين دفع للصدر. الترايسبس والكتف الأمامي بيساعدوا في الحركة. ابدأ بوزن تقدر تتحكم فيه طول المجموعة.",
      setup: "نام على البنش، وعينيك تحت البار تقريبًا. ثبّت رجليك على الأرض وخلّي رأسك وأعلى ظهرك ومؤخرتك على البنش. اسحب لوحي كتفك لورا وتحت بهدوء.",
      steps: [
        "امسك البار أوسع من كتفك بشوية، وإبهامك مقفول حواليه. خلّي رسغك فوق ساعدك، مش مكسور لورا.",
        "اطلع البار من الحامل بمساعدة لو محتاج، وثبّته فوق صدرك. خُد نفس وشد بطنك قبل النزول.",
        "انزل بالبار ببطء ناحية منتصف صدرك. خلّي كوعك تحت رسغك، مش مفتوح على الجنب بزيادة. انزل في مدى مريح ومن غير ما تخبط صدرك.",
        "ادفع البار لفوق ولورا سنة لحد ما يبقى فوق كتفك. طلّع النفس مع الدفع، وارجع لوضع البداية من غير ما تحدف الوزن.",
        "كرر بنفس التحكم. في الآخر رجّع البار لورا لحد الحامل، واتأكد إنه ثابت في الناحيتين قبل ما تسيبه."
      ],
      feel: "المفروض تحس بمجهود في الصدر والترايسبس. الألم الحاد في الكتف أو الرسغ مش علامة إن التمرين شغال.",
      mistakes: ["تسيب البار ينط من على صدرك.","ترفع مؤخرتك من البنش أو تحرّك رجليك مع كل عدة.","تزود الوزن لدرجة إن البار يميل أو تفقد التحكم."],
      safety: "ما تتمرنش لحد الفشل لوحدك تحت البار. استخدم حواجز أمان مضبوطة أو حد فاهم يأمّنك. لو في ألم حاد أو مفصلي، وقف الحركة. لو مستمر، اسأل مختص."
    },
    en: {
      summary: "A chest pressing exercise. Your triceps and front shoulders assist. Start with a weight you can control for the whole set.",
      setup: "Lie with your eyes roughly under the bar. Keep your feet planted and your head, upper back and hips on the bench. Gently draw your shoulder blades back and down.",
      steps: [
        "Grip slightly wider than shoulder width, with your thumbs wrapped around the bar. Keep your wrists stacked over your forearms.",
        "Unrack with help if needed and steady the bar over your chest. Breathe in and brace before lowering.",
        "Lower slowly toward the middle of your chest. Keep your elbows under your wrists, without flaring them excessively. Use a comfortable range and do not bounce.",
        "Press up and slightly back until the bar is over your shoulders. Breathe out as you press and keep the weight controlled.",
        "Repeat with the same control. Finish by moving the bar back to the hooks. Check both sides are secure before letting go."
      ],
      feel: "Expect effort in your chest and triceps. Sharp shoulder or wrist pain is not a sign of a productive rep.",
      mistakes: ["Bouncing the bar off your chest.","Lifting your hips or moving your feet each rep.","Adding so much weight that the bar tilts or you lose control."],
      safety: "Do not train to failure alone under a bar. Use correctly set safety bars or a competent spotter. Stop for sharp or joint pain. Seek professional advice if it persists."
    }
  }
};
export function getExerciseGuide(exercise, lang = "ar") {
  if (!exercise || exercise.custom || exercise.ownerContent) return null;
  return EXERCISE_GUIDES[exercise.id]?.[lang === "en" ? "en" : "ar"] || null;
}
