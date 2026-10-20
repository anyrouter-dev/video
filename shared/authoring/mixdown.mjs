// The soundtrack of a generated film in one file: a licensed music bed that steps down under
// the voice, the voice lines where the film puts them, and the sound effects of its motion,
// mixed by ffmpeg and brought to -14 LUFS with true peak at or under -1 dBTP. Same inputs,
// same file.
//
//   mixdown({ out, duration, music, voice, sfx }) → { lufs, truePeak, lra }
//
//   music  { file, offset, gain, fadeIn, fadeOut, duck }   gain and duck in dB
//   voice  [{ file, at, start, end }]   start/end: when speech runs inside the file
//   sfx    [{ file, at, gain, rate, from, dur }]   rate repitches (1.04 is a little higher)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

export const TARGET = { lufs: -14, truePeak: -1.5 };
// Loud cues: two of them closer than this blur into one hit.
export const HIT_GAP = 0.3;

const db = x => 10 ** (x / 20);
const r3 = x => +x.toFixed(3);

/**
 * Cue sheet: each motion event becomes the sound its kind's table names for it, pitch-varied
 * when the same sound repeats so a run of them never sounds like one sample looped. Throws when
 * two big hits land within HIT_GAP of each other.
 */
export function cueSheet(events, table) {
  const seen = new Map();
  const cues = events.map(e => {
    const s = table[e.event];
    if (!s) throw new Error(`no sound for the event "${e.event}"`);
    const n = seen.get(e.event) ?? 0;
    seen.set(e.event, n + 1);
    const steps = s.pitch ?? [1];
    return { event: e.event, file: s.file, at: r3(e.at), gain: s.gain, rate: steps[n % steps.length], from: s.from ?? 0, dur: s.dur ?? null, big: !!s.big };
  }).sort((a, b) => a.at - b.at);
  const big = cues.filter(c => c.big);
  for (let i = 1; i < big.length; i++) {
    if (big[i].at - big[i - 1].at < HIT_GAP) throw new Error(`two big hits ${r3(big[i].at - big[i - 1].at)}s apart at ${big[i - 1].at}s (${big[i - 1].event}, ${big[i].event})`);
  }
  return cues;
}

/** The bed's gain over time as an ffmpeg expression: down by `duck` dB while a line is spoken. */
export function duckExpr(spans, duck, ramp = 0.25) {
  if (!spans.length) return '1';
  const k = 1 - db(-duck);
  const terms = spans.map(([a, b]) => `clip(min((t-${r3(a - ramp)})/${ramp},(${r3(b + ramp)}-t)/${ramp}),0,1)`);
  const most = terms.reduce((acc, t) => (acc ? `max(${acc},${t})` : t), '');
  return `1-${r3(k)}*${most}`;
}

// ffmpeg writes its measurements to stderr
function stderrOf(args) {
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.slice(-800)}`);
  return r.stderr;
}

/** Integrated loudness, true peak and loudness range of a file, from ffmpeg's ebur128 summary. */
export function loudness(file) {
  return parseLoudness(stderrOf(['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']));
}

export function parseLoudness(text) {
  const tail = text.slice(text.lastIndexOf('Summary:'));
  const pick = re => Number(re.exec(tail)?.[1]);
  return { lufs: pick(/I:\s+(-?[\d.]+) LUFS/), lra: pick(/LRA:\s+(-?[\d.]+) LU/), truePeak: pick(/Peak:\s+(-?[\d.]+) dBFS/) };
}

export function mixdown({ out, duration, music, voice = [], sfx = [] }) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const inputs = [], chains = [], mix = [];
  const add = (args) => { inputs.push(...args); return inputs.filter(a => a === '-i').length - 1; };

  if (music) {
    const i = add(['-ss', String(music.offset ?? 0), '-t', String(duration + 1), '-i', music.file]);
    const spans = voice.map(v => [v.at + (v.start ?? 0), v.at + (v.end ?? 0)]);
    chains.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${r3(db(music.gain ?? 0))},`
      + `volume='${duckExpr(spans, music.duck ?? 10)}':eval=frame,`
      + `afade=t=in:st=0:d=${music.fadeIn ?? 0.8},afade=t=out:st=${r3(duration - (music.fadeOut ?? 2.5))}:d=${music.fadeOut ?? 2.5}[m]`);
    mix.push('[m]');
  }
  voice.forEach((v, k) => {
    const i = add(['-i', v.file]);
    const ms = Math.round(v.at * 1000);
    chains.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v${k}]`);
    mix.push(`[v${k}]`);
  });
  sfx.forEach((c, k) => {
    const i = add(['-i', c.file]);
    const ms = Math.round(c.at * 1000);
    const cut = c.dur ? `atrim=start=${c.from}:duration=${c.dur},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${r3(c.dur - Math.min(0.25, c.dur / 3))}:d=${r3(Math.min(0.25, c.dur / 3))},` : '';
    const pitch = c.rate && c.rate !== 1 ? `asetrate=${Math.round(48000 * c.rate)},aresample=48000,` : '';
    chains.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,${cut}${pitch}volume=${r3(db(c.gain ?? -12))},adelay=${ms}|${ms}[s${k}]`);
    mix.push(`[s${k}]`);
  });
  if (!mix.length) throw new Error('nothing to mix');
  const graph = `${chains.join(';')};${mix.join('')}amix=inputs=${mix.length}:normalize=0:dropout_transition=0,`
    + `apad,atrim=0:${duration},asetpts=PTS-STARTPTS[pre]`;

  const raw = `${out}.raw.wav`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', graph, '-map', '[pre]', '-ar', '48000', '-c:a', 'pcm_s24le', raw]);

  // Two-pass loudnorm: measure, then correct linearly to the target.
  const pass1 = stderrOf(['-hide_banner', '-nostats', '-i', raw, '-af',
    `loudnorm=I=${TARGET.lufs}:TP=${TARGET.truePeak}:LRA=11:print_format=json`, '-f', 'null', '-']);
  const m = JSON.parse(/\{[^{}]*"target_offset"[^{}]*\}/.exec(pass1)[0]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af',
    `loudnorm=I=${TARGET.lufs}:TP=${TARGET.truePeak}:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,`
    + `alimiter=limit=${r3(db(TARGET.truePeak - 0.3))}:attack=1:release=50:level=false,aresample=48000`,
    '-ar', '48000', '-c:a', 'pcm_s16le', out]);
  fs.rmSync(raw, { force: true });
  return loudness(out);
}
