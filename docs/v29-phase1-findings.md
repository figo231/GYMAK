# v29 phase 1 findings (2026-11-27)

Scope: stability only. No feature, no publish, no production change. Facts come from code reading, tests, and read-only catalog queries (no user rows).

## 1. Signup failure on the phone: still not established
Facts: gateway logs show no signup request from the attempts. Auth health answers from the phone. Signup is enabled. Stubbed-fetch tests reach `fetch` in the register form.
Added: auth network errors now carry a tag (`[net TypeError]`, `[offline-flag ...]`) and a connection check line, e.g. `(chk:http200 140ms online=true sw)`. The check is one anonymous GET to `/auth/v1/health`. It sends no key and no user data.
How to read it on the phone: `chk:http200` = server reachable, so the failing step is the signup request itself (blocker or wrong onLine flag). `chk:TypeError` = network or DNS or content blocker. `online=false` = browser thinks it is offline. `sw` = a service worker controls the page (old cached build possible), `nosw` = none.
Also fixed: `runSync` returned on `navigator.onLine === false` with no retry. A wrong flag could stop sync until app restart. It now retries on the normal backoff.

## 2. Backup
Facts: `db-backup.yml` needs a repo secret with the database connection string (full read of production, including auth password hashes) plus a passphrase. It is scheduled daily, last run failed 22 Nov, and the workflow is disabled. The Supabase free plan has no downloadable automatic backup.
Test without permanent keys (proposal, needs approval for the manual parts):
A. Restore proof with no production access. In CI, start Postgres 17, replay migrations (the repo test already replays them on a stub), seed fake rows, `pg_dump -Fc`, `pg_restore` into a second database, compare counts. Proves the tools and the restore steps. Free. Blocked partly by the missing 0006-0014 and the 4 replay failures (0015-0017, 0048).
B. One production backup, one time, short lived. Kareem resets the database password in the Supabase dashboard (the app uses API keys, not this password), pastes the new pooler string as a repo secret only for the run, I trigger `workflow_dispatch` once with the schedule removed, then he deletes the secret and resets the password again. Artifact is encrypted and kept 1 day. Needs his explicit approval and manual steps. Not done.
C. Restore check of that artifact: decrypt and `pg_restore` in CI into a throwaway database, compare counts. Needs B first.
Not covered by any backup: photos and chat media in Storage, and device-only data (separate plan: the in-app export file).

## 3. Missing migrations 0006-0014
Fact: every live table is created by a migration in the repo, except `own_push_once`. Every live function too, except `rls_auto_enable` (Supabase helper). Policies: all 77 live policies match repo policies (different quoting only).
So the missing files hold history that was later replaced or has no live object, or created objects under names the repo also creates. Their exact text is not recoverable from git.
Done (read-only): `supabase/snapshots/live-schema-2026-11-27.txt`: columns, constraints, indexes, triggers, function signatures with md5 of definitions, policies, cron jobs, edge function list. It is a drift reference, not a migration. Do not apply it.
Next (suggested): add a drift test that compares a fresh export to this file, and a `0000_baseline_note.md` that marks 0006-0014 as lost.

## 4. Sync and notifications review
Facts (code):
- Sync runs on local change, on `online`, on manual sync, and on retry backoff (5 s up to 5 min). There is no sync on app resume. Remote changes from another device appear only after one of those events.
- Auth error stops the retry ladder and shows a message. No automatic sign-out.
- `isNetworkError` treats any `TypeError` as "no connection". A code bug that throws TypeError is shown as a network problem.
- Non-network server errors show `err.message` raw (can be English).
- Migration snapshot goes to localStorage and quota errors are swallowed.
- `push_tokens.app_version` is always `0.1.0` (package.json version), not the app version.
- If notification permission is denied at sign-in, listeners are not registered until the next resume or restart.
- Token delete on sign-out while offline: provider token is revoked, the DB row stays until the server marks it inactive on an UNREGISTERED reply.
Facts (live): only 6 edge functions are deployed: chat-photo, delete-account, dispatch-chat-push, send-encouragement, send-notification, send-owner-push. Not deployed: dispatch-batch, dispatch-scheduled, retry-failed-deliveries, get-campaign-analytics, track-event. Only 2 cron jobs exist (chat photo expiry hourly, chat push sweep every minute). Nothing schedules batch broadcast or retries. Migration 0056 and `claim_pending_deliveries` are missing, so dispatch-batch could not run if deployed.
Uncovered cases (suggestions): queued broadcast and scheduled sends do not run live; no retry job for failed deliveries; no resume sync; wrong error labels above.

## 5. RLS and edge functions (read-only)
Facts: 72 public tables, all with RLS on. 77 policies. 41 tables have RLS and no policy (access only through functions or service role). All SECURITY DEFINER functions have a fixed search_path. No table grants write to anon. Functions executable by anon: apk18_capabilities, coach_can_see, feedback_rate_limit, handle_new_user, is_coach, professional_directory, professional_directory_v2, rls_auto_enable, touch_updated_at.
Suggestions to review (not changed): revoke anon execute on handle_new_user, rls_auto_enable, feedback_rate_limit if the app does not call them signed out. Needs a migration, so it needs approval.
Not reviewed: edge function source as deployed (the dashboard shows names and dates only; repo source differs by update date). Storage policies not exported.

## 6. CI and version
`android-apk.yml` now builds code 29 / name 1.29 on branch `release/apk29-candidate` only, tests upgrade 28 to 29 and rollback 29 to 28 on emulators, checks the signing certificate against apk-28, uploads no APK. `version.json` now also carries versionCode and versionName from the tag. `vercel.json` skips deploys for the branch.
