#!/usr/bin/env bash
# Commit 1 (HEAD~2) must be the exact product tree. Commit 2 (HEAD~1) may touch only test paths.
# Commit 3 (HEAD) may touch only the workflow and this script folder.
set -euo pipefail
WANT=12d1f0617bf17c8369887d81fb6214b835bdb2a7
test "$(git rev-parse 'HEAD~2^{tree}')" = "$WANT" || { echo "product tree mismatch" >&2; exit 1; }
test "$(git rev-parse 'HEAD~3')" = "eeb8dcf9d190546fca95c49a2a3e0a33f3b64f09" || { echo "base is not apk-26" >&2; exit 1; }
bad=$(git diff --name-only HEAD~2 HEAD~1 | grep -vE '^(android/app/src/androidTest/java/com/gymak/app/(AvatarFullPhotoTest|FinalCandidateTest|MainScreensThemeTest|OfflineUpgradeTest|OtaRollbackTest)\.java|scripts/android28-acceptance/[^/]+|tests/(applock|ota-food-readiness)\.test\.js)$' || true)
test -z "$bad" || { echo "commit 2 touches non-test paths: $bad" >&2; exit 1; }
bad=$(git diff --name-only HEAD~1 HEAD | grep -vE '^(\.github/workflows/android-apk\.yml|vercel\.json|scripts/android28-acceptance/[^/]+)$' || true)
test -z "$bad" || { echo "commit 3 touches unexpected paths: $bad" >&2; exit 1; }
git diff HEAD~1 HEAD -- vercel.json | grep '^[-+]' | grep -vE '^(\+\+\+|---)' | grep -qvE '^\+\s+"release/apk28-candidate-ci": false,$' && { echo 'vercel.json: only the one skip line may change' >&2; exit 1; }
grep -q '"release/apk28-candidate-ci": false' vercel.json || { echo 'vercel skip line missing' >&2; exit 1; }
echo STRUCTURE_OK
