# Suggested professionals and chat navigation

Release scope: owner-written coach/doctor suggestions, a Chat bottom tab, the reviewed v6 muscle figure, and actual heaviest logged weight on progress summaries.

## Security and privacy

- Only an actual `super_admin` can create or edit a suggestion. It must point to an already assigned coach/doctor account. Saving a card never grants a role.
- Owner writes the display name and a 500-character description, reviews a preview and explicitly publishes or hides it. Public cards contain no email, fitness data or profile image. Guests can read the cards.
- A professional without chat consent can have a visible card but cannot receive a contact request until activated.
- Requests require client chat consent and a deliberate confirmation. Only the client and professional can inspect or act on a request. No administrator read exception. No direct table access from public/anon/authenticated.
- Both coaches and doctors accept contact before new directory conversations. Acceptance opens messages only. It does not create or accept a `coach_links` fitness-sharing relationship. Existing accepted coach relationships still work.
- Existing doctor conversations are preserved by migration; no new conversations are created by that backfill. Declined/canceled requests cannot be resent, and new requests are limited to ten per day. Account deletion cascades requests/cards.
- No push, email, real request, role grant, professional card or example production account is created during this release.

## UI and data

- `دردشة` is a sixth short bottom tab, with a full-height tap target at 360px. The inbox leads to suggestions and request status. Threads remain a detail screen so the keyboard has room.
- Owner panel > `المقترحين` edits cards for already assigned professionals; `المستخدمون` manages roles separately.
- V6 original SVG source from reviewed sample head `9ee1b2b` is used in exercise detail (front/back targets) and stats (logged-set muscle map). Instance IDs are isolated so multiple SVGs cannot reference each other's gradients. All artwork is bundled, no external requests.
- Progress and weekly/share summaries show `أعلى وزن شلته في مجموعة`, from valid actual logged set weights in the local date window, never accumulated volume, estimated 1RM, or body weight. Timed exercises, future dates and invalid/incomplete entries are excluded. Existing tonnage calculation and persisted data shape are unchanged.
- Install the APK over the existing version, without uninstalling. The legacy HTTPS origin, signing identity, offline bundle and local-data rules are unchanged.

## Checks before release

- Full test suite in UTC and Africa/Cairo, including actual PostgreSQL migration/permission/requests tests and peak-weight regressions.
- Isolated mobile browser fixtures: directory/filter, request confirmation and pending/cancel, incoming accept, owner edit/publish preview, owner denial, guests, empty state, chat tab, exercise figure and stats/max-weight.
- No synthetic data is sent to the live service. All fixture HTTP is intercepted and WebSockets/DNS are blocked.
- Native APK verification must pass apk-9 seeded upgrade/data/media preservation and fresh offline install before publication. Published bytes must match the verified artifact, signer and manifest.

Post-release UX simplification review is separate and must not silently remove features in this release.
