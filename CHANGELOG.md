# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [v1.0.0-beta.1] — 2026-07-28

### Added
- `useStoreVersion` hook: every page now subscribes to data-layer changes,
  so a background sync pull updates the open screen immediately (Sprint 1).
- Supabase Storage upload path for avatar/cover images (`imageUpload.js`),
  with a deterministic per-user file path so re-uploads replace the old
  file instead of accumulating (Sprint 2).
- Cache-busting on avatar/cover URLs so browsers never show a stale cached
  photo after a re-upload (Sprint 2).
- In-memory cache layer inside the local data store, populated on first
  read and kept in sync on every write or remote merge (Sprint 3).
- `Store.invalidateCache()` — a single explicit escape hatch for
  exceptional cache-reset cases (Sprint 3).
- `.gitignore` and `.env.example` (Sprint 5).
- `src/lib/crashReporting.js` — a documented, currently-inert hook point
  for a future real crash-reporting integration (Sprint 6).
- Standard Capacitor ProGuard keep rules added to `proguard-rules.pro` as
  inert groundwork for a future, separately-tested minification pass
  (Sprint 6).

### Changed
- README.md rewritten to describe the app's actual current architecture
  (local-first + optional sync), replacing outdated "Phase 2/3" language
  (Sprint 5).
- `android:allowBackup` changed from `true` to `false` to prevent system
  auto-backup from including signed-in session data (Sprint 6).
- `ErrorBoundary.jsx` now also routes caught render errors through the new
  crash-reporting hook, in addition to its existing console logging
  (Sprint 6).

### Fixed
- Race condition where selecting a second profile photo before the first
  one finished uploading could let the older upload's result overwrite the
  newer one; the latest selection now always wins (Sprint 2).
- Stats page previously never refreshed after data changed elsewhere in
  the app during the same session; it now updates live like every other
  page (Sprint 1).

### Removed
- `src/pages/ExerciseDetail/MoveGuide.jsx` — an unused component with zero
  references anywhere in the project, superseded earlier by
  `MuscleAnatomy.jsx` (Sprint 5).

### Security
- Closed an Android backup exposure (`allowBackup="true"` → `"false"`)
  that could have allowed a signed-in session to be extracted via system
  or ADB backup on unrestricted devices (Sprint 6).

### Internal / Engineering
- Full engineering review, deep technical audit, and evidence-based
  benchmark (before/after measurements on both light and heavy synthetic
  datasets) performed and documented prior to the cache-layer work
  (Sprint 3).
- Two full production-readiness audits performed (code quality, React
  architecture, performance, security, Android/Capacitor config,
  documentation) — see internal engineering reports (Sprint 4, Sprint 7).
