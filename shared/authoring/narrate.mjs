// Voices the lines of a generated film with a local voice, and hands the film each line's
// recording and timing. No voice service is called at render time: a line is recorded once,
// stored under the hash of what is said and by which voice, and a film whose line has no
// recording fails to build with the command that makes it.
//
//   voice   Kokoro-82M (Apache-2.0, hexgrad/Kokoro-82M) through kokoro-onnx, in kokoro.py
//   timing  when speech starts and ends in each recording, from whisper (`hyperframes transcribe`)
//
// Setup, once per machine (none of it is needed to render):
//   brew install espeak-ng
//   uv venv ~/.cache/kokoro-venv --python 3.12 && uv pip install --python ~/.cache/kokoro-venv/bin/python kokoro-onnx soundfile
//   (the model and voices are the ones `hyperframes tts` downloads to ~/.cache/hyperframes/tts)
//   KOKORO_PYTHON=~/.cache/kokoro-venv/bin/python node videos/<kind>/voice.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT } from '../../lib/paths.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);

/**
 * A line as it is spoken: each key of `say` that appears as a whole token is replaced
 * by how it is said ("anyr" is "any R", "M3.1" is "M three point one").
 */
export function spokenOf(text, say = {}) {
  const keys = Object.keys(say).sort((a, b) => b.length - a.length);
  if (!keys.length) return text;
  const re = new RegExp(`(?<![\\w./-])(${keys.map(k => k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')})(?![\\w/-]|\\.\\w)`, 'g');
  return text.replace(re, k => say[k]);
}

/** What a recording is made from: a new hash is a new recording. */
export const hashOf = (voice, spoken) => crypto.createHash('sha256')
  .update(JSON.stringify([voice.engine, voice.id, voice.speed, voice.lang, spoken])).digest('hex').slice(0, 16);

/**
 * A voiced line: its recording, its length, when speech starts and ends in it. Throws when
 * the line has no recording of what it now says, so a stale voice never reaches a render.
 */
export function voicedLine(dir, voice, text, say, { kind } = {}) {
  const spoken = spokenOf(text, say);
  const hash = hashOf(voice, spoken);
  const meta = path.join(dir, `${hash}.json`);
  if (!fs.existsSync(meta) || !fs.existsSync(path.join(dir, `${hash}.mp3`))) {
    throw new Error(`no recording of "${spoken}": run KOKORO_PYTHON=… node videos/${kind ?? '<kind>'}/voice.mjs`);
  }
  const rec = JSON.parse(fs.readFileSync(meta, 'utf8'));
  return { text, spoken, hash, file: path.join(dir, `${hash}.mp3`), duration: rec.duration, start: rec.start, end: rec.end };
}

