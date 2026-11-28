# Prepared, NOT applied (needs Kareem's explicit yes to apply to production)
Nothing here is in supabase/migrations or deployed. Each file is local only.
1. 0064_rate_limit_atomic.sql + rateLimit.v2.ts : fixes the select-then-upsert race (review item).
2. 0065_avatars_limits.sql : size/type limits on avatars bucket + WITH CHECK on update policy.
3. 0066_check_constraints.sql : sanity CHECKs added NOT VALID (old rows untouched; new/updated rows validated).
4. cronAuth.ts : constant-time compare with a dedicated secret for dispatch-batch / dispatch-scheduled / retry-failed-deliveries. Needs: set secret CRON_DISPATCH_SECRET, update cron callers, redeploy 3 functions.
Test plan: apply to a throwaway Supabase project first (free tier), run the app's sync + admin send tests, then production.
