// Resolves a film's sound cues (sfx-cues.json) into audio_meta.json `sfx`, the list the
// assembler mounts at frame start + offset_s. A cue names the spoken word it lands on, so
// cues follow the narration when its timing is corrected; `at` pins a cue to a second
// instead, for sounds with no word (a transition whoosh).
//
//   { "frame": 5, "sound": "click", "word": "create", "nth": 1, "offset": 0.0, "volume": 0.35 }
//   { "frame": 2, "sound": "whoosh", "at": 0.05 }
//
// Sounds are the bundled library in media-use (click, click-soft, pop, ping, chime, error,
// whoosh, whoosh-short, typing, key-press, sparkle, notification, riser). This tool owns
// `sfx`: it replaces the whole list each run, so it is idempotent.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const LIBRARY = path.join(os.homedir(), '.claude/skills/media-use/audio/assets/sfx');
const DEFAULT_VOLUME = 0.3;

const bare = s => s.toLowerCase().replace(/[^\w$.]+/g, '').replace(/\.$/, '');
const seconds = file => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }));

const meta = JSON.parse(fs.readFileSync('audio_meta.json', 'utf8'));
const cues = JSON.parse(fs.readFileSync('sfx-cues.json', 'utf8'));
const voices = new Map(meta.voices.map(v => [Number(v.frame), v]));

fs.mkdirSync('assets/sfx', { recursive: true });
meta.sfx = cues.map(cue => {
  const voice = voices.get(cue.frame);
  if (!voice) throw new Error(`cue ${JSON.stringify(cue)}: no narration for frame ${cue.frame}`);
  let t = cue.at;
  if (cue.word != null) {
    const hits = voice.words.filter(w => bare(w.text) === bare(cue.word));
    const hit = hits[(cue.nth ?? 1) - 1];
    if (!hit) throw new Error(`cue ${JSON.stringify(cue)}: word not spoken in frame ${cue.frame} (have: ${voice.words.map(w => w.text).join(' ')})`);
    t = hit.start;
  }
  if (t == null) throw new Error(`cue ${JSON.stringify(cue)}: needs "word" or "at"`);
  const src = path.join(LIBRARY, `${cue.sound}.mp3`);
  if (!fs.existsSync(src)) throw new Error(`cue ${JSON.stringify(cue)}: no sound "${cue.sound}" in ${LIBRARY}`);
  const file = `assets/sfx/${cue.sound}.mp3`;
  fs.copyFileSync(src, file);
  const offset = Math.max(0, +(t + (cue.offset ?? 0)).toFixed(3));
  if (offset >= voice.duration_s) throw new Error(`cue ${JSON.stringify(cue)}: lands at ${offset}s, after frame ${cue.frame} ends (${voice.duration_s}s)`);
  return {
    frame: cue.frame,
    file,
    offset_s: offset,
    duration_s: +seconds(src).toFixed(3),
    volume: cue.volume ?? DEFAULT_VOLUME,
    source: 'bundled',
  };
});

for (const f of fs.readdirSync('assets/sfx')) {
  if (!meta.sfx.some(s => s.file === `assets/sfx/${f}`)) fs.rmSync(`assets/sfx/${f}`);
}
fs.writeFileSync('audio_meta.json', JSON.stringify(meta, null, 2));
console.log(`${meta.sfx.length} sound cues → audio_meta.json`);
for (const s of meta.sfx) console.log(`  frame ${s.frame}  ${s.offset_s.toFixed(2)}s  ${path.basename(s.file)}`);
