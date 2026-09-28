"""Original score + sound design for مخطط المشروع, synthesized from the
animation's own cue list (cues.json) so every sound lands on its frame."""
import json, sys, pathlib
import numpy as np
import scipy.signal as ss

SR = 44100
DUR = 150.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
HERE = pathlib.Path(__file__).parent
cues = json.loads((HERE / 'cues.json').read_text())

buses = {k: np.zeros((2, N)) for k in ('mus', 'mus_wet', 'sfx', 'sfx_wet', 'low')}


def mf(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(n):
    return np.arange(n) / SR


def place(bus, sig, t, pan=0.0, gain=1.0):
    i = int(round(t * SR))
    if i >= N:
        return
    if sig.ndim == 1:
        a = np.pi / 4 * (pan + 1)
        sig = np.vstack([sig * np.cos(a), sig * np.sin(a)])
    sig = sig * gain
    j = min(N, i + sig.shape[1])
    if i < 0:
        sig = sig[:, -i:]
        i = 0
    buses[bus][:, i:j] += sig[:, : j - i]


def lp(x, fc, order=2):
    return ss.sosfilt(ss.butter(order, fc, 'low', fs=SR, output='sos'), x, axis=-1)


def hp(x, fc, order=2):
    return ss.sosfilt(ss.butter(order, fc, 'high', fs=SR, output='sos'), x, axis=-1)


def bp(x, lo, hi, order=2):
    return ss.sosfilt(ss.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x, axis=-1)


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    t = tt(n)
    dur = n / SR
    e = np.ones(n) * s
    e[t < a] = t[t < a] / max(a, 1e-4)
    m = (t >= a) & (t < a + d)
    e[m] = 1 - (1 - s) * (t[m] - a) / d
    rm = t > dur - r
    e[rm] *= np.clip((dur - t[rm]) / r, 0, 1)
    return e


def noise(n):
    return rng.standard_normal(n)


# ------------------------------------------------------------------ music
BEAT = 0.6            # 100 bpm
BAR = 4 * BEAT
CH = {
    'Dm': ([50, 57, 60, 64, 65], 38, [62, 65, 69, 72, 74, 77]),
    'Bb': ([46, 53, 57, 62, 65], 34, [58, 62, 65, 69, 70, 74]),
    'F':  ([53, 60, 67, 69, 72], 41, [60, 65, 69, 72, 76, 77]),
    'C':  ([48, 55, 62, 64, 67], 36, [60, 64, 67, 72, 74, 76]),
}


def pad_note(freq, n, att=0.9, rel=1.4):
    t = tt(n)
    out = np.zeros(n)
    for det in (-0.07, 0.0, 0.07):
        f = freq * 2 ** (det / 12)
        ph = rng.uniform(0, 2 * np.pi)
        for h in range(1, 6):
            out += np.sin(2 * np.pi * f * h * t + ph * h) / h
    e = np.minimum(1, t / att) * np.clip((n / SR - t) / rel, 0, 1)
    return out * e / 9.0


def pad_chord(name, t0, t1, gain=1.0):
    notes = CH[name][0]
    n = int((t1 - t0 + 1.4) * SR)
    for k, m in enumerate(notes):
        sig = pad_note(mf(m), n)
        place('mus', sig, t0, pan=(k - 2) * 0.28, gain=0.16 * gain)
        place('mus_wet', sig, t0, pan=(k - 2) * 0.28, gain=0.10 * gain)


def pluck(freq, dur=0.5):
    n = int(dur * SR)
    t = tt(n)
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) * np.exp(-t * 18) + 0.12 * np.sin(6 * np.pi * freq * t) * np.exp(-t * 30)
    return s * np.exp(-t * 7.5) * np.minimum(1, t / 0.004)


def bass(freq, dur):
    n = int(dur * SR)
    t = tt(n)
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t)
    return s * np.minimum(1, t / 0.01) * np.clip((dur - t) / 0.08, 0, 1)


def kick():
    n = int(0.45 * SR)
    t = tt(n)
    f = 45 + 75 * np.exp(-t * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) + 0.15 * lp(noise(n), 2000) * np.exp(-t * 60)


def hat():
    n = int(0.06 * SR)
    t = tt(n)
    return hp(noise(n), 7000, 4) * np.exp(-t * 90)


