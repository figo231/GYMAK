#!/usr/bin/env bash
# Only runs on an isolated CI emulator, never on a person's phone.
set -euo pipefail
mkdir -p verification
trap 'adb pull /sdcard/Android/data/com.gymak.app/files/condition-failure.png verification/condition-failure.png || true; adb exec-out screencap -p > verification/last-screen.png || true' EXIT
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

# Also exercise the version people currently have, not only the old web wrapper.
adb shell cmd connectivity airplane-mode disable
adb shell svc wifi enable
curl --fail --location --retry 2 https://github.com/figo231/GYMAK/releases/download/apk-15/GYMAK.apk -o /tmp/gymak-previous.apk
adb uninstall com.gymak.app.test
adb uninstall com.gymak.app
adb install -r -g /tmp/gymak-previous.apk
adb install -r -g -t android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
run_test seedLegacyData
cp verification/seedLegacyData.txt verification/apk15-seed.txt
adb shell am force-stop com.gymak.app
adb shell svc wifi disable
adb shell svc data disable
adb shell cmd connectivity airplane-mode enable
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
run_test keepsDataAndRunsOffline
cp verification/keepsDataAndRunsOffline.txt verification/apk15-upgrade.txt
adb pull /sdcard/Android/data/com.gymak.app/files/offline-upgrade.png verification/apk15-offline-upgrade.png

# Verify the immediately previous APK16 as well.
adb shell cmd connectivity airplane-mode disable
adb shell svc wifi enable
curl --fail --location --retry 2 https://github.com/figo231/GYMAK/releases/download/apk-16/GYMAK.apk -o /tmp/gymak-apk16.apk
adb uninstall com.gymak.app.test
adb uninstall com.gymak.app
adb install -r -g /tmp/gymak-apk16.apk
adb install -r -g -t android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
run_test seedLegacyData
cp verification/seedLegacyData.txt verification/apk16-seed.txt
adb shell am force-stop com.gymak.app
adb shell svc wifi disable
adb shell svc data disable
adb shell cmd connectivity airplane-mode enable
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
run_test keepsDataAndRunsOffline
cp verification/keepsDataAndRunsOffline.txt verification/apk16-upgrade.txt
adb pull /sdcard/Android/data/com.gymak.app/files/offline-upgrade.png verification/apk16-offline-upgrade.png

# APK18 candidate must preserve the current published APK17's data as well.
adb shell cmd connectivity airplane-mode disable
adb shell svc wifi enable
curl --fail --location --retry 2 https://github.com/figo231/GYMAK/releases/download/apk-17/GYMAK.apk -o /tmp/gymak-apk17.apk
# Reset only the isolated CI fixture between separate scenarios, never user data.
adb uninstall com.gymak.app.test
adb uninstall com.gymak.app
adb install -r -g /tmp/gymak-apk17.apk
adb install -r -g -t android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
run_test seedLegacyData
cp verification/seedLegacyData.txt verification/apk17-seed.txt
adb shell am force-stop com.gymak.app
adb shell svc wifi disable
adb shell svc data disable
adb shell cmd connectivity airplane-mode enable
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
run_test keepsDataAndRunsOffline
cp verification/keepsDataAndRunsOffline.txt verification/apk17-upgrade.txt
adb pull /sdcard/Android/data/com.gymak.app/files/offline-upgrade.png verification/apk17-offline-upgrade.png

# Signature contract against the exact native updater dependency.
adb shell am instrument -w -e class com.gymak.app.OtaCryptoTest com.gymak.app.test/androidx.test.runner.AndroidJUnitRunner | tee verification/ota-crypto.txt
grep -q 'OK (1 test)' verification/ota-crypto.txt

# Fresh instrumentation process gets one activation slot, reload never gets another.
run_test otaActivationOnlyOncePerProcess
