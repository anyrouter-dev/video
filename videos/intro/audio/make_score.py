#!/usr/bin/env python3
"""
AnyRouter intro v3 — 60s score. Synthesized from scratch (no samples).

120 BPM, D major, one bar = 2.000s, so every scene cut sits on a bar line
and every UI pop on a beat (0.5s) or an eighth (0.25s).

Rhythm: 2-step garage (kick 1 · 2-and · 3-and, claps 2/4, swung hats). The hook is a
3-3-4-2 clave melody whose notes follow the chord, so it returns with the I–vi–IV–V loop.

  0.0  INTRO      music-box teaser of the hook, riser into the groove   (mark prints)
  4.0  GROOVE A   2-step + woodblock clave; hook lands at 8             (gateway, one key, code)
 18.0  GROOVE A'  16th hats, brighter arp                               (200+ models, speed) + vox chops
 24.0  BREAKDOWN  kick out, sustained bass, 429 buzz                    (free keys hit the wall)
 28.0  BUILD      half-time → groove at 32, riser into the pool         (donate, failover)
 36.0  LIFT       fullest section, pool impact                          (everyone rides free, donors earn)
 44.0  GROOVE B   vi–IV–I, hook on FM pluck an octave down                              (live network data)
 50.0  PRE-DROP   half-time, filtered, break + swell at 53.5            (pricing)
 54.0  DROP       biggest hit of the film                               ("millions of tokens")
 56.5  OUTRO      thin groove, final impact on the click, ring out      (end card)
"""
import os, wave
import numpy as np

SR = 48000; BPM = 120.0
BEAT = 60.0 / BPM; BAR = BEAT * 4
DUR = 60.0; N = int(SR * DUR); T = np.arange(N) / SR
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

# ── new voices ─────────────────────────────────────────────────────────
def lead(f, dur, a=1.0, cut=3600):
    """Hook voice: soft square + a little FM bite, short plucky envelope."""
    n = int(dur * SR); t = np.arange(n) / SR
    sq = np.tanh(3 * np.sin(2 * np.pi * f * t + .6 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 18)))
    return lpf(sq, cut) * env(n, .003, .09, .06, .45) * a
def vox(f, dur=.2, a=1.0):
    """Formant 'ah' chop — the human-ish offbeat hit."""
    y = osc(f, dur, "saw", .004)
    y = bpf(y, 730, 3.0) * 1.0 + bpf(y, 1090, 3.5) * .55 + bpf(y, 2440, 4.0) * .3
    return y * env(len(y), .004, .05, .07, .5) * a * 2.2
def wood(a=1.0, f=1250):
    n = int(.07 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 1.52 * t)) * np.exp(-t * 60) * a
def snare(a=1.0):
    n = int(.18 * SR); t = np.arange(n) / SR
    return (bpf(noise(.18), 2400, 1.0) * np.exp(-t * 22) + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * .5) * a

# ── harmony: D major. Hook progression I–vi–IV–V, restarted at each section ──
D, A, Bm, G = ([73.42, [293.66, 369.99, 440.00], [587.33, 739.99, 880.00, 1174.66]],
               [55.00, [277.18, 329.63, 440.00], [554.37, 659.25, 880.00, 1108.73]],
               [61.74, [293.66, 369.99, 493.88], [587.33, 739.99, 987.77, 1174.66]],
               [49.00, [293.66, 392.00, 493.88], [587.33, 783.99, 987.77, 1174.66]])
HP = [D, Bm, G, A]
SECTIONS = [(0, 2, [D, D]), (2, 9, HP), (9, 12, HP), (12, 14, [Bm, G]), (14, 16, [G, A]), (16, 18, [Bm, A]),
            (18, 22, HP), (22, 25, [Bm, G, D]), (25, 27, [G, A]), (27, 28, [D]), (28, 29, [A]), (29, 30, [D])]
PROG = [None] * 30
for b0, b1, pr in SECTIONS:
    for b in range(b0, b1): PROG[b] = pr[(b - b0) % len(pr)]
