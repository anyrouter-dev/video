// Mixes the film's one audio file, assets/mix.wav: the voice lines at their starts, the music bed
// ducked under the voice, and the machine's sounds (sfx-cues.json, played at the times
// tools/events.json gives), loudness-normalised to -14 LUFS with a -1.5 dBTP ceiling.
//
//   node tools/mix.mjs [--preview=FROM,TO]    the preview writes the scratchpad audio sample
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILM = path.resolve(HERE, '..');
const LIB = path.join(os.homedir(), '.claude/skills/media-use/audio/assets/sfx');
const RATE = 48000;

const meta = JSON.parse(fs.readFileSync(path.join(FILM, 'audio_meta.json'), 'utf8'));
const { duration: DURATION, events } = JSON.parse(fs.readFileSync(path.join(HERE, 'events.json'), 'utf8'));
const cues = JSON.parse(fs.readFileSync(path.join(FILM, 'sfx-cues.json'), 'utf8')).events;
const seconds = (file) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }));

const VARY = [0, 2, -1, 3, -2, 1, -3, 2, 0, -1, 3, -2];
const inputs = [];
const chains = [];
const sfxLabels = [];
const add = (file) => (inputs.push(file), inputs.length - 1);

// Voice: each line at its start.
let at = 0;
const voiceLabels = [];
for (const v of [...meta.voices].sort((a, b) => a.frame - b.frame)) {
  const i = add(path.join(FILM, v.path));
  chains.push(`[${i}:a]aresample=${RATE},pan=stereo|c0=c0|c1=c0,adelay=${Math.round(at * 1000)}|${Math.round(at * 1000)}[v${i}]`);
  voiceLabels.push(`[v${i}]`);
  at += v.duration_s;
}

// The machine: every event's layers.
const played = [];
let n = 0;
for (const ev of events) {
  const cue = cues[ev.kind];
  if (!cue) throw new Error(`no sound for event "${ev.kind}" in sfx-cues.json`);
  const hits = ev.kind === 'type' ? Array.from({ length: ev.n }, (_, j) => ev.at + j * ev.step) : [ev.at];
  for (const t of hits) {
    for (const layer of cue.layers) {
      const label = `s${n++}`;
      const f = [];
      let start = t + (layer.offset ?? 0);
      let i;
      if (layer.synth === 'hum') {
        const len = layer.swell + layer.hold + layer.fade;
        i = add(`aevalsrc=0.55*sin(2*PI*98*t)+0.3*sin(2*PI*196*t)+0.12*sin(2*PI*294*t):s=${RATE}:d=${len}`);
        f.push('lowpass=f=520', `afade=t=in:d=${layer.swell}`, `afade=t=out:st=${layer.swell + layer.hold}:d=${layer.fade}`);
      } else {
        const file = path.join(LIB, `${layer.sound}.mp3`);
        i = add(file);
        if (layer.trim) f.push(`atrim=0:${layer.trim}`, `afade=t=out:st=${Math.max(0, layer.trim - 0.03)}:d=0.03`);
        if (layer.tail) {
          const len = seconds(file);
          f.push(`atrim=${(len - layer.tail).toFixed(3)}:${len.toFixed(3)}`, 'asetpts=PTS-STARTPTS');
          if (layer.fadein) f.push(`afade=t=in:d=${layer.fadein}`);
          start = t - layer.tail;
        }
        const pitch = layer.pitch === 'vary' ? VARY[played.length % VARY.length] * (layer.vary / 3) : typeof layer.pitch === 'object' ? layer.pitch[ev.port] ?? 0 : layer.pitch ?? 0;
        f.push(`aresample=${RATE}`);
        if (pitch) f.push(`asetrate=${Math.round(RATE * 2 ** (pitch / 12))}`, `aresample=${RATE}`);
      }
      if (layer.highpass) f.push(`highpass=f=${layer.highpass}`);
      if (layer.lowpass) f.push(`lowpass=f=${layer.lowpass}`);
      const pan = layer.pan ?? 0;
      f.push('aformat=channel_layouts=mono', `pan=stereo|c0=${(1 - Math.max(0, pan)).toFixed(2)}*c0|c1=${(1 + Math.min(0, pan)).toFixed(2)}*c0`);
      f.push(`volume=${layer.gain}dB`, `adelay=${Math.round(start * 1000)}|${Math.round(start * 1000)}`);
      chains.push(`[${i}:a]${f.join(',')}[${label}]`);
      sfxLabels.push(`[${label}]`);
    }
    played.push({ kind: ev.kind, at: t });
  }
}

