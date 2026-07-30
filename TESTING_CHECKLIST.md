# GYMAK v1.0.0-beta.1 — Manual Testing Checklist

For each item: mark Status as ✅ Pass / ❌ Fail / ⚠️ Partial, and note the
device/Android version tested on if it fails.

## Authentication

- ☐ Test: Register a new account with email + password
  ☐ Expected: Account created, redirected into the app signed in
  ☐ Status:
- ☐ Test: Sign in with an existing account
  ☐ Expected: Signed in, previously synced data appears
  ☐ Status:
- ☐ Test: Sign in with wrong password
  ☐ Expected: Clear Arabic error message, no crash
  ☐ Status:
- ☐ Test: "Forgot password" flow end to end
  ☐ Expected: Reset email received, new password works
  ☐ Status:
- ☐ Test: Sign out
  ☐ Expected: Returns to signed-out state; local data on the device remains intact
  ☐ Status:

## Offline mode

- ☐ Test: Fresh install, never sign in, use the app fully offline
  ☐ Expected: Every feature (logging weight/exercise/food, viewing stats) works with no account
  ☐ Status:
- ☐ Test: Turn on airplane mode mid-session, keep using the app
  ☐ Expected: No crash, no error banner spam; data keeps saving locally
  ☐ Status:

## Sync

- ☐ Test: Log data on Device A while signed in, open Device B (same account)
  ☐ Expected: Device B shows the new data after a sync cycle, without needing to restart the app
  ☐ Status:
- ☐ Test: Have Dashboard open on Device B while Device A logs new data
  ☐ Expected: Device B's Dashboard updates live, no manual refresh needed
  ☐ Status:
- ☐ Test: Sign in for the first time on a device that already has local (guest) data
  ☐ Expected: One-time migration uploads existing local data to the new account without duplicating it
  ☐ Status:
- ☐ Test: Go offline, log several entries, come back online
  ☐ Expected: All offline entries sync up once connectivity returns
  ☐ Status:

## Profile

- ☐ Test: Edit name/bio/height/gender
  ☐ Expected: Saves and persists after closing/reopening the app
  ☐ Status:
- ☐ Test: View achievements/badges screen
  ☐ Expected: Reflects actual logged history accurately
  ☐ Status:

## Avatar upload

- ☐ Test: Upload avatar while signed in and online
  ☐ Expected: New photo appears immediately, persists after reopening the app
  ☐ Status:
- ☐ Test: Upload avatar while offline (or not signed in)
  ☐ Expected: Photo still saves and displays normally, no error shown
  ☐ Status:
- ☐ Test: Replace an existing avatar with a new one
  ☐ Expected: Old photo is fully replaced everywhere it's shown (no stale cached image)
  ☐ Status:
- ☐ Test: Try uploading a very large image file
  ☐ Expected: Clear "file too large" message, no crash
  ☐ Status:
- ☐ Test: Try uploading a non-image file (renamed extension)
  ☐ Expected: Rejected with a clear message
  ☐ Status:

## Exercises

- ☐ Test: Browse exercise library by muscle group
  ☐ Expected: Filters correctly, all exercises show their info/media
  ☐ Status:
- ☐ Test: Add a custom exercise
  ☐ Expected: Appears in the list immediately, persists after reopening
  ☐ Status:
- ☐ Test: Log a set (weight/reps/sets) for an exercise
  ☐ Expected: Saved, reflected in Stats and streak
  ☐ Status:

## Weight logs

- ☐ Test: Log today's weight
  ☐ Expected: Updates Dashboard's latest weight and weekly diff immediately
  ☐ Status:
- ☐ Test: Log weight twice in the same day
  ☐ Expected: Second entry updates the same day's record rather than creating a duplicate
  ☐ Status:

## Food logs

- ☐ Test: Log a meal with calories/macros
  ☐ Expected: Saved and reflected in the day's totals
  ☐ Status:

## Statistics

- ☐ Test: Open Stats after logging data elsewhere in the same session
  ☐ Expected: Reflects the new data without needing to restart the app
  ☐ Status:
- ☐ Test: Switch between time periods (e.g. 7/30/90 days)
  ☐ Expected: Numbers recalculate correctly for each period
  ☐ Status:

## Android lifecycle

- ☐ Test: Put the app in the background mid-workout-log, then return to it
  ☐ Expected: State is preserved, no data loss
  ☐ Status:
- ☐ Test: Force-close the app and reopen
  ☐ Expected: All previously saved data is intact
  ☐ Status:
- ☐ Test: Rotate the device (if orientation change is allowed)
  ☐ Expected: No crash, no lost input
  ☐ Status:

## Network interruption

- ☐ Test: Lose connection mid-sync
  ☐ Expected: No crash; sync retries automatically once connection returns
  ☐ Status:
- ☐ Test: Lose connection mid-avatar-upload
  ☐ Expected: Falls back gracefully to local photo storage, no stuck loading state
  ☐ Status:

## Storage

- ☐ Test: Use the app heavily for a simulated long period (many logs) if possible
  ☐ Expected: No noticeable slowdown opening Dashboard/Stats/Profile
  ☐ Status:
- ☐ Test: Check device storage settings — app data size seems reasonable
  ☐ Expected: No unexpectedly large storage usage
  ☐ Status:

## Performance

- ☐ Test: App cold start time (icon tap to usable Dashboard)
  ☐ Expected: Feels responsive, no long blank/frozen screen
  ☐ Status:
- ☐ Test: Navigating between tabs repeatedly
  ☐ Expected: Smooth, no visible lag or jank
  ☐ Status:
