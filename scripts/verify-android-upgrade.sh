#!/usr/bin/env bash
# Only runs on an isolated CI emulator, never on a person's phone.
set -euo pipefail
mkdir -p verification
trap 'adb exec-out screencap -p > verification/last-screen.png || true' EXIT
run_test() {
  local method="$1"
  adb shell am instrument -w -e class "com.gymak.app.OfflineUpgradeTest#$method" com.gymak.app.test/androidx.test.runner.AndroidJUnitRunner | tee "verification/$method.txt"
  grep -q 'OK (1 test)' "verification/$method.txt"
}
adb shell wm size 360x800
adb shell wm density 160
curl --fail --location --retry 2 https://github.com/figo231/GYMAK/releases/download/apk-9/GYMAK.apk -o /tmp/gymak-legacy.apk
adb install -r -g /tmp/gymak-legacy.apk
adb install -r -g android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
run_test seedLegacyData
adb shell am force-stop com.gymak.app
adb shell svc wifi disable
adb shell svc data disable
adb shell cmd connectivity airplane-mode enable
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
run_test keepsDataAndRunsOffline
adb pull /sdcard/Android/data/com.gymak.app/files/offline-upgrade.png verification/offline-upgrade.png
# A second test covers a completely fresh offline install, not only a warm cache.
adb shell am force-stop com.gymak.app
adb shell pm clear com.gymak.app
run_test freshOfflineInstall
adb exec-out screencap -p > verification/fresh-offline.png
