# GYMAK — gym workout, weight, and nutrition tracker

A local-first, Arabic-language fitness tracking app: React + Vite for the
web/PWA build, wrapped with Capacitor for the Android app, with optional
Supabase-backed account sign-in and cross-device cloud sync.

## Architecture: local-first + sync

The app works **fully offline** with no account at all — every read/write
goes through a single data layer, `src/lib/store/gymakStore.js`, backed by
`localStorage`. Signing in is optional and adds cloud sync on top of the
same local data; it never replaces it.

- **Store (`src/lib/store/gymakStore.js`)** — the only place that reads or
  writes the app's data. Exposes plain getter/setter methods (e.g.
  `getProfile()`, `addWeight()`, `logSet()`) and an `onChange(fn)`
  subscription used by the UI to react to any update. Since a recent
  optimization, the store keeps one in-memory copy of the current state
  (populated on first read) so repeated reads don't re-parse localStorage —
  every write still persists immediately, and remote sync updates the same
  in-memory copy before notifying listeners, so the UI is never stale.
- **Sync (`src/lib/sync/`)** — only active when signed in. `syncManager.js`
  schedules push/pull cycles (push-before-pull, so a device's own pending
  local changes are never clobbered by a pull); `domains.js` has one
  push/pull pair per data type (profile, weight logs, food log, exercises,
  exercise logs, PR history, workout days); `validate.js` rejects malformed
  rows before they're written either direction; `deterministicId.js` gives
  append-only records a stable id so re-syncing never creates duplicates.
  First sign-in on a device with existing local data triggers a one-time
  migration that uploads it to the user's new Supabase account.
- **UI reacts to both local and remote changes** — every page subscribes to
  the Store's `onChange` (via `src/hooks/useStoreVersion.js`), so a page
  update fired by a background sync pull (another device's changes arriving)
  shows up immediately, the same way a local edit does.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL files in `supabase/migrations/` in order (`0001` → `0003`) via
   the SQL editor or the Supabase CLI. They create the data tables with Row
   Level Security (every user can only read/write their own rows), plus the
   `avatars` Storage bucket and its policies.
3. Copy `.env.example` to `.env` and fill in your project's URL and anon key
   (Project Settings → API in the Supabase dashboard).

Without a configured Supabase project, the app runs entirely offline —
`src/lib/supabaseClient.js` simply exports `null` and every sync-related
call becomes a no-op.

## Storage (avatar / cover images)

Profile pictures uploaded while signed in go to the `avatars` Storage bucket
(one file per user per kind, at a deterministic path — re-uploading replaces
the previous file, so nothing accumulates) and only the resulting URL is
stored in the `profiles` row. Uploading while offline, or without an
account, falls back to storing a compressed image directly as a data URL —
existing profiles from before this feature was added keep working exactly
as they always did; nothing is migrated automatically.

## Environment setup

```bash
npm install
cp .env.example .env   # fill in your Supabase URL/anon key — optional, see above
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

To build for production:

```bash
npm run build
npm run preview   # serve the production build locally to sanity-check it
```

## Android build (Capacitor)

```bash
npm run build
npx cap sync android
npx cap open android   # opens the project in Android Studio
```

From Android Studio: `Build → Generate Signed Bundle / APK` for a release
build. Release signing (keystore, Play App Signing) isn't configured yet in
this repository — set that up in Android Studio or via Gradle before the
first Play Store upload.

## Project structure

```
supabase/
  migrations/            — SQL: tables, RLS policies, avatars Storage bucket
src/
  lib/
    store/gymakStore.js  — the single local data layer (localStorage-backed, in-memory cached)
    sync/                — syncManager.js, domains.js (push/pull per table), validate.js, deterministicId.js
    update/              — PWA vs. native-APK update detection/prompt logic
    supabaseClient.js    — Supabase client (null if not configured — app stays offline-only)
    imageCompress.js, imageUpload.js — client-side image resize + Supabase Storage upload
    authErrors.js, format.js
  hooks/
    useAuth.jsx           — Supabase auth session (sign in/up/out, password reset)
    useStoreVersion.js    — subscribes a page to Store changes (local or remote)
    useSyncStatus.jsx, useTheme.jsx, useI18n.jsx, useToast.jsx, useDialog.jsx
  components/
    layout/               — TabShell, DetailShell, BottomNav
    ErrorBoundary.jsx, PWAUpdatePrompt.jsx, Onboarding.jsx, SplashScreen.jsx, ProtectedRoute.jsx, RouteError.jsx
  pages/
    Dashboard/, Exercises/, ExerciseDetail/, Stats/, Profile/, Programs/, AiCoach/, Auth/
  styles/
    tokens.css, global.css
```
