# Sources, checked 23 November 2026
- Supabase deployment docs, https://supabase.com/docs/guides/functions/deploy . Official API/CLI flow and named function deployment. High confidence.
- Supabase scheduled functions, https://supabase.com/docs/guides/functions/schedule-functions . Official pg_cron + pg_net + Vault. High confidence; live database configuration not checked in this research.
- Scoped access tokens, https://supabase.com/docs/guides/platform/personal-access-tokens . Official project-scoped Edge Functions read/write access. High confidence.
- Supabase pricing, https://supabase.com/pricing . Official Free includes 500,000 Edge Function invocations. High confidence for plan limit; usage headroom not checked.
- Firebase pricing, https://firebase.google.com/pricing . Official FCM no-cost. High confidence.
- Firebase message types, https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type . Official background notification payload behavior. High confidence.
- Firebase engineering delivery article, https://firebase.blog/posts/2024/07/understand-fcm-delivery-rates/ . Official engineering source: force-stop and device state can block delivery, provider acceptance is not visible display. High confidence.
- Live deployment state: https://supabase.com/dashboard/project/ybkeshztehjeoeonpkih/functions . Two functions as of 01:24 Cairo, read-only dashboard.
- Repository source main 14205160ead0e0cd6254764cb5ed94ce55fb79b8, existing send/dispatch/pushService. Inspected locally against fetched origin/main.
