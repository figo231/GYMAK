# GYMAK — Version Information

**Version:** v1.0.0-beta.1
**Release date:** July 28, 2026
**Build type:** Public Beta (Android APK, sideload/limited distribution)

---

## What's new in this release (Sprint 1 → Sprint 7)

This is the first beta build following a full engineering review and
hardening pass across seven sprints:

- **Live cross-device sync** — any screen open in the app now updates
  immediately when data arrives from another device, not just after a
  local change (Sprint 1).
- **Cloud-backed profile pictures** — avatar/cover photos uploaded while
  signed in now go to secure cloud storage instead of being embedded as
  large text blobs in the database, cutting sync payload size significantly.
  Offline or guest-mode users are unaffected (Sprint 2).
- **Faster app screens on accounts with a lot of history** — repeated
  reads of your data no longer re-parse it from scratch; benchmarked at
  roughly 90%+ faster rendering on accounts with years of logged data
  (Sprint 3).
- **Production hardening pass** — dead code removed, environment/setup
  documentation rewritten to match the app as it actually works, and a
  full security/architecture audit performed (Sprint 4–6).
- **Android security tightening** — automatic system backup of app data
  disabled to protect signed-in session data (Sprint 6).
- **Crash-reporting groundwork** — the app is now structured to plug in
  real crash reporting in a future release without any further rework
  (Sprint 6).

## Known limitations (beta)

- No automated test suite yet — all testing for this beta is manual (see
  `TESTING_CHECKLIST.md`).
- Crash reporting is not yet connected to a live service — unexpected
  errors are only visible to the person experiencing them, not to us. Bug
  reports from testers (see `BUG_REPORT_TEMPLATE.md`) are how we'll find
  issues during this beta.
- Very rare edge case: if you pick two different profile photos back-to-back
  in quick succession while online, the very last one you picked always
  wins on your screen and in your account — but in a rare timing scenario
  the discarded photo may still briefly exist in cloud storage. This does
  not affect what you or anyone else sees in the app.
- Android release build does not yet use code shrinking (R8/ProGuard),
  so the APK is somewhat larger than its final optimized size will be.

## Future roadmap (post-beta)

- Connect a real crash-reporting service.
- Enable Android build optimization (smaller APK).
- Add automated tests for the core data layer.
- Expand feature set (see prior engineering reports for candidates:
  body measurements, workout templates/calendar, push notification
  reminders, barcode scanning for food logging).
