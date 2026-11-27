# GYMAK v29 Phase 2 findings (local work only)

Nothing was published, deployed or applied. No production data was changed. Live checks were read-only catalog queries and read-only views of function code in the dashboard.
Label key: VERIFIED = proven by a test or a direct read. UNVERIFIED = not proven.

## 1. Signup bug: root cause NOT established
Ruled out (VERIFIED by reading the shipped APK 28 and the code):
- The Supabase URL inside APK 28 is correct (`ybkeshztehjeoeonpkih`).
- The service worker inside the APK only handles page navigation and exercise images. It does not touch Supabase calls.
- The custom header `x-gymak-training-generation` is only added when a user is signed in. It is not on the signup request.
- A slow email send ends as the "slow connection" message, not as a "no connection" message, and it would still reach the server logs.
Still open (UNVERIFIED): the failed request never shows in Supabase gateway logs, so it fails before leaving the phone. Candidates: a network or DNS path on his phone for the Supabase domain only, a content blocker or private DNS, or a WebView issue. A local test cannot tell these apart.
What decides it: the v29 build shows a tag on the error, like `(chk:http200 140ms online=true sw)`. One screenshot from his phone settles which group it is. v29 is not published, so this needs his approval to send a private test build.

## 2. Sync on app resume: FIXED locally
Cause: sync ran only on edits, on start and on the `online` event. Coming back from background did nothing.
Fix: `src/lib/sync/syncManager.js` syncs on foreground (page visible and native appStateChange) if the last sync is older than 60 s or the last attempt failed. At most once per 15 s. Does nothing when signed out or already running.
Proof: 3 new tests in `tests/sync-session-race.test.js`. Two of them fail without the fix and pass with it (VERIFIED). Not tested on a real phone (UNVERIFIED).

## 3. Network and server errors
Already handled in Phase 1: network wording, tag with the real reason, raw English hidden behind a generic Arabic line (`src/lib/authErrors.js`, tests pass). No new change this phase.

## 4. Notification system: what scheduled sending and retries need
Facts (VERIFIED from the repo and the live catalog):
- Live has 2 pg_cron jobs (chat push sweep, chat photo expiry). It has NO job for scheduled sends, batch dispatch, retries, or the daily 12:00 encouragement push.
- Live has 6 functions: chat-photo, delete-account, dispatch-chat-push, send-encouragement, send-notification, send-owner-push. NOT deployed: dispatch-scheduled, dispatch-batch, retry-failed-deliveries, get-campaign-analytics, track-event.
- Migration 0056 is not applied live (no `claimed_at`, no `outcome_unknown`, no claim functions).
- So today a "scheduled" owner notification is never picked up, and failed deliveries are never retried. The daily encouragement push has no trigger either (UNVERIFIED that it never ran by another route; no cron or workflow in the repo calls it).
Needed to make it work (nothing done, all need approval):
1. Apply 0056. Tested on the live table shape: `tests/migration-0056-live-shape.test.js` (VERIFIED on a throwaway Postgres engine, not on Supabase itself).
2. Deploy dispatch-scheduled, dispatch-batch, retry-failed-deliveries.
3. Scheduler jobs. The old 0015 jobs call the functions with the service-role key stored in Vault. That is a broad permanent secret, which Kareem refused. Safer: use the same pattern as chat push (one dedicated secret per function, checked in the function). That is a code change plus new secrets, so approval is needed.
4. Throughput: dispatch-batch sends 5 devices per call. At one call per minute that is 300 devices per hour. The claim function allows up to 50. Raise the batch or call it more often before a large broadcast.
5. Devices in `outcome_unknown` are never resent on purpose (a dead worker may have already sent). The owner screen should show them.
6. The function secrets needed: FIREBASE_SERVICE_ACCOUNT (already used by deployed functions), ENCOURAGEMENT_RUNNER_SECRET, CHAT_PUSH_DISPATCH_SECRET. Not checked whether they are set (UNVERIFIED, secrets are never read).
7. `push_tokens.app_version` is always `0.1.0` (from Phase 1, not fixed).

