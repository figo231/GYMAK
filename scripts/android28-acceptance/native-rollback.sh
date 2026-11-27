#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p verification
salvage() {
  local status=$?
  trap - EXIT
  printf 'exit_status=%s\n' "$status" > verification/rollback-exit-status.txt
  timeout --kill-after=1s 15s bash "$RUNNER_TEMP/collect-evidence.sh" rollback || printf 'evidence_collection_timed_out_or_failed\n' >> verification/rollback-collection-status.txt
  exit "$status"
}
trap salvage EXIT
adb install -r -g /tmp/apk27.apk
adb install -r -g -t android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable
adb shell svc data disable
adb shell am instrument -w -e class com.gymak.app.OfflineUpgradeTest#seedLegacyData com.gymak.app.test/androidx.test.runner.AndroidJUnitRunner > verification/rollback-isolated-seed.txt 2>&1
cat verification/rollback-isolated-seed.txt
grep -q 'OK (1 test)' verification/rollback-isolated-seed.txt
adb shell am force-stop com.gymak.app
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
adb shell am instrument -w -e class com.gymak.app.OfflineUpgradeTest#keepsDataAndRunsOffline com.gymak.app.test/androidx.test.runner.AndroidJUnitRunner > verification/rollback-isolated-upgrade.txt 2>&1
cat verification/rollback-isolated-upgrade.txt
grep -q 'OK (1 test)' verification/rollback-isolated-upgrade.txt
adb shell am force-stop com.gymak.app
adb install -r -d -g /tmp/apk27.apk > verification/downgrade-install.txt 2>&1
adb shell dumpsys package com.gymak.app | grep versionCode > verification/downgrade-version.txt
grep 'versionCode=28' verification/downgrade-version.txt
adb shell am instrument -w -e class com.gymak.app.OfflineUpgradeTest#keepsDataAndRunsOffline com.gymak.app.test/androidx.test.runner.AndroidJUnitRunner > verification/downgrade27.txt 2>&1
cat verification/downgrade27.txt
grep -q 'OK (1 test)' verification/downgrade27.txt
