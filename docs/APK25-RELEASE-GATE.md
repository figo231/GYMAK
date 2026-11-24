# APK25 readiness gate

This branch is not released. Owner approval is required before publication.

## New backend prerequisites

- Apply migrations 0038–0045 in sequence after checking the current live migration head.
- Deploy updated `delete-account` and `chat-photo` Edge Functions using existing project-managed environment secrets. Do not put any key in client code or logs.
- Configure repository secret `SUPABASE_SERVICE_ROLE_KEY` for the hourly cleanup workflow, then run the workflow once and verify actual object removal. A workflow file alone is not a running cleanup service.
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
