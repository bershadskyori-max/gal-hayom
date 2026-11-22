#!/usr/bin/env bash
# Builds in-this-town.mp4 (1080x1920, 30fps, 15s).
# Needs: node + playwright (chromium), python3 + numpy + scipy, ffmpeg, mbrola + mbrola-es1.
set -euo pipefail
cd "$(dirname "$0")"
WORK=${WORK:-build}
mkdir -p "$WORK"
if [ ! -d vendor/three ]; then
  mkdir -p vendor/fonts && (cd "$WORK" && npm pack three@0.170.0 @fontsource/luckiest-guy@5.1.0 @fontsource/heebo@5.1.0 >/dev/null)
  for f in "$WORK"/*.tgz; do mkdir -p "${f%.tgz}" && tar xzf "$f" -C "${f%.tgz}"; done
  cp -r "$WORK"/three-0.170.0/package vendor/three
  cp "$WORK"/fontsource-luckiest-guy-5.1.0/package/files/luckiest-guy-latin-400-normal.woff2 \
     "$WORK"/fontsource-heebo-5.1.0/package/files/heebo-{hebrew,latin}-900-normal.woff2 vendor/fonts/
fi
python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 & SRV=$!
trap 'kill $SRV' EXIT
sleep 1
rm -rf "$WORK/frames"
for i in 0 1 2 3; do a=$((i*113)); b=$(( (i+1)*113 )); [ $b -gt 450 ] && b=450; node render.js "$WORK/frames" 30 $a $b & done
wait
python3 audio.py "$WORK/audio" "$WORK/soundtrack.wav"
ffmpeg -y -v error -framerate 30 -i "$WORK/frames/f%04d.jpg" -i "$WORK/soundtrack.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k \
  -movflags +faststart -shortest in-this-town.mp4
echo "done: in-this-town.mp4"
