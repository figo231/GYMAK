# Signup identity candidate, not deployed

Branch feature/apk18-signup-identity, based on APK18 d28af75. Separate from ongoing OTA native candidate and language/theme branch. Migration 0029 not applied.

New signup requires display name 2-40 characters, gender male/female, and a normalized unique ASCII username 3-24 characters starting with a letter. Auth trigger reserves username atomically in signup transaction; profile mirrors canonical identity, protected from old sync overwrites. Caller-bound RPCs and live-session client checks guard account switches. No anonymous username lookup.

Existing users are not renamed or backfilled into completed identity. One optional completion prompt per account, with skip. Existing valid usernames are reserved: a single owner can keep their name, duplicate legacy claims remain blocked for automatic assignment rather than choosing a winner. Previous handles remain reserved to prevent impersonation. Legacy claims are not a public directory and gender is not newly exposed. Workouts/photos/media unchanged. Privacy text covers fields and legacy handling.

Nine focused client/database tests pass, including normalization, duplicate signup rollback, stale profile sync protection, unique and ambiguous legacy claims, old-client collision attempt, session mismatch and direct-table privilege rejection. Production build passes. Arabic/dark full signup screenshot inspected at 360px, fixed cramped fields/full-width selector. Existing-account and new-user dialog sequencing tested with fixture; English/light full-app checks await language/theme integration. No final combined native test yet.

Migration sequence: 0027 UGC, 0028 encouragement, 0029 identity. Backup freshness, live schema checks, rehearsal and exact final migration hashes required before owner-approved production action. Encouragement sender and OTA automatic downloads remain disabled. No release, merge, production migration or web deployment from this branch.
