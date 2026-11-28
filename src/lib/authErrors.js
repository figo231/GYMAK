import { tx } from "./i18n/tx";
// Order matters: first match wins. Never show raw English to the user.
const KNOWN = [
  [/invalid login credentials|invalid_credentials/i, tx("الإيميل أو الباسورد غلط.")],
  [/user already registered|already been registered|email_exists|user_already_exists/i, tx("الإيميل ده مسجل قبل كده. سجّل دخول، أو دوس \"نسيت الباسورد\".")],
  [/user_banned|user is banned/i, tx("الحساب ده موقوف. تواصل مع الدعم.")],
  [/email not confirmed|email_not_confirmed/i, tx("لازم تأكد إيميلك الأول. شوف صندوق الوارد (وسبام).")],
  [/different from the old password|same as the old/i, tx("الباسورد الجديد لازم يختلف عن القديم.")],
  [/password should be at least|weak.password|at least \d+ characters/i, tx("الباسورد ضعيف. استعمل 8 حروف على الأقل.")],
  [/after \d+ seconds|only request this/i, tx("استنى شوية قبل ما تجرب تاني.")],
  [/over_email_send_rate_limit|email rate limit exceeded/i, tx("خدمة رسائل التأكيد وصلت لحد الإرسال مؤقتًا. المشكلة مش من عدد محاولاتك. جرب بعدين، أو سجّل دخول لو حسابك متأكد بالفعل.")],
  [/rate limit|too many requests|over_request/i, tx("محاولات كتير قوي. استنى شوية وجرب تاني.")],
  [/unable to validate email|invalid format|valid email|email_address_invalid|email address .* is invalid/i, tx("صيغة الإيميل مش صحيحة.")],
  [/signups? not allowed|signup is disabled/i, tx("التسجيل مقفول حاليًا.")],
  [/session missing|invalid.*(refresh|jwt)|jwt expired/i, tx("الجلسة خلصت. سجّل دخول تاني.")],
  [/invalid or has expired|otp.expired|link.*expired|token.*expired/i, tx("الرابط انتهى أو اتفتح قبل كده. اطلب رابط جديد.")],
  [/user not found/i, tx("الإيميل ده مش مسجل.")],
  [/timeout/i, tx("الاتصال بطيء قوي. جرب تاني.")],
  [/failed to fetch|load failed|networkerror|network request/i, tx("مفيش اتصال بالإنترنت. اتأكد من النت وجرب تاني.")],
  [/network/i, tx("مفيش اتصال بالإنترنت. اتأكد من النت وجرب تاني.")],
];
const GENERIC = tx("حصلت مشكلة. جرب تاني بعد شوية.");

export function authErrorCode(error) {
  if (!error) return "";
  return String(error.code || error.error_code || "");
}

// HTTP 5xx: the server answered with a failure. This is not a network problem.
export const isServerError = (error) => !!error && typeof error.status === "number" && error.status >= 500;
export const SIGNUP_EMAIL_ERROR = tx("مقدرناش نبعت إيميل التأكيد دلوقتي، والمشكلة عندنا مش من النت عندك. جرب بعد شوية.");

export function translateAuthError(error, online = typeof navigator === "undefined" ? true : navigator.onLine !== false) {
  if (!error) return "";
  // A real server answer (HTTP 4xx) proves we are online, whatever navigator.onLine claims.
  // Any HTTP answer (4xx or 5xx) proves the request reached the server.
  const answered = typeof error.status === "number" && error.status >= 400;
  if (!online && !answered) return tx("مفيش اتصال بالإنترنت. اتأكد من النت وجرب تاني.");
  if (isServerError(error)) return tx("حصلت مشكلة عندنا في الخادم، مش من النت عندك. جرب تاني بعد شوية.");
  const msg = `${authErrorCode(error)} ${error.message || String(error)}`;
  // The browser says online but the request failed before any answer: the server is unreachable from this network.
  if (error.name === "AuthRetryableFetchError" || error instanceof TypeError || /failed to fetch|load failed|networkerror|network request/i.test(msg)) return tx("النت شغال بس مش قادر أوصل للخادم. جرب تبدّل بين الواي فاي والداتا، أو اقفل الـ VPN أو الـ DNS الخاص، وجرب تاني.");
  for (const [pattern, ar] of KNOWN) if (pattern.test(msg)) return ar;
  // Arabic text from our own code passes through; anything else is hidden behind a generic line.
  return /[\u0600-\u06FF]/.test(error.message || "") ? error.message : GENERIC;
}

export const SIGNUP_USERNAME_TAKEN = tx("التسجيل ما كملش. ممكن اسم المستخدم واخده حد تاني، أو التسجيل واقف مؤقتًا من عندنا. جرّب اسم تاني، ولو فضلت المشكلة جرّب بعد شوية.");
export const SIGNUP_SERVER_ERROR = tx("التسجيل فشل من عندنا في الخادم، مش من النت عندك. جرّب اسم مستخدم تاني، أو جرّب بعد شوية.");
// Signup-specific wording. `detail` = {status, code, msg} captured from the failed answer (may be null).
export function signupFailureMessage(error, detail = null, online) {
  if (!error) return "";
  const body = `${detail?.code || ""} ${detail?.msg || ""}`;
  const status = typeof error.status === "number" ? error.status : detail?.status;
  if (typeof status === "number" && status >= 500) {
    if (/username_taken|username|database error saving new user/i.test(body)) return SIGNUP_USERNAME_TAKEN;
    if (/sending|confirmation email|recovery email|smtp|mail/i.test(body)) return SIGNUP_EMAIL_ERROR;
    return SIGNUP_SERVER_ERROR;
  }
  return translateAuthError(error, online);
}

export const RECOVER_SEND_FAILED = tx("مقدرناش نبعت إيميل إعادة التعيين دلوقتي. جرّب تاني بعد شوية.");
// Password-reset wording: when the server could not send the email, say so (not a generic server error).
export function recoverFailureMessage(error, online) {
  if (!error) return "";
  const msg = `${authErrorCode(error)} ${error.message || ""}`;
  if (isServerError(error) || /over_email_send_rate_limit|email rate limit exceeded|unexpected_failure|error sending|sending recovery|smtp/i.test(msg)) return RECOVER_SEND_FAILED;
  return translateAuthError(error, online);
}

export const isUnconfirmed = (error) => authErrorCode(error) === "email_not_confirmed" || /email not confirmed/i.test(error?.message || "");

// Sign-in wording. Supabase answers "invalid_credentials" for BOTH a wrong password and an unknown email on purpose
// (so nobody can probe which emails exist), so the message must say "email or password" and point to sign-up.
export const LOGIN_BAD_CREDENTIALS = tx("الإيميل أو الباسورد غلط. لو لسه معندكش حساب، اعمل حساب جديد.");
export const LOGIN_SERVER_ERROR = tx("الدخول فشل من عندنا في الخادم، مش من النت عندك. جرّب بعد شوية.");
export function loginFailureMessage(error, online) {
  if (!error) return "";
  const msg = `${authErrorCode(error)} ${error.message || ""}`;
  if (isServerError(error)) return LOGIN_SERVER_ERROR;
  if (/invalid login credentials|invalid_credentials/i.test(msg)) return LOGIN_BAD_CREDENTIALS;
  return translateAuthError(error, online);
}
