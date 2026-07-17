const KNOWN = [
  [/invalid login credentials/i, "الإيميل أو الباسورد غلط."],
  [/user already registered/i, "الإيميل ده مسجل قبل كده. جرب تسجّل دخول بدل كده."],
  [/email not confirmed/i, "لازم تأكد إيميلك الأول. تحقق من صندوق الوارد بتاعك."],
  [/password should be at least/i, "الباسورد لازم يكون 6 حروف على الأقل."],
  [/rate limit/i, "محاولات كتير قوي. استنى شوية وجرب تاني."],
  [/unable to validate email address/i, "صيغة الإيميل مش صحيحة."],
  [/network/i, "مفيش اتصال بالإنترنت. اتأكد من النت وجرب تاني."],
];

export function translateAuthError(error) {
  if (!error) return "";
  const msg = error.message || String(error);
  for (const [pattern, ar] of KNOWN) {
    if (pattern.test(msg)) return ar;
  }
  return msg; // fall back to Supabase's own message rather than hiding unknown errors
}
