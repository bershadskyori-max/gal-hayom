"""Soundtrack for "Fridge Light Guy". Usage: python3 audio.py <voice_dir> <out.wav>"""
import sys, os
import numpy as np
from scipy import signal
from scipy.io import wavfile
import soundfile as sf

SR = 44100
N = int(SR * 15.0)
rng = np.random.default_rng(5)
vdir, out_path = sys.argv[1], sys.argv[2]
tt = np.arange(N) / SR


def t_arr(d): return np.arange(int(d * SR)) / SR
def place(buf, x, at, g=1.0):
    i = int(at * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i]; buf[i:i + len(x)] += x * g
def filt(x, kind, f, order=2):
    b, a = signal.butter(order, np.array(f) / (SR / 2), kind); return signal.lfilter(b, a, x)
def note(n): return 440.0 * 2 ** ((n - 69) / 12)
def saw(f, t): return 2 * ((f * t) % 1.0) - 1
def ramp(a, b, t=tt): return np.clip((t - a) / (b - a), 0, 1)
def noise(d): return rng.standard_normal(int(d * SR))


# ---------- instruments ----------
def kick(p=1.0):
    t = t_arr(0.4); ph = 2 * np.pi * np.cumsum(45 + 120 * np.exp(-t * 30)) / SR
    x = np.sin(ph) * np.exp(-t * 8); x[:150] += np.linspace(0.5, 0, 150); return np.tanh(x * 1.5 * p)
def clap():
    t = t_arr(0.22); n = filt(noise(0.22), 'band', [900, 3500])
    env = sum((t >= d) * np.exp(-(t - d).clip(0) * (60 if d < 0.02 else 13)) for d in (0, 0.01, 0.02)); return n * env * 0.8
def hat(o=False):
    t = t_arr(0.22 if o else 0.05); return filt(noise(len(t) / SR), 'high', 7000) * np.exp(-t * (15 if o else 75)) * 0.3
def snare():
    t = t_arr(0.18); return (filt(noise(0.18), 'band', [1500, 6000]) * 0.6 + np.sin(2 * np.pi * 190 * t) * 0.5) * np.exp(-t * 22) * 0.6
def pizz(f, d=0.25):
    t = t_arr(d); x = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) + 0.15 * saw(f, t)); return x * np.exp(-t * 16) * 0.35
def glock(f, d=0.6):
    t = t_arr(d); x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 8); return x * np.exp(-t * 5) * 0.18
def marimba(f, d=0.2):
    t = t_arr(d); x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 40); return x * np.exp(-t * 18) * 0.25
def bass(f, d, open_=900):
    t = t_arr(d); x = saw(f, t) + 0.6 * saw(f * 1.006, t) + 0.8 * np.sin(np.pi * f * t)
    return filt(x, 'low', open_) * np.minimum(1, t / 0.004) * np.exp(-t * 2.5) * 0.45
def stab(fs, d=0.22):
    t = t_arr(d); x = sum(saw(f, t) + saw(f * 1.01, t) for f in fs) / len(fs)
    return filt(x, 'low', 3200) * np.exp(-t * 9) * 0.28
def click(g=1.0, f=3000):
    t = t_arr(0.03); return filt(noise(0.03), 'band', [f * 0.6, f * 1.6]) * np.exp(-t * 250) * g
def thwop():  # fridge door suction release
    t = t_arr(0.35); f = 160 * np.exp(-t * 6) + 50
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12) * 0.7 + filt(noise(0.35), 'band', [200, 1200]) * np.exp(-t * 20) * 0.4)
def thump():
    t = t_arr(0.4); return np.sin(2 * np.pi * np.cumsum(70 + 60 * np.exp(-t * 25)) / SR) * np.exp(-t * 14) * 0.9 + click(0.3, 1500)[:len(t)].sum() * 0
def pop(f=1400):
    t = t_arr(0.08); return np.sin(2 * np.pi * np.cumsum(f * (1 + 2 * np.exp(-t * 60))) / SR) * np.exp(-t * 45) * 0.25
