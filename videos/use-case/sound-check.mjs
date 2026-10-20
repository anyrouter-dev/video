// Renders every use-case film's mix, as the film writes it, and measures how far apart each
// pair sounds. Fails when two films are as close as one score is to itself with another motif.
//
//   node videos/use-case/sound-check.mjs [--from=FILE] [--models-from=FILE] [--out=FILE] [--keep=DIR]
//
// Each mix is reduced to three fingerprints, from the audio alone:
//   chroma   energy per pitch class over the film (its key and chords)
//   rhythm   the autocorrelation of its onsets over 0.25–1.6 s (its tempo and groove)
//   bright   its mean spectral centroid (its voices)
// A pair's distance is the length of (1 - chroma cosine, 1 - rhythm cosine, |log centroid ratio|).
// The bar it must clear is measured, not picked: the first film's score rendered again with
// another seed, the same key, tempo, chords and groove under a different motif, is the closest
// a film can sound to another without being it. Every pair must be farther apart than that.
//
// --out writes every pair's distance as JSON; --keep writes each mix as a wav.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../../lib/paths.mjs';
import { renderSound } from '../../lib/sound.mjs';
import { soundOf } from './project.mjs';
import kind from './kind.mjs';

const SR = 48000, DOWN = 4, RATE = SR / DOWN;

/** Mono, at a quarter of the rate: plenty for pitch under 3 kHz and for onsets. */
function mono(wav) {
  const s = new Int16Array(wav.buffer.slice(wav.byteOffset + 44, wav.byteOffset + 44 + wav.readUInt32LE(40)));
  const out = new Float64Array(Math.floor(s.length / 2 / DOWN));
  for (let i = 0; i < out.length; i++) {
    let v = 0;
    for (let k = 0; k < DOWN; k++) v += s[(i * DOWN + k) * 2] + s[(i * DOWN + k) * 2 + 1];
    out[i] = v / (2 * DOWN * 32768);
  }
  return out;
}

/** Magnitudes of a Hann-windowed frame, radix-2 FFT in place. */
function spectrum(x, from, n) {
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = (x[from + i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
  const mag = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
  return mag;
}

export function fingerprint(wav) {
  const x = mono(wav);
  const chroma = new Float64Array(12);
  let centroid = 0, frames = 0;
  for (let at = 0; at + 4096 <= x.length; at += 2048) {
    const m = spectrum(x, at, 4096);
    let num = 0, den = 0;
    for (let b = 1; b < m.length; b++) {
      const f = (b * RATE) / 4096, e = m[b] * m[b];
      num += f * e; den += e;
      if (f >= 55 && f <= 2000) chroma[((Math.round(12 * Math.log2(f / 440)) + 69) % 12 + 12) % 12] += e;
    }
    if (den > 1e-9) { centroid += num / den; frames++; }
  }
  // onsets: positive spectral flux every 1024 samples (85 ms), then its autocorrelation
  const flux = [];
  let prev = null;
  for (let at = 0; at + 1024 <= x.length; at += 256) {
    const m = spectrum(x, at, 1024);
    flux.push(prev ? m.reduce((s, v, i) => s + Math.max(0, v - prev[i]), 0) : 0);
    prev = m;
  }
  const hop = 256 / RATE, mean = flux.reduce((a, b) => a + b, 0) / flux.length, f = flux.map(v => v - mean);
  const rhythm = [];
  for (let lag = Math.round(0.25 / hop); lag <= Math.round(1.6 / hop); lag++) {
    let s = 0;
    for (let i = 0; i + lag < f.length; i++) s += f[i] * f[i + lag];
    rhythm.push(s);
  }
  return { chroma: [...chroma], rhythm, bright: centroid / Math.max(1, frames) };
}

const cosine = (a, b) => {
  let ab = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
  return ab / Math.sqrt(aa * bb || 1);
};
export function distance(a, b) {
  const chroma = 1 - cosine(a.chroma, b.chroma), rhythm = 1 - cosine(a.rhythm, b.rhythm), bright = Math.abs(Math.log(a.bright / b.bright));
  return { chroma: +chroma.toFixed(4), rhythm: +rhythm.toFixed(4), bright: +bright.toFixed(4), d: +Math.hypot(chroma, rhythm, bright).toFixed(4) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { flags } = parseArgs(process.argv.slice(2));
  const films = kind.split(await kind.collect({ flags: { ...flags, slug: undefined } })).map(rel => {
    const film = kind.film(rel), opts = soundOf(film), wav = renderSound(opts);
    if (flags.keep) { fs.mkdirSync(flags.keep, { recursive: true }); fs.writeFileSync(path.join(flags.keep, `${rel.label}.wav`), wav); }
    return { slug: rel.label, style: film.style, opts, print: fingerprint(wav) };
  });

  // the bar: the first film's score again, the same style under another motif
  const [first] = films;
  const twin = fingerprint(renderSound({ ...first.opts, style: { ...first.style, seed: first.style.seed + 1 } }));
  const bar = distance(first.print, twin);
  console.log(`bar: ${first.slug} against its own score with another motif, d ${bar.d} (chroma ${bar.chroma}, rhythm ${bar.rhythm}, bright ${bar.bright})`);

  const pairs = [];
  for (let i = 0; i < films.length; i++) for (let j = i + 1; j < films.length; j++) {
    pairs.push({ a: films[i].slug, b: films[j].slug, ...distance(films[i].print, films[j].print) });
  }
  pairs.sort((p, q) => p.d - q.d);
  const near = pairs.filter(p => p.d <= bar.d);
  const fmt = p => `${p.a} · ${p.b}`.padEnd(58) + `d ${p.d.toFixed(4)}  chroma ${p.chroma.toFixed(4)}  rhythm ${p.rhythm.toFixed(4)}  bright ${p.bright.toFixed(4)}`;
  const style = f => { const s = films.find(x => x.slug === f).style; return `${'C C# D D# E F F# G G# A A# B'.split(' ')[s.key]} ${s.mode} ${s.bpm}bpm ${s.groove} ${s.lead} prog${s.prog}`; };
  console.log(`\n${films.length} films, ${pairs.length} pairs. Closest ten:`);
  for (const p of pairs.slice(0, 10)) console.log(`  ${fmt(p)}\n      ${style(p.a)}  |  ${style(p.b)}`);
  const ds = pairs.map(p => p.d);
  console.log(`\nmedian d ${ds[Math.floor(ds.length / 2)].toFixed(4)}, farthest ${ds.at(-1).toFixed(4)}, closest ${ds[0].toFixed(4)} against the bar ${bar.d.toFixed(4)}`);
  if (flags.out) fs.writeFileSync(flags.out, JSON.stringify({ bar: { slug: first.slug, ...bar }, pairs, styles: Object.fromEntries(films.map(f => [f.slug, f.style])) }, null, 1) + '\n');
  if (near.length) {
    console.log(`\nFAIL: ${near.length} pair(s) as close as one score with another motif:`);
    for (const p of near) console.log(`  ${fmt(p)}`);
    process.exit(1);
  }
  console.log('\nno two films share a score');
}