def chord(t): return PROG[min(int(t // BAR), 29)]

# THE HOOK: a 3-3-4-2 clave (16th steps) whose notes follow the chord, so it returns with the progression.
S16 = BEAT / 4
N5 = dict(D5=587.33, E5=659.25, Fs5=739.99, G5=783.99, A5=880.0, B5=987.77, Cs6=1108.73, D6=1174.66, E6=1318.51)
HOOK = {id(D): ([0, 3, 6, 10, 12], ["A5", "Fs5", "A5", "B5", "A5"]),
        id(Bm): ([0, 3, 6, 10, 12], ["Fs5", "D5", "Fs5", "A5", "Fs5"]),
        id(G): ([0, 3, 6, 10, 12, 14], ["G5", "B5", "D6", "B5", "A5", "G5"]),
        id(A): ([0, 3, 6, 8, 10], ["E5", "A5", "Cs6", "E6", "Cs6"])}
CLAVE = [0, 3, 6, 10, 12]

drum = np.zeros(N); bass = np.zeros(N); harm = np.zeros(N); fx = np.zeros(N); mel = np.zeros(N)
duck = np.ones(N)
def sidechain(at, depth=.3, L=.16):
    i = int(at * SR); n = min(int(L * SR), N - i)
    if n > 0: duck[i:i + n] = np.minimum(duck[i:i + n], np.linspace(depth, 1, n) ** .6)
def bars(b0, b1):
    t = b0
    while t < b1 - 1e-6: yield t; t += BAR

SWING = .022
def twostep(b0, b1, kick_amp=.95, clap_amp=.34, hat_amp=.06, sixteenth=False, four=False, wood_amp=0):
    """2-step: kick on 1 · 'and' of 2 · 3-and (alt bar pushes), claps on 2 and 4, swung hats."""
    for k, t in enumerate(bars(b0, b1)):
        ks = [0, 4, 8, 12] if four else ([0, 6, 10] if k % 2 == 0 else [0, 3, 8, 11])
        for s in ks:
            if t + s * S16 < b1 - 1e-6: place(drum, kick(kick_amp), t + s * S16); sidechain(t + s * S16)
        if clap_amp:
            for s in (4, 12):
                if t + s * S16 < b1 - 1e-6: place(drum, clap(clap_amp), t + s * S16); place(drum, snare(clap_amp * .5), t + s * S16)
        for s in range(0, 16, 2 if not sixteenth else 1):
            at = t + s * S16 + (SWING if s % 4 == 2 else 0) + (SWING * .7 if s % 2 else 0)
            if at >= b1 - 1e-6: break
            op = s % 4 == 2
            place(drum, hat(hat_amp * (1.2 if op else .55), open_=op), at)
        if wood_amp:
            for s in CLAVE: place(drum, wood(wood_amp), t + s * S16)

def bassline(b0, b1, amp=.55, sustain=False):
    """Bass rides the clave: root, root, octave, fifth, root."""
    for t in bars(b0, b1):
        root = chord(t + .01)[0]
        if sustain: place(bass, bassnote(root, BAR * .95, amp), t); continue
        for s, m, L in zip(CLAVE, [1, 1, 2, 1.5, 1], [3, 3, 4, 2, 4]):
            if t + s * S16 < b1 - 1e-6: place(bass, bassnote(root * m, S16 * L * .85, amp * (1 if s == 0 else .8)), t + s * S16)

def hook(b0, b1, amp=.12, voice="lead", octave=1.0, cut=3600, sweep=None):
    for t in bars(b0, b1):
        steps, notes = HOOK[id(chord(t + .01))]
        for j, (s, nm) in enumerate(zip(steps, notes)):
            at = t + s * S16
            if at >= b1 - 1e-6: break
            nxt = steps[j + 1] if j + 1 < len(steps) else 16
            dur = (nxt - s) * S16 * .92
            c = cut if sweep is None else sweep[0] * (sweep[1] / sweep[0]) ** ((at - b0) / (b1 - b0))
            f = N5[nm] * octave
            if voice == "lead": place(mel, lead(f, dur, amp, c), at)
            elif voice == "box": place(mel, bell(f, amp, .5), at)
            else: place(mel, pluck(f, dur, amp, 1.1), at)

def voxchops(b0, b1, amp=.08):
    for t in bars(b0, b1):
        top = chord(t + .01)[1]
        for s, f in zip((2, 7, 14), (top[2], top[1], top[2])):
            if t + s * S16 < b1 - 1e-6: place(mel, vox(f, .16, amp), t + s * S16)

def pads(b0, b1, amp=.06, cut=2600):
    for t in bars(b0, b1):
        for f in chord(t + .01)[1]: place(harm, lpf(pad(f, BAR + .3, amp), cut), t)

def roll(t0, t1, a0=.08, a1=.3):
    t = t0
    while t < t1 - 1e-6:
        p = (t - t0) / (t1 - t0); place(drum, snare(a0 + (a1 - a0) * p), t)
        t += S16 * 2 if p < .5 else S16
def buzz(t, a=.10):
    n = int(.18 * SR); tt = np.arange(n) / SR
    place(fx, np.sign(np.sin(2 * np.pi * 110 * tt)) * np.exp(-tt * 14) * a, t)

# 0–4 INTRO: music-box teaser of the hook over a filtered pad, riser into the groove
pads(0.0, 4.0, .10, 1800); hook(0.0, 4.0, .13, "box")
place(fx, riser(1.9, .20), 2.1); place(fx, swell(0.9, .16), 3.1)
place(mel, vox(440.0, .3, .10), 3.75)
# 4–8 GROOVE A light: 2-step + woodblock clave + bass, hook held back
twostep(4.0, 8.0, .9, .26, .05, wood_amp=.05); bassline(4.0, 8.0, .5); pads(4.0, 8.0, .05, 2000)
# 8–18 GROOVE A: the hook arrives
twostep(8.0, 18.0); bassline(8.0, 18.0); pads(8.0, 18.0, .05); hook(8.0, 18.0, .12)
# 18–24 GROOVE A': 16th hats + vox chops on the offbeats
twostep(18.0, 24.0, .95, .34, .06, sixteenth=True); bassline(18.0, 24.0, .56); pads(18.0, 24.0, .05)
hook(18.0, 24.0, .12); voxchops(18.0, 24.0, .07)
# 24–28 BREAKDOWN: no kick, sub sustain, woodblock clave + music-box hook
bassline(24.0, 28.0, .45, sustain=True); pads(24.0, 28.0, .065, 1200)
twostep(24.0, 28.0, 0, 0, .04, wood_amp=.07); hook(24.0, 28.0, .12, "box")
# 28–32 BUILD: four-on-the-floor returns, hook filter sweeps open, snare roll
twostep(28.0, 32.0, .85, .28, .05, four=True); bassline(28.0, 32.0, .45); pads(28.0, 32.0, .058, 2000)
hook(28.0, 32.0, .11, sweep=(500, 4200)); roll(30.0, 32.0)
# 32–36 groove, riser into the pool
twostep(32.0, 36.0); bassline(32.0, 36.0, .55); pads(32.0, 36.0, .055); hook(32.0, 36.0, .12)
place(fx, riser(1.4, .20), 34.6)
# 36–44 LIFT: fullest — hook doubled an octave up, vox, 16ths
twostep(36.0, 44.0, 1.0, .36, .07, sixteenth=True); bassline(36.0, 44.0, .6); pads(36.0, 44.0, .06)
hook(36.0, 44.0, .12); hook(36.0, 44.0, .05, octave=2.0); voxchops(36.0, 44.0, .08)
# 44–50 GROOVE B: new progression, hook moves to the FM pluck an octave down, woodblock back
twostep(44.0, 50.0, .95, .32, .06, wood_amp=.04); bassline(44.0, 50.0, .55); pads(44.0, 50.0, .055)
hook(44.0, 50.0, .16, "pluck", octave=.5); voxchops(44.0, 50.0, .06)
# 50–53.5 PRE-DROP: half-energy, filtered hook, roll into the break
twostep(50.0, 53.5, .8, .26, .05); bassline(50.0, 53.5, .45); pads(50.0, 53.5, .06, 1600)
hook(50.0, 53.5, .10, cut=1400); roll(52.0, 53.5, .06, .26)
place(fx, swell(.5, .35), 53.5); place(fx, riser(.9, .18), 53.1)
# 54–56.5 DROP: everything, hook in octaves
twostep(54.0, 56.5, 1.05, .40, .075, sixteenth=True); bassline(54.0, 56.5, .62); pads(54.0, 56.5, .065)
hook(54.0, 56.5, .13); hook(54.0, 56.5, .06, octave=2.0); voxchops(54.0, 56.5, .09)
# 56.5–60 OUTRO: thin groove on V, resolve to I on the click at 58, ring out
twostep(56.5, 58.0, .85, .28, .05); bassline(56.5, 58.0, .5); pads(56.5, 58.0, .055); hook(56.5, 58.0, .10)
place(bass, bassnote(73.42, 2.0, .6), 58.0)
for f in D[1]: place(harm, pad(f, 2.0, .06), 58.0)
place(mel, lead(1174.66, 1.2, .11), 58.0); place(mel, vox(587.33, .45, .09), 58.0)
place(harm, bell(1174.66, .12, 1.8), 58.0); place(harm, bell(1479.98, .08, 1.8), 58.25)

# STABS on chapter hits
for t, a in [(4.0, .26), (8.0, .24), (12.0, .22), (18.0, .26), (24.0, .26), (28.0, .20), (32.0, .22), (36.0, .32),
             (40.0, .22), (44.0, .24), (50.0, .20), (54.0, .36), (56.5, .26), (58.0, .30)]:
    place(harm, stab([f * 2 for f in chord(t + .01)[1]], a), t)

# SOUND DESIGN synced to picture
place(fx, whoosh(.5, .16, 400, 3000), 3.45)                                        # lockup → HUD
for t in [5.0, 5.5, 6.0, 6.5]: place(fx, tick(.14), t)                             # rotating words
place(fx, tick(.18, 1400), 7.0)                                                    # hub pops
place(fx, whoosh(.55, .22, 250, 4000), 7.45)                                       # fly into hub
for k in range(12): place(fx, tick(.08, 1800 + k * 120), 8.2 + k * .05)            # keys cascade
place(fx, whoosh(.35, .14), 9.65); place(fx, bell(1760.0, .10, .8), 9.95)          # → one key
place(fx, whoosh(.55, .22, 250, 4000), 11.45)                                      # fly into key
place(fx, whoosh(.6, .14, 3000, 300), 12.0)                                        # pull back to code
place(fx, whoosh(.6, .16, 300, 2400), 13.3); place(fx, whoosh(.6, .12, 2400, 300), 14.9)  # base_url zoom
for t in [15.5, 16.0, 16.5, 17.0]: place(fx, tick(.18), t); place(fx, bell(1318.51, .05, .5), t + .26)  # routes
place(fx, whoosh(.36, .2), 17.72)                                                  # whip
for k in range(10): place(fx, tick(.07, 2600 + k * 120), 18.15 + k * .12)         # 200+ counter
for k in range(5): place(fx, tick(.06, 2000 + k * 150), 18.6 + k * .12)            # speed bars
place(fx, whoosh(.5, .16, 400, 3000), 23.5)                                        # push
for t in [24.8, 25.15, 25.5]: place(fx, tick(.12, 2400), t)                        # 200 OK lines
buzz(25.85); buzz(26.2, .12)                                                       # 429s + stamp
place(fx, whoosh(.36, .2), 27.72)                                                  # whip
place(fx, tick(.25, 1500), 29.62); place(fx, bell(1318.51, .10, .9), 29.7)        # toggle click
place(fx, bell(1760.0, .07, .7), 29.9)                                             # toast
place(fx, whoosh(.6, .22, 250, 4000), 31.4)                                        # fly into toggle
place(fx, bell(987.77, .09), 33.2)                                                 # request lands
buzz(33.62, .09)                                                                   # 429 on key 1
place(fx, bell(1479.98, .10), 34.15)                                               # failover 200
place(fx, whoosh(.7, .24, 200, 4500), 35.35)                                       # fly into the pool
for i, t in enumerate([37.0, 37.35, 37.7, 38.05, 38.4]):
    place(fx, bell([1174.66, 1318.51, 1479.98, 1760.0, 2349.32][i], .09), t)      # free models light
for k in range(8): place(fx, tick(.05, 2200 + k * 100), 36.5 + k * .15)           # stats count
place(fx, whoosh(.36, .2), 39.72)                                                  # whip
for i, t in enumerate([40.65, 40.95, 41.25, 41.55]): place(fx, bell(2637.0 - i * 200, .08, .6), t)  # coins
place(fx, whoosh(.45, .16), 43.55)                                                 # push
for k in range(12): place(fx, tick(.06, 2200 + k * 90), 44.45 + k * .07)          # data bars grow
place(fx, whoosh(.36, .2), 49.72)                                                  # whip
place(fx, tick(.22, 1500), 51.67); place(fx, bell(1760.0, .09), 52.05)            # donate click → $0
place(fx, whoosh(.6, .22, 250, 4000), 53.38)                                       # fly into $0
for k in range(10): place(fx, tick(.07, 2600 + k * 120), 54.1 + k * .1)           # counter
place(fx, whoosh(.3, .16), 56.2)                                                   # push → end
place(fx, tick(.2, 1500), 57.97)                                                   # start-free click
place(fx, impact(.4), 24.0); place(fx, impact(.5), 36.0); place(fx, impact(.55), 54.0); place(fx, impact(.45), 58.0)

# ── mix ────────────────────────────────────────────────────────────────
bass *= duck; harm_d = harm * (.55 + .45 * duck)
mel_d = mel * (.6 + .4 * duck)
mix = drum * .85 + bass * .9 + harm_d * 1.0 + mel_d * 1.0 + fx * .9
L = mix.copy(); R = mix.copy()
d = int(.012 * SR); wide = harm_d * .35 + mel_d * .25 + fx * .2
R[d:] += wide[:-d] * .5; L += wide * .1
fade = np.ones(N); fo = int(1.2 * SR); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
st = np.stack([L, R], 1) * fade[:, None]
st = np.tanh(st / np.max(np.abs(st)) * 1.25) * .89
pcm = (st * 32767).astype(np.int16)
with wave.open(os.path.join(HERE, "score.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote score.wav", DUR, "s")
