#!/usr/bin/env bash
set +e
phase="$1"
adb get-state > "verification/$phase-device-state.txt" 2>&1
if grep -qx device "verification/$phase-device-state.txt";then
 adb logcat -d -v threadtime > "verification/$phase-final-logcat.txt" 2>&1
 adb pull /sdcard/Android/data/com.gymak.app/files/ "verification/$phase-final-screens" > "verification/$phase-pull.txt" 2>&1
else
 echo device-unavailable > "verification/$phase-collection-status.txt"
fi