## 5. Backup and restore test (plan A only): DONE on fake data
Files: `scripts/backup-restore/run.sh`, `stub.sql`, `seed-fake.sql`, `.github/workflows/backup-restore-test.yml`.
It builds a throwaway database from every repo migration, fills 47 of 71 tables with generated fake rows (137 rows), dumps with the same flags as the daily backup, restores into a second empty database, and compares row count plus a content hash of all 72 tables in public and auth.
It also proves the check can fail: deleting one row is detected, and a truncated dump is rejected. It refuses to run against a host named supabase, pooler or amazonaws. No secret, no production connection.
VERIFIED: run locally on PostgreSQL 14, passed. The CI workflow on PostgreSQL 17 has NOT run yet (needs a push). Not covered: 24 tables stay empty (strict rules), photos and storage files, encryption step, Supabase-only parts.

## 6. Storage policies (read-only export)
- 3 buckets, all private, with size and type limits: chat-avatars (100 KB, jpeg), chat-delivery (200 KB, jpeg), chat-report-evidence (200 KB, jpeg).
- 4 policies, all on chat-avatars, all for authenticated only, identical to migration 0040 (VERIFIED).
- chat-delivery and chat-report-evidence have no policy, so only the server functions can read or write them. This matches the code (VERIFIED).
- Repo migration 0003 (old avatars bucket policies) has no live counterpart. Drift, harmless.

## 7. Deployed Edge Function source vs local
Read-only view in the dashboard, index file only:
- chat-photo, delete-account, dispatch-chat-push, send-owner-push: identical to local (VERIFIED, ignoring a trailing newline).
- send-encouragement: DIFFERENT. Local passes `category:'encouragement'` to the push call, deployed does not. Effect: category opt-out may not apply to that push (UNVERIFIED how fcmClient treats a missing category).
- send-notification: the dashboard shows one bundled file, so a text comparison is not possible (UNVERIFIED).
- Files under `_shared` were not compared (UNVERIFIED).

## 8. anon function permissions: review, nothing changed
Nine functions are executable by anon. Six also by PUBLIC (so revoking only anon would not work).
- RPC functions: apk18_capabilities, coach_can_see, is_coach, professional_directory, professional_directory_v2. In the app they are only called after login (identity prompt and Professionals page are inside the protected routes). Every RLS policy that calls them is for `authenticated` only (VERIFIED from the live catalog).
- Finding: professional_directory(_v2) is a SECURITY DEFINER function anon can call. It returns verified professionals' name, bio and kind. Anyone with the public anon key can list them. is_coach(uuid) lets anyone test whether a known user id is a coach.
- Trigger functions (feedback_rate_limit, handle_new_user, touch_updated_at, rls_auto_enable) are never called through the API. Triggers do not need EXECUTE for the caller.
Proposal (NOT applied, kept out of `supabase/migrations`): `supabase/proposed/0064_revoke_anon_execute.sql`. Test `tests/anon-revoke-proposal.test.js` (VERIFIED on a throwaway engine): anon loses all nine, authenticated and service_role keep the five RPCs, the feedback rate-limit trigger still fires, rollback restores. Not proven on hosted Supabase (supabase_auth_admin and platform roles).
Risk: low for the app. If some unlisted client calls these as anon it would get a permission error.

## 9. Emulator tests (items 7): cause analysis, one fix, NOT re-run
Failure: `OtaRollbackTest.activatesPipelineOnNextColdStart` waited for the staged OTA bundle to activate on cold start. State showed the bundle `pending`, the staged key empty, running bundle built-in.
Reading the code and script: the staged key is a localStorage value. Chromium writes localStorage to disk a few seconds later. The script force-stops the app right after the staging test, and its own disk check accepted "not on disk yet" (exit 2) and carried on. If the app is killed before the write, the cold start finds nothing to activate. This also fits APK 28 failing once and passing 7 minutes later.
Fix (commit 4bea4a2b): the script now waits up to about 45 s for the key to be on disk and stops with a clear message if it never is.
Status: this is the most likely cause, NOT proven. Only a CI run can show it. The second emulator job (29 to 28 rollback) has never run.
Needs one GitHub push (per-test approval, branch only, short token, deleted after). The same push would run the new backup/restore workflow.

## Tests
175 test files, 831 tests pass locally. `vite build` passes.
