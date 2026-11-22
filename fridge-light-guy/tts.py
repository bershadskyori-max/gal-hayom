"""Narration + chant with the Kokoro neural TTS (am_onyx = deep trailer voice).
Usage: python3 tts.py <kokoro_dir> <out_dir>"""
import sys, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
kd, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
k = Kokoro(os.path.join(kd, "kokoro-v1.0.int8.onnx"), os.path.join(kd, "voices-v1.0.bin"))
LINES = {
    "l1": ("You think the fridge light turns on by itself?", "am_onyx", 1.0),
    "l2": ("Meet Gary.", "am_onyx", 0.9),
    "l3": ("Night shift. Forty seven openings. Zero breaks.", "am_onyx", 1.05),
    "l4": ("And some of them... just stare.", "am_onyx", 0.98),
    "l5": ("But when the door closes...", "am_onyx", 1.12),
}
CHANT = ["am_puck", "am_fenrir", "am_eric", "bm_lewis", "af_bella", "af_nicole", "am_liam"]
def trim(a, th=0.01):
    idx = np.where(np.abs(a) > th)[0]
    return a[max(0, idx[0] - 240): idx[-1] + 2400] if len(idx) else a
for n, (txt, v, sp) in LINES.items():
    a, sr = k.create(txt, voice=v, speed=sp, lang="en-us")
    a = trim(a); sf.write(os.path.join(out, n + ".wav"), a, sr); print(n, round(len(a) / sr, 2))
for i, v in enumerate(CHANT):
    a, sr = k.create("Lights out!", voice=v, speed=1.15, lang="en-us")
    sf.write(os.path.join(out, f"chant{i}.wav"), trim(a), sr)
print("chant voices", len(CHANT))
