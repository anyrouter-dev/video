/**
 * sound — the score and the sound effects of a film, synthesized from nothing.
 *
 *   renderSound({ duration, palette, cues, seed })  →  a complete WAV file (Buffer)
 *   writeSound(file, opts)                          →  { seconds, peakDb, cues }
 *
 * Node builtins only, no samples, no ffmpeg. Same input → byte-identical WAV, so
 * the sound is as reproducible as the picture.
 *
 * Two layers:
 *
 *  1. The BED — music written at the film's length, never a loop cut to fit.
 *     Every film has the same shape: a teaser, a body that builds through
 *     levels (see ARC), and a resolve that lands on the `end` cue — or on the
 *     last beat that leaves ~2s to ring out when there is none.
 *  2. The CUES — effects placed on the picture (`at` in seconds). The bed ducks
 *     under `hit`, `cut` and `end`, so an effect is never buried and never clips.
 *
 * Tempo is shared (120 BPM, a beat is 0.5s, a bar 2s) so cuts stay on the grid
 * in every palette. What differs per palette is key, groove and voices.
 *
 * The look is 1-bit print, so is the sound: pulse and FM tones, bit-crushed
 * drums, noise that is either on or off (`dither`), dot-matrix bursts (`dots`).
 * Dry — there is no reverb anywhere.
 *
 * Listen: node lib/sound.mjs <palette> <seconds> [out.wav]
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const BPM = 120; // beat = 0.5s; films cut on the beat grid where they can
export const PALETTES = ['drop', 'release', 'changelog', 'intro'];

const SR = 48000;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const S16 = BEAT / 4;
const TAU = Math.PI * 2;
const CEILING = 0.885; // -1.06 dBFS — the soft clip never exceeds it
const KNEE = 0.6;
const TRIM = 0.8; // bed + cues, before the soft clip — keeps the clip for accidents
const BED_RMS = 0.14; // the body of the bed sits at -17 dBFS RMS…
const BED_PEAK = 0.8; // …unless that would push its loudest sample past -2 dBFS
const CUE_KINDS = ['cut', 'tick', 'rise', 'hit', 'type', 'end'];

// ── primitives ─────────────────────────────────────────────────────────
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mtof = m => 440 * 2 ** ((m - 69) / 12);
const len = dur => Math.max(1, Math.round(dur * SR));

function gen(dur, fn) {
  const n = len(dur), y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = fn(i / SR, i, n);
  return y;
}
/** Attack / decay / sustain, with a release that always reaches zero at the end. */
function adsr(n, a, d, s, r) {
  const A = a * SR, D = d * SR, R = r * SR;
  return i => (i < A ? i / A : i < A + D ? 1 - (1 - s) * (i - A) / D : s) * Math.min(1, (n - i) / R);
}
function biquad(x, type, fc, q = 0.707) {
  const w = TAU * Math.min(fc, SR * 0.45) / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; }
  const a0 = 1 + al, a1 = -2 * cs / a0, a2 = (1 - al) / a0;
  b0 /= a0; b1 /= a0; b2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y;
  }
  return x;
}
/** Band-pass whose centre moves — `fc(p)` with p from 0 to 1. */
function sweep(x, fc, q = 0.5) {
  let low = 0, band = 0;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin(Math.PI * Math.min(fc(i / x.length), 7000) / SR);
    low += f * band;
    band += f * (x[i] - low - q * band);
    x[i] = band;
  }
  return x;
}
/** Fewer bits, fewer samples: the amplitude is quantised and held. */
function crush(x, bits, hold) {
  const q = 2 ** (bits - 1);
  let h = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % hold === 0) h = Math.round(x[i] * q) / q;
    x[i] = h;
  }
  return x;
}
function place(bus, sig, at, gain = 1, pan = 0) {
  const i0 = Math.round(at * SR), n = bus.l.length;
  if (i0 >= n) return;
  const a = (pan + 1) * Math.PI / 4, gl = gain * Math.cos(a) * Math.SQRT2, gr = gain * Math.sin(a) * Math.SQRT2;
  const from = Math.max(0, -i0), to = Math.min(sig.length, n - i0);
  for (let i = from; i < to; i++) { bus.l[i0 + i] += sig[i] * gl; bus.r[i0 + i] += sig[i] * gr; }
}
const newBus = n => ({ l: new Float64Array(n), r: new Float64Array(n) });

// ── noise, the 1-bit way ───────────────────────────────────────────────
/** Noise that is on or off, like a dither pattern: `density(p)` of the cells are inked. */
function dither(rng, dur, density, hold = 4) {
  let v = 0;
  return gen(dur, (t, i, n) => {
    if (i % hold === 0) v = rng() < density(i / n) ? (rng() < 0.5 ? 1 : -1) : 0;
    return v;
  });
}
/** A dot-matrix head crossing the paper: pin strikes at `rate` Hz, `fill` of them firing. */
function dots(rng, dur, rate = 64, fill = 0.7, fc = 3200) {
  const n = len(dur), y = new Float64Array(n), period = SR / rate;
  for (let k = 0; k * period < n; k++) {
    if (rng() > fill) continue;
    const i0 = Math.floor(k * period), a = 0.6 + 0.4 * rng();
    for (let i = 0; i < 140 && i0 + i < n; i++) y[i0 + i] = (rng() * 2 - 1) * a * Math.exp(-i / 35);
  }
  return biquad(y, 'bp', fc, 1.2);
}

