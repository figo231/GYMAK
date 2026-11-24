# APK25 isolated backend test, 24 November 2026

## Outcome

A second FREE Supabase project, `GYMAK-apk25-isolated-test` (`yyrccpbznvwvsdjamhfz`), was created in the existing free organization. Prerequisites and exact migrations0038-0046 were applied. The actual `chat-photo`, `dispatch-chat-push`, and `delete-account` source was deployed there, plus a temporary secret-protected synthetic harness pinned to that project.

22 hosted PostgreSQL checks and26 authenticated Edge/Storage checks passed. The disposable project was deleted afterward. The temporary token was restricted to this project and Edge Functions/secrets, then revoked and visually confirmed absent. The test database vault entry and local credential files were deleted. Production was not changed. No app release or web deployment occurred.

## Passed

- Hosted SQL: owner-only badges; current remote profile/inbox names; unchanged old message bodies; photo reservation idempotency and participant checks; absent-byte publish denial; client denial of fake deletion; generic preview default; account-only preference saves; recipient-only queue; single claim; doctor override; block and expiry rechecks; service-only queue.
- Actual valid JPEG upload and publication; retry with the same nonce; exact-byte recipient download with a real signed-in JWT; unrelated JWT denial; sender cannot confirm recipient save.
- Recipient acknowledgement physically deletes the object, records saved state, and prevents redownload.
- Expired delivery blocks download before cleanup. Calling the actual cleanup handler physically deletes expired delivery and report-evidence objects and clears their references. A client cannot call cleanup.
- Separately selected report evidence uploads; only the test owner can review it; unrelated account denied.
- Two authenticated API sessions see changed profile names and opted-in avatar bytes. After hiding, a new signed URL is denied and a fresh exact-object authenticated request is denied. Previously issued URLs and already downloaded/cached copies are not retroactively revoked. Avatar signed URLs last120seconds.
- Dispatcher rejects a missing scheduler secret. With the correct secret and paused control it returns200,0attempts, and `receipt:not_confirmed`.

## Fixture and scope caveats

A fresh Supabase project's Data API default grants differed from the older application's defaults. The test fixture explicitly granted CRUD for profiles/push_tokens to authenticated/service_role and admin_users to service_role. RLS remained active. No corresponding production grant was changed. The first harness attempts surfaced these fixture gaps and were not counted as passes.

Expiry dates were moved into the past in the synthetic fixture to exercise immediate expiry and byte deletion. This is not evidence that an hourly scheduler is installed or has fired.

An initial avatar test reused a cached download and did not prove immediate revocation. The final check uses a new signed URL attempt and a fresh exact-object request. It does not claim to erase client copies.

## Still unverified, not a complete release gate

- Real FCM acceptance and foreground/background/killed Android device receipt. No Firebase credential was copied and no real push was sent.
- Two rendered UI sessions receiving a realtime name/avatar change without refresh.
- Actual device IndexedDB save/readback followed by server acknowledgement in one integrated run. Unit coverage exists, but the hosted harness tested the server side only.
- Prompt push dispatch wiring and a running hourly expiry scheduler.
- Latest native welcome screenshot still captured before page pixels painted, despite the exact URL intent and accessibility-text checks passing.
- Full application/server review remains separate work.

## Evidence

Dashboard organization after deletion: https://supabase.com/dashboard/org/dbcnxxghxjvtmbioenvs

Token list after revocation: https://supabase.com/dashboard/account/tokens

The test project's former dashboard URL, https://supabase.com/dashboard/project/yyrccpbznvwvsdjamhfz/functions , is historical, not an available live resource after deletion.

Machine-readable synthetic check results and harness source were retained privately as test evidence. They contain no token, password, user message, or production data.
