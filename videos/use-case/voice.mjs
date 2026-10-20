// Voices the use-case scripts in videos/use-case/narration.json with ElevenLabs, each line
// once: a line whose spoken text and voice match its recording is skipped, so a rerun voices
// only what changed. Each line becomes voice/<line>.mp3 and voice/<line>.json, its length and
// when each character is spoken, taken from the service's own timestamps.
//
//   ELEVENLABS_API_KEY=… node videos/use-case/voice.mjs --budget=N [--slug=a,b] [--dry-run]
//
// --budget is the most characters this run may voice. It refuses to start past it, or past
// the quota the account has left, and reports what it used and what is left.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from '../../lib/paths.mjs';
import { loadNarration, scriptOf, parseLine, hashOf, VOICE_DIR } from './narration.mjs';

const API = 'https://api.elevenlabs.io/v1';
const { flags } = parseArgs(process.argv.slice(2));
const narration = loadNarration();
const slugs = flags.slug ? String(flags.slug).split(',') : Object.keys(narration.films);

const lines = [...new Map(slugs.flatMap(s => scriptOf(narration, s)).map(l => [l.id, l])).values()];
const todo = lines.map(l => ({ ...l, spoken: parseLine(l.text, narration.say).spoken })).map(l => ({ ...l, hash: hashOf(narration.voice, l.spoken) }))
  .filter(l => {
    const meta = path.join(VOICE_DIR, `${l.id}.json`);
    return !(fs.existsSync(meta) && JSON.parse(fs.readFileSync(meta, 'utf8')).hash === l.hash && fs.existsSync(path.join(VOICE_DIR, `${l.id}.mp3`)));
  });
const chars = todo.reduce((n, l) => n + l.spoken.length, 0);
console.log(`${lines.length} lines, ${lines.length - todo.length} already voiced, ${todo.length} to voice: ${chars} characters`);
for (const l of todo) console.log(`  ${l.id.padEnd(38)} ${String(l.spoken.length).padStart(4)}  ${l.spoken}`);
if (flags['dry-run'] || !todo.length) process.exit(0);

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('ELEVENLABS_API_KEY is not set');
const budget = Number(flags.budget);
if (!(budget >= 0)) throw new Error('pass --budget=N, the most characters this run may voice');
if (chars > budget) throw new Error(`${chars} characters to voice, over the budget of ${budget}`);
const quota = async () => {
  const r = await fetch(`${API}/user/subscription`, { headers: { 'xi-api-key': key } });
  if (!r.ok) throw new Error(`subscription: HTTP ${r.status}`);
  const s = await r.json();
  return s.character_limit - s.character_count;
};
const before = await quota();
if (chars > before) throw new Error(`${chars} characters to voice, the account has ${before} left`);

fs.mkdirSync(VOICE_DIR, { recursive: true });
const { id: voice, model, settings } = narration.voice;
for (const l of todo) {
  const r = await fetch(`${API}/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ text: l.spoken, model_id: model, voice_settings: settings }),
  });
  if (!r.ok) throw new Error(`${l.id}: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
  const { audio_base64: audio, alignment } = await r.json();
  if (alignment.characters.join('') !== l.spoken) throw new Error(`${l.id}: the timestamps are for "${alignment.characters.join('')}", not the line`);
  // written beside, then moved into place: a run cut short never leaves a recording with the wrong hash
  const mp3 = path.join(VOICE_DIR, `${l.id}.mp3`), tmp = `${mp3}.part`;
  fs.writeFileSync(tmp, Buffer.from(audio, 'base64'));
  const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', tmp], { encoding: 'utf8' }));
  fs.renameSync(tmp, mp3);
  fs.writeFileSync(path.join(VOICE_DIR, `${l.id}.json`), JSON.stringify({
    hash: l.hash, spoken: l.spoken, duration: +duration.toFixed(3),
    alignment: { start: alignment.character_start_times_seconds, end: alignment.character_end_times_seconds },
  }) + '\n');
  console.log(`  voiced ${l.id}  ${duration.toFixed(2)}s`);
}
const after = await quota();
console.log(`voiced ${chars} characters; the account had ${before} left and has ${after} now (${before - after} used)`);
