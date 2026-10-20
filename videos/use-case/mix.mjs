/**
 * mix: a use-case film's soundtrack, one file: its music bed, its voice, and a
 * sound effect for each motion event the picture makes, mixed by ffmpeg and
 * normalised to -14 LUFS integrated with a true peak under -1 dBTP (MOTION.md,
 * sound events). Same inputs, same file.
 *
 *   music   a licensed track per film (audio/music.json, ledger in audio/LICENSES.md),
 *           faded in, ducked under every spoken line, faded out on the end card
 *   voice   each line at its time on the film's clock
 *   effects SFX: the one table from a motion event to its sound, how loud it sits
 *           under the voice, and how its pitch moves between repeats
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const AUDIO = path.join(DIR, 'audio');
const music = () => JSON.parse(fs.readFileSync(path.join(AUDIO, 'music.json'), 'utf8'));

/**
 * Motion event → sound. `db` is the sound's peak against the voice's peak; `semi` its pitch in
 * semitones for the n-th repeat (a step marker rises a step each step, key presses wander);
 * `big` sounds keep 0.3 s apart.
 */
export const SFX = {
  travel: { file: 'whoosh.mp3', db: -17, semi: () => -3, lead: 0.12, big: true },
  tilt: { file: 'whoosh-short.mp3', db: -24, semi: () => 2, lead: 0.05 },
  land: { file: 'click-soft.mp3', db: -19, semi: () => 0 },
  step: { file: 'ping.mp3', db: -21, semi: c => -5 + 2 * (c.step ?? 0), big: true },
  key: { file: 'key-press.mp3', db: -25, semi: c => [0, -1, 1, -2, 0.5][(c.n ?? 0) % 5] },
  arrive: { file: 'pop.mp3', db: -20, semi: c => (c.n ?? 0) % 2 ? 1 : -1, big: true },
  end: { file: 'chime.mp3', db: -13, semi: () => 0, big: true },
};
// Music under a spoken line sits this far under the voice's loudness, and comes up between lines.
const BED = { under: -21, between: -14, attack: 0.08, release: 0.45, fadeIn: 0.8, fadeOut: 2.6 };
const TARGET = { I: -14, TP: -1.5, LRA: 11 };

const run = args => execFileSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
const stderrOf = args => spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }).stderr;
const measured = new Map();
/** A file's peak and its integrated loudness, measured once. */
function levels(file, from = 0, dur = null) {
  const key = `${file}@${from}+${dur}`;
  if (measured.has(key)) return measured.get(key);
  const cut = [...(from ? ['-ss', String(from)] : []), ...(dur ? ['-t', String(dur)] : [])];
  const out = stderrOf([...cut, '-i', file, '-af', 'volumedetect,ebur128=peak=true', '-f', 'null', '-']);
  const r = { peak: Number(/max_volume: (-?[\d.]+) dB/.exec(out)?.[1] ?? 0), lufs: Number([...out.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)?.[1] ?? -23) };
  measured.set(key, r);
  return r;
}

/** Cues past the 0.3 s rule go: of two big sounds closer than that, the later is dropped (the end card always stays). */
export function spaced(cues) {
  const kept = [];
  let last = -Infinity;
  for (const c of [...cues].sort((a, b) => a.at - b.at)) {
    const s = SFX[c.kind];
    if (!s) throw new Error(`mix: no sound for the event "${c.kind}"`);
    if (s.big && c.at - last < 0.3 && c.kind !== 'end') continue;
    if (s.big) last = c.at;
    kept.push(c);
  }
  return kept;
}

/** The music's volume over time: under the voice while it speaks, up between lines, eased both ways. */
export function duckExpr(spans) {
  const lo = 10 ** ((BED.under - BED.between) / 20);
  if (!spans.length) return '1';
  const near = spans.map(s => `clip(min((t-${(s.at - BED.attack).toFixed(3)})/${BED.attack},(${(s.at + s.dur + BED.release).toFixed(3)}-t)/${BED.release}),0,1)`);
  const most = near.reduce((a, b) => `max(${a},${b})`);
  return `1-${(1 - lo).toFixed(4)}*${most}`;
}

