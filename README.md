# GYMAK — React + Vite migration (Phase 2)

This is the React/Vite rebuild of the original static HTML app, described in
`gymak-phase1-audit-report.md`. It preserves all data, all workout plans, all
exercises, and all functionality from the original 7-page app.

## Branding

The app is branded **GYMAK** — neon lime (`#D7FF2F`), white, and a dark
background (`#0B0F12`). All icons live in `public/`:

| File | Used for |
|---|---|
| `icon-192.png`, `icon-512.png`, `icon-1024.png` | PWA manifest (`any` + `maskable`) |
| `apple-touch-icon.png` (180×180) | iOS home-screen icon |
| `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png` | Browser tab / bookmark icon |

The favicon uses a glyph-only version of the mark (no "GYMAK" wordmark) since
the full lockup is illegible at 16–32px — every other icon size uses the full
glyph + wordmark. The PWA manifest's `theme_color`/`background_color` are set
to the brand's dark background (`#0B0F12`) to match the icon art and avoid a
color-flash on install/splash. **Note:** this only re-branded the icon set,
manifest, and app name/metadata — the in-app UI itself (cards, accent colors)
is unchanged from its existing light theme; a full visual re-theme to the new
dark/lime palette would be a separate, larger design task.

## Setup

```bash
npm install
cp .env.example .env   # optional — only needed once Supabase auth/sync is wired in (Phase 3)
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

To build for production:

```bash
npm run build
npm run preview   # serve the production build locally to sanity-check it
```

**Note on this delivery:** this sandbox has no network access, so `npm install`
and `npm run build` could not actually be executed here to produce a compiled
bundle. Everything was verified statically instead (see the Phase 2 final
report for exactly what that covered) — you'll want to run `npm install &&
npm run build` yourself as the first step, before anything else.

## Data migration for existing users

If someone already used the original static app in their browser, their data
lives in `localStorage["gymak_state_v1"]`. This app reads that exact same key
with the exact same shape (`src/lib/store/gymakStore.js` is a verbatim port of
the original `app-data.js`), so opening this app in the same browser picks up
their existing profile, weights, exercises, programs, and achievements
automatically. Nothing to migrate manually.

## What's implemented (Phase 2)

- All 7 original pages, ported to React Router routes with lazy loading
- Shared design system (`src/styles/tokens.css`, `global.css`) instead of the
  original's 7 copies of near-identical CSS
- Every `prompt()`/`alert()`/`confirm()` replaced with accessible in-app
  dialogs (`src/hooks/useDialog.jsx`, `useToast.jsx`)
- The stored-XSS bug from the Phase 1 audit (unescaped exercise names via
  `innerHTML`) is fixed — all user-provided text now renders through JSX,
  which escapes by default
- Supabase client scaffolded (`src/lib/supabaseClient.js`, `.env.example`) —
  not wired to any UI yet, that's Phase 3

## What's next (Phase 3)

See the "Migration plan" section of `gymak-phase1-audit-report.md` for the
full feature rollout order: Supabase auth + cloud sync first, then workout
session mode, calculators, calendar/heatmap, progress photos, exports,
barcode scanner, and social/leaderboards last.

## Project structure

```
src/
  lib/
    store/gymakStore.js   — ported data layer (localStorage-backed)
    supabaseClient.js     — Phase 3 scaffold
    format.js, imageCompress.js
  hooks/
    useI18n.jsx, useToast.jsx, useDialog.jsx
  components/layout/
    TabShell.jsx           — layout for Dashboard/Exercises/Stats/Profile
    DetailShell.jsx         — layout for ExerciseDetail/Programs (+ ChatShell for AI Coach)
    BottomNav.jsx
  pages/
    Dashboard/, Exercises/, ExerciseDetail/, Stats/, Profile/, Programs/, AiCoach/
  styles/
    tokens.css, global.css
```