// ── drums ──────────────────────────────────────────────────────────────
function kick(rng, punch = 1) {
  let ph = 0;
  return gen(0.4, t => {
    ph += TAU * (150 * punch * Math.exp(-t * 30) + 48) / SR;
    const click = t < 0.004 ? (rng() * 2 - 1) * Math.exp(-t * 500) * 0.3 : 0;
    return Math.tanh((Math.sin(ph) * Math.exp(-t * 7) + click) * 1.4);
  });
}
function snare(rng) {
  const y = biquad(gen(0.18, t => (rng() * 2 - 1) * Math.exp(-t * 24)), 'bp', 2200, 0.8);
  for (let i = 0; i < y.length; i++) y[i] = y[i] * 1.6 + Math.sin(TAU * 190 * i / SR) * Math.exp(-i / SR * 30) * 0.5;
  return crush(y, 6, 3);
}
function clap(rng) {
  // three quick bursts, then the tail — hands never land together
  return biquad(gen(0.2, t => (rng() * 2 - 1) * Math.exp(-t * 28) * (t < 0.012 && t % 0.004 > 0.002 ? 0.3 : 1)), 'bp', 1500, 1);
}
function hat(rng, open = false) {
  const y = dither(rng, open ? 0.16 : 0.035, () => 1, 3);
  for (let i = 0; i < y.length; i++) y[i] *= 2.2 * Math.exp(-i / SR * (open ? 20 : 95));
  return biquad(y, 'hp', 6000);
}
function wood(f = 1250) {
  return gen(0.07, t => (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.52 * t)) * Math.exp(-t * 60));
}

// ── tones ──────────────────────────────────────────────────────────────
/** Pulse wave, DC removed. `duty` 0.5 is a square. */
function pulse(f, dur, duty = 0.5) {
  let ph = 0;
  const dc = 2 * duty - 1;
  return gen(dur, () => { ph = (ph + f / SR) % 1; return (ph < duty ? 1 : -1) - dc; });
}
function chip(f, dur, duty = 0.25) {
  const y = biquad(pulse(f, dur, duty), 'lp', 6000), e = adsr(y.length, 0.002, 0.03, 0.55, 0.03);
  for (let i = 0; i < y.length; i++) y[i] *= e(i) * 0.6;
  return y;
}
/** Hook voice: a soft square with a little FM bite at the front. */
function lead(f, dur, cut = 3600) {
  const y = biquad(gen(dur, t => Math.tanh(3 * Math.sin(TAU * f * t + 0.6 * Math.sin(TAU * f * 2 * t) * Math.exp(-t * 18)))), 'lp', cut);
  const e = adsr(y.length, 0.003, 0.09, 0.45, 0.06);
  for (let i = 0; i < y.length; i++) y[i] *= e(i);
  return y;
}
function pluck(f, dur = 0.25, bright = 1) {
  return gen(dur, (t, i, n) => Math.sin(TAU * f * t + 1.4 * bright * Math.sin(TAU * f * 3 * t) * Math.exp(-t * 26)) * Math.exp(-t * 12) * Math.min(1, (n - i) / 200));
}
function bell(f, dur = 0.9) {
  return gen(dur, (t, i, n) => Math.sin(TAU * f * t + 2.2 * Math.sin(TAU * f * 3.5 * t) * Math.exp(-t * 6)) * Math.exp(-t * 4.5) * Math.min(1, (n - i) / 400));
}
function bassv(f, dur, cut = 500) {
  const y = biquad(pulse(f, dur), 'lp', cut), e = adsr(y.length, 0.004, 0.05, 0.7, 0.05);
  for (let i = 0; i < y.length; i++) y[i] = (y[i] * 0.45 + Math.sin(TAU * f * i / SR) * 0.8) * e(i);
  return y;
}
function pad(freqs, dur, cut = 2200) {
  const n = len(dur), y = new Float64Array(n);
  for (const f of freqs) {
    const a = pulse(f, dur, 0.35), b = pulse(f * 1.006, dur, 0.5);
    for (let i = 0; i < n; i++) y[i] += (a[i] + b[i]) / (2 * freqs.length);
  }
  biquad(y, 'lp', cut);
  const e = adsr(n, 0.18, 0.3, 0.8, 0.35);
  for (let i = 0; i < n; i++) y[i] *= e(i);
  return y;
}
function stab(freqs, dur = 0.12) {
  const n = len(dur), y = new Float64Array(n);
  for (const f of freqs) { const a = pulse(f, dur, 0.25); for (let i = 0; i < n; i++) y[i] += a[i] / freqs.length; }
  biquad(y, 'lp', 4500);
  const e = adsr(n, 0.002, 0.05, 0.4, 0.05);
  for (let i = 0; i < n; i++) y[i] *= e(i);
  return crush(y, 5, 3);
}
/** Rising dither that fills in, over a pulse climbing in steps from `f`. */
function riser(rng, dur, f = 146.83) {
  const y = biquad(dither(rng, dur, p => p * p * 0.9, 3), 'hp', 1500), steps = 12;
  let ph = 0;
  for (let i = 0; i < y.length; i++) {
    const p = i / y.length;
    ph = (ph + f * 2 ** (Math.floor(p * steps) * 2 / steps) / SR) % 1;
    y[i] = y[i] * p ** 1.5 + (ph < 0.25 ? 0.22 : -0.22) * p * p;
  }
  return y;
}

