# Private chat + owner directory, phase 1 review

Status: reviewed development branch; coordinated release authorized after explicit non-E2EE acceptance. Migration 0024 has NOT been applied to production. No production roles, messages or notifications were changed.

## Release decisions still required

1. The non-E2EE model was explicitly accepted before release. This implementation is HTTPS + two-participant access control, NOT end-to-end encryption. Database operators and service-role access can read stored messages. The owner UI cannot read other people's conversations.
2. Coordinate the authorized web release, migration and new APK. APK 12 bundles its screens offline, so a web deployment alone will not add chat or this directory to APK 12.
3. Review retention/privacy and support capacity before activation. General doctor/coach guidance is not emergency care. Owner-assigned roles do not verify licenses. Existing Supabase is reused; no paid service was added, but free service quotas are not unlimited storage guarantees.

## Included

- `/messages` and `/messages/:threadId`, linked from account, dashboard and coaching.
- Explicit versioned privacy consent for both clients and professionals. A professional is not listed until they accept.
- Doctor contacts selected from owner-granted doctors. Coach contacts require an accepted active coach link. Starting a chat does not grant access to workout records.
- Server-derived sender identity, participant-only reads, no owner/admin reading exception, no direct table writes.
- Text only, 2,000 Unicode characters, HTTPS links opened only on tap, visible destination hostname, no automatic previews or attachments.
- Inbox, contacts and history pagination. Focus/manual refresh and optional Realtime refresh signals.
- Retry nonce avoids duplicate messages. Limits: 20 messages/minute, 300/day per sender, 10 new conversations/day per client.
- Revocation makes the affected relationship read-only while preserving its participants' history. Account deletion cascades conversations/messages. It cannot delete a recipient's screenshots or copies.
- Messages/drafts stay out of workout state, exports and local workout backups. Drafts are not preserved after leaving the page. Chat has no background push in this phase.
- Owner directory on `/owner` > users and `/admin`: registered Auth accounts, including missing profiles and email-less accounts; literal name/email search; role filters; counts; stable 50-account pagination; registration date; profile-recorded gender (male/female or not recorded, never inferred); role review and confirmation.
- Old pre-registration coach grants remain visible and revocable separately. Local guests are not registered accounts and do not appear.
- Sender-admins cannot call the owner directory or role RPCs. Administration is separate from user/coach/doctor roles.

The live count investigation found 6 Auth accounts, 5 profiles and no admin-read profile policy. The old profiles count was RLS-limited. New owner-only statistics bypass that limitation with an explicit super-admin check, without broadening profile-table policies.

## Operational cautions

- Existing coach grants are still email-bound; doctor grants and registered account selection use immutable Auth IDs. An email change can affect coach eligibility. Migrating the entire legacy coaching permission model is not included.
- Migration revokes direct coach-grant writes so older cached owner screens, including APK 12, cannot bypass the new exclusive role RPCs. Coordinate the new owner UI/APK with activation. Ordinary coaching link acceptance remains unchanged.
- Do not run the old role migration again to manage roles; use the new owner RPCs after approval.
- No password rotation or database backup retry was done. Those remain deferred.
- Roles are not medical credential verification. No response-time promise, video calls or professional scheduling are provided.

## Verification

- Actual migration executed in embedded PostgreSQL 18.7 (PGlite 0.5.17), with representative Supabase Auth/coach/admin tables. This is not a production migration or a production-version compatibility proof.
- 25 SQL tests cover anonymous/user/sender denial, owner directory completeness/pagination/search, legacy grants, role conversion, both-party consent, valid contacts, participant-only history, owner/stranger read denial, direct write/helper execution denial, idempotency, limits, read cursors, revocation and account-delete cascade.
- 11 helper tests cover link validation, inert HTML text, secure UUID fallback, recipient/nonce arguments, role targets, versioned consent, errors and message pagination.
- Mobile browser scenarios use synthetic accounts, intercepted HTTP and blocked WebSockets/DNS. No dummy data is sent to production. Screens: owner directory, search, inline role confirmation, legacy grant list, consent, inbox, thread, send, offline, revoked relationship, account switch and migration-not-active error.
- Account-switch test verifies old messages and draft controls disappear for the new account. Links do not auto-fetch, and HTML-like text does not create elements.
- Not verified against a deployed staging Supabase or real two-device Realtime delivery. No medical/personal messages, real recipients or production role changes were used.

## Activation outline, only after approval

1. Confirm non-E2EE acceptance and reviewed privacy text.
2. Validate actual production schema/prerequisites and existing plan capacity without changing secrets or retrying the deferred backup.
3. Arrange deployment/rollback timing and create a new APK from the reviewed branch.
4. Apply migration 0024 only under a separate live-change approval; then deploy web and publish the approved APK.
5. Use designated test accounts to verify participant/stranger isolation, role conversion and two-device delivery. Obtain approval for any real notification sends separately.
6. Rollback means disabling chat links/UI and RPC access, not dropping message tables or deleting history. Do not restore old direct role writes without a reviewed alternative.