# intro swell: Dm9 held under the cover
pad_chord('Dm', 0.0, 9.3, gain=0.9)
prog = ['Dm', 'Bb', 'F', 'C']
t = 9.0
k = 0
chord_at = []
while t < 139.0 - 1e-6:
    name = prog[k % 4]
    end = min(t + 2 * BAR, 139.0)
    chord_at.append((t, end, name))
    pad_chord(name, t, end)
    t = end
    k += 1
chord_at += [(139.0, 142.0, 'Bb'), (142.0, 145.2, 'C'), (145.2, 150.0, 'F')]
pad_chord('Bb', 139.0, 142.0, 0.9)
pad_chord('C', 142.0, 145.2, 1.0)
pad_chord('F', 145.2, 151.0, 1.25)


def chord_for(t):
    for a, b, n in chord_at:
        if a <= t < b:
            return n
    return 'Dm'


def section_gain(t):
    # arrangement: light in fundamentals, driving through the phases, airy in methodologies
    if t < 9: return 0.0
    if t < 45: return 0.65
    if t < 128: return 1.0
    if t < 139: return 0.8
    if t < 145.2: return 0.7
    return 0.0


# 8th-note arpeggio, bass with side-chain pump, kick & hats
arp_pat = [0, 2, 4, 3, 5, 3, 4, 2]
step = BEAT / 2
t = 9.0
i = 0
while t < 145.2:
    g = section_gain(t)
    if g > 0:
        name = chord_for(t)
        tones = CH[name][2]
        m = tones[arp_pat[i % 8]]
        vel = (1.0 if i % 2 == 0 else 0.7) * g
        place('mus', pluck(mf(m)), t, pan=(-0.35 if i % 2 else 0.35), gain=0.075 * vel)
        place('mus_wet', pluck(mf(m)), t, pan=(0.5 if i % 2 else -0.5), gain=0.05 * vel)
        if i % 2 == 0:  # quarter notes → bass pulse
            root = CH[name][1]
            place('low', bass(mf(root + 12), BEAT * 0.92), t, gain=0.20 * g)
        drive = 45 <= t < 128 or 139.6 <= t < 145.2
        if drive and i % 4 == 0:
            place('low', kick(), t, gain=0.42 * g)
        if drive and i % 2 == 1:
            place('mus', hat(), t, pan=0.2, gain=0.05 * g)
    if 4.5 <= t or t < 9:
        pass
    t += step
    i += 1

# clock-like ticks during the cover (time is the project's first constraint)
t = 4.2
while t < 9.0:
    place('mus', hat(), t, pan=-0.1, gain=0.035)
    t += BEAT

# side-chain style pump on the pad under the kicks
pump = np.ones(N)
tk = 45.0
while tk < 128:
    a = int(tk * SR)
    n = int(BEAT * 2 * SR)
    seg = 1 - 0.35 * np.exp(-tt(n) * 7)
    b = min(N, a + n)
    pump[a:b] = np.minimum(pump[a:b], seg[: b - a])
    tk += BEAT * 2
buses['mus'] *= pump
buses['mus_wet'] *= pump


# ------------------------------------------------------------------ sfx
def s_whoosh(v):
    d = 1.0
    n = int(d * SR)
    t = tt(n)
    x = noise(n)
    out = np.zeros(n)
    blk = 512
    for s in range(0, n, blk):
        p = s / n
        fc = 350 + 3200 * np.sin(np.pi * p) ** 1.6
        seg = x[max(0, s - 2048): s + blk]
        y = bp(seg, fc * 0.55, min(fc * 1.6, 16000), 2)
        out[s: s + blk] = y[-len(out[s: s + blk]):]
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2.2
    mono = out * e * 0.9
    pan = np.linspace(0.8, -0.8, n)  # right → left, same as the light sweep
    a = np.pi / 4 * (pan + 1)
    return np.vstack([mono * np.cos(a), mono * np.sin(a)]) * v


def s_pop(v):
    n = int(0.12 * SR)
    t = tt(n)
    f = 520 + 380 * np.exp(-t * 40)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38) * 0.6 * v


def s_blip(v):
    n = int(0.07 * SR)
    t = tt(n)
    return np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 70) * 0.35 * v