// ── the scores ─────────────────────────────────────────────────────────
// A chord is a bass root and three tones, as MIDI notes.
const ch = (root, ...tones) => ({ root, tones, key: `${root}.${tones.join('.')}` });
const freqs = (c, up = 0) => c.tones.map(m => mtof(m + up));

// How a body of n bars builds. [from (0–1), level, use progB?]
//   0 breakdown · 1 groove, no hook · 2 groove + hook · 3 full · 4 lift
const ARC_SHORT = [[0, 3]];
const ARC = [[0, 1], [0.25, 2], [0.6, 3]];
const ARC_BREAK = [[0, 1], [0.2, 2], [0.5, 0], [0.62, 3]];
const ARC_LONG = [[0, 1], [0.12, 2], [0.3, 3], [0.45, 0], [0.53, 2], [0.62, 4], [0.78, 2, true], [0.88, 4]];
const arcFor = (n, long) => (n < 4 ? ARC_SHORT : n < 12 ? ARC : long && n >= 16 ? ARC_LONG : ARC_BREAK);

const F = { i: ch(41, 65, 68, 72), VI: ch(37, 65, 68, 73), III: ch(44, 63, 68, 72), VII: ch(39, 63, 67, 70) };
const G = { I: ch(43, 62, 67, 71), vi: ch(40, 64, 67, 71), IV: ch(36, 64, 67, 72), V: ch(38, 62, 66, 69) };
const A = { i: ch(45, 64, 67, 72), VI: ch(41, 65, 69, 72), v: ch(40, 64, 67, 71) };
const D = { I: ch(38, 62, 66, 69), vi: ch(35, 62, 66, 71), IV: ch(31, 62, 67, 71), V: ch(33, 61, 64, 69) };

// release: one sung phrase per chord — [step, note, length in steps]
const TUNE = {
  [G.I.key]: [[0, 74, 3], [3, 71, 3], [6, 67, 2], [8, 69, 2], [10, 71, 4]],
  [G.vi.key]: [[0, 76, 3], [3, 71, 3], [6, 67, 4], [12, 71, 2], [14, 74, 2]],
  [G.IV.key]: [[0, 76, 3], [3, 72, 3], [6, 67, 2], [8, 72, 2], [10, 76, 4], [14, 74, 2]],
  [G.V.key]: [[0, 74, 3], [3, 69, 3], [6, 66, 2], [8, 69, 4], [12, 74, 4]],
};
// intro: the 3-3-4-2 clave hook, its notes following the chord
const CLAVE = [0, 3, 6, 10, 12];
const HOOK = {
  [D.I.key]: [[0, 81], [3, 78], [6, 81], [10, 83], [12, 81]],
  [D.vi.key]: [[0, 78], [3, 74], [6, 78], [10, 81], [12, 78]],
  [D.IV.key]: [[0, 79], [3, 83], [6, 86], [10, 83], [12, 81], [14, 79]],
  [D.V.key]: [[0, 76], [3, 81], [6, 85], [8, 88], [10, 85]],
};

