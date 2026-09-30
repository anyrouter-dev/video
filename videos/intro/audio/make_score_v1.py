#!/usr/bin/env python3
"""
AnyRouter intro — 18s score. Synthesized from scratch (no samples).

120 BPM, D major, one bar = 2.000s, so every scene cut sits on a bar line
and every UI pop on a beat (0.5s) or an eighth (0.25s).

  0.0  intro     filtered pad + sparkle arp, riser into the drop
  2.0  DROP 1    four-on-the-floor, claps on 2/4, pumping bass     (gateway, code, models)
  8.0  LIFT      fuller arp 16ths, plinks on every pool beat         (donated keys -> pool)
 12.0  pricing   half-time groove
 13.5  BREAK     everything cuts, reverse swell
 14.0  DROP 2    biggest hit of the film                             ("millions of tokens")
 16.0  END       impact + held chord under the end card
"""
import os, wave
import numpy as np

SR = 48000; BPM = 120.0
BEAT = 60.0 / BPM; BAR = BEAT * 4
DUR = 18.0; N = int(SR * DUR); T = np.arange(N) / SR
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(2026)

def place(buf, sig, at):
    i = int(round(at * SR))
    if i >= len(buf): return
    seg = sig[:len(buf) - i]; buf[i:i + len(seg)] += seg

def env(n, a, d, r, sus=.6):
    A, D, R = int(a * SR), int(d * SR), int(r * SR); S = max(0, n - A - D - R)
    y = np.concatenate([np.linspace(0, 1, A, endpoint=False), np.linspace(1, sus, D, endpoint=False),
                        np.full(S, sus), np.linspace(sus, 0, R)])
    return np.pad(y, (0, max(0, n - len(y))))[:n]

def osc(f, dur, kind="sine", detune=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    saw = lambda ff: 2 * ((ff * t) % 1.0) - 1
    if kind == "sine": y = np.sin(2 * np.pi * f * t)
    elif kind == "tri": y = 2 * np.abs(saw(f)) - 1
    else: y = saw(f)
    if detune: y = 0.5 * (y + saw(f * (1 + detune)))
    return y

def noise(d): return rng.standard_normal(int(d * SR))
def spec(x, H):
    n = len(x); f = np.fft.rfftfreq(n, 1 / SR)
    return np.fft.irfft(np.fft.rfft(x) * H(np.maximum(f, 1e-3)), n)
def lpf(x, c): return spec(x, lambda f: 1 / np.sqrt(1 + (f / c) ** 4))
def hpf(x, c): return spec(x, lambda f: (f / c) ** 2 / np.sqrt(1 + (f / c) ** 4))
def bpf(x, c, q=2.0): return spec(x, lambda f: np.exp(-0.5 * (np.log(f / c) * q) ** 2))

# ── instruments ────────────────────────────────────────────────────────
def kick(a=1.0, punch=1.0):
    n = int(.45 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(160 * punch * np.exp(-t * 30) + 48) / SR) * np.exp(-t * 6.5)
    click = np.zeros(n); c = noise(.004) * np.exp(-np.arange(int(.004 * SR)) / SR * 500); click[:len(c)] = c
    return np.tanh((body + click * .3) * 1.4) * a
def clap(a=1.0):
    n = int(.22 * SR); t = np.arange(n) / SR
    e = np.exp(-t * 28); e[:int(.012 * SR)] *= (np.arange(int(.012 * SR)) % int(.004 * SR) < int(.002 * SR)) * .6 + .4
    return bpf(noise(.22) * e, 1600, 1.4) * a
def hat(a=1.0, open_=False):
    d = .18 if open_ else .04; n = int(d * SR); t = np.arange(n) / SR
    return hpf(noise(d) * np.exp(-t * (18 if open_ else 90)), 8000) * a
def bassnote(f, dur, a=1.0):
    y = osc(f, dur, "sine") * .8 + lpf(osc(f, dur, "saw"), 420) * .45
    return y * env(len(y), .004, .06, .08, .7) * a
def pad(f, dur, a=1.0):
    y = osc(f, dur, "saw", .006) + osc(f * 2, dur, "tri") * .25
    return lpf(y, 2600) * env(len(y), .25, .4, .5, .8) * a
def pluck(f, dur=.25, a=1.0, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    m = np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 26)
    return np.sin(2 * np.pi * f * t + 1.4 * bright * m) * np.exp(-t * 12) * a
def bell(f, a=1.0, dur=.9):
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t + 2.2 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t * 6))
    return y * np.exp(-t * 4.5) * a
