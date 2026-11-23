import { tx } from "./i18n/tx";
// Order matters: first match wins. Never show raw English to the user.
const KNOWN = [
  [/invalid login credentials/i, tx("الإيميل أو الباسورد غلط.")],
  [/user already registered|already been registered/i, tx("الإيميل ده مسجل قبل كده. سجّل دخول، أو دوس \"نسيت الباسورد\".")],
  [/email not confirmed/i, tx("لازم تأكد إيميلك الأول. شوف صندوق الوارد (وسبام).")],
  [/different from the old password|same as the old/i, tx("الباسورد الجديد لازم يختلف عن القديم.")],
  [/password should be at least|weak.password|at least \d+ characters/i, tx("الباسورد ضعيف. استعمل 8 حروف على الأقل.")],
  [/after \d+ seconds|only request this/i, tx("استنى شوية قبل ما تجرب تاني.")],
  [/rate limit|too many requests|over_request|over_email_send/i, tx("محاولات كتير قوي. استنى شوية وجرب تاني.")],
  [/unable to validate email|invalid format|valid email/i, tx("صيغة الإيميل مش صحيحة.")],
  [/signups? not allowed|signup is disabled/i, tx("التسجيل مقفول حاليًا.")],
  [/session missing|invalid.*(refresh|jwt)|jwt expired/i, tx("الجلسة خلصت. سجّل دخول تاني.")],
  [/invalid or has expired|otp.expired|link.*expired|token.*expired/i, tx("الرابط انتهى أو اتفتح قبل كده. اطلب رابط جديد.")],
  [/user not found/i, tx("الإيميل ده مش مسجل.")],
  [/timeout/i, tx("الاتصال بطيء قوي. جرب تاني.")],
  [/failed to fetch|load failed|networkerror|network request|fetch/i, tx("مفيش اتصال بالإنترنت. اتأكد من النت وجرب تاني.")],
  [/network/i, tx("مفيش اتصال بالإنترنت. اتأكد من النت وجرب تاني.")],
];
const GENERIC = tx("حصلت مشكلة. جرب تاني بعد شوية.");

export function authErrorCode(error) {
  if (!error) return "";
  return String(error.code || error.error_code || "");
}

export function translateAuthError(error, online = typeof navigator === "undefined" ? true : navigator.onLine !== false) {
  if (!error) return "";
  if (!online) return tx("مفيش اتصال بالإنترنت. اتأكد من النت وجرب تاني.");
  const msg = `${authErrorCode(error)} ${error.message || String(error)}`;
  if (error.name === "AuthRetryableFetchError" || error instanceof TypeError) return KNOWN[KNOWN.length - 2][1];
  for (const [pattern, ar] of KNOWN) if (pattern.test(msg)) return ar;
  // Arabic text from our own code passes through; anything else is hidden behind a generic line.
  return /[\u0600-\u06FF]/.test(error.message || "") ? error.message : GENERIC;
}

export const isUnconfirmed = (error) => authErrorCode(error) === "email_not_confirmed" || /email not confirmed/i.test(error?.message || "");