const SCORES = {
  // model launches — punchy, syncopated, the most notes per bar
  drop: {
    home: F.i, turn: F.VII, prog: [F.i, F.VI, F.III, F.VII], swing: 0,
    teaser(c, b) {
      F.i.tones.forEach((m, j) => [0, 3, 6, 10, 12, 14].forEach((s, i) => (i + j) % 3 === 0 &&
        c.put(c.music, c.m(`pl${m}`, () => pluck(mtof(m + 12), 0.2, 0.6)), c.t(b, s), 0.22, j - 1)));
      for (let s = 0; s < 16; s += 2) c.put(c.drum, c.hat(), c.t(b, s), 0.05 + s * 0.012, 0.3);
      for (const s of [0, 3, 6, 10]) c.put(c.bass, c.m(`bs${F.i.root}.1`, () => bassv(mtof(F.i.root), 0.11, 900)), c.t(b, s), 0.3);
    },
    bar(c, b, chord, lv, k) {
      const kicks = k % 2 ? [0, 3, 7, 10, 13] : [0, 3, 6, 10], root = mtof(chord.root);
      if (lv === 0) {
        c.put(c.bass, c.m(`bl${chord.root}`, () => bassv(root, BAR * 0.9, 300)), c.t(b, 0), 0.3);
        for (const s of CLAVE) c.put(c.drum, c.m('zt', () => dots(c.rng, 0.09)), c.t(b, s), 0.2, s % 4 ? 0.4 : -0.4);
      } else {
        for (const s of kicks) {
          const up = s === 6 || s === 7 ? 2 : 1;
          c.kick(c.t(b, s), s ? 0.85 : 1);
          c.put(c.bass, c.m(`bs${chord.root}.${up}`, () => bassv(root * up, 0.11, 900)), c.t(b, s), 0.55);
        }
        for (const s of [4, 12]) c.put(c.drum, c.snare(), c.t(b, s), 0.5);
        for (let s = 0; s < 16; s += lv === 1 ? 2 : 1) c.put(c.drum, c.hat(), c.t(b, s), s % 4 === 2 ? 0.13 : s % 2 ? 0.05 : 0.08, 0.3);
      }
      if (lv !== 1) [0, 2, 3, 6, 8, 10, 11, 14].forEach((s, i) => {
        const m = chord.tones[(i * 2) % 3] + (i % 4 === 3 ? 24 : 12);
        c.put(c.music, c.m(`pl${m}`, () => pluck(mtof(m), 0.2, 1.2)), c.t(b, s), 0.13, i % 2 ? 0.5 : -0.5);
      });
      if (lv >= 2) [3, 6, 11, 14].forEach((s, i) =>
        c.put(c.music, c.m(`st${chord.key}`, () => stab(freqs(chord), 0.1)), c.t(b, s), 0.22, i % 2 ? -0.35 : 0.35));
      if (lv >= 3) {
        for (const s of [0, 6, 12]) c.put(c.music, c.m(`cp${chord.tones[2]}`, () => chip(mtof(chord.tones[2] + 12), 0.16)), c.t(b, s), 0.11);
        c.put(c.drum, c.hat(true), c.t(b, 14), 0.12, 0.3);
        c.put(c.drum, c.snare(), c.t(b, 15), 0.2);
      }
    },
    resolve(c, t) {
      place(c.music, stab(freqs(F.i), 0.5), t, 0.3);
      place(c.drum, c.hat(true), t, 0.18, 0.3);
    },
  },

  // a product version — half-time backbeat, a sung tune over a warm pad
  release: {
    home: G.I, turn: G.V, prog: [G.I, G.vi, G.IV, G.V], swing: 0.02,
    teaser(c, b) {
      c.pad(G.I, c.t(b, 0), 0.22, 1300);
      for (const [s, m] of TUNE[G.I.key]) c.put(c.music, c.m(`be${m}`, () => bell(mtof(m), 0.5)), c.t(b, s), 0.13);
    },
    bar(c, b, chord, lv, k) {
      const root = mtof(chord.root);
      c.pad(chord, c.t(b, 0), lv >= 2 ? 0.13 : 0.15, lv >= 2 ? 2200 : 1400);
      if (lv === 0) {
        c.put(c.bass, c.m(`bl${chord.root}`, () => bassv(root, BAR * 0.9, 300)), c.t(b, 0), 0.3);
      } else {
        for (const s of lv >= 3 ? [0, 7, 10, 14] : k % 2 ? [0, 7, 10] : [0, 10]) c.kick(c.t(b, s), s ? 0.8 : 0.95);
        c.put(c.drum, c.snare(), c.t(b, 8), 0.3);
        c.put(c.drum, c.clap(), c.t(b, 8), 0.4);
        for (let s = 0; s < 16; s += 2) c.put(c.drum, c.hat(lv >= 2 && s % 8 === 6), c.t(b, s), s % 4 ? 0.09 : 0.05, -0.25);
        [[0, 1, 5], [6, 1, 3], [10, 1.5, 3], [14, 2, 2]].forEach(([s, up, l]) =>
          c.put(c.bass, c.m(`bs${chord.root}.${up}.${l}`, () => bassv(root * up, l * S16 * 0.9, 380)), c.t(b, s), 0.5));
      }
      for (const [s, m, l] of TUNE[chord.key]) {
        if (lv === 0) c.put(c.music, c.m(`be${m}`, () => bell(mtof(m), 0.5)), c.t(b, s), 0.12);
        if (lv >= 2) c.put(c.music, c.m(`ld${m}.${l}`, () => lead(mtof(m), l * S16 * 0.92, 3000)), c.t(b, s), 0.13);
      }
      if (lv >= 3) for (let s = 1; s < 16; s += 2) {
        const m = chord.tones[(s >> 1) % 3] + 12;
        c.put(c.music, c.m(`pl${m}`, () => pluck(mtof(m), 0.2, 0.7)), c.t(b, s), 0.07, s % 4 === 1 ? 0.5 : -0.5);
      }
    },
    resolve(c, t) {
      place(c.music, lead(mtof(79), 1.0, 3000), t, 0.12);
      place(c.music, bell(mtof(86), 1.6), t + BEAT / 2, 0.08, 0.3);
    },
  },

  // a daily log — sparse and mechanical: a printer head, a carriage, a bell
  changelog: {
    home: A.i, turn: A.v, prog: [A.i, A.i, A.VI, A.VI], swing: 0, landing: 0.55,
    line(c, b, s, steps, gain) {
      c.put(c.drum, dots(c.rng, steps * S16 * 0.92, 64, 0.72), c.t(b, s), gain, -0.3);
    },
    carriage(c, t, gain) {
      c.put(c.drum, gen(0.2, (u, i, n) => (Math.sin(TAU * (90 + 160 * u / 0.2) * u) > 0 ? 1 : -1) * 0.5 * Math.min(1, i / 200, (n - i) / 600)), t, gain, 0.2);
    },
    teaser(c, b) {
      this.line(c, b, 2, 4, 0.34);
      this.line(c, b, 8, 5, 0.4);
      c.put(c.music, c.m('ding', () => bell(mtof(93), 0.8)), c.t(b, 14), 0.12, 0.4);
    },
    bar(c, b, chord, lv, k) {
      const root = mtof(chord.root);
      if (lv > 0) {
        c.kick(c.t(b, 0), 0.7);
        if (lv >= 2) c.kick(c.t(b, 10), 0.55);
        for (const s of [4, 12]) c.put(c.drum, c.m('wood', () => wood(1250)), c.t(b, s), 0.2, 0.25);
      }
      c.put(c.bass, c.m(`bs${chord.root}`, () => bassv(root, 0.22, 700)), c.t(b, 0), 0.5);
      if (lv >= 2) c.put(c.bass, c.m(`bs${chord.root}.2`, () => bassv(root * 2, 0.1, 700)), c.t(b, 11), 0.4);
      // the head prints a line, the carriage returns, every fourth line rings the bell
      this.line(c, b, 1, lv >= 3 ? 3 : 2, 0.2);
      if (lv !== 1) this.line(c, b, 5, 2, 0.17);
      this.carriage(c, c.t(b, 13), 0.07);
      if (k % 4 === 3) c.put(c.music, c.m('ding', () => bell(mtof(93), 0.8)), c.t(b, 14), 0.13, 0.4);
      if (lv === 0 || lv >= 2) [[6, 0], [8, 2], [9, 1]].forEach(([s, j]) => (lv >= 3 || k % 2 === 0) &&
        c.put(c.music, c.m(`cp${chord.tones[j]}`, () => chip(mtof(chord.tones[j] + 12), 0.1, 0.5)), c.t(b, s), 0.12, 0.2 - j * 0.2));
      if (lv >= 3) for (let s = 2; s < 16; s += 4) c.put(c.drum, c.hat(), c.t(b, s), 0.06, 0.3);
    },
    fill(c, t) {
      c.put(c.drum, dots(c.rng, BEAT * 0.9, 96, 0.85), t - BEAT, 0.22, -0.3);
    },
    resolve(c, t) {
      place(c.music, bell(mtof(93), 1.4), t, 0.14, 0.4);
      place(c.drum, dots(c.rng, 0.12, 64, 1), t, 0.2, -0.3);
    },
  },

  // the 60s brand piece — 2-step, the clave hook, and an arrangement that develops
  intro: {
    home: D.I, turn: D.V, prog: [D.I, D.vi, D.IV, D.V], progB: [D.vi, D.IV, D.I, D.V], swing: 0.022, long: true,
    hook(c, b, chord, make, gain, up = 0) {
      const notes = HOOK[chord.key];
      notes.forEach(([s, m], j) => {
        const l = ((notes[j + 1]?.[0] ?? 16) - s) * S16 * 0.92;
        c.put(c.music, c.m(`${make.name}${m + up}.${j}`, () => make(mtof(m + up), l)), c.t(b, s), gain, up ? 0.3 : 0);
      });
    },
    teaser(c, b, k) {
      c.pad(D.I, c.t(b, 0), 0.24, 1500);
      this.hook(c, b, k % 2 ? D.vi : D.I, (f) => bell(f, 0.5), 0.13);
    },
    bar(c, b, chord, lv, k) {
      const root = mtof(chord.root);
      c.pad(chord, c.t(b, 0), 0.11, lv === 0 ? 1200 : 2400);
      if (lv === 0) {
        c.put(c.bass, c.m(`bl${chord.root}`, () => bassv(root, BAR * 0.9, 300)), c.t(b, 0), 0.28);
        for (const s of CLAVE) c.put(c.drum, c.m('wood', () => wood()), c.t(b, s), 0.12, -0.3);
        this.hook(c, b, chord, (f) => bell(f, 0.5), 0.12);
        return;
      }
      for (const s of k % 2 ? [0, 3, 8, 11] : [0, 6, 10]) c.kick(c.t(b, s), lv >= 3 ? 1 : 0.9);
      for (const s of [4, 12]) { c.put(c.drum, c.clap(), c.t(b, s), 0.42); c.put(c.drum, c.snare(), c.t(b, s), 0.17); }
      for (let s = 0; s < 16; s += lv >= 3 ? 1 : 2) c.put(c.drum, c.hat(s % 4 === 2), c.t(b, s), s % 4 === 2 ? 0.1 : 0.05, 0.3);
      if (lv === 1) for (const s of CLAVE) c.put(c.drum, c.m('wood', () => wood()), c.t(b, s), 0.09, -0.3);
      CLAVE.forEach((s, j) => {
        const up = [1, 1, 2, 1.5, 1][j], l = [3, 3, 4, 2, 4][j];
        c.put(c.bass, c.m(`bs${chord.root}.${up}.${l}`, () => bassv(root * up, l * S16 * 0.85, 420)), c.t(b, s), s ? 0.45 : 0.55);
      });
      if (lv >= 2) this.hook(c, b, chord, function ld(f, l) { return lead(f, l); }, 0.12);
      if (lv >= 3) [2, 7, 14].forEach((s, j) =>
        c.put(c.music, c.m(`pl${chord.tones[2 - j % 2]}`, () => pluck(mtof(chord.tones[2 - j % 2] + 12), 0.2, 1.1)), c.t(b, s), 0.1, j % 2 ? 0.5 : -0.5));
      if (lv >= 4) {
        this.hook(c, b, chord, function oc(f, l) { return chip(f, l, 0.5); }, 0.06, 12);
        c.put(c.music, c.m(`st${chord.key}`, () => stab(freqs(chord, 12), 0.3)), c.t(b, 0), 0.16);
      }
    },
    resolve(c, t) {
      place(c.music, lead(mtof(86), 1.2), t, 0.11);
      place(c.music, bell(mtof(86), 1.8), t, 0.12, -0.3);
      place(c.music, bell(mtof(90), 1.8), t + BEAT / 2, 0.08, 0.3);
    },
  },
};

