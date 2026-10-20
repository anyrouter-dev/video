// Voices a narrated film's SCRIPT.md with ElevenLabs, one call per line, and writes each line's
// word times from ElevenLabs' own character alignment. Whisper is not involved, so the times need
// no snapping (align-words.mjs assumes a pause at every comma, which ElevenLabs does not make).
// Run from the film's folder:
//
//   node ../../shared/authoring/eleven-voice.mjs [--dry-run]
//
// SCRIPT.md holds the words as captions show them. SAY maps a word to how it is spoken, so the
// voice hears "any router dot dev" while the caption reads "anyrouter.dev". A line whose text,
// voice and settings match its audio_meta.json entry is never sent again: every call costs
// characters from a monthly quota, and --dry-run prints what a run would spend.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const VOICE = {
  id: 'cjVigY5qzO86Huf0OWal', // Eric
  model: 'eleven_multilingual_v2',
  settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
};

export const SAY = {
  'anyrouter.dev': 'any router dot dev',
  'anyrouter.dev/cli': 'any router dot dev slash C L I',
  anyr: 'any R',
  '270': 'two hundred and seventy',
  '50': 'fifty',
  'openrouter/free': 'open router slash free',
  AgentID: 'Agent I D',
  AgentMail: 'Agent Mail',
};

/** SCRIPT.md → [{ frame, text }]: a `## … (Frame N)` heading, then its indented spoken block. */
export function parseScript(md) {
  const out = [];
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    const h = /^#{2,3}\s+.*?\(frame\s+(\d+)\)/i.exec(line);
    if (h) { cur = { frame: Number(h[1]), text: '' }; out.push(cur); continue; }
    const m = /^(?: {4,}|\t)(\S.*)$/.exec(line);
    if (cur && m) cur.text += (cur.text ? ' ' : '') + m[1].trim();
  }
  return out.filter(l => l.text);
}

/** The text the voice reads, and each caption word's character range in it. */
export function spoken(text) {
  let say = '';
  const words = text.split(/\s+/).filter(Boolean).map(word => {
    const [, core, trail] = /^(.*?)([.,?!;:]*)$/.exec(word);
    const part = (SAY[core] ?? core) + trail;
    if (say) say += ' ';
    const from = say.length;
    say += part;
    return { text: word, from, to: say.length };
  });
  return { say, words };
}

/** Caption words timed from ElevenLabs' per-character alignment of `say`. */
export function timeWords(words, alignment) {
  const { character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment;
  return words.map(({ text, from, to }, i) => ({
    id: `w${i}`,
    text,
    start: +starts[from].toFixed(3),
    end: +ends[to - 1].toFixed(3),
  }));
}

const same = (entry, line, say) => entry && entry.text === line.text && entry.say === say
  && entry.voice === VOICE.id && entry.model === VOICE.model
  && JSON.stringify(entry.settings) === JSON.stringify(VOICE.settings)
  && fs.existsSync(entry.path);

async function voice(say) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: say, model_id: VOICE.model, voice_settings: VOICE.settings }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  if (body.alignment?.characters?.join('') !== say) throw new Error(`alignment does not match the text sent: "${say}"`);
  return body;
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  if (!dry && !process.env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY is not set');
  const meta = fs.existsSync('audio_meta.json') ? JSON.parse(fs.readFileSync('audio_meta.json', 'utf8')) : { voices: [] };
  const lines = parseScript(fs.readFileSync('SCRIPT.md', 'utf8'));
  const byFrame = new Map(meta.voices.map(v => [Number(v.frame), v]));
  let spend = 0;

  const voices = [];
  for (const line of lines) {
    const { say, words } = spoken(line.text);
    const kept = byFrame.get(line.frame);
    if (same(kept, line, say)) { voices.push(kept); continue; }
    spend += say.length;
    console.log(`${dry ? 'would voice' : 'voicing'} ${line.frame} (${say.length} chars): ${say}`);
    if (dry) continue;

    const body = await voice(say);
    const file = `assets/voice/${String(line.frame).padStart(2, '0')}.wav`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const mp3 = `${file}.mp3`;
    fs.writeFileSync(mp3, Buffer.from(body.audio_base64, 'base64'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp3, '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', file]);
    fs.rmSync(mp3);
    const duration = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }));
    voices.push({
      frame: line.frame, path: file, duration_s: +duration.toFixed(3), raw_s: +duration.toFixed(3),
      text: line.text, say, voice: VOICE.id, model: VOICE.model, settings: VOICE.settings,
      words: timeWords(words, body.alignment),
    });
  }

  console.log(`${dry ? 'would spend' : 'spent'} ${spend} characters`);
  if (dry) return;
  meta.voices = voices;
  fs.writeFileSync('audio_meta.json', JSON.stringify(meta, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
