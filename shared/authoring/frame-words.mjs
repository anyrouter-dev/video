// Writes .hyperframes/frame-packets/<frame_id>.words.json from audio_meta.json so each
// frame worker can cue reveals to the real spoken word times (seconds from frame start).
import fs from 'node:fs';

const meta = JSON.parse(fs.readFileSync('audio_meta.json', 'utf8'));
const packets = '.hyperframes/frame-packets';
const ids = fs.readdirSync(packets).filter(f => /^\d\d-.*\.md$/.test(f)).map(f => f.slice(0, -3));

for (const voice of meta.voices) {
  const n = String(voice.frame).padStart(2, '0');
  const id = ids.find(i => i.startsWith(`${n}-`));
  if (!id) throw new Error(`no packet for frame ${n}`);
  const words = voice.words.map(w => ({ w: w.text.trim(), start: +w.start.toFixed(2), end: +w.end.toFixed(2) }));
  fs.writeFileSync(`${packets}/${id}.words.json`, JSON.stringify({ frame_id: id, duration: voice.duration_s, words }, null, 1));
  console.log(`${id}: ${words.length} words, ${voice.duration_s}s`);
}