// ── the bed ────────────────────────────────────────────────────────────
function bed(n, duration, P, endAt, rng) {
  const drum = newBus(n), bass = newBus(n), music = newBus(n), side = new Float64Array(n).fill(1);
  const memo = new Map();
  let stop = endAt;
  const c = {
    drum, bass, music, rng,
    m(key, make) { if (!memo.has(key)) memo.set(key, make()); return memo.get(key); },
    t: (b, s) => b * BAR + s * S16 + (s % 2 ? P.swing : 0),
    put(bus, sig, t, gain, pan) { if (t < stop - 1e-6 && t >= 0) place(bus, sig, t, gain, pan); },
    kick(t, gain) {
      if (t >= stop - 1e-6) return;
      place(drum, c.m('kick', () => kick(rng)), t, gain);
      const i0 = Math.round(t * SR), L = Math.round(0.16 * SR);
      for (let i = 0; i < L && i0 + i < n; i++) side[i0 + i] = Math.min(side[i0 + i], 0.35 + 0.65 * (i / L) ** 0.6);
    },
    hat: open => c.m(`hat${open ? 1 : 0}`, () => hat(rng, open)),
    snare: () => c.m('snare', () => snare(rng)),
    clap: () => c.m('clap', () => clap(rng)),
    pad(chord, t, gain, cut) {
      const dur = Math.min(BAR + 0.25, stop - t + 0.1);
      if (dur > 0.4) c.put(music, c.m(`pad${chord.key}.${cut}.${dur.toFixed(3)}`, () => pad(freqs(chord), dur, cut)), t, gain);
    },
  };

  // teaser → body → resolve
  const introBars = duration >= 24 ? 2 : duration >= 7 ? 1 : 0;
  const bodyBars = Math.max(0, Math.ceil((endAt - introBars * BAR) / BAR - 1e-9));
  const arc = arcFor(bodyBars, P.long);
  for (let b = 0; b < introBars; b++) P.teaser(c, b, b);
  if (introBars && P !== SCORES.changelog) c.put(music, riser(rng, BEAT * 2, mtof(P.home.root + 12)), introBars * BAR - BEAT * 2, 0.1);
  for (let k = 0; k < bodyBars; k++) {
    const [, lv, alt] = arc.findLast(([from]) => from <= k / bodyBars);
    const prog = alt && P.progB ? P.progB : P.prog;
    const chord = k === bodyBars - 1 && bodyBars > 1 ? P.turn : prog[k % prog.length];
    P.bar(c, introBars + k, chord, lv, k);
  }
  if (bodyBars) {
    if (P.fill) P.fill(c, endAt);
    else {
      for (let j = 4; j >= 1; j--) c.put(drum, c.snare(), endAt - j * S16, 0.42 - j * 0.07);
      c.put(music, riser(rng, BEAT * 2, mtof(P.home.root + 12)), endAt - BEAT * 2, 0.09);
    }
  }
  stop = Infinity;
  const land = P.landing ?? 1;
  c.kick(endAt, land);
  place(bass, bassv(mtof(P.home.root), 1.6, 420), endAt, 0.6 * land);
  place(music, pad(freqs(P.home), 1.8, 2400), endAt, 0.16 * land);
  P.resolve(c, endAt);
  // an early `end` leaves a long card: keep a pulse under it instead of silence
  for (let j = 1; endAt + j * BAR < duration - 1; j++) {
    c.kick(endAt + j * BAR, 0.6 * 0.7 ** j);
    place(music, c.m('tail', () => bell(mtof(P.home.tones[0] + 12), 1.2)), endAt + j * BAR, 0.12 * 0.7 ** j);
  }

  // kick ducks the bass fully, the music partly
  const out = newBus(n);
  // levelled by the loudness of the body, not by its loudest sample, so a
  // stacked resolve cannot make the whole film quiet
  const from = Math.round(introBars * BAR * SR), to = Math.round(endAt * SR) > from + SR ? Math.round(endAt * SR) : n;
  let peak = 1e-9, energy = 0;
  for (const [o, d, bs, mu] of [[out.l, drum.l, bass.l, music.l], [out.r, drum.r, bass.r, music.r]]) {
    for (let i = 0; i < n; i++) {
      const v = d[i] * 0.85 + bs[i] * side[i] * 0.9 + mu[i] * (0.8 + 0.5 * side[i]);
      o[i] = v;
      if (v > peak) peak = v; else if (-v > peak) peak = -v;
      if (i >= from && i < to) energy += v * v;
    }
  }
  const g = Math.min(BED_RMS / Math.sqrt(energy / (2 * (to - from)) + 1e-12), BED_PEAK / peak);
  for (let i = 0; i < n; i++) { out.l[i] *= g; out.r[i] *= g; }
  return out;
}

