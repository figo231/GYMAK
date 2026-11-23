import { tx, txf } from "./i18n/tx";
/* Warm-up and stretching routines. Standard, low-risk moves; durations in seconds. */
export const WARMUP = [
  { name: tx("مشي سريع أو حبل خفيف"), sec: 180, tip: tx("ارفع نبضك بالتدريج لحد ما تحس بسخونة خفيفة.") },
  { name: tx("دوران الكتفين للخلف"), sec: 30, tip: tx("دوائر كبيرة وبطيئة، 15 مرة لكل اتجاه.") },
  { name: tx("دوران الذراعين"), sec: 30, tip: tx("من صغير لكبير، 10 مرات لكل اتجاه.") },
  { name: tx("ميلان الجذع الجانبي"), sec: 40, tip: tx("إيدك على وسطك، 10 مرات لكل جنب.") },
  { name: tx("سكوات بوزن الجسم"), sec: 45, tip: tx("ضهرك مفرود، 10 مرات بإيقاع هادي.") },
  { name: tx("ضغط على الحيطة أو ضغط عادي"), sec: 40, tip: tx("10 مرات بتحكم.") },
  { name: tx("ست تسخين بوزن خفيف"), sec: 60, tip: tx("أول تمرين في اليوم: مجموعة بنص وزنك الشغال، 10 تكرارات.") },
];
export const STRETCH = {
  chest: { label: tx("صدر"), items: [{ name: tx("إطالة الصدر عند الحيطة"), sec: 30, tip: tx("إيدك على الحيطة ولف جسمك بعيد عنها بلطف.") }, { name: tx("فتح الصدر خلف الظهر"), sec: 30, tip: tx("شبّك إيديك ورا ضهرك وارفعهم شوية.") }] },
  back: { label: tx("ظهر"), items: [{ name: tx("وضع الطفل"), sec: 40, tip: tx("اقعد على كعبك ومد إيدك قدام وخد نفس عميق.") }, { name: tx("إطالة الظهر العلوي"), sec: 30, tip: tx("إمسك حاجة ثابتة وارجع بجسمك لورا.") }] },
  shoulders: { label: tx("أكتاف"), items: [{ name: tx("إطالة الكتف عبر الصدر"), sec: 30, tip: tx("شد دراعك قدام صدرك بالدراع التاني، كل جنب.") }, { name: tx("إطالة خلف الكتف"), sec: 30, tip: tx("أدّي اليد فوق الكتف وشدها بالكوع.") }] },
  arms: { label: tx("ذراعين"), items: [{ name: tx("إطالة البايسبس"), sec: 30, tip: tx("ادّي إيدك على الحيطة والكف لورا، لف جسمك بلطف.") }, { name: tx("إطالة الترايسبس"), sec: 30, tip: tx("ارفع كوعك فوق راسك واسحبه بالإيد التانية.") }] },
  legs: { label: tx("أرجل"), items: [{ name: tx("إطالة الفخذ الأمامي"), sec: 30, tip: tx("واقف، إسحب كعبك ناحية الأرداف، كل رجل.") }, { name: tx("إطالة الفخذ الخلفي"), sec: 30, tip: tx("رجل قدام ومفرودة وانحني من الوسط بضهر مفرود.") }, { name: tx("إطالة السمانة"), sec: 30, tip: tx("إيدك على الحيطة والكعب على الأرض.") }] },
  core: { label: tx("بطن وأسفل الظهر"), items: [{ name: tx("إطالة الكوبرا"), sec: 30, tip: tx("على بطنك وارفع صدرك بإيدك من غير ألم.") }, { name: tx("لف الجذع وأنت نايم"), sec: 30, tip: tx("ركبتك لجنب وكتافك على الأرض، كل جنب.") }] },
};
export function routineMinutes(items) { return Math.max(1, Math.round(items.reduce((a, x) => a + x.sec, 0) / 60)); }

export function routineDurationLabel(items) {
  const n = routineMinutes(items);
  return n === 1 ? tx("دقيقة واحدة") : n === 2 ? tx("دقيقتين") : n <= 10 ? txf(`{0} دقايق`, [n]) : txf(`{0} دقيقة`, [n]);
}
