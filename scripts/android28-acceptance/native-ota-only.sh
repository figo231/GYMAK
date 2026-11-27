#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p verification
salvage() {
  local status=$?
  trap - EXIT
  printf 'exit_status=%s\n' "$status" > verification/ota-only-exit-status.txt
  timeout --kill-after=1s 15s bash "$RUNNER_TEMP/collect-evidence.sh" acceptance || printf 'evidence_collection_timed_out_or_failed\n' >> verification/acceptance-collection-status.txt
  exit "$status"
}
trap salvage EXIT
mkdir -p verification
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
adb install -r -g -t android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable
adb shell svc data disable
adb shell pm grant com.gymak.app android.permission.POST_NOTIFICATIONS
adb shell am instrument -w -e class com.gymak.app.OfflineUpgradeTest#freshOfflineInstall,com.gymak.app.FinalCandidateTest,com.gymak.app.Apk27ReminderTest,com.gymak.app.OtaCryptoTest com.gymak.app.test/androidx.test.runner.AndroidJUnitRunner > verification/final-native.txt 2>&1
cat verification/final-native.txt
grep -q 'OK (4 tests)' verification/final-native.txt
adb shell am instrument -w -e class com.gymak.app.AvatarFullPhotoTest com.gymak.app.test/androidx.test.runner.AndroidJUnitRunner > verification/avatar-storage.txt
cat verification/avatar-storage.txt
grep -q 'OK (2 tests)' verification/avatar-storage.txt
timeout --kill-after=1s 15s adb pull /sdcard/Android/data/com.gymak.app/files/ verification/screens
adb shell am instrument -w -e class com.gymak.app.MainScreensThemeTest com.gymak.app.test/androidx.test.runner.AndroidJUnitRunner > verification/main-themes.txt 2>&1
cat verification/main-themes.txt
timeout --kill-after=1s 15s adb pull /sdcard/Android/data/com.gymak.app/files/ verification/main-screens
grep -q 'OK (1 test)' verification/main-themes.txt
adb shell am instrument -w -e class com.gymak.app.OfflineUpgradeTest#seedLegacyData com.gymak.app.test/androidx.test.runner.AndroidJUnitRunner > verification/ota-seed.txt 2>&1
grep -q 'OK (1 test)' verification/ota-seed.txt
adb logcat -c
adb shell am instrument -w -e class com.gymak.app.OtaRollbackTest#encryptedDownloadUnzipRejectsCorruptionAndPreservesData com.gymak.app.test/androidx.test.runner.AndroidJUnitRunner > verification/ota-transport.txt
timeout --kill-after=1s 15s adb logcat -d -v threadtime > verification/ota-transport-logcat.txt
cat verification/ota-transport.txt
grep -q 'OK (1 test)' verification/ota-transport.txt
# Read-only evidence after transport instrumentation teardown, before cold bootstrap.
python3 - <<'PY2'
import re,json
s=open('verification/ota-transport-logcat.txt').read()
x=re.findall(r'OTA_STAGED_STATE=(\{.*)',s)
assert x,'missing staged diagnostic output'
d=json.loads(x[-1]);candidate=json.loads(d['staged'])['id'];open('verification/ota-candidate.txt','w').write(candidate)
PY2
candidate=$(cat verification/ota-candidate.txt)
# Chromium writes localStorage to disk a few seconds after the page sets it.
# Force-stopping before that loses the staged key and the cold start has nothing to activate.
# Poll the on-disk log until the candidate is recorded (max about 45s), then continue.
flushed=no
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  rm -rf verification/ota-after-close-storage verification/ota-after-close-storage.tar
  adb exec-out "run-as com.gymak.app tar -cf - 'app_webview/Default/Local Storage/leveldb'" > verification/ota-after-close-storage.tar
  mkdir -p verification/ota-after-close-storage
  tar -xf verification/ota-after-close-storage.tar -C verification/ota-after-close-storage
  if python3 "$RUNNER_TEMP/read-activation-wal.py" verification/ota-after-close-storage "$candidate" > verification/ota-after-close-storage.json; then flushed=yes; break; fi
  sleep 3
done
echo "staged key flushed to disk before force-stop: $flushed (attempts: $attempt)"
test "$flushed" = yes
adb shell run-as com.gymak.app find files/versions/"$candidate" -type f > verification/ota-bundle-files.txt
adb exec-out run-as com.gymak.app cat files/versions/"$candidate"/index.html | sha256sum > verification/ota-bundle-after-close.sha256
adb shell am force-stop com.gymak.app
adb shell am instrument -w -e class com.gymak.app.OtaRollbackTest#activatesPipelineOnNextColdStart com.gymak.app.test/androidx.test.runner.AndroidJUnitRunner > verification/ota-activation.txt
timeout --kill-after=1s 15s adb logcat -d -v threadtime > verification/ota-activation-logcat.txt
cat verification/ota-activation.txt
grep -q 'OK (1 test)' verification/ota-activation.txt
adb exec-out run-as com.gymak.app cat files/versions/"$candidate"/index.html | sha256sum > verification/ota-bundle-after-cold.sha256
cmp verification/ota-bundle-after-close.sha256 verification/ota-bundle-after-cold.sha256
adb shell am instrument -w -e class com.gymak.app.OtaRollbackTest#switchesGoodBundleAndRollsBackUnreadyBundleWithoutDataLoss com.gymak.app.test/androidx.test.runner.AndroidJUnitRunner > verification/ota-rollback.txt
timeout --kill-after=1s 15s adb logcat -d -v threadtime > verification/ota-rollback-logcat.txt
cat verification/ota-rollback.txt
grep -q 'OK (1 test)' verification/ota-rollback.txt
echo "OTA-only acceptance finished OK (no upgrade over APK 28, no production certificate)"
