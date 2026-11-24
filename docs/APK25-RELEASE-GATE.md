# APK25 readiness gate

This branch is not released. Owner approval is required before publication.

## New backend prerequisites

- Apply migrations 0038 through 0047 in sequence only in the approved release window, after checking the current live migration head and the disposable-project evidence.
- Deploy updated `delete-account` and `chat-photo` Edge Functions using existing project-managed environment secrets. Do not put any key in client code or logs.
- Follow APK25-FREE-SERVER-WIRING.md. Prefer free provider-native hourly scheduling with a dedicated cleanup-only secret after implementing that endpoint authentication. Never place a broad service credential in scheduler SQL or add it merely to activate the old workflow. Verify a real scheduled fire physically removes an expired synthetic object. A workflow file alone is not a running cleanup service.
- Verify private buckets, participant denial, recipient-save deletion and expiry against the real Storage API. Local SQL tests cannot validate object-byte deletion.
- Check current organization Storage/egress usage, since the 200 MB pending-photo cap is shared with other buckets under the free 1 GB allowance. No paid fallback.
- Update published privacy/terms copy together with the app. Users get an explicit per-photo preview and opt-in; username discovery is off until enabled.

## Required release checks

- Full test suite and production web build.
- Photo endpoint round trip, persistent IndexedDB write before acknowledgement, reconnect/retry idempotency, failed local save, denied cross-user access, block, expiry and report evidence.
- Native version must be 25; fresh install plus existing APK upgrades retain logs/custom media/session and do not force onboarding.
- Native Update opens external `/welcome`, whose Android button gets the approved APK.
- Compare signing certificate with previous release and verify final downloaded APK hash/version.

## Photo lifecycle and limits

- JPEG only, up to 200 KB per compressed image; ten sends per sender/day; 200 MB maximum pending delivery bytes across chat photos.
- Recipient taps to download. File is written to per-account IndexedDB and read back before save acknowledgement. Acknowledgement invokes object deletion before terminal state is recorded. Device storage is not a guarantee against later OS eviction or uninstall.
- One recipient device saves. Other devices and cleared installs may show unavailable. Sender local copy is saved before upload; failed uploads keep the same nonce for retry.
- Undelivered files expire after seven days. Expiry blocks downloads immediately; physical deletion is asynchronous on the hourly job and may be delayed by scheduler/service failure. The owner must monitor failures.
- A photo report includes a local copy only after a separate unchecked selection and preview. Owner sees it as reporter-provided, not a verified original. Evidence expires after 30 days, with asynchronous physical cleanup. Metadata-only reporting still works.
- Not E2EE, not medical-record storage, no promise to erase copies/screenshots held by recipients.

## Pre-approval staging boundary

No existing production table/function/constraint is to be changed before explicit release authority. The integration migrations above are therefore NOT approved for staging as a batch. New isolated staging objects may be used only for owner/test accounts. Current production remains untouched until that isolated stage is verified. Rollback of an isolated stage is to stop its job, remove its test objects through the Storage API, delete its new function, then remove only its new isolated schema/tables/buckets after verifying them empty. Never remove or change any existing user table or bucket during staging rollback.

## Local verification checkpoint, 2026-11-24

527 tests across 104 files pass. Production build passes. Inspected local mobile UI screenshots cover inbox dark/light, profile/privacy, photo-send medical warning, chat ticks, quieter home, last-set copy and owner request review. Widths 360/390/412 checked for conversation overflow. Last-set copy sets exactly one set and does not auto-log.

No backend migration or function has been deployed for APK25. No native APK25 has been built. CI has the native toolchain and upgrade fixtures; the local workspace does not. Upgrade script now additionally covers APK24. It still needs an Android getInfo=25 and actual external Update-to-welcome test added and run. New photo endpoint must be type-checked/tested in its real runtime, including byte deletion and denied accounts. Main profile bridge and remote identity cache invalidation still need two-session end-to-end verification.

The requested full app/server review is queued after this candidate, including all tabs/flows, security, quotas, backup recovery and error handling. It is a review, not authority to add more features before APK25.

## 17:35 checkpoint

Full current local run:536 tests across106 files passed, production build passed, actual Deno type-check passed. New checks cover professional-directory44 against25's published-card baseline, cleanup failures surfacing as job failures, and own-profile form stability while save signals propagate. Latest app checkpoint4df563a.

Private CI run45426193173 builds earlier248ba3404dc2c1a2c41f33280ca29901ae2ec151 directly from a hash-checked bundle, without candidate push, web publication, or APK release. A later native rerun must include subsequent fixes. The unit tests run with the normal ungated test environment; the installable private build retains backend gates.

Isolated live Storage probe apk25-bytecheck was deployed from verified source, invoked once through the provider test panel, denied403 because the panel supplied a new-style secret rather than the legacy service JWT. The authorization denial occurred before any Storage mutation. The probe was deleted and the functions list verified back at its original four entries. No existing function changed, no migration applied, no bucket created. Real object deletion remains UNVERIFIED.