// ── the cues ───────────────────────────────────────────────────────────
function boom(dur, f0, rate) {
  let ph = 0;
  return gen(dur, (t, i, n) => {
    ph += TAU * (f0 * Math.exp(-t * 14) + 40) / SR;
    return Math.tanh(Math.sin(ph) * Math.exp(-t * rate) * 1.3) * Math.min(1, (n - i) / 600);
  });
}
const CUES = {
  // scene change: dither that fills in and clears, swept upward, then the thud on the cut
  cut(fx, rng, { at, gain }) {
    const w = sweep(dither(rng, 0.3, p => Math.sin(Math.PI * p) ** 2, 5), p => 400 * 12 ** p);
    for (let i = 0; i < w.length; i++) w[i] *= Math.sin(Math.PI * (i / w.length) ** 0.7) ** 1.5;
    place(fx, w, at - 0.2, 0.55 * gain, -0.2);
    place(fx, boom(0.25, 90, 16), at, 0.42 * gain);
    return [0.7, 0.22];
  },
  // a row lands: one blip, its pitch stepping through root · fifth · octave
  tick(fx, rng, { at, gain }, P, k) {
    const f = mtof(P.home.root + 48 + [0, 7, 12][k % 3]);
    place(fx, gen(0.03, t => ((f * t) % 1 < 0.5 ? 1 : -1) * Math.exp(-t * 170) + (t < 0.002 ? rng() * 2 - 1 : 0)), at, 0.34 * gain, k % 2 ? 0.25 : -0.25);
  },
  // riser INTO a moment — `at` is where it ends
  rise(fx, rng, { at, gain, dur = 0.6 }, P) {
    const d = Math.min(Math.max(dur, 0.2), 4, at);
    if (d >= 0.05) place(fx, riser(rng, d, mtof(P.home.root + 12)), at - d, 0.5 * gain);
  },
  // the big accent: sub boom, a crushed crack, the home chord as a stab
  hit(fx, rng, { at, gain }, P) {
    place(fx, boom(0.9, 120, 4.5), at, 0.6 * gain);
    place(fx, crush(biquad(gen(0.08, t => (rng() * 2 - 1) * Math.exp(-t * 45)), 'bp', 1800, 0.7), 4, 4), at, 0.5 * gain);
    place(fx, stab(freqs(P.home, 12), 0.4), at, 0.2 * gain);
    return [0.5, 0.4];
  },
  // keys being typed, for `dur` seconds
  type(fx, rng, { at, gain, dur = 0.6 }) {
    for (let t = 0; t < Math.min(Math.max(dur, 0.05), 10); t += 0.05 + rng() * 0.05) {
      const f = 2400 + rng() * 1600, a = 0.6 + rng() * 0.4;
      const key = biquad(dither(rng, 0.014, p => 1 - p, 2), 'hp', f * 0.6);
      for (let i = 0; i < key.length; i++) key[i] = key[i] * Math.exp(-i / SR * 250) + Math.sin(TAU * 320 * i / SR) * Math.exp(-i / SR * 300) * 0.5;
      place(fx, key, at + t, 0.45 * a * gain, rng() * 0.8 - 0.4);
    }
  },
  // the end card: a longer boom and the home chord left to ring
  end(fx, rng, { at, gain }, P) {
    place(fx, boom(1.6, 110, 3), at, 0.5 * gain);
    place(fx, bell(mtof(P.home.root + 36), 1.8), at, 0.16 * gain, -0.3);
    place(fx, bell(mtof(P.home.tones[2] + 12), 1.8), at, 0.1 * gain, 0.3);
    place(fx, stab(freqs(P.home, 12), 1.2), at, 0.14 * gain);
    return [0.6, 0.5];
  },
};

