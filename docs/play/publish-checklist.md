# GYMAK: Google Play publish checklist (kept current)

Status: Play is parked by the owner; this list keeps the project upload-ready.

## Already done in the repo
- [x] targetSdk 36 (meets the Aug 31 2026 requirement)
- [x] Release signing config reads a separate upload key; Play upload keystore created, repo secrets GYMAK_PLAY_KEYSTORE_B64 and GYMAK_PLAY_KEYSTORE_PASSWORD set (alias gymak-upload). Back up the keystore with the owner.
- [x] Workflow `.github/workflows/android-play.yml` (manual) builds a signed AAB. Needs to be on main to run.
- [x] In-app GitHub updater turns off when versionName contains "play"
- [x] Privacy policy page: /privacy.html (covers data, processors, coach sharing, deletion by email)
- [x] Listing text draft: docs/play/listing-ar.md
- [x] Account deletion code (button hidden behind flag + delete-account edge function, not yet deployed)

## Before upload (owner or us)
- [ ] Deploy the delete-account edge function (Supabase > Edge Functions), verify with a disposable account, THEN set DELETE_ACCOUNT_ENABLED = true in src/pages/Auth/Account.jsx (the button is hidden until then). Do not claim in-app deletion publicly before this
- [ ] Owner gives an explicit yes to the public support email on the listing and privacy page
- [ ] Play Developer account ($25). Personal accounts created after Nov 13 2023 need a closed test with 12+ testers opted in for 14 days before applying for production
- [ ] Create app in Play Console, upload AAB to Closed testing
- [ ] Data safety form (answers in listing-ar.md; coach sharing is optional and user-initiated)
- [ ] Health apps declaration (Policy > App content). Likely categories: Activity and Fitness, Nutrition and Weight Management. Re-verify against the final feature set
- [ ] Content rating (IARC) questionnaire, target audience (not for under 13), ads: none
- [ ] Account deletion URL in Play Console: the privacy page path, plus in-app route
- [ ] Screenshots (phone), feature graphic 1024x500, 512px icon
- [ ] Confirm the privacy page and Data safety match what ships (re-check after each feature batch)

## Known gaps
- Owner broadcast composer hidden until the notifications backend exists (migration 0019 pending)
- Not device-tested: notifications sheet, owner panel, coach tab, Play build gate

## Database steps for coach program assignments
- [ ] Run `supabase/migrations/0019_coach_assignments.sql` in the Supabase SQL editor (after 0018). Until then the coach "send program" button shows an error and the trainee card stays hidden. Nothing else breaks.
