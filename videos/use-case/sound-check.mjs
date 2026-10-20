// Checks that every use-case film has music of its own: a licensed track no other film uses
// (audio/music.json, audio/LICENSES.md), a file no other film's track is, and an excerpt that
// does not sound like another film's. Fails otherwise.
//
//   node videos/use-case/sound-check.mjs [--out=FILE]
//
// Each excerpt is reduced to three fingerprints, from the audio alone:
//   chroma   energy per pitch class (its key and chords)
//   rhythm   the autocorrelation of its onsets over 0.25–1.6 s (its tempo and groove)
//   bright   its mean spectral centroid (its instruments)
// A pair's distance is the length of (1 - chroma cosine, 1 - rhythm cosine, |log centroid ratio|).
// The bar is measured, not picked: a track's first 30 s against its next 30 s, the closest a piece
// of music sounds to itself. Every pair of films must be farther apart than the closest of those.
//
// --out writes every pair's distance as JSON.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from '../../lib/paths.mjs';
import { AUDIO } from './mix.mjs';
import { loadNarration } from './narration.mjs';

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

/** `seconds` of a file from `from`, as the 48 kHz stereo 16-bit WAV mono() reads. */
function pcm(file, from, seconds) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-nostdin', '-ss', String(from), '-t', String(seconds), '-i', file, '-ar', '48000', '-ac', '2', '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  const head = Buffer.alloc(44);
  head.writeUInt32LE(raw.length, 40);
  return Buffer.concat([head, raw]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { flags } = parseArgs(process.argv.slice(2));
  const music = JSON.parse(fs.readFileSync(path.join(AUDIO, 'music.json'), 'utf8'));
  const slugs = Object.keys(loadNarration().films);
  const problems = [];
  for (const slug of slugs) if (!music.films[slug]) problems.push(`${slug} has no track`);
  const owner = new Map();
  for (const [slug, f] of Object.entries(music.films)) {
    if (owner.has(f.track)) problems.push(`${slug} and ${owner.get(f.track)} share ${f.track}`);
    owner.set(f.track, slug);
    const t = music.tracks[f.track];
    if (!t) { problems.push(`${slug}: no track ${f.track} in the ledger`); continue; }
    for (const k of ['title', 'artist', 'source', 'license', 'licenseUrl', 'attribution', 'evidence']) if (!t[k]) problems.push(`${f.track}: no ${k} in the ledger`);
  }
  const hashes = new Map();
  for (const [id, t] of Object.entries(music.tracks)) {
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(AUDIO, 'music', t.file))).digest('hex');
    if (hashes.has(h)) problems.push(`${id} is the same file as ${hashes.get(h)}`);
    hashes.set(h, id);
  }
  // what each film plays (its first 40 s), and the bar: each track's first 30 s against its next 30 s
  const films = Object.entries(music.films).map(([slug, f]) => {
    const file = path.join(AUDIO, 'music', music.tracks[f.track].file);
    return { slug, track: f.track, print: fingerprint(pcm(file, f.start ?? 0, 40)), self: distance(fingerprint(pcm(file, 0, 30)), fingerprint(pcm(file, 30, 30))) };
  });
  const bar = films.reduce((a, b) => (b.self.d < a.self.d ? b : a));
  console.log(`bar: ${bar.track} against itself 30 s later, d ${bar.self.d}`);
  const pairs = [];
  for (let i = 0; i < films.length; i++) for (let j = i + 1; j < films.length; j++) pairs.push({ a: films[i].slug, b: films[j].slug, ...distance(films[i].print, films[j].print) });
  pairs.sort((p, q) => p.d - q.d);
  const fmt = p => `${p.a} · ${p.b}`.padEnd(58) + `d ${p.d.toFixed(4)}  chroma ${p.chroma.toFixed(4)}  rhythm ${p.rhythm.toFixed(4)}  bright ${p.bright.toFixed(4)}`;
  console.log(`\n${films.length} films, ${owner.size} tracks, ${pairs.length} pairs. Closest five:`);
  for (const p of pairs.slice(0, 5)) console.log(`  ${fmt(p)}`);
  for (const p of pairs.filter(p => p.d <= bar.self.d)) problems.push(`${p.a} and ${p.b} sound as close as a track to itself (d ${p.d})`);
  if (flags.out) fs.writeFileSync(flags.out, JSON.stringify({ bar: { track: bar.track, ...bar.self }, pairs }, null, 1) + '\n');
  if (problems.length) {
    console.log(`\nFAIL:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`\nevery film has a licensed track of its own; the closest pair is d ${pairs[0].d}, the bar ${bar.self.d}`);
}