// ── render ─────────────────────────────────────────────────────────────
function synth({ duration, palette = 'drop', cues = [], seed = 1 } = {}) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`sound: duration must be a positive number of seconds, got ${duration}`);
  const P = SCORES[palette];
  if (!P) throw new Error(`sound: unknown palette "${palette}" — one of ${PALETTES.join(', ')}`);
  for (const cue of cues) {
    if (!CUE_KINDS.includes(cue?.kind)) throw new Error(`sound: unknown cue kind "${cue?.kind}" — one of ${CUE_KINDS.join(', ')}`);
    if (!Number.isFinite(cue.at)) throw new Error(`sound: cue "${cue.kind}" needs a numeric \`at\`, got ${cue.at}`);
  }
  const n = Math.round(duration * SR);
  const live = cues.filter(cue => cue.at >= 0 && cue.at < duration);
  const end = live.find(cue => cue.kind === 'end');
  const endAt = Math.max(0, Math.min(end ? end.at : Math.floor((duration - 2) / BEAT) * BEAT, duration - 0.5));

  const out = bed(n, duration, P, endAt, prng(seed));

  // each cue has its own noise, so adding one never changes the bed or the others
  const fx = newBus(n), duck = new Float64Array(n).fill(1);
  const counts = {};
  live.forEach(cue => {
    const k = counts[cue.kind] = (counts[cue.kind] ?? -1) + 1;
    const rng = prng(seed * 7919 + CUE_KINDS.indexOf(cue.kind) * 104729 + Math.round(cue.at * 1000));
    const dip = CUES[cue.kind](fx, rng, { ...cue, gain: cue.gain ?? 1 }, P, k);
    if (!dip) return;
    const [depth, recover] = dip, i0 = Math.round(cue.at * SR), A = 384, R = Math.round(recover * SR);
    for (let i = -A; i < R; i++) {
      const j = i0 + i;
      if (j >= 0 && j < n) duck[j] = Math.min(duck[j], i < 0 ? 1 - (1 - depth) * (i + A) / A : depth + (1 - depth) * (i / R) ** 1.5);
    }
  });

  // master: duck, sum, DC block, soft clip under the ceiling, fades
  const pcm = new Int16Array(n * 2), fadeIn = Math.round(0.04 * SR), fadeOut = Math.round(Math.min(0.6, duration / 4) * SR);
  const fade = new Float64Array(n).fill(1);
  for (let i = 0; i < Math.min(fadeIn, n); i++) fade[i] = i / fadeIn;
  for (let i = Math.max(0, n - fadeOut); i < n; i++) fade[i] = Math.min(fade[i], ((n - 1 - i) / fadeOut) ** 1.5);
  let peak = 0;
  for (const [chn, b, f] of [[0, out.l, fx.l], [1, out.r, fx.r]]) {
    for (let i = 0; i < n; i++) b[i] = (b[i] * duck[i] + f[i]) * TRIM;
    biquad(biquad(b, 'hp', 25), 'lp', 15000); // no DC, and no edges sharp enough to overshoot between samples
    for (let i = 0; i < n; i++) {
      const x = b[i], a = Math.abs(x);
      const v = a <= KNEE ? x : Math.sign(x) * (KNEE + (CEILING - KNEE) * Math.tanh((a - KNEE) / (CEILING - KNEE)));
      const s = Math.round(v * fade[i] * 32767);
      pcm[i * 2 + chn] = s;
      if (s > peak) peak = s; else if (-s > peak) peak = -s;
    }
  }

  const data = Buffer.from(pcm.buffer), head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22);
  head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 4, 28); head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return { wav: Buffer.concat([head, data]), seconds: n / SR, peakDb: 20 * Math.log10(Math.max(peak, 1) / 32768), cues: live.length };
}

