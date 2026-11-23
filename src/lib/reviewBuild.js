// Private test builds against the unmigrated production backend must not send
// or claim new server features work. Production activation is a separate build.
export const REVIEW_BACKEND_GATED=import.meta.env.VITE_REVIEW_BACKEND_GATED==='true';
export const reviewBackendMessage=lang=>lang==='en'?'Private test build: this server feature is disabled until the reviewed database update. Existing account sign-in and local workout data are unchanged.':'نسخة تجربة خاصة: الميزة دي متوقفة لحد تحديث قاعدة البيانات بعد المراجعة. تسجيل الدخول والتمارين المحلية زي ما هم.';
