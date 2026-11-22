#!/usr/bin/env bash
# Builds fridge-light-guy.mp4 (1080x1920, 30fps, 15s).
# Needs: node + playwright (chromium), python3 + numpy scipy soundfile kokoro-onnx, espeak-ng, ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
WORK=${WORK:-build}; mkdir -p "$WORK/kokoro"
if [ ! -d vendor/three ]; then
  mkdir -p vendor/fonts && (cd "$WORK" && npm pack three@0.170.0 @fontsource/luckiest-guy@5.1.0 >/dev/null)
  for f in "$WORK"/*.tgz; do mkdir -p "${f%.tgz}" && tar xzf "$f" -C "${f%.tgz}"; done
  cp -r "$WORK"/three-0.170.0/package vendor/three
  cp "$WORK"/fontsource-luckiest-guy-5.1.0/package/files/luckiest-guy-latin-400-normal.woff2 vendor/fonts/
fi
for f in kokoro-v1.0.int8.onnx voices-v1.0.bin; do
  [ -f "$WORK/kokoro/$f" ] || curl -sSL -o "$WORK/kokoro/$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
done
python3 -m http.server 8766 --bind 127.0.0.1 >/dev/null 2>&1 & SRV=$!; trap 'kill $SRV' EXIT; sleep 1
rm -rf "$WORK/frames"
for i in 0 1 2 3; do a=$((i*113)); b=$(( (i+1)*113 )); [ $b -gt 450 ] && b=450; node render.js "$WORK/frames" 30 $a $b 8766 & done
python3 tts.py "$WORK/kokoro" "$WORK/voice"
python3 audio.py "$WORK/voice" "$WORK/soundtrack.wav"
wait
ffmpeg -y -v error -framerate 30 -i "$WORK/frames/f%04d.jpg" -i "$WORK/soundtrack.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k \
  -movflags +faststart -shortest fridge-light-guy.mp4
echo "done: fridge-light-guy.mp4"