/**
 * A complete WAV file: 48 kHz, stereo, 16-bit PCM, exactly `duration` seconds.
 * Cue kinds: 'cut' · 'tick' · 'rise' (`at` is where it ends) · 'hit' · 'type' (takes `dur`) · 'end'.
 * A cue outside the film is ignored; an unknown kind throws.
 */
export function renderSound(opts) {
  return synth(opts).wav;
}

/** Render and write. `cues` is how many landed inside the film. */
export function writeSound(file, opts) {
  const { wav, seconds, peakDb, cues } = synth(opts);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, wav);
  return { seconds, peakDb: Math.round(peakDb * 100) / 100, cues };
}

// ── listen ─────────────────────────────────────────────────────────────
/** A plausible film: a cut every 2–4s, rows ticking in, one typed line, one hit, an end card. */
function demoCues(duration, seed = 1) {
  const rng = prng(seed), cues = [], end = Math.floor((duration - 2) / BEAT) * BEAT, hitAt = Math.round(end * 0.45 / BEAT) * BEAT;
  for (let t = 2 + Math.floor(rng() * 3) * BEAT; t < end - 1; t += 2 + Math.floor(rng() * 5) * BEAT) {
    cues.push({ at: t, kind: 'cut' });
    if (rng() < 0.3) cues.push({ at: t + 0.5, kind: 'type', dur: 0.8 });
    else for (let k = 0; k < 3 + Math.floor(rng() * 3); k++) cues.push({ at: t + 0.5 + k * 0.25, kind: 'tick' });
  }
  cues.push({ at: hitAt, kind: 'rise', dur: 0.75 }, { at: hitAt, kind: 'hit' }, { at: end, kind: 'end' });
  return cues.sort((a, b) => a.at - b.at);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [palette, seconds, out] = process.argv.slice(2);
  if (!PALETTES.includes(palette) || !(Number(seconds) > 0)) {
    console.error(`usage: node lib/sound.mjs <${PALETTES.join('|')}> <seconds> [out.wav]`);
    process.exit(1);
  }
  const file = out ?? path.join('.build', 'sound-demo', `${palette}-${seconds}s.wav`);
  const t0 = performance.now();
  const stats = writeSound(file, { duration: Number(seconds), palette, cues: demoCues(Number(seconds)) });
  console.log(`${file}  ${stats.seconds}s  peak ${stats.peakDb} dBFS  ${stats.cues} cues  (${Math.round(performance.now() - t0)} ms)`);
}
