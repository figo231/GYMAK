# APK18 candidate release gates
Not release-ready. No web deploy, migrations, FCM sends or APK publication approved by this file.

## Candidate
- Combined prototype branch: feature/apk18-ota-prototype.
- QA fixes already shipped on main fc63288, included here.
- UGC b29d2b6 included, migration0027 NOT applied.
- Encouragement0028 included, no migration/sender deployment/cron.
- Encouragement default-on product request at23Nov01:56:12 Cairo. Eligible device enrollment only after new-app notice, existing OS grant and no explicit prior off. Sender globally off pending final words/time/audience approval.
- OTA initial integration authorized at01:54:13 Cairo, not publish approval.

## Before candidate native build
- Dedicated OTA signing key must be generated in protected CI or owner's secret manager; no private key in Git, logs, artifacts or chat. Public key passed as GYMAK_OTA_PUBLIC_KEY and embedded before cap sync. Key custody, backup and rotation must be set up before any enabled distribution.
- Native verifier must reject unsigned/corrupt/wrong-key bundle on actual Android. VITE_OTA_ENABLED stays false until this proof and release gate.
- Exact binary target/channel in manifest; no wildcards; Play review hold applies both download and activation. Separate package signature/upgrade test for Play. Explicit distro config replaces legacy name substring guard.
- Verify updater native readiness/rollback timing from cold start, offline, JS exception and failed first route. Readiness signal should reflect functioning app, not simply module import.
- Bounded startup fallback so stuck plugin cannot leave blank page, while preventing late update from replacing an already-active UI.
- Staged update activates at next clean JS bootstrap; never via native next/background lifecycle. Save app data first; reject failed version loop; check disk/cleanup/rollback.

## Native tests and evidence
- APK17 -> candidate install-over with signing cert match, workout/food/weight/account state intact. Never uninstall to test upgrade.
- Cold offline launch and existing alarm/FCM/chat plugin smoke checks.
- Stage good bundle and restart, verified new JS content while App.getInfo native version unchanged.
- Corrupt ZIP, wrong signature, wrong binary version, disabled manifest, expiry/downgrade, no connection and partial download preserve working app.
- Deliberately broken web bundle auto-rollback, recovery without data loss.
- Workout and message draft background/resume never apply update or erase active data.
- User/owner settings and first-run default-on notice screenshot review.
- Explicit Terms checkbox required before chat, owner moderation/report/block tests.
- Capture evidence and report caveats. Emulator-only is not physical-device verification.

## Coordinated deployment after approval
- Back up and verify rollback before schema changes.
- User-visible release approval and screenshots before web deploy/UGC migration/APK publication.
- Enforce versioned Terms server-side, never auto-accept or lock unrelated fitness features.
- Signed native APK18 published only after verification; separate OTA/web version track.
- Encourage sender stays off until final user text/time/audience go. Schedule infra must be free and separately verified. No topic path.