def reverb(x, secs=0.8, mix=0.2):
    t = t_arr(secs); ir = filt(rng.standard_normal(len(t)) * np.exp(-t * 7), 'low', 5000)
    w = signal.fftconvolve(x, ir)[: len(x)]; w *= np.max(np.abs(x)) / (np.max(np.abs(w)) + 1e-9); return x * (1 - mix) + w * mix


music = np.zeros(N); sfx = np.zeros(N); drop = np.zeros(N); amb = np.zeros(N)
B = 0.5
# ---- 0 - 1.35: sneaky pizzicato in the dark ----
sneak = [45, None, 48, None, 50, 51, 52, None]
for i, n in enumerate(sneak):
    if n: place(music, pizz(note(n)), 0.05 + i * 0.25, 0.9)
# ---- 1.35 - 4.8: curious glockenspiel + pizz bass ----
mel = [76, 79, 81, 79, 76, 72, 74, 76, 79, 84, 83, 81, 79]
for i, n in enumerate(mel):
    place(music, glock(note(n)), 1.5 + i * 0.25, 1.0)
for i in range(7):
    place(music, pizz(note([45, 52, 45, 52, 43, 50, 45][i])), 1.5 + i * 0.5, 0.8)
# ---- 4.8 - 8.4: busy montage (marimba 16ths + snare) ----
scale = [69, 72, 74, 76, 79, 81]
for i in range(int(3.6 / 0.125)):
    tt0 = 4.8 + i * 0.125
    place(music, marimba(note(scale[(i * 3 + i // 4) % 6])), tt0, 0.9)
    if i % 4 == 0: place(music, kick(0.7), tt0, 0.5)
    if i % 8 == 4: place(music, snare(), tt0, 0.6)
    if i % 2 == 1: place(music, hat(), tt0, 0.5)
    if i % 4 == 0: place(music, bass(note([45, 45, 48, 43][(i // 8) % 4] - 12), 0.4, 600), tt0, 0.8)
for c in range(6):
    t0 = 4.8 + c * 0.6
    place(sfx, thwop(), t0, 0.5)
    for s in range(7): place(sfx, click(0.35, 2500 + 400 * (s % 2)), t0 + 0.08 + s * 0.026)  # tiny footsteps
    place(sfx, click(0.9, 4000), t0 + 0.25)  # light click on
    place(sfx, thump(), t0 + 0.52, 0.45)  # flop into bed / door shut
# needle stop at 8.4
t = t_arr(0.3); place(sfx, np.sin(2 * np.pi * np.cumsum(400 * np.exp(-t * 10)) / SR) * np.exp(-t * 8) * 0.25, 8.38)
# ---- ambience: fridge hum (louder while open) ----
t = tt
hum = (np.sin(2 * np.pi * 60 * t) * 0.5 + np.sin(2 * np.pi * 120 * t) * 0.3 + np.sin(2 * np.pi * 180 * t) * 0.1) * 0.06
hum_gain = 0.6 + 0.8 * ramp(1.35, 1.5) - 0.8 * ramp(11.4, 11.5) - 0.6 * ramp(11.6, 12.2)
amb += hum * np.clip(hum_gain, 0, 2)
# crickets at the start
for c in np.arange(0.1, 1.4, 0.4):
    for j in range(3):
        tc = t_arr(0.03); place(amb, np.sin(2 * np.pi * 4500 * tc) * np.sin(np.pi * tc / 0.03) * 0.05, c + j * 0.045)
# door open at 1.35 + light click
place(sfx, thwop(), 1.33, 0.8); place(sfx, click(1.0, 4000), 1.47)
# giant breathing 8.4 - 11
for b0 in (8.5, 9.6):
    d = 1.0; tb = t_arr(d)
    place(sfx, filt(noise(d), 'band', [150, 900]) * np.sin(np.pi * tb / d) ** 2 * 0.35, b0)
# sigh 10.6
d = 0.7; tb = t_arr(d); place(sfx, filt(noise(d), 'band', [200, 1400]) * np.sin(np.pi * tb / d) * np.exp(-tb * 1.5) * 0.5, 10.55)
# flicker buzz 10.1 - 11
d = 0.9; tb = t_arr(d); bz = np.sign(np.sin(2 * np.pi * 100 * tb)) * 0.05 * (np.sin(2 * np.pi * 13 * tb) > 0.2)
place(sfx, filt(bz, 'low', 2500), 10.1)
# door closing swoosh + thump + light off
d = 0.45; tb = t_arr(d); place(sfx, filt(noise(d), 'band', [300, 2500]) * np.sin(np.pi * tb / d) * 0.35, 11.0)
place(sfx, thump(), 11.43, 1.0); place(sfx, click(0.8, 3500), 11.46)
# grin "ding" + eyes popping open in the dark
place(sfx, glock(note(88), 0.8), 11.9, 1.2)
for i in range(10): place(sfx, pop(1200 + i * 90), 12.0 + i * 0.05, 1.0)
# hidden switch click
place(sfx, click(1.2, 2500), 12.42); place(sfx, click(1.0, 1800), 12.47)

# ---- DROP 12.5 - 15: house ----
D0 = 12.5
place(drop, filt(noise(1.2), 'high', 4000) * np.exp(-t_arr(1.2) * 2.5) * 0.4, D0)
chords = [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62], [57, 60, 64]]
for i in range(5):
    b = D0 + i * B
    place(drop, kick(1.3), b, 1.0)
    place(drop, hat(True), b + 0.25, 0.6)
    if i % 2 == 1: place(drop, clap(), b, 0.9)
    place(drop, bass(note(chords[i][0] - 24), 0.24, 1200), b + 0.25, 1.4)
    for s in (0, 0.25 * 1.5):
        place(drop, stab([note(n) for n in chords[i]]), b + s, 1.0)
for i in range(20): place(drop, hat(), D0 + i * 0.125, 0.4)
# crowd chant "Lights out!"
chant = None
for i in range(7):
    a, sr = sf.read(os.path.join(vdir, f"chant{i}.wav"))
    a = signal.resample_poly(a, SR, sr)
    a = np.concatenate([np.zeros(int(rng.uniform(0, 0.025) * SR)), a])
    chant = a if chant is None else (np.pad(chant, (0, max(0, len(a) - len(chant)))) + np.pad(a, (0, max(0, len(chant) - len(a)))))
chant = reverb(chant / np.max(np.abs(chant)), 0.6, 0.25)
for at in (12.62, 14.12):
    place(drop, chant, at, 0.85)

# ---------- voice ----------
voice = np.zeros(N)
def vo(name, at, g=1.0):
    a, sr = sf.read(os.path.join(vdir, name + ".wav")); a = signal.resample_poly(a, SR, sr)
    a = filt(a, 'high', 70); a = a + 0.35 * filt(a, 'band', [90, 250])  # chest
    a = reverb(a / np.max(np.abs(a)), 0.9, 0.12); place(voice, a, at, g)
vo('l1', 0.2); vo('l2', 3.5); vo('l3', 4.9); vo('l4', 8.55); vo('l5', 11.0, 0.95)

# ---------- mix ----------
act = np.convolve((np.abs(voice) > 0.03).astype(float), np.ones(6000) / 6000, 'same')
duck = 1 - 0.5 * np.clip(act * 3, 0, 1)
mus_gain = (1 - ramp(8.38, 8.45)) * 0.75
mix = music * mus_gain * duck + sfx * 0.9 + amb + drop * ramp(12.45, 12.5) * 0.55 + voice * 0.95
mix = np.tanh(mix * 1.2)
L = mix; R = np.concatenate([np.zeros(15), mix[:-15]]) * 0.96 + mix * 0.04
st = np.stack([L, R], 1)
st *= 0.66 / np.max(np.abs(st))
st[-int(0.08 * SR):] *= np.linspace(1, 0, int(0.08 * SR))[:, None]
wavfile.write(out_path, SR, (st * 32767).astype(np.int16))
print("wrote", out_path)
