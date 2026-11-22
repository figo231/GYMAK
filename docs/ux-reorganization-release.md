# Daily-task-first navigation

This release rearranges the interface. It does not change stored data, data formats, permissions, SQL, synchronization, or messaging rules.

## Where existing features live

- Home: today's workout first, then food/water shortcuts. Expand weight/body indicators, weekly report, water, today's/recent exercises, tips/streaks/challenges, or quick workout. All existing controls inside those groups remain.
- Training: `/training` is the bottom-tab landing. The existing `/exercises` library, search, filters, favourites, custom media, programmes and warmup routes remain. Training settings contains the existing AI coach, Ramadan switch, rest timer and authenticated coach-sharing entry.
- Food: summary, food entry and diary first. Saved meals, goal/free-day/Ramadan controls and weekly meal/supplement destinations are grouped below. Barcode, previews, editing, deleting, undo and saving meals remain.
- Progress: overview/body/strength and a compact period selector. The weekly card is expandable. Body editing, measurements and photos are in Body. Achievements and all existing share-card controls are in an expandable group. History, strength records and all original routes remain.
- Chat: conversations, suggestions and requests have separate destinations. Accepted contacts are expandable. The dedicated bottom tab, privacy notice, explicit consent, request approval, and the distinction from workout-data sharing remain.
- Profile: compact identity, then account/sync, preferences/privacy, help, app/about, and owner-only management. Cover/avatar editing, XP/activity details, reset confirmation, backup, tour and update check remain. Owner/admin routes and guards remain separate.

Duplicate home/profile banners to Chat were removed as entry points, not as features. Every prior route is retained, including deep links.

## Verification

- 335 unit/integration tests in UTC and Africa/Cairo, including 13 new navigation/grouping regressions.
- Isolated browser fixtures at 320, 360, 390 and 1280px, all six tabs. No real messages, requests, roles or user data were used.
- Browser checks compare persisted fitness state before/after expanding groups and switching progress views. Exercise library and current chart/figure implementations are unchanged.
- Native verification covers both the legacy apk-9 wrapper upgrade and the previous bundled apk-15 upgrade, local workout/weight/measurement and IndexedDB media preservation, new Training route loading offline, and a fresh offline installation.
- The verified APK must be inspected for package, version, signing identity, bundled media and HTTPS origin, then the published download must match it byte-for-byte.

No push campaign, schema migration, production test data, paid service, backup retry or secret change is part of this release.
