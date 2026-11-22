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
# Only the legacy wrapper seed needs internet. Check emulator DNS explicitly;
# ICMP replies are not required, only successful hostname resolution.
adb wait-for-device
adb shell cmd connectivity airplane-mode disable
adb shell svc wifi enable
adb shell settings put global private_dns_mode off
resolved=false
for attempt in 1 2 3 4 5 6 7 8; do
  adb shell ping -c 1 -W 1 gymak-eight.vercel.app > verification/network-before.txt 2>&1 || true
  cat verification/network-before.txt
  if grep -q '^PING ' verification/network-before.txt; then resolved=true; break; fi
  sleep 2
done
if [ "$resolved" != true ]; then echo 'Emulator DNS preflight failed before legacy seeding' >&2; exit 1; fi
curl --fail --location --connect-timeout 15 --max-time 30 --retry 2 https://gymak-eight.vercel.app/ -o /tmp/gymak-live-preflight.html
adb shell wm size 360x800
adb shell wm density 160
curl --fail --location --retry 2 https://github.com/figo231/GYMAK/releases/download/apk-9/GYMAK.apk -o /tmp/gymak-legacy.apk
adb install -r -g /tmp/gymak-legacy.apk
adb install -r -g -t android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
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
adb pull /sdcard/Android/data/com.gymak.app/files/fresh-offline.png verification/fresh-offline.png
