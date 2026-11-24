# Coach and nutrition additions, review candidate

Branch: feat/coach-nutrition-eight. Based on APK23 source, not a released APK.

## Included
- Weekly check-in at /weekly-check-in, available from Profile > Training. One local summary per Saturday-based week. Explicit selection of chat and reviewable draft, never auto-send.
- Doctor-authored structured nutrition plan in existing doctor chats. Preview before sharing. Immutable versions and explicit client choice of current version.
- Food swaps at /food-swaps, linked from food navigation. Approximate calorie/protein matching within the same name-based food group. Not an allergy engine or a medical substitution tool.
- Optional RIR value on individually logged rep-based sets. Local metadata only, not cloud-synced. Old logs remain valid.
- Superset ordering and rest timer at /supersets, linked from training navigation. Saved pair and round/rest settings; session progress is not resumed after leaving the screen. Does not auto-log exercise or award XP.
- Server-side literal chat search with 50-result cursor pages. Personal message pins, at most30 per conversation. No shared pin state.
- Free follow-up appointment requests from existing chats. Professional creates availability, client requests, professional accepts. No payments, fees, push delivery, calls or calendar sync. Times display in device timezone. Each effect has an explicit review step.
- Nutrition version history and coach training snapshots in chats. Historical coach snapshots preserve their original exercise details. Existing legacy assignments are not backfilled or replaced. Viewing an old version does not silently apply a program.

## Backend rollout still pending
Apply additive migrations0033,0034,0035,0036 in order only after review and release authority. None was applied to production during development. Existing chat consent, professional relationship, roles, blocks and write-pause control are checked on the server. Tables have RLS and no direct authenticated reads or writes. Only participant-scoped functions expose data. No owner-panel flow or existing function was changed.

Before activation, verify two actual test accounts through doctor and coach flows, including consent, revoke, block, role change, retries and cancellation. The local embedded-PostgreSQL tests and browser fixtures do not replace this production smoke check.

Check-ins, RIR and saved supersets are device-local and included in the existing local-state backup. They are not added to cloud sync. Training reset clears these fields. No new external service or paid dependency.

## Release restrictions
Do not push, deploy, upload, package or publish an APK, apply production migrations, or run any notification campaign from this branch without the owner's explicit go. APK23 release authority remains separate.

## Privacy and appointment review
Local check-ins, RIR and superset settings are not auto-shared. Check-in sharing creates a reviewable draft for a deliberately selected conversation, bound to the signed-in account; it never auto-sends. Existing chat consent remains required. Plan sharing and every appointment effect have a review/confirmation step. Shared versions and client selections live on the server for the two conversation participants. A revoked relationship/role stops new shared writes, not historical access; blocking hides care-plan/search tools without erasing them. Local deletion/training reset does not recall sent messages or shared versions. Account deletion cascades through conversations, plan versions, appointments and pins. Recipient copies/screenshots and exported local backups cannot be recalled.

Appointment history and cancellation stay available even after block/revocation; new requests/acceptance do not. Pending is always labeled waiting for professional acceptance. Status and cancellation are shown in the panel, with explicit refresh and no reminder reliance. UTC storage and device-zone rendering were tested for the same instant: Cairo17:00 and New York10:00 on25November2026. Both zone labels and offsets were pixel-checked. Existing privacy text and FAQ were updated to match these facts, in Arabic plus English policy text. No production privacy page was published.