def stab(freqs, a=1.0, dur=.34):
    y = sum(osc(f, dur, "saw", .007) for f in freqs) / len(freqs)
    return lpf(y, 3800) * env(len(y), .003, .08, .16, .45) * a
def riser(dur, a=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; p = t / dur
    x = hpf(noise(dur), 900) * p ** 2.4
    x += np.sin(2 * np.pi * np.cumsum(300 + 2400 * p ** 2) / SR) * p ** 3 * .35
    return x * a
def swell(dur, a=1.0):  # reversed cymbal-ish swell
    n = int(dur * SR); t = np.arange(n) / SR
    return hpf(noise(dur), 3000) * (t / dur) ** 3 * a
def whoosh(dur=.4, a=1.0, f0=500, f1=4000):
    n = int(dur * SR); p = np.linspace(0, 1, n)
    y = noise(dur); fc = f0 * (f1 / f0) ** p
    # time-varying band via short overlapped chunks
    out = np.zeros(n); L = 1024
    for i in range(0, n, L // 2):
        seg = y[i:i + L]
        if len(seg) < 32: break
        w = np.hanning(len(seg)); out[i:i + len(seg)] += bpf(seg * w, fc[min(i, n - 1)], 1.3)
    return out * np.sin(np.pi * p) ** 1.5 * a
def impact(a=1.0):
    n = int(2.0 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(110 * np.exp(-t * 14) + 38) / SR) * np.exp(-t * 3.2)
    tail = lpf(noise(2.0), 1800) * np.exp(-t * 5) * .35
    return np.tanh((boom + tail) * 1.3) * a
def tick(a=1.0, f=3200):
    n = int(.03 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 220) * a

# ── harmony: D major, I–V–vi–IV (D A Bm G), one chord per bar ─────────
D, A, Bm, G = ([73.42, [293.66, 369.99, 440.00], [587.33, 739.99, 880.00, 1174.66]],
               [55.00, [277.18, 329.63, 440.00], [554.37, 659.25, 880.00, 1108.73]],
               [61.74, [293.66, 369.99, 493.88], [587.33, 739.99, 987.77, 1174.66]],
               [49.00, [293.66, 392.00, 493.88], [587.33, 783.99, 987.77, 1174.66]])
PROG = [D, A, Bm, G, D, A, Bm, G, D]   # bar 0..8
def chord(t): return PROG[min(int(t // BAR), len(PROG) - 1)]

drum = np.zeros(N); bass = np.zeros(N); harm = np.zeros(N); fx = np.zeros(N)
duck = np.ones(N)
def sidechain(at, depth=.3, L=.16):
    i = int(at * SR); n = min(int(L * SR), N - i)
    if n > 0: duck[i:i + n] = np.minimum(duck[i:i + n], np.linspace(depth, 1, n) ** .6)

# INTRO 0–2: pad swelling open, sparse bell arp, riser
for f in D[1]: place(harm, lpf(pad(f, 2.2, .07), 1400), 0.0)
for k, i in enumerate([0, 1, 2, 3, 2, 1, 2, 3]):
    place(harm, pluck(D[2][i], .35, .10 + k * .012, bright=.5), k * BEAT / 2 + 0.0)
place(fx, riser(1.9, .22), 0.1); place(fx, swell(0.9, .18), 1.1)
place(fx, bell(1174.66, .12, 1.4), 0.0)

# Drum sections
def groove(b0, b1, kick_amp=.95, clap_amp=.32, hat_amp=.06, sixteenth=False, half=False):
    t = b0
    while t < b1 - 1e-6:
        for q in range(4):
            bt = t + q * BEAT
            if not half or q in (0, 2.5):
                place(drum, kick(kick_amp), bt); sidechain(bt)
            if half and q == 2: place(drum, clap(clap_amp), bt)
            if not half and q in (1, 3): place(drum, clap(clap_amp), bt)
            place(drum, hat(hat_amp * 1.2, open_=True), bt + BEAT / 2)
            if sixteenth:
                for s in (1, 3): place(drum, hat(hat_amp * .55), bt + s * BEAT / 4)
        t += BAR

groove(2.0, 8.0)
groove(8.0, 12.0, 1.0, .36, .07, sixteenth=True)
groove(12.0, 13.5, .9, .30, .05, half=True)
groove(14.0, 16.0, 1.05, .40, .075, sixteenth=True)
# drum fills into sections
for k in range(4): place(drum, clap(.12 + k * .05), 7.5 + k * BEAT / 4)

# BASS: offbeat pump on the chord root, octave jumps
def bassline(b0, b1, amp=.55):
    t = b0
    while t < b1 - 1e-6:
        root = chord(t + .01)[0]
        for e in range(8):
            f = root * (2 if e in (3, 7) else 1)
            place(bass, bassnote(f, BEAT * .45, amp * (1 if e % 2 else .7)), t + e * BEAT / 2)
        t += BAR
bassline(2.0, 12.0); bassline(12.0, 13.5, .45); bassline(14.0, 16.0, .62)
place(bass, bassnote(73.42, 2.0, .6), 16.0)

# PADS under everything after the intro
for bi in range(1, 9):
    t0 = bi * BAR
    if 13.5 <= t0 < 14.0: continue
    dur = BAR + .3 if bi < 8 else 2.0
    for f in chord(t0 + .01)[1]:
        place(harm, pad(f, dur, .055 if bi < 4 else .065), t0)

# ARP: 8ths in drop 1, 16ths in the lift and drop 2
PAT = [0, 2, 1, 3, 2, 1, 3, 2]
def arp(b0, b1, div, amp, bright):
    t = b0; k = 0
    while t < b1 - 1e-6:
        sc = chord(t + .01)[2]
        place(harm, pluck(sc[PAT[k % 8]], .22, amp * (1.25 if k % div == 0 else 1), bright), t)
        t += BEAT / div
        k += 1
arp(2.0, 8.0, 2, .09, .7)      # 8ths
arp(8.0, 13.5, 4, .085, 1.0)   # 16ths
arp(14.0, 16.0, 4, .10, 1.1)

# STABS on the hero beats (scene hits)
for t, a in [(2.0, .30), (4.0, .20), (6.0, .20), (8.0, .28), (12.0, .22), (14.0, .36), (16.0, .30)]:
    place(harm, stab([f * 2 for f in chord(t + .01)[1]], a), t)

# POOL plinks: one bell per donated key landing (8.5, 9.0, 9.5, 10.0), then the pool fills (10.5)
for i, t in enumerate([8.5, 9.0, 9.5, 10.0]):
    place(fx, bell([1174.66, 1318.51, 1479.98, 1760.0][i], .10), t)
place(fx, bell(2349.32, .08, 1.2), 10.5)

# UI ticks: model-id swaps in the code card (4.5, 5.0, 5.5) and token counter (14.25..15.5)
for t in [4.5, 5.0, 5.5, 6.5, 7.0]: place(fx, tick(.18), t)
for k in range(10): place(fx, tick(.07, 2600 + k * 120), 14.25 + k * .125)

# TRANSITIONS: whooshes leading into each bar cut
for t in [3.75, 5.75, 7.7, 11.7, 15.7]:
    place(fx, whoosh(.36, .20), t)

# BREAK 13.5–14.0: reverse swell + riser; DROP 2 impact
place(fx, swell(.5, .35), 13.5); place(fx, riser(.5, .18), 13.5)
place(fx, impact(.55), 14.0)
# END: big impact, held chord, sparkle
place(fx, impact(.5), 16.0)
place(harm, bell(1174.66, .12, 1.8), 16.0); place(harm, bell(1479.98, .08, 1.8), 16.25)

# ── mix ────────────────────────────────────────────────────────────────
bass *= duck; harm_d = harm * (.55 + .45 * duck)
mix = drum * .85 + bass * .9 + harm_d * 1.0 + fx * .9
# short stereo widening via Haas on harm/fx
L = mix.copy(); R = mix.copy()
d = int(.012 * SR); wide = harm_d * .35 + fx * .2
R[d:] += wide[:-d] * .5; L += wide * .1
fade = np.ones(N); fo = int(.6 * SR); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
st = np.stack([L, R], 1) * fade[:, None]
st = np.tanh(st / np.max(np.abs(st)) * 1.25) * .89
pcm = (st * 32767).astype(np.int16)
with wave.open(os.path.join(HERE, "score.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote score.wav", DUR, "s")