// Two hits closer than 0.3 s read as one smeared sound, unless they are one gesture.
const GESTURE = new Set(['tick', 'type', 'select', 'detent', 'riser']);
for (let i = 1; i < played.length; i++) {
  const [a, b] = [played[i - 1], played[i]];
  if (b.at - a.at < 0.3 && !(GESTURE.has(a.kind) && GESTURE.has(b.kind))) console.warn(`  close hits: ${a.kind} ${a.at.toFixed(2)} and ${b.kind} ${b.at.toFixed(2)}`);
}

// Music: the bed from its start, faded in and out, ducked under the voice.
const m = add(path.join(FILM, 'assets/bgm/track.mp3'));
chains.push(`${voiceLabels.join('')}amix=inputs=${voiceLabels.length}:normalize=0,asplit=2[voice][key]`);
chains.push(`[${m}:a]aresample=${RATE},atrim=0:${DURATION},afade=t=in:d=0.8,afade=t=out:st=${(DURATION - 3.2).toFixed(2)}:d=3.2,volume=-9dB[bed]`);
chains.push(`[bed][key]sidechaincompress=threshold=0.03:ratio=5:attack=25:release=420:makeup=1[ducked]`);
chains.push(`${sfxLabels.join('')}amix=inputs=${sfxLabels.length}:normalize=0[sfx]`);
chains.push(`[voice][ducked][sfx]amix=inputs=3:normalize=0,atrim=0:${DURATION}[mix]`);

const inputArgs = inputs.flatMap((x) => (x.startsWith('aevalsrc') ? ['-f', 'lavfi', '-i', x] : ['-i', x]));
const graph = path.join(os.tmpdir(), `cli-swap-mix-${process.pid}.txt`);
fs.writeFileSync(graph, chains.join(';\n'));
const raw = path.join(os.tmpdir(), `cli-swap-raw-${process.pid}.wav`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputArgs, '-/filter_complex', graph, '-map', '[mix]', '-ar', String(RATE), '-ac', '2', raw]);

// Two-pass loudness: measure, then normalise to -14 LUFS, true peak under -1.5 dBTP.
const TARGET = { I: -14, TP: -1.5, LRA: 11 };
const measured = JSON.parse(/\{[\s\S]*\}/.exec(execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${raw}" -af loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:print_format=json -f null - 2>&1`], { encoding: 'utf8' }))[0]);
const out = path.join(FILM, 'assets/mix.wav');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true,aresample=${RATE}`, '-ar', String(RATE), '-ac', '2', '-c:a', 'pcm_s16le', out]);
fs.rmSync(raw);
fs.rmSync(graph);

const report = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${out}" -af ebur128=peak=true -f null - 2>&1 | tail -14`], { encoding: 'utf8' });
const I = /I:\s+(-?[\d.]+) LUFS/.exec(report)?.[1];
const TP = /Peak:\s+(-?[\d.]+) dBFS/.exec(report)?.[1];
console.log(`mix: ${played.length} hits, ${sfxLabels.length} sound layers, ${DURATION}s → assets/mix.wav  (${I} LUFS integrated, true peak ${TP} dBTP)`);

const preview = process.argv.find((a) => a.startsWith('--preview='))?.split('=')[1];
if (preview) {
  const [from, to] = preview.split(',').map(Number);
  const dest = '/private/tmp/claude-501/-Users-duet-project-anyrouter-dev/3fb04cbd-de0b-4d55-89d6-ec571fc9182c/scratchpad/uc/samples-cli/cli-swap-audio-swap-preview.wav';
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(from), '-to', String(to), '-i', out, '-af', 'afade=t=in:d=0.3,afade=t=out:st=' + (to - from - 0.6) + ':d=0.6', dest]);
  console.log(`preview ${from}-${to}s → ${dest}`);
}