Live read-only baseline: public function-definition fingerprint321a3a44566fcb233004422678699af0. Storage buckets empty. Installed extensions exclude pg_cron, so an expiry job must use an existing external scheduler or have separate authority for extension setup. Do not claim an hourly job exists.

Next safe backend path: a self-cleaning owner-authenticated probe invoked from the owner's existing app session, or a provider-supported test with legacy server authorization. Never show or copy the server credential into chat. Two real signed-in participant sessions and the integrated migrations remain separate release checks.

## 17:42 isolated Storage result

Second probe accepted only project server credentials validated inside its runtime. Real Storage create-private-bucket, four-byte upload, download, remove and failed subsequent download returned200 with deleted=true. This is transport evidence, not a valid-JPEG decoder check, not an actual participant RPC check, and not expiry-job proof. Probe was then deleted. SQL verified zero buckets and public function fingerprint unchanged321a3a44566fcb233004422678699af0. Dashboard verified original four functions. No lasting backend change.

Official current docs describe both legacy server JWT and new server-only secret dictionaries; no key was copied into source or logs, no key changed. Useful factual references: https://supabase.com/docs/guides/functions/secrets and https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys . Later server review should assess the provider's end2026 legacy-key deprecation claim without changing keys now.

##19:30 native checkpoint

Run45443286765 attempt2 passed on source16d262a: package/getInfo25, exact Android VIEW intent to https://gymak-eight.vercel.app/welcome, and existing upgrade/offline/OTA fixtures. Inspected native25-welcome.png: captured Chrome host while page still painting, not full landing content. Earlier1a66045 screenshot showed actual landing. Strengthen final condition to landing text before screenshot and rerun latest notification-preview UI commit6cdc357. Local545tests109files and production build pass. No release, no backend activation.

## Free-only photo guard, 24 November 20:44 Cairo

Prepared migration0047 adds a400MiB conservative total-project image budget. It counts objects in ALL buckets, pending reservations not yet backed by objects, and reserved report evidence. Expired-but-not-deleted objects still count. Missing size metadata uses the bucket's maximum, or the entire budget for an unknown uncapped bucket. New delivery reservations, evidence reservations and avatar/delivery/evidence Storage writes are checked under a shared lock. The Edge upload handler checks before sending bytes to Storage as well. No paid fallback exists.

Existing200MiB pending-delivery cap remains:1024maximum-size200KiB photos, before other usage/safety headroom. A theoretical1GB decimal allowance fits4882such files if absolutely nothing else uses it, but that is NOT the configured capacity or a promise.400MiB total budget equals2048maximum-size files across categories; actual deliverable count is lower due to avatars, evidence, pending reservations and conservative double-counting at upload. Report evidence maximum250copies is48.83MiB; avatars cap100KiB each.10photo sends per rolling24hours per sender;200KiB/photo; client JPEG compression1280px down to600px; delete-after-save and7-day expiry unchanged.

Clear Arabic messages distinguish daily cap and safe free-storage stop, without suggesting payment. Screenshot inspected390px;360/390/412no overflow.550tests109files pass, production build and actual Deno check pass.

This guard is prepared locally, NOT applied to production and NOT included in the previous48hosted checks. It needs hosted validation in a new disposable environment. The earlier test project has been deleted. Changing storage.objects with an additive trigger is part of migration0047 and must be reviewed with the release plan, not applied silently. The guard covers this project's bytes, not a future second project's quota, bandwidth/egress, database size, or function invocation quotas. Shared account usage and free plan must be checked again at release. Zero server load cannot be promised: compression runs locally but private delivery/auth/cleanup still use server resources. Free-tier limits can block service; never switch to paid service automatically.


## Final hosted guard checkpoint, 24 November 21:00 Cairo

New disposable FREE project aznkcjhtywqjoxhrwexb accepted all prerequisite migrations through0047, including the Storage trigger.22hosted SQL behavior checks repeated successfully and21new quota/guard checks passed. Tests cover exact400MiB boundary, other-bucket usage, missing metadata fail-closed handling, reservations/evidence, expired metadata, per-image/day limits and concurrent writes serializing then rechecking committed usage. These are hosted SQL/Storage metadata tests, not a repeat of the earlier authenticated Edge byte-upload suite. The earlier deleted project's26Edge/Storage checks remain byte-lifecycle integration evidence before0047. No fresh final-guard Edge deployment was performed.

Both disposable projects are deleted. Dashboard visually shows only original GYMAK in the FREE organization. The second vault entry and local secret file are deleted; no deployment token was created for the second project. Production untouched.

Final native run45464001614 on exact app source90f159b passed tests/build and APK compile; emulator verification and final pixel inspection pending at this checkpoint. Source500fb1c only adds the free-server wiring plan. Hourly cleanup and prompt push wake/continuation remain plans, not activated services. Full real-device FCM receipt and two-session UI/cache persistence tests remain unverified.
