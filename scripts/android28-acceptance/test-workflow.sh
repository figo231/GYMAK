#!/usr/bin/env bash
# Static checks for .github/workflows/android-apk.yml. Executes nothing from the workflow.
f=${1:-.github/workflows/android-apk.yml}; fail=0
bad(){ echo "FAIL: $1"; fail=1; }
grep -nE 'gh release|github\.token|GH_TOKEN|git push|contents: write|id-token|vercel|supabase db|functions deploy|workflow_dispatch|pull_request|schedule:|OTA_PUBLISH|ota-publish' "$f" && bad "publish/deploy/write/other trigger"
grep -nEi 'publish' "$f" && bad "word publish present"
grep -E '^\s*-?\s*uses:' "$f" | grep -vE '@[0-9a-f]{40}( |$)' && bad "unpinned action"
[ "$(grep -c '^permissions:' "$f")" = 1 ] && grep -q '^  contents: read' "$f" || bad "permissions"
awk '/^on:/{p=1;next} /^[a-z]/{p=0} p' "$f" | tr -d ' \n' | grep -qx 'push:branches:\[release/apk28-candidate-ci\]' || bad "trigger must be push to exactly release/apk28-candidate-ci"
grep -q "if: github.ref == 'refs/heads/release/apk28-candidate-ci'" "$f" || bad "ref guard"
[ "$(grep -c 'write-native-trust' "$f")" = 2 ] || bad "native trust step in both jobs"
[ "$(grep -c 'VITE_OTA_ENABLED: "true"' "$f")" = 2 ] || bad "OTA flag in both jobs"
grep -q 'SIGNING CERT MISMATCH' "$f" || bad "cert check"
grep -q 'needs: acceptance' "$f" || bad "real job must need acceptance"
[ "$(grep -c 'verify-structure.sh' "$f")" = 2 ] || bad "structure check in both jobs"
[ "$(grep -c 'upload-artifact@' "$f")" = 2 ] && [ "$(grep -c 'retention-days: 1$' "$f")" = 2 ] || bad "artifacts: exactly 2, retention 1 day"
grep -q "find verification -name '\*.apk' -delete" "$f" || bad "fixture apk must be removed from evidence"
grep -q 'GYMAK_VERSION_CODE=28' "$f" || bad "version code 28"
awk '/^  real:/{r=1} r' "$f" | grep -q 'android-emulator-runner\|native-avatar-fixture' && bad "emulator/fixture in real job"
awk '/^  acceptance:/{a=1} /^  real:/{a=0} a' "$f" | grep -q 'vars.VITE_SUPABASE' && bad "real config in acceptance job"
[ $fail = 0 ] && echo WORKFLOW_STATIC_OK; exit $fail