def s_tick(v):
    n = int(0.05 * SR)
    t = tt(n)
    return (hp(noise(n), 3000) * np.exp(-t * 400) * 0.5 + np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 90) * 0.3) * v


def s_boom(v):
    n = int(2.4 * SR)
    t = tt(n)
    f = 32 + 40 * np.exp(-t * 3)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    air = hp(noise(n), 5000) * np.exp(-t * 2.2) * 0.12
    return (sub * 0.9 + air) * v


def s_swipe(v):
    n = int(0.35 * SR)
    t = tt(n)
    x = bp(noise(n), 1500, 6000)
    return x * np.sin(np.pi * t / 0.35) ** 2 * 0.25 * v


def s_alert(v):
    out = np.zeros(int(0.5 * SR))
    for k, m in enumerate([88, 83]):
        n = int(0.4 * SR)
        t = tt(n)
        s = (np.sin(2 * np.pi * mf(m) * t) + 0.3 * np.sin(2 * np.pi * mf(m) * 2.76 * t)) * np.exp(-t * 9)
        o = int(k * 0.09 * SR)
        out[o: o + n] += s[: len(out) - o]
    return out * 0.18 * v


def s_stretch(v):
    d = 1.6
    n = int(d * SR)
    t = tt(n)
    f = 180 + 170 * (t / d) ** 1.3
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 + 0.3 * np.sin(2 * np.pi * 9 * t))
    return s * np.sin(np.pi * t / d) * 0.16 * v


def s_swish(v):
    n = int(0.32 * SR)
    t = tt(n)
    return bp(noise(n), 900, 5000) * np.sin(np.pi * t / 0.32) ** 3 * 0.3 * v


def s_type(v):
    out = np.zeros(int(0.5 * SR))
    for k in range(5):
        o = int((k * 0.085 + rng.uniform(0, .02)) * SR)
        c = s_tick(0.5)
        out[o: o + len(c)] += c[: len(out) - o]
    return out * v


def s_scribble(v):
    d = 1.0
    n = int(d * SR)
    t = tt(n)
    am = np.abs(np.sin(2 * np.pi * (7 + 3 * np.sin(2 * np.pi * 1.3 * t)) * t)) ** 2
    return bp(noise(n), 2500, 8000) * am * np.sin(np.pi * t / d) * 0.22 * v


def s_stamp(v):
    n = int(0.6 * SR)
    t = tt(n)
    f = 50 + 70 * np.exp(-t * 30)
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    slap = lp(noise(n), 2500) * np.exp(-t * 45) * 0.6
    return (thump + slap) * 0.9 * v


def s_drop(v):
    n = int(0.15 * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * 160 * t) * np.exp(-t * 35) + lp(noise(n), 1200) * np.exp(-t * 80) * 0.3) * 0.4 * v


def s_shimmer(v):
    d = 3.0
    out = np.zeros(int((d + 1) * SR))
    notes = [74, 77, 81, 84, 86, 89, 93]
    for k, m in enumerate(notes):
        n = int(1.0 * SR)
        t = tt(n)
        s = (np.sin(2 * np.pi * mf(m) * t) + 0.25 * np.sin(2 * np.pi * mf(m) * 3.01 * t)) * np.exp(-t * 4)
        o = int(k * d / len(notes) * SR)
        out[o: o + n] += s
    return out * 0.07 * v


def s_cascade(v):
    out = np.zeros(int(1.0 * SR))
    for k in range(7):
        n = int(0.12 * SR)
        t = tt(n)
        s = np.sin(2 * np.pi * mf(79 + k * 2) * t) * np.exp(-t * 40)
        o = int(k * 0.07 * SR)
        out[o: o + n] += s
    return out * 0.16 * v


def s_count(v):
    d = v
    out = np.zeros(int((d + .2) * SR))
    tt_ = 0.0
    while tt_ < d:
        c = s_tick(0.35)
        o = int(tt_ * SR)
        out[o: o + len(c)] += c[: len(out) - o]
        p = tt_ / d
        tt_ += 0.035 + 0.12 * p ** 2
    return out


def s_drip(v):
    n = int(0.12 * SR)
    t = tt(n)
    f = 500 + 900 * np.exp(-t * 60)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * 0.35 * v


