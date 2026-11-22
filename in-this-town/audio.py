"""Soundtrack for "In this town": 120 BPM electro beat, muffled section, comic silence,
curtain whoosh, crazy drop with "HUSS" chops, and deep Hebrew narration (espeak/mbrola-free:
phonemes are fed straight to the mbrola es1 voice so the Hebrew vowels come out right).
Usage: python3 audio.py <workdir> <out.wav>
"""
import subprocess, sys, os
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
DUR = 15.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(3)
work, out_path = sys.argv[1], sys.argv[2]
os.makedirs(work, exist_ok=True)


def t_arr(d):
    return np.arange(int(d * SR)) / SR


def place(buf, x, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    x = x[: len(buf) - i]
    buf[i:i + len(x)] += x * gain


def lp(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def hp(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def bp(x, f1, f2, order=2):
    b, a = signal.butter(order, [f1 / (SR / 2), f2 / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def note(n):  # midi -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)


def saw(f, t):
    return 2 * ((f * t) % 1.0) - 1


# ---------- drum voices ----------
def kick(punch=1.0):
    t = t_arr(0.45)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7.5)
    x[:200] += np.linspace(0.6, 0, 200) * punch
    return np.tanh(x * 1.6 * punch)


def clap():
    t = t_arr(0.25)
    n = bp(rng.standard_normal(len(t)), 900, 3500)
    env = np.zeros_like(t)
    for d in (0, 0.011, 0.022):
        env += (t >= d) * np.exp(-(t - d).clip(0) * (60 if d < 0.02 else 14))
    return n * env * 0.9


def hat(open_=False):
    t = t_arr(0.25 if open_ else 0.06)
    n = hp(rng.standard_normal(len(t)), 7000)
    return n * np.exp(-t * (14 if open_ else 70)) * 0.35


def crash():
    t = t_arr(1.6)
    n = hp(rng.standard_normal(len(t)), 4000)
    return n * np.exp(-t * 2.6) * 0.35


def bass_note(f, d, wob=0.0):
    t = t_arr(d)
    x = saw(f, t) + 0.6 * saw(f * 1.007, t) + 0.8 * np.sin(2 * np.pi * f / 2 * t)
    if wob:
        # LFO-swept filter for a wobble bass
        lfo = 0.5 + 0.5 * np.sin(2 * np.pi * wob * t - np.pi / 2)
        y = np.zeros_like(x)
        chunk = 256
        zi = None
        for i in range(0, len(x), chunk):
            fc = 150 + 2200 * lfo[i]
            b, a = signal.butter(2, fc / (SR / 2), 'low')
            if zi is None:
                zi = signal.lfilter_zi(b, a) * 0
            y[i:i + chunk], zi = signal.lfilter(b, a, x[i:i + chunk], zi=zi)
        x = np.tanh(y * 2.2)
    else:
        x = lp(x, 700)
    env = np.minimum(1, t / 0.005) * np.exp(-t * 3.0)
    return x * env * 0.5


def pluck(f, d=0.22):
    t = t_arr(d)
    x = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + saw(f * 1.003, t) * 0.5
    x = lp(x, 3500)
    return x * np.exp(-t * 14) * 0.22


def siren(d, f0=880):
    t = t_arr(d)
    f = f0 * (1 + 0.25 * np.sin(2 * np.pi * 4 * t))
    x = saw(1, np.cumsum(f) / SR)
    return lp(x, 4000) * 0.12 * np.minimum(1, t / 0.05)


def reverb(x, secs=0.9, mix=0.25):
    t = t_arr(secs)
    ir = rng.standard_normal(len(t)) * np.exp(-t * 6.5)
    ir = lp(ir, 5000)
    wet = signal.fftconvolve(x, ir)[: len(x)]
    wet *= np.max(np.abs(x)) / (np.max(np.abs(wet)) + 1e-9)
    return x * (1 - mix) + wet * mix


# ---------- music stems ----------
music = np.zeros(N)
A = [57, 57, 53, 55]  # bar roots: A F G (minor vibe)
ARP = [0, 3, 7, 10, 12, 10, 7, 3]
for bar in range(4):  # 0..8 s
    root = A[bar]
    t0 = bar * 2.0
    for b in range(4):
        place(music, kick(), t0 + b * BEAT, 0.9)
        place(music, hat(), t0 + b * BEAT + 0.25, 0.8)
        if b in (1, 3):
            place(music, clap(), t0 + b * BEAT, 0.6)
    for s in range(16):
        place(music, hat(), t0 + s * 0.125, 0.25)
        if s % 2 == 1:
            place(music, bass_note(note(root - 24), 0.2), t0 + s * 0.125, 1.0)
        place(music, pluck(note(root + ARP[(s + bar * 2) % 8])), t0 + s * 0.125, 1.0)
place(music, crash(), 0.0, 0.8)

# drop (12.2 .. 15): double-time, wobble bass, siren
drop = np.zeros(N)
DT0 = 12.25
place(drop, crash(), DT0, 1.0)
k = 0
t = DT0
while t < 14.95:
    place(drop, kick(1.25), t, 1.0)
    place(drop, hat(open_=True), t + 0.25, 0.5)
    t += BEAT
for i in range(int((14.95 - DT0) / 0.125)):
    tt = DT0 + i * 0.125
    place(drop, hat(), tt, 0.35)
    if i % 4 == 2:
        place(drop, clap(), tt, 0.8)
for i, r in enumerate([45, 45, 48, 43, 45, 45]):
    place(drop, bass_note(note(r - 12), 0.5, wob=4.0), DT0 + i * 0.5, 1.4)
place(drop, siren(2.6), DT0 + 0.1, 1.0)
for i in range(22):
    place(drop, pluck(note(69 + [0, 12, 7, 12, 3, 12, 10, 12][i % 8]), 0.12), DT0 + i * 0.125, 1.1)

# ---------- SFX ----------
sfx = np.zeros(N)
# record scratch at 8.0
t = t_arr(0.28)
f = 600 * np.exp(-t * 9) + 80
scr = bp(rng.standard_normal(len(t)), 300, 2500) * 0.6 + saw(1, np.cumsum(f) / SR) * 0.4
place(sfx, scr * np.exp(-t * 6) * 0.8, 7.98)
# crickets 9.2 - 11.2
for c in np.arange(9.25, 11.2, 0.42):
    for j in range(3):
        tt = t_arr(0.03)
        place(sfx, np.sin(2 * np.pi * 4300 * tt) * np.sin(np.pi * tt / 0.03) * 0.07, c + j * 0.045)
# heartbeat 9.8 - 12
for hb in np.arange(9.8, 11.9, 0.55):
    for j, g in ((0, 0.9), (0.16, 0.6)):
        tt = t_arr(0.18)
        x = np.sin(2 * np.pi * (55 + 40 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 22)
        place(sfx, x * g * 0.7, hb + j)
# tension riser 10.6 - 12
t = t_arr(1.4)
rise = bp(rng.standard_normal(len(t)), 400, 6000) * (t / 1.4) ** 2 * 0.35
rise += saw(1, np.cumsum(110 + 330 * (t / 1.4) ** 2) / SR) * (t / 1.4) ** 2 * 0.08
place(sfx, rise, 10.6)
# curtain whoosh 11.95
t = t_arr(0.45)
wh = rng.standard_normal(len(t))
y = np.zeros_like(wh)
for i in range(0, len(wh), 256):
    fc = 300 + 3500 * np.sin(np.pi * i / len(wh))
    b, a = signal.butter(2, [max(80, fc * 0.5) / (SR / 2), min(fc * 1.6, 18000) / (SR / 2)], 'band')
    y[i:i + 256] = signal.lfilter(b, a, wh[i:i + 256])
place(sfx, y * np.sin(np.pi * t / 0.45) * 0.9, 11.95)


# ---------- voice (mbrola) ----------
def mbrola(name, phones, base, fall, slow=1.0):
    n = len(phones)
    lines = []
    for i, (p, d) in enumerate(phones):
        k = i / max(1, n - 1)
        f = base * (1 - (1 - fall) * k)
        lines.append(f"{p} {int(d * slow)} 0 {f:.0f} 100 {f * 0.97:.0f}")
    pho = os.path.join(work, name + '.pho')
    wav = os.path.join(work, name + '.wav')
    open(pho, 'w').write("\n".join(lines) + "\n")
    subprocess.run(["mbrola", "-e", "/usr/share/mbrola/es1/es1", pho, wav], check=True, capture_output=True)
    sr, x = wavfile.read(wav)
    x = x.astype(np.float64) / 32768
    return signal.resample_poly(x, SR, sr)


def P(s):  # "b70 a110 ..." -> [(ph, dur)]
    out = []
    for tok in s.split():
        i = 0
        while i < len(tok) and not tok[i].isdigit():
            i += 1
        out.append((tok[:i], int(tok[i:])))
    return out


# "ba'ir ha-zot... kulam yotz'im lemesibot"
v1 = mbrola('v1', P("_120 b70 a120 i160 r60 _30 a90 s110 o200 t80 _520 k80 u80 l70 a190 m90 _40 jj60 o110 t50 s90 i170 m90 _30 l60 e80 m70 e80 s100 i90 b60 o260 t120 _150"), 80, 0.72, slow=0.92)
# "khutz mimeni"
v2 = mbrola('v2', P("_100 x160 u240 t60 s150 _280 m90 i100 m90 e150 n100 i460 _250"), 74, 0.7)
hu = mbrola('huss', P("_20 x140 u160 s260 _40"), 96, 0.9)


def deepen(x, rev=0.3):
    x = hp(x, 60)
    # body boost around 120 Hz, gentle high cut, light saturation
    x = x + 0.6 * bp(x, 90, 220)
    x = lp(x, 6000)
    x = np.tanh(x * 1.4)
    x = reverb(x, 1.1, rev)
    return x / (np.max(np.abs(x)) + 1e-9)


v1, v2 = deepen(v1), deepen(v2, 0.35)
hu = np.tanh(deepen(hu, 0.15) * 2.0)
voice = np.zeros(N)
place(voice, v1, 0.3, 0.95)
place(voice, v2, 4.65, 0.95)
print('v1 %.2fs  v2 %.2fs' % (len(v1) / SR, len(v2) / SR))
for at in (12.5, 13.0, 13.5, 14.0, 14.25, 14.5):
    place(drop, hu, at, 0.9)
    place(drop, kick(1.3), at, 0.4)

# ---------- mix ----------
tt = np.arange(N) / SR


def ramp(a, b, t):
    return np.clip((t - a) / (b - a), 0, 1)


full = music
muff = lp(music, 380, 4) * 1.6
muff = reverb(muff, 0.6, 0.35)
gain_full = 1 - ramp(3.85, 4.15, tt)
gain_muff = ramp(3.85, 4.15, tt) * (1 - ramp(7.95, 8.0, tt)) * 0.42
duck = 1 - 0.45 * np.clip(np.convolve((np.abs(voice) > 0.02).astype(float), np.ones(4410) / 4410, 'same') * 3, 0, 1)
mix = (full * gain_full + muff * gain_muff) * duck * 0.8
mix += drop * 0.85 * ramp(12.2, 12.26, tt)
mix += sfx
mix += voice * 1.0
mix = np.tanh(mix * 1.1)
# true comic silence: hard mute 8.25-9.15 s
mix *= 1 - ramp(8.2, 8.25, tt) * (1 - ramp(9.12, 9.17, tt))
# stereo: slight width via delayed copy on hats/pluck region
L = mix.copy()
R = np.concatenate([np.zeros(18), mix[:-18]]) * 0.97 + mix * 0.03
st = np.stack([L, R], 1)
st *= 0.66 / np.max(np.abs(st))  # leaves headroom for AAC true-peak overshoot
fade = np.ones(N)
fade[-int(0.08 * SR):] = np.linspace(1, 0, int(0.08 * SR))
st *= fade[:, None]
wavfile.write(out_path, SR, (st * 32767).astype(np.int16))
print('wrote', out_path)