/**
 * Write the film's soundtrack to `file` (48 kHz stereo WAV): { slug, duration, voice: [{ file, at, speaks, dur }], cues }:
 * each line's file starts at `at`, and its words run from `speaks` for `dur`.
 * Returns what it measured of the result.
 */
export function writeMix(file, { slug, duration, voice, cues }) {
  const MUSIC = music(), track = MUSIC.films[slug] && MUSIC.tracks[MUSIC.films[slug].track];
  if (!track) throw new Error(`mix: audio/music.json gives ${slug} no track`);
  const musicFile = path.join(AUDIO, 'music', track.file), start = MUSIC.films[slug].start ?? 0;
  const voicePeak = Math.max(...voice.map(v => levels(v.file).peak));
  const voiceLufs = Math.max(...voice.map(v => levels(v.file).lufs));
  const bed = levels(musicFile, start, duration);
  const kept = spaced(cues).filter(c => c.at >= 0 && c.at < duration - 0.1);

  const inputs = ['-ss', String(start), '-t', String(duration + 0.5), '-i', musicFile];
  const parts = [];
  const bedGain = BED.between + voiceLufs - bed.lufs;
  parts.push(`[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=${bedGain.toFixed(2)}dB,volume='${duckExpr(voice.map(v => ({ at: v.speaks, dur: v.dur })))}':eval=frame,afade=t=in:d=${BED.fadeIn},afade=t=out:st=${(duration - BED.fadeOut).toFixed(2)}:d=${BED.fadeOut},atrim=0:${duration}[m]`);
  voice.forEach((v, i) => {
    inputs.push('-i', v.file);
    const ms = Math.round(v.at * 1000);
    parts.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v${i}]`);
  });
  const base = voice.length + 1;
  kept.forEach((c, i) => {
    const s = SFX[c.kind], f = path.join(AUDIO, 'sfx', s.file);
    inputs.push('-i', f);
    const gain = s.db + voicePeak - levels(f).peak, rate = 2 ** (s.semi(c) / 12);
    const ms = Math.max(0, Math.round((c.at - (s.lead ?? 0)) * 1000));
    parts.push(`[${base + i}:a]aformat=channel_layouts=stereo,aresample=44100,asetrate=${Math.round(44100 * rate)},aresample=48000,volume=${gain.toFixed(2)}dB,adelay=${ms}|${ms}[s${i}]`);
  });
  const all = ['[m]', ...voice.map((_, i) => `[v${i}]`), ...kept.map((_, i) => `[s${i}]`)];
  const mixed = `${parts.join(';')};${all.join('')}amix=inputs=${all.length}:normalize=0:duration=first,atrim=0:${duration}`;

  // two passes: measure the mix, then bring it to the target in one linear gain
  const pre = `${file}.pre.wav`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  run(['-y', ...inputs, '-filter_complex', `${mixed}[out]`, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s24le', pre]);
  const json = /\{[\s\S]*?"target_offset"[\s\S]*?\}/.exec(stderrOf(['-i', pre, '-af', `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:print_format=json`, '-f', 'null', '-']))?.[0];
  if (!json) throw new Error(`mix: ${slug}: loudnorm measured nothing`);
  const m = JSON.parse(json);
  run(['-y', '-i', pre, '-af', `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`, '-c:a', 'pcm_s16le', file]);
  fs.rmSync(pre);
  return { track: MUSIC.films[slug].track, cues: kept, dropped: cues.length - kept.length, measuredIn: m };
}

/** Integrated loudness and true peak of a file, as YouTube reads them. */
export function loudness(file) {
  const out = stderrOf(['-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const I = Number([...out.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)?.[1]);
  const TP = Number([...out.matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].at(-1)?.[1]);
  return { I, TP };
}
