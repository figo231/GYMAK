# GYMAK: Google Play publish checklist (kept current)

Status: Play is parked by the owner; this list keeps the project upload-ready.

## Already done in the repo
- [x] targetSdk 36 (meets the Aug 31 2026 requirement)
- [x] Release signing config reads a separate upload key; Play upload keystore created, repo secrets GYMAK_PLAY_KEYSTORE_B64 and GYMAK_PLAY_KEYSTORE_PASSWORD set (alias gymak-upload). Back up the keystore with the owner.
- [x] Workflow `.github/workflows/android-play.yml` (manual) builds a signed AAB. Needs to be on main to run.
- [x] In-app GitHub updater turns off when versionName contains "play"
- [x] Privacy policy page: /privacy.html (data, processors, coach sharing, in-app deletion, contact messages, barcode lookup via Open Food Facts, backups; updated 22 Nov 2026)
- [x] Listing text draft: docs/play/listing-ar.md
- [x] Account deletion: delete-account edge function deployed and tested live (22 Nov 2026), DELETE_ACCOUNT_ENABLED = true, in-app button under Profile > Account

## Before upload (owner or us)
- [x] Delete-account deployed and verified (see above). Public wording about in-app deletion is the owner's call.
- [ ] Owner gives an explicit yes to the public support email on the listing and privacy page
- [ ] Play Developer account ($25). Personal accounts created after Nov 13 2023 need a closed test with 12+ testers opted in for 14 days before applying for production
- [ ] Create app in Play Console, upload AAB to Closed testing
- [ ] Data safety form (answers in listing-ar.md; coach sharing is optional and user-initiated)
- [ ] Health apps declaration (Policy > App content). Likely categories: Activity and Fitness, Nutrition and Weight Management. Re-verify against the final feature set
- [ ] Content rating (IARC) questionnaire, target audience (not for under 13), ads: none
- [ ] Account deletion URL in Play Console: the privacy page path, plus in-app route
- [ ] Screenshots (phone), feature graphic 1024x500, 512px icon
- [ ] Confirm the privacy page and Data safety match what ships (re-check after each feature batch). New since the last check: contact-us messages stored with the account, barcode numbers sent to Open Food Facts, encrypted server backups (30 days), CSV/JSON export, local backups
- [ ] Data safety form: add "Messages" (private in-app chat + in-app support) as collected and linked to the user; barcode lookups send a product number only (no user data)

## UGC / Terms of Use batch (added 23 Nov 2026, migration 0027)
- [ ] Run `supabase/migrations/0027_ugc_terms_moderation.sql` in the Supabase SQL editor (after 0022-0024). Safe to re-run. Until then chat consent, report and block show "لسه مش مفعلة على السيرفر" errors.
- [x] Terms of Use page /terms.html (Arabic + English), separate from the privacy policy
- [x] Versioned, non-skippable chat consent now covers the Terms of Use (version 2026-11-23-tou-v1); existing users re-consent on next chat open
- [x] In-app report (message, user, support reply) and block with server-side enforcement; owner moderation queue shows only reported content
- [x] Privacy policy carve-out: owner may review only reported content; report/block and push-notification wording added
- [ ] Content rating (IARC): answer that users can interact (private chat) - expect "Users Interact" notice, still Everyone-compatible
- [ ] Moderation procedure: owner reviews the البلاغات tab in the owner panel regularly; actions = warn, remove role (المستخدمون tab), or account deletion
- [ ] OFL font license file for IBM Plex Sans Arabic in the repo/listing
- [ ] Open Food Facts attribution in the app or listing

## Known gaps
- Owner broadcast composer hidden until the notifications backend exists (migration 0019 pending)
- Not device-tested: notifications sheet, owner panel, coach tab, Play build gate

## Database steps for coach program assignments
- [ ] Run `supabase/migrations/0019_coach_assignments.sql` in the Supabase SQL editor (after 0018). Until then the coach "send program" button shows an error and the trainee card stays hidden. Nothing else breaks.

## Broadcast backend (done 2026-11-22, verify after deploy)
- [x] Migration 0020_broadcast_backend.sql run in the SQL editor.
- [x] Edge function send-notification deployed, secret FIREBASE_SERVICE_ACCOUNT set.
- [x] 0019 run and verified live.
- [ ] After the web deploy: send one real broadcast from Profile > Notifications as the owner and confirm a device receives it. The Android APK must include google-services.json for the Firebase project gymak-9b6bd (kept out of the repo).

- [x] Migration 0021_exercise_favorites.sql (favourite exercises sync) ran in the Supabase SQL editor. Safe to re-run. The app keeps working without it (favourites stay local).

## Added 22 Nov 2026 batch
- [x] Migration 0022_feedback.sql (contact us) and 0023_feedback_reply.sql (admin replies) ran live.
- [ ] Android: camera barcode scanning needs the CAMERA permission in AndroidManifest and a new APK (manual barcode entry works without it). Local reminder types (meals, water, weigh-in, missed workout) use the plugin already in the APK, not device-tested.
- [ ] Database backup workflow `.github/workflows/db-backup.yml`: owner adds repo secrets SUPABASE_DB_URL and BACKUP_PASSPHRASE (steps in docs/db-backup.md), then run it once (Actions > Database backup > Run workflow) and test a restore on a throwaway project.
- [ ] google-services.json for gymak-9b6bd must be added to the APK build (kept out of the repo).
