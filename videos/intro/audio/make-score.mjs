/**
 * The intro's score: lib/sound.mjs, palette 'intro', 60s, with a cue on every
 * cut and on every moment the picture lands. The times are index.html's timeline
 * (absolute seconds) — move a beat there, move its cue here.
 *
 *   node videos/intro/audio/make-score.mjs     →  videos/intro/audio/score.wav
 *
 * Deterministic: same cues, byte-identical wav.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSound } from '../../../lib/sound.mjs';

const DURATION = 60;
const cut = at => ({ at, kind: 'cut' });
const tick = at => ({ at, kind: 'tick' });
const hit = at => ({ at, kind: 'hit' });
const rise = (at, dur) => ({ at, kind: 'rise', dur });
const ticks = (from, step, n) => Array.from({ length: n }, (_, i) => tick(+(from + i * step).toFixed(3)));

export const CUES = [
  // 0–4 open: the mark prints out of dither, slams into the lockup, the slate types
  rise(1.7, 1.5), hit(2.15), { at: 2.1, kind: 'type', dur: 0.4 },
  // 4–8 one gateway: the rotating word on the beat, the hub stamps, into the hub
  cut(4), ...ticks(5.0, 0.5, 4), hit(7.0), rise(8.0, 0.55),
  // 8–12 one key: chips fly in, collapse, the key stamps, the tally, into the key tile
  cut(8), ...ticks(8.2, 0.2, 3), hit(9.45), tick(9.85), tick(10.0), ...ticks(10.25, 0.25, 2), rise(12.0, 0.5),
  // 12–18 one line: out of the code card, one route per beat
  cut(12), tick(13.3), ...ticks(15.6, 0.5, 4),
  // 18–24 200+ models and the speed chart
  cut(18), ...ticks(18.6, 0.12, 5), hit(19.35),
  // 24–28 the 429 wall
  cut(24), ...ticks(24.8, 0.35, 4), hit(26.2), tick(26.5),
  // 28–32 donate: the click, the toggle, the toast, into the toggle
  cut(28), tick(29.62), hit(29.65), tick(29.85), rise(32.0, 0.6),
  // 32–36 failover: 429, the next key answers, into the pool
  cut(32), tick(33.25), tick(33.62), hit(34.15), rise(36.0, 0.65),
  // 36–40 everyone rides free: four stats, five free models
  cut(36), ...ticks(36.5, 0.15, 4), ...ticks(37.0, 0.35, 5),
  // 40–44 donors earn
  cut(40), hit(40.5), ...ticks(40.6, 0.3, 4),
  // 44–50 live network data
  cut(44), ...ticks(44.6, 0.18, 3), hit(45.4), ...ticks(45.55, 0.15, 3),
  // 50–54 pricing: three plans, the click, $2 → $0, into the $0
  cut(50), ...ticks(50.2, 0.12, 3), tick(51.67), hit(52.05), rise(54.0, 0.62),
  // 54–56.5 the drop
  cut(54), hit(54.0), tick(54.85),
  // 56.5–60 the end card
  cut(56.5), { at: 57.0, kind: 'end' }, tick(57.97),
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'score.wav');
  const stats = writeSound(out, { duration: DURATION, palette: 'intro', cues: CUES });
  console.log(`${out}  ${stats.seconds}s  peak ${stats.peakDb} dBFS  ${stats.cues} cues`);
}
