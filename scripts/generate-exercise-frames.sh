#!/usr/bin/env bash
# Downloads the two licensed demo frames per built-in exercise from
# yuhonas/free-exercise-db (The Unlicense) at a pinned commit, downscales them
# to WebP and writes them to public/exercises/<id>/{0,1}.webp so the exercise
# demos are bundled locally (offline-first) instead of hot-linked to jsDelivr.
#
# Requires: curl, ffmpeg (libwebp). Idempotent: existing files are skipped.
# Usage: ./scripts/generate-exercise-frames.sh
set -euo pipefail
cd "$(dirname "$0")/.."
COMMIT="f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5"
BASE="https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/exercises"
OUT="public/exercises"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# id -> free-exercise-db slug, extracted from src/lib/exerciseImages.js
grep -oE '^\s*"[^"]+": "[^"]+"' src/lib/exerciseImages.js | tr -d ' ",' | while IFS=: read -r id slug; do
  [ -f "$OUT/$id/0.webp" ] && [ -f "$OUT/$id/1.webp" ] && continue
  mkdir -p "$OUT/$id"
  for n in 0 1; do
    jpg="$TMP/$id-$n.jpg"
    if ! curl -sfL "$BASE/$slug/$n.jpg" -o "$jpg"; then
      echo "MISS $id ($slug/$n.jpg)"; rm -rf "$OUT/$id"; break
    fi
    ffmpeg -nostdin -y -loglevel error -i "$jpg" -vf "scale=480:-2:flags=lanczos" -c:v libwebp -quality 72 "$OUT/$id/$n.webp"
  done
done
echo "done. $(find "$OUT" -name '*.webp' | wc -l) files, $(du -sh "$OUT" | cut -f1)"