SCALE = [74, 77, 81, 84, 86, 89]


def s_chime(v):
    m = SCALE[int(v) % len(SCALE)]
    n = int(2.2 * SR)
    t = tt(n)
    f = mf(m)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 7)
    return s * np.minimum(1, t / 0.003) * 0.12


def s_riser(v):
    d = v
    n = int(d * SR)
    t = tt(n)
    p = t / d
    x = noise(n)
    y = np.zeros(n)
    blk = 1024
    for s in range(0, n, blk):
        fc = 400 + 7000 * (s / n) ** 2
        seg = x[max(0, s - 2048): s + blk]
        yy = bp(seg, fc * .6, min(fc * 1.5, 18000))
        y[s: s + blk] = yy[-len(y[s: s + blk]):]
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2 * p)) / SR) * 0.3
    return (y * 0.5 + tone) * p ** 2.2 * 0.5


def s_impact(v):
    n = int(3.5 * SR)
    t = tt(n)
    f = 28 + 55 * np.exp(-t * 4)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.1)
    crash = hp(noise(n), 3000) * np.exp(-t * 1.8) * 0.18
    body = lp(noise(n), 900) * np.exp(-t * 14) * 0.5
    return (sub + crash + body) * v


SFX = dict(whoosh=s_whoosh, pop=s_pop, blip=s_blip, tick=s_tick, boom=s_boom, swipe=s_swipe, alert=s_alert,
           stretch=s_stretch, swish=s_swish, type=s_type, scribble=s_scribble, stamp=s_stamp, drop=s_drop,
           shimmer=s_shimmer, cascade=s_cascade, count=s_count, drip=s_drip, chime=s_chime, riser=s_riser,
           impact=s_impact)
GAIN = dict(whoosh=0.6, pop=0.5, blip=0.45, tick=0.55, boom=0.4, swipe=0.6, alert=0.8, stretch=0.9, swish=0.6,
            type=0.35, scribble=0.6, stamp=0.9, drop=0.5, shimmer=1.0, cascade=0.8, count=0.5, drip=0.6,
            chime=1.0, riser=0.9, impact=0.5)
WET = dict(whoosh=0.25, boom=0.35, alert=0.5, chime=0.6, shimmer=0.7, impact=0.5, stamp=0.35, pop=0.2, riser=0.4)

missing = set()
for c in cues:
    f = SFX.get(c['type'])
    if not f:
        missing.add(c['type'])
        continue
    sig = f(c['v'])
    pan = 0.0 if sig.ndim > 1 else float(rng.uniform(-0.25, 0.25))
    place('sfx', sig, c['t'], pan=pan, gain=GAIN[c['type']])
    w = WET.get(c['type'], 0.12)
    place('sfx_wet', sig, c['t'], pan=pan, gain=GAIN[c['type']] * w)
if missing:
    print('no synth for', missing)

# ------------------------------------------------------------------ mix
ir_n = int(2.6 * SR)
it = tt(ir_n)
ir = np.vstack([lp(noise(ir_n), 6000) * np.exp(-it * 2.6), lp(noise(ir_n), 6000) * np.exp(-it * 2.6)])
ir[:, : int(0.012 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))

mus = lp(buses['mus'], 5200)
wet_in = lp(buses['mus_wet'], 4200) + buses['sfx_wet']
wet = np.vstack([ss.fftconvolve(wet_in[c], ir[c])[:N] for c in range(2)]) * 0.9
low = lp(buses['low'], 900)
mix = mus + wet + low * 1.0 + buses['sfx']
mix = hp(mix, 28)
# fades
fi = np.minimum(1, tt(N) / 0.05)
fo = np.clip((DUR - tt(N)) / 2.2, 0, 1) ** 1.5
mix *= fi * fo
rms0 = np.sqrt((mix ** 2).mean())
mix = mix / rms0 * 10 ** (-17.0 / 20)
mix = 0.95 * np.tanh(mix / 0.95)
rms = np.sqrt((mix ** 2).mean())
print('peak', np.abs(mix).max().round(3), 'rms dBFS', round(20 * np.log10(rms), 1))
out = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
import wave
with wave.open(str(HERE / 'soundtrack.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(out.tobytes())
print('wrote soundtrack.wav', DUR, 's')
