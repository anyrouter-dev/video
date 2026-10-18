// Pads each narration line with trailing silence: a breath between lines so frames don't
// run sentences together, and a longer hold after the last line for the end card.
// Idempotent: each voice records the pad it carries, and a voice already padded is skipped.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const BREATH_S = 0.4;
const END_HOLD_S = 2.5;
const meta = JSON.parse(fs.readFileSync('audio_meta.json', 'utf8'));
const last = Math.max(...meta.voices.map(v => Number(v.frame)));

for (const v of meta.voices) {
  const pad = Number(v.frame) === last ? END_HOLD_S : BREATH_S;
  if (v.padded_s === pad) continue;
  const tmp = `${v.path}.tmp.wav`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', v.path, '-af', `apad=pad_dur=${pad}`, tmp]);
  fs.renameSync(tmp, v.path);
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', v.path], { encoding: 'utf8' }));
  v.duration_s = +dur.toFixed(3);
  v.padded_s = pad;
  console.log(`voice ${v.frame}: ${v.duration_s}s`);
}
fs.writeFileSync('audio_meta.json', JSON.stringify(meta, null, 2));