/** Record every line that has no recording yet. Returns the hashes the lines use. */
export function voiceLines(dir, voice, lines, { dry = false } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const all = lines.map(({ text, say }) => {
    const spoken = spokenOf(text, say);
    return { spoken, hash: hashOf(voice, spoken) };
  });
  const todo = [...new Map(all.filter(l => !fs.existsSync(path.join(dir, `${l.hash}.json`))).map(l => [l.hash, l])).values()];
  console.log(`${all.length} lines, ${all.length - todo.length} already voiced, ${todo.length} to voice (${voice.engine} ${voice.id})`);
  for (const l of todo) console.log(`  ${l.hash}  ${l.spoken}`);
  if (dry || !todo.length) return new Set(all.map(l => l.hash));

  const python = process.env.KOKORO_PYTHON;
  if (!python) throw new Error('KOKORO_PYTHON is not set: the python of a venv with kokoro-onnx and soundfile (see shared/authoring/narrate.mjs)');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'narrate-'));
  const jobs = todo.map(l => ({ text: l.spoken, voice: voice.id, speed: voice.speed, lang: voice.lang, out: path.join(tmp, `${l.hash}.wav`) }));
  execFileSync(python, [path.join(HERE, 'kokoro.py')], { input: JSON.stringify(jobs), stdio: ['pipe', 'inherit', 'inherit'] });

  const hf = path.join(ROOT, 'node_modules/.bin/hyperframes');
  for (const l of todo) {
    const wav = path.join(tmp, `${l.hash}.wav`);
    const words = path.join(tmp, l.hash);
    execFileSync(hf, ['transcribe', wav, '-d', words, '--json'], { stdio: 'pipe' });
    const said = JSON.parse(fs.readFileSync(path.join(words, 'transcript.json'), 'utf8'));
    if (!said.length) throw new Error(`whisper heard nothing in the recording of "${l.spoken}"`);
    const mp3 = path.join(dir, `${l.hash}.mp3`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '160k', mp3]);
    const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3], { encoding: 'utf8' }));
    fs.writeFileSync(path.join(dir, `${l.hash}.json`), JSON.stringify({
      spoken: l.spoken, voice, duration: +duration.toFixed(3),
      start: said[0].start, end: Math.min(said.at(-1).end, +duration.toFixed(3)),
      heard: said.map(w => w.text).join(' '),
    }, null, 2) + '\n');
    console.log(`  voiced ${l.hash}  ${duration.toFixed(2)}s  heard: ${said.map(w => w.text).join(' ')}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return new Set(all.map(l => l.hash));
}

/** Remove recordings no line uses any more. */
export function pruneVoices(dir, keep) {
  if (!fs.existsSync(dir)) return 0;
  const stale = fs.readdirSync(dir).filter(f => /^[0-9a-f]{16}\.(mp3|json)$/.test(f) && !keep.has(f.slice(0, 16)));
  for (const f of stale) fs.rmSync(path.join(dir, f));
  return stale.length;
}

/**
 * Captions for a line: its words in groups of at most `most`, each shown from when its
 * share of the line is reached, spread over the speech by length.
 */
export function captionsOf(text, { at, start, end }, most = 6) {
  const words = text.split(/\s+/).filter(Boolean);
  const groups = [];
  for (let i = 0; i < words.length;) {
    let n = Math.min(most, words.length - i);
    // a group ends after a comma or a full stop when one falls inside it
    const stop = words.slice(i, i + n).findIndex(w => /[,.;:?!]$/.test(w));
    if (stop >= 1 && stop < n - 1) n = stop + 1;
    // never leave one word alone at the end
    if (words.length - (i + n) === 1 && n > 2) n -= 1;
    groups.push(words.slice(i, i + n).join(' '));
    i += n;
  }
  const total = groups.reduce((s, g) => s + g.length, 0);
  let t = at + start;
  return groups.map(g => {
    const dur = (end - start) * (g.length / total);
    const c = { text: g, at: +t.toFixed(2), end: +(t + dur).toFixed(2) };
    t += dur;
    return c;
  });
}

export const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** A whole number under a million, as it is said. */
export function numberWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberWords(n % 100)}` : ''}`;
  return `${numberWords(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${numberWords(n % 1000)}` : ''}`;
}

/**
 * A model name as it is said: "M3.1" is "M three point one", "120B" is "one hundred twenty B",
 * "VL" is "V L", and hyphens are pauses.
 */
export function speakName(name) {
  const num = n => (n.includes('.') ? `${numberWords(Number(n.split('.')[0]))} point ${[...n.split('.')[1]].map(d => ONES[d]).join(' ')}` : numberWords(Number(n)));
  const spell = s => (/^[A-Z]{1,3}$/.test(s) ? [...s].join(' ') : s);
  return name.split(/[\s-]+/).filter(Boolean).map(tok => {
    const m = /^([A-Za-z]*?)(\d+(?:\.\d+)?)([A-Za-z]*)$/.exec(tok);
    if (!m) return spell(tok);
    return [m[1] && spell(m[1].toUpperCase() === m[1] ? m[1] : m[1]), num(m[2]), m[3] && spell(m[3].toUpperCase())].filter(Boolean).join(' ');
  }).join(' ');
}
