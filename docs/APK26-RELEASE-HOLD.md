# APK26 release hold

No release or production changes as of November25 2026 00:07Africa/Cairo.

## Verified

- First native candidate0292621: complete upgrade suite green including24/25, fresh offline launch, crypto/corruption/rollback.
- Later native pipeline: signed JS envelope verification, native encrypted download, no immediate activation, and next-process activation passed in run45496568889. Final runtime candidate f5de60a runs in45496956046.
- Local final suite583tests114files, build passes. Commit67a097e adds auth tests only after f5de60a.
- Local phone visuals: developer self card/full library, mandatory login, conflict choice and announcement dismissal checked.

## Blocker: concurrent account writes during guest import

The current local importer re-fetches the cloud preview before merging locally. Normal sync starts afterward and does push-before-pull. A second device can change a cloud record after the re-fetch but before that first push. The first push can overwrite an unreviewed cloud edit. A local archive protects the guest and reviewed cloud copy, not that concurrent cloud edit. Do not release this importer merely because helper tests are green.

Required next design:

1. Server-side import transaction with authenticated user identity, training-generation guard, idempotency key and expected remote baseline.
2. Atomic conflict validation plus write. The check must lock affected rows/tables sufficiently against ordinary sync writers. On mismatch, no writes and return a fresh review.
3. Keep local pending marker until server confirms the exact request. Retry safely on lost responses.
4. Before normal sync starts, pull the committed cloud rows into the reviewed local state. Guard against a pending training reset and account changes throughout.
5. Test concurrent same-date weights/food/custom exercise/profile edits, cloud reset during review, network loss before/after commit, duplicate request, storage quota and account switch.
6. Existing unsupported account-switch cache cases must remain isolated with recoverable histories. Do not silently mix accounts or delete media.

## Other work left

- Announcements0049 not applied live. Backend tables currently absent. Local PGlite role/RLS/dismissal tests pass. Apply only once final release gate is safe, test via rollback-scoped live transaction without sending real announcements.
- Web push config disabled and missing browser provider config/VAPID. Do not apply0050 or advertise web push for26.
- Prepared /downloads/apk26-publish.yml is not uploaded. Review before use; it rebuilds/tests exact f5de60a and publishes APK/web only after success. The current candidate is blocked, so do not run it.
- Native visual evidence from first run is available, including24/25 offline login screenshots. Later native evidence still needs collection/inspection.
