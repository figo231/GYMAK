# Status 2026-11-22 (read first)
The owner unfroze the batch and asked for everything in one deploy. Now built on branch `deploy`/`batch2`:
- Progress photos (device-local IndexedDB, before/after compare, src/lib/photos, /photos page). Local only by design, privacy page updated.
- Weekly stats summary (Stats page card + share card, src/lib/stats/weekly.js).
- Coach dashboard (summary tiles, attention sort, search, 30-day activity strip, weight trend, sent programs; src/lib/coach/dashboard.js).
- Owner broadcast backend: migration 0020 RUN LIVE, edge function send-notification DEPLOYED (JWT-legacy check off, function verifies admin itself), secret FIREBASE_SERVICE_ACCOUNT SET from the vault. BROADCAST_ENABLED=true. NOT yet proven: a real send to a device. First owner broadcast after deploy is the end-to-end test. Logs: Supabase, Edge Functions, send-notification.
Still not done: delete-account edge function not deployed (DELETE_ACCOUNT_ENABLED stays false), dispatch-batch/dispatch-scheduled/retry functions and pg_cron (token-audience sends and scheduling are not live; topic broadcast to everyone works without them), server-driven reminders, cloud photo sync.
The older notes below are the original backlog and design notes.

# Next batch backlog (after the frozen deploy)

Order set by the owner via main on 2026-11-22. Nothing here ships in the first deploy.
Deploy rules still apply: one PR per item, squash-merge after CI is green, batch to respect the Vercel free-tier limit, run `npx vite build` and `npm test` before each commit, check UI visually (puppeteer-core + system Chrome).

## What shipped in the deploy (for context)
Rest timer, water card, 15 achievements, goal-filtered programs (6), share cards (PNG), body measurements, coach program assignments (migration 0019, already run by the owner and verified live). See docs/play/publish-checklist.md for open dashboard/Play steps.

## 1. Progress photos
- Not built. Body measurements (src/lib/measure/measure.js, key gymak_measure_v1, device-local) and the /measurements page are the natural home: add a photo strip per entry or a separate "photos" tab.
- Decide storage first. Device-local: store downsized JPEGs (about 1080px, quality 0.8) in IndexedDB, not localStorage (quota). Cloud: a private Supabase Storage bucket with RLS by `auth.uid()` folder, plus a migration (0020). Private bucket only, signed URLs, never public.
- Photos are sensitive health data. Update the privacy page (AR+EN) before shipping, and do not let coach sharing include photos unless the trainee opts in explicitly.
- Capture: `<input type="file" accept="image/*" capture>` works in the Android WebView. A native camera plugin is not needed. Check the file-chooser behavior on a real device.
- Add to account deletion (delete-account function) if cloud storage is used: remove the user's photo folder, same as the avatar cleanup.
- Add a before/after compare view and optionally a share card (reuse src/lib/share/shareCard.js).

## 2. Server-driven notifications: owner broadcast to all users (WANTED, not deferred)
Owner decision 2026-11-22: he wants the owner broadcast to all users. Firebase project: gymak-9b6bd. The service-account key was requested through a vault link (login entry "Firebase service account gymak-9b6bd", password field holds the JSON). It is write-only: use `tools vault fill` to type it into the Supabase edge function secrets page. Never print it, never put it in chat or the repo. The key is SAVED in the vault (confirmed 2026-11-22 01:45); no need to wait on him for it.
Steps: deploy the edge functions, add the broadcast tables migration (0020+), set the secret, test with a real device token, then flip BROADCAST_ENABLED.

### Also: daily workout reminder
- A local version ALREADY EXISTS: src/lib/push/nativeReminder.js (Capacitor local-notifications, daily repeating alarm) with UI in src/pages/Profile/ReminderSheet.jsx. It needs no backend. Verify it on a real device and in the current APK before building anything new.
- What needs the push backend is a server-driven reminder (smart timing, skip if already trained today, streak-at-risk nudges). That requires:
  - A Firebase service-account secret for the edge functions. Collect it from the owner only through a vault link, never in chat or the repo.
  - Deploy the edge functions (none are deployed today: send-notification, dispatch-batch, dispatch-scheduled, retry-failed-deliveries, get-campaign-analytics, track-event, delete-account) and the broadcast tables, which are missing (planned as migration 0019 originally, but 0019 is now coach_assignments, so use 0020 or later).
  - Client side: @capacitor-firebase/messaging is already a dependency. Token registration is in src/lib/push/pushService.js, hardened by migration 0005.
- The in-app broadcast composer is hidden by `BROADCAST_ENABLED=false` in src/lib/push/ownerBroadcast.js and the delete-account button by `DELETE_ACCOUNT_ENABLED=false` in src/pages/Auth/Account.jsx. Flip them only after the backend is deployed and verified end to end. Do not claim in-app deletion works in any public text before that.
- Native plugin or build changes need a new APK. Web changes go live with the Vercel deploy because the app loads https://gymak-eight.vercel.app.

## 3. Weekly stats summary
- Compute from existing local data (workouts, volume, PRs, water, weight change, streak) in a pure function with tests, like src/lib/water/water.js.
- Surface as a dashboard card and a shareable card (reuse shareCard.js). Optional: a weekly local notification using the same local-notifications plugin as item 2 (Sunday evening). No backend needed.
- Keep copy Arabic-first with an English fallback, in the gold luxe theme (tokens in src/styles/pro.css).

## 4. Coach dashboard (trainees list and progress view)
- The base exists: src/pages/Coach/Coach.jsx and coachApi.js, with coach_links, coach_assignments (0019) and RLS via `coach_can_see`. The coach already sees trainee weight, workouts and PRs through RLS.
- Build: a trainees list with last-active date, current program and weekly adherence, plus a per-trainee progress view with weight trend, PRs and volume charts.
- Check which tables the coach policies cover (0018) before adding queries, and add a read policy in a new migration if a table is missing. Test with the local throwaway Postgres approach: stub the `auth` schema, `auth.uid()`, `auth.jwt()` and roles, then run migrations 0001, 0018 and 0019 and check the RLS behavior. The script is rls-test-0018-0019.py, sent to main.
- Do not widen what the coach can read without the trainee's consent. The privacy page already discloses coach data sharing.

## Standing caveats
- Water, measurements and rest-timer settings are device-local and not synced. A cloud sync for these would need new tables and RLS.
- Share cards use navigator.share with files and fall back to a download. They are untested in a real Android WebView.
- Leaked-password protection and Captcha are off in Supabase Auth. Optional hardening, owner's call.
