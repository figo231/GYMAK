# GYMAK scheduled encouragement, 23 November 2026

Recommendation: reuse FCM and Supabase, with a new token-filtered encouragement sender. Keep it disabled until the own-device test has visible receipt and Kareem approves the wording, audience and schedule. Do not activate the existing topic-based scheduler: it cannot enforce the desired per-user opt-out.

## Deployment
Authenticated CLI login succeeded through Supabase's normal browser verification exchange. GYMAK project access confirmed. The named own-device-once function is deployed. Downloaded live source matches local bytes. Missing/invalid credentials reject 401; authorized dry run confirms one owner + one bound device + one token row and performs no send. Private one-use claim table exists and contains zero rows. Own-device push is still not sent, awaiting exact test-wording approval. No cron or broadcast is active. Temporary CLI credential is account-wide because the vendor login flow creates that form; remove it after active deployment work or replace with a scoped project-only credential. The previous unused login token was removed and live token list confirms only the current session.

Live cron extension check found only supabase_vault, not pg_cron or pg_net. Enable neither until the implementation and activation gates are settled.

## Proposed implementation
- Category encouragement, separate from local workout/water reminders and service announcements.
- Signed-in eligible accounts only for the first version. APK17 guests can join the old all_users topic but do not have account-owned token rows, so saying all installed users would be false. Do not repurpose the old topic.
- Account-owned push preference with row-level security; a clear in-app explanation and toggle. Recommend explicit opt-in for this new optional category, with an immediate opt-out any time. Whether to default existing users into this category is a product decision, not assumed.
- New UI and native behavior batch into APK18 with activity/QA fixes. Existing APK17 has no category opt-out, so do not include it in scheduled encouragement until it has the new control.
- Owner can save a draft schedule in Africa/Cairo, select approved messages, preview exact next local dates/times and eligible account/device counts, then activate only after the requested approval gate. No time selected by us. Default proposed cap at most one encouragement per user per local day; user can choose fewer.
- Minute scheduler tick via pg_cron + pg_net, invoking a dedicated service-authenticated Edge Function. Store invocation credential in Supabase Vault, never client code. No paid Firebase Cloud Functions/Cloud Scheduler. 44,640 minute ticks in a 31-day month is below Supabase Free's 500,000 included invocations before existing usage and dispatch overhead. Verify actual quota headroom, paused-project behavior and live cron extensions first. This is quota-bound free operation, not an unlimited guarantee.
- Atomic campaign occurrence claim keyed by schedule + local date/time, with published message version hash and recipient snapshot. For delivery, re-check preference, account/device binding, supported client version, token activity and cancel state just before calling FCM. No raw tokens returned to the owner UI or logs.
- Deduplicate campaign+device and avoid concurrent dispatch. If the network times out after a send, record outcome_unknown and do not blindly resend. Exact once visible delivery cannot be guaranteed. Provider accepted is not delivered or seen. Use short TTL and a stable notification tag/collapse key to avoid stale encouragement piles. Retire invalid tokens. Use capped backoff only on definitive retryable failures, not ambiguous outcomes.
- Owner kill switch and cancel pending queue immediately. Do not allow a disabled job to catch up with a backlog later. Retain minimal delivery metadata, not workout/health content.

## Draft Arabic set, not approved for sending
Title: خطوة صغيرة النهارده
Body: حتى خطوة بسيطة بتفرق. سجّل تمرينك لما تكون جاهز.

Title: شوف إنت وصلت لفين
Body: بص على آخر أرقامك وخلي خطوتك الجاية مناسبة ليك.

Title: الاستمرار أهم من المثالية
Body: يومك مش لازم يبقى كامل. حاجة بسيطة تحافظ بيها على عادتك كفاية.

Title: وقتك على قدك؟
Body: اختار حركة مناسبة ليك، وخلي الراحة جزء من خطتك.

Avoid medical claims, guilt, body shaming, assumptions that someone missed a workout and promises about results. Do not use health/profile data to personalize the message.

## Delivery limits
Android notification messages can appear with the app in the background. Force stop, disabled OS notifications, no network, device power management and invalid tokens can stop or delay them. We cannot promise every user receives a message at the exact time or after force-stop. An own-device test is still unsent. Standard web has no remote push subscription path in this app yet; this proposal targets supported Android installs, controlled from the website owner panel.

## Remaining gates
1. Finish verified CLI authentication/deployment.
2. Validate own-device source/target and get confirmed receipt of one approved test.
3. Implement and test opt-in/out, permission status, queue/cancel/idempotency and draft owner schedule UI.
4. Show screenshots before visual shipping; batch native into APK18.
5. Kareem approves actual message set, audience, timezone and times before activation or any broadcast.
6. Check live cron, Vault/config, FCM credential readiness and quota usage. None was activated during this research.

Sources are listed in sources.md. No paid service, cron, broadcast or real push was started.
