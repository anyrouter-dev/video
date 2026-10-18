// Corrects Whisper's word times against the narration audio itself. Whisper drifts by up
// to a second on synthetic speech (line 5's "openrouter.ai" ended 0.9s late), and frames
// cue their reveals to these times. Kokoro pauses at every comma and full stop, so each
// word ending in punctuation is matched, in order, to a measured silence; its end snaps
// to the silence start and the next word's start to the silence end. The last word's end
// snaps to the trailing silence. Words between anchors are remapped linearly.
//
// Idempotent: each voice records `aligned: true` and is skipped afterwards.
// Prints the largest shift per line so a caller can see which frames need retiming.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SKIP_COST_S = 0.6;
const MIN_WORD_S = 0.06;

function measuredGaps(file) {
  const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'silencedetect=noise=-40dB:d=0.15', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]);
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
  return starts.map((start, i) => ({ start, end: ends[i] }));
}

/**
 * Order-preserving match of boundary words to gaps. A DP minimises the time error after removing the line's overall stretch (`scale`), so
 * drift that builds along the line doesn't pull a word onto a later pause. Equal counts
 * still go through it: Whisper can add a comma Kokoro never paused at and drop one it did.
 */
function match(bounds, gaps, scale) {
  const n = bounds.length, m = gaps.length;
  const cost = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
  const back = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  cost[0][0] = 0;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    const c = cost[i][j];
    if (c === Infinity) continue;
    const step = (ni, nj, add, pair) => {
      if (c + add < cost[ni][nj]) { cost[ni][nj] = c + add; back[ni][nj] = { i, j, pair }; }
    };
    if (i < n && j < m) step(i + 1, j + 1, Math.abs(bounds[i].end * scale - gaps[j].start), true);
    if (i < n) step(i + 1, j, SKIP_COST_S, false);
    if (j < m) step(i, j + 1, SKIP_COST_S, false);
  }
  const pairs = [];
  for (let i = n, j = m; back[i][j];) {
    const b = back[i][j];
    if (b.pair) pairs.unshift([b.i, b.j]);
    ({ i, j } = b);
  }
  return pairs;
}

function align(words, gaps, duration) {
  const trailing = gaps.at(-1)?.end >= duration - 0.01 ? gaps.at(-1) : null;
  const inner = trailing ? gaps.slice(0, -1) : gaps;
  const boundIdx = words.flatMap((w, i) => (i < words.length - 1 && /[.,!?;:]$/.test(w.text) ? [i] : []));

  const scale = trailing ? trailing.start / words.at(-1).end : 1;
  const pairs = match(boundIdx.map(i => words[i]), inner, scale).map(([b, g]) => [boundIdx[b], inner[g]]);

  // One anchor per matched pause: the old boundary midpoint maps to the pause midpoint.
  // (A word's end and the next start often share one Whisper timestamp, so anchoring both
  // edges separately would make the map ambiguous.)
  const anchors = [[0, 0], ...pairs.map(([i, gap]) => [(words[i].end + words[i + 1].start) / 2, (gap.start + gap.end) / 2])];
  if (trailing) anchors.push([words.at(-1).end, trailing.start]);
  const map = t => {
    let k = 0;
    while (k < anchors.length - 2 && t > anchors[k + 1][0]) k++;
    const [a0, b0] = anchors[k], [a1, b1] = anchors[k + 1];
    return a1 === a0 ? b0 : b0 + (t - a0) * (b1 - b0) / (a1 - a0);
  };

  const out = words.map(w => ({ ...w, start: map(w.start), end: map(w.end) }));
  for (const [i, gap] of pairs) { out[i].end = gap.start; out[i + 1].start = gap.end; }
  // Pauses Whisper wrote no punctuation for (a dropped colon): a word that overlaps one moves
  // whichever edge sits nearer the pause out of it.
  for (const gap of inner) for (const w of out) {
    if (Math.min(w.end, gap.end) - Math.max(w.start, gap.start) <= 0.05) continue;
    if (gap.start - w.start < w.end - gap.end) w.start = gap.end; else w.end = gap.start;
  }
  // Snapping a start to a pause's end can pass the next word; keep words in order, each ≥ 60ms.
  out.forEach((w, i) => {
    if (i > 0) w.start = Math.max(w.start, out[i - 1].start + MIN_WORD_S);
    w.end = Math.max(w.end, w.start + MIN_WORD_S);
    if (i > 0) out[i - 1].end = Math.min(out[i - 1].end, w.start);
  });
  return out.map(w => ({ ...w, start: +w.start.toFixed(3), end: +w.end.toFixed(3) }));
}

const meta = JSON.parse(fs.readFileSync('audio_meta.json', 'utf8'));

// --check: fail if any word sits inside a measured pause, runs out of order, or is shorter
// than MIN_WORD_S. The invariants the alignment promises; run after any re-voice.
if (process.argv.includes('--check')) {
  const problems = [];
  for (const v of meta.voices) {
    const gaps = measuredGaps(v.path);
    v.words.forEach((w, i) => {
      // Times are rounded to the millisecond, so a word can read up to 1ms short of the minimum.
      if (w.end - w.start < MIN_WORD_S - 0.0015) problems.push(`voice ${v.frame} "${w.text}" shorter than ${MIN_WORD_S}s`);
      if (i > 0 && (w.start < v.words[i - 1].start || v.words[i - 1].end > w.start + 1e-6)) problems.push(`voice ${v.frame} "${w.text}" out of order`);
      for (const g of gaps) if (Math.min(w.end, g.end) - Math.max(w.start, g.start) > 0.12) problems.push(`voice ${v.frame} "${w.text}" inside a pause at ${g.start.toFixed(2)}s`);
    });
  }
  for (const p of problems) console.log(`✗ ${p}`);
  console.log(problems.length ? `✗ ${problems.length} alignment problems` : '✓ alignment: no word inside a pause, all in order');
  process.exit(problems.length ? 1 : 0);
}

for (const v of meta.voices) {
  if (v.aligned) continue;
  const before = v.words;
  v.words = align(before, measuredGaps(v.path), v.duration_s);
  v.aligned = true;
  const shift = Math.max(...v.words.map((w, i) => Math.abs(w.start - before[i].start)));
  console.log(`voice ${v.frame}: max shift ${shift.toFixed(2)}s`);
}
fs.writeFileSync('audio_meta.json', JSON.stringify(meta, null, 2));
