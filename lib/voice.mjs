/**
 * voice — the voice-over of a film cut into scene slots (lib/scenes.mjs): one
 * line per slot, written from the facts, spoken by a local TTS model, burned in
 * as captions and mixed over the score.
 *
 *   voiceProblem(text, facts)   why a line may not be spoken, or null
 *   writeScript(...)            one line per slot: an LLM's polish where it passes
 *                               the gate, else the template's own line
 *   polish(...)                 that LLM call: AnyRouter's own API, a fixed model
 *   speakable(text)             the line as the TTS should say it ($0.15 → 15 cents)
 *   speak(script)               Kokoro-82M through `hyperframes tts` → wav files
 *   captionGroups(...)          a line cut into short caption groups, timed across it
 *   mixVoice(score, lines)      the film's mix.wav: the score ducked under the voice
 *
 * A line is written with digits; only `speakable` turns them into words, at TTS
 * time, so the gate and the captions read the same digits the facts carry.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ROOT } from './paths.mjs';
import { copyProblem, factNumbers } from './plan.mjs';

export const VOICE = 'am_michael';
/** A fixed, non-alias model: the same facts get the same polish. */
export const POLISH_MODEL = 'poolside/laguna-s-2.1';
const API = 'https://anyrouter.dev/api/v1/chat/completions';
const MAX_WORDS = 24;
const MAX_CHARS = 180;

// The same idea as plan.mjs's number gate: a number spelled out slips past it.
const NUMBER_WORDS = /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundreds?|thousands?|millions?|billions?|trillions?|dozens?|percent)\b/i;
const OVERCLAIM = /\b(unlimited|cheapest|biggest|largest|strongest|leading|most (?:advanced|capable|intelligent|powerful))\b/i;

/**
 * Why a line cannot be spoken, or null. On top of the plan's gate (hype, a
 * number the facts do not carry): no spelled-out numbers, no "unlimited" or
 * superlatives, no "/" (an id or a path read aloud), and short enough to say in
 * one breath. `names` are model names, which may hold words like "One".
 */
export function voiceProblem(text, facts, { names = [] } = {}) {
  const why = copyProblem(text, factNumbers(facts), MAX_CHARS);
  if (why) return why;
  const plain = names.reduce((s, n) => s.split(n).join(' '), text);
  const spelled = NUMBER_WORDS.exec(plain);
  if (spelled) return `spells out "${spelled[0]}"; write the digits`;
  const over = OVERCLAIM.exec(plain);
  if (over) return `says "${over[0]}", which no fact can back`;
  if (plain.includes('/')) return 'has a "/", which reads aloud as an id or a path';
  const n = text.split(/\s+/).filter(Boolean).length;
  if (n > MAX_WORDS) return `is ${n} words (max ${MAX_WORDS})`;
  return null;
}

/**
 * A template may offer several lines in order of preference (a catalog
 * sentence, then its own); each slot's draft is the first that passes the gate.
 */
export const firstPassing = (drafts, facts, { names = [] } = {}) => drafts.map(({ slot, text }) => {
  const options = [].concat(text);
  return { slot, text: options.find(t => !voiceProblem(t, facts, { names })) ?? options[0] };
});

/**
 * The script. Each slot gets the LLM's line when there is one and it passes
 * the gate, else its draft. A draft that fails the gate is a template bug: the
 * slot stays silent and the warning says so.
 */
export function writeScript({ drafts, polished = {}, facts, names = [] }) {
  const warnings = [];
  const script = [];
  for (const { slot, text } of drafts) {
    const llm = polished[slot];
    const llmWhy = llm == null ? null : voiceProblem(llm, facts, { names });
    if (llm != null && !llmWhy) { script.push({ slot, text: llm.trim(), source: 'llm' }); continue; }
    if (llm != null) warnings.push(`voice ${slot}: dropped the LLM line ("${llm}"): ${llmWhy}`);
    const why = voiceProblem(text, facts, { names });
    if (why) warnings.push(`voice ${slot}: no line — the template's own line ${why}`);
    else script.push({ slot, text, source: 'facts' });
  }
  return { script, warnings };
}

const RULES = `You polish the voice-over of a short product film about AI models on AnyRouter.
You get the facts and one draft line per scene slot. Rewrite each draft so it sounds natural spoken aloud.
Rules, all hard:
- Say only what the facts say. Keep every number exactly as written in the draft, as digits ($0.15, 66K, 37%). Never spell a number out, never add a number.
- At most 22 words per line. One line per slot, same slots as the drafts.
- Use the model's name, never its id, and no "/" anywhere.
- No superlatives, no hype, no exclamation marks, no emoji, never "unlimited".
- Each line describes what its scene shows, as the draft does.
Reply with JSON only: {"lines":{"<slot>":"<line>"}}`;

/**
 * Ask AnyRouter's API for a polish of the drafts. Returns `{ slot: line }`; the
 * caller gates every line. Throws on any failure, so the caller falls back.
 */
export async function polish({ facts, drafts, key, model = POLISH_MODEL, fetchImpl = fetch, timeoutMs = 30000 }) {
  const r = await fetchImpl(API, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model, temperature: 0, max_tokens: 800, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: RULES },
        { role: 'user', content: JSON.stringify({ facts, drafts: drafts.map(({ slot, text }) => ({ slot, draft: text })) }) }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`${model} → HTTP ${r.status}`);
  const content = (await r.json()).choices?.[0]?.message?.content ?? '';
  const json = /\{[\s\S]*\}/.exec(content)?.[0];
  if (!json) throw new Error(`${model} returned no JSON`);
  const lines = JSON.parse(json).lines;
  if (!lines || typeof lines !== 'object') throw new Error(`${model} returned no "lines"`);
  return Object.fromEntries(Object.entries(lines).filter(([, v]) => typeof v === 'string'));
}

// ── spoken form ────────────────────────────────────────────────────────────
const money = v => {
  if (!v) return '0 dollars';
  if (v < 1) { const c = +(v * 100).toFixed(2); return `${c} cent${c === 1 ? '' : 's'}`; }
  const d = Math.floor(v), c = Math.round((v - d) * 100);
  return `${d} dollar${d === 1 ? '' : 's'}${c ? ` ${c} cents` : ''}`;
};
const UNIT = { K: 'thousand', M: 'million', B: 'billion' };

/**
 * The line as the TTS should say it. Model names are kept exactly as written
 * ("E4B" is a name, not 4 billion); ids are replaced by their names.
 */
export function speakable(text, { names = {} } = {}) {
  const kept = [];
  const keep = s => `\u0000${kept.push(s) - 1}\u0000`;
  let s = String(text);
  for (const [id, name] of Object.entries(names)) s = s.split(id).join(name);
  for (const name of Object.values(names).sort((a, b) => b.length - a.length)) s = s.split(name).join(keep(name));
  s = s
    .replace(/\$(\d+(?:\.\d+)?)/g, (_, v) => money(+v))
    .replace(/(?<![\w.])(\d+(?:\.\d+)?)([KMB])\b/g, (_, v, u) => `${v} ${UNIT[u]}`)
    .replace(/\bper 1 million\b/g, 'per million')
    .replace(/(\d)%/g, '$1 percent')
    .replace(/(\d)\+/g, '$1 plus')
    .replace(/\banyr\b/g, 'any R')
    .replace(/\s*·\s*/g, ', ');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => kept[+i]);
}

// ── TTS ────────────────────────────────────────────────────────────────────
// Where the Kokoro venv lives unless HYPERFRAMES_PYTHON says otherwise; CI keeps it there too.
const VENV_PYTHON = path.join(os.homedir(), '.cache/anyrouter-video/tts-venv/bin/python');
const HF = path.join(ROOT, 'node_modules/.bin/hyperframes');

/** Seconds of audio in a PCM wav, from its header. */
export function wavSeconds(file) {
  const w = readWav(fs.readFileSync(file));
  return +(w.channels[0].length / w.rate).toFixed(3);
}

/**
 * Speak each line with Kokoro-82M (`hyperframes tts`). Each wav is cached in
 * `dir` under a hash of the voice and the spoken text, so a rebuild speaks
 * nothing twice. Returns `{ lines: [{ slot, text, wav, seconds }] }`, or
 * `{ error }` when the TTS is not installed or fails: the film then has no voice.
 */
export function speak(script, { voice = VOICE, dir, names = {}, env = process.env }) {
  const python = env.HYPERFRAMES_PYTHON || (fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : null);
  if (!python) return { error: `no Kokoro python: set HYPERFRAMES_PYTHON or create ${VENV_PYTHON} (pip install kokoro-onnx soundfile)` };
  if (!fs.existsSync(HF)) return { error: 'hyperframes is not installed — run `npm ci`' };
  fs.mkdirSync(dir, { recursive: true });
  const lines = [];
  for (const { slot, text } of script) {
    const spoken = speakable(text, { names });
    const wav = path.join(dir, `${crypto.createHash('sha256').update(`${voice}\n${spoken}`).digest('hex').slice(0, 16)}.wav`);
    if (!fs.existsSync(wav)) {
      const tmp = `${wav}.${process.pid}.tmp.wav`;
      const res = spawnSync(HF, ['tts', spoken, '-v', voice, '-o', tmp, '--json'], {
        cwd: ROOT, encoding: 'utf8', timeout: 300000, env: { ...env, HYPERFRAMES_PYTHON: python },
      });
      const out = (res.stdout ?? '').trim().split('\n').reverse().map(l => { try { return JSON.parse(l); } catch { return null; } }).find(Boolean);
      if (res.status !== 0 || !out?.ok || !fs.existsSync(tmp)) {
        fs.rmSync(tmp, { force: true });
        return { error: out?.error ?? (res.error?.message || (res.stderr ?? '').slice(-400) || `tts exited ${res.status}`) };
      }
      fs.renameSync(tmp, wav);
    }
    lines.push({ slot, text, wav, seconds: wavSeconds(wav) });
  }
  return { lines };
}

// ── captions ───────────────────────────────────────────────────────────────
/**
 * A line cut into groups of at most `words` words and `chars` characters, each
 * on screen for its share of the line's span, by length.
 */
export function captionGroups(text, at, seconds, { words = 6, chars = 42 } = {}) {
  const groups = [];
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    const g = groups.at(-1);
    if (g && g.length < words && [...g, w].join(' ').length <= chars) g.push(w);
    else groups.push([w]);
  }
  const weight = g => g.join(' ').length + 1;
  const total = groups.reduce((a, g) => a + weight(g), 0);
  let t = at;
  return groups.map(g => {
    const d = (seconds * weight(g)) / total;
    const out = { text: g.join(' '), start: +t.toFixed(3), end: +(t + d).toFixed(3) };
    t += d;
    return out;
  });
}

// ── the mix ────────────────────────────────────────────────────────────────
/** A PCM wav (16-bit or 32-bit float) → `{ rate, channels: Float32Array[] }`. */
export function readWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a wav file');
  let fmt = null, data = null;
  for (let o = 12; o + 8 <= buf.length; o += 8 + buf.readUInt32LE(o + 4) + (buf.readUInt32LE(o + 4) & 1)) {
    const id = buf.toString('ascii', o, o + 4), size = buf.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(o + 8), channels: buf.readUInt16LE(o + 10), rate: buf.readUInt32LE(o + 12), bits: buf.readUInt16LE(o + 22) };
    if (id === 'data') data = buf.subarray(o + 8, o + 8 + Math.min(size, buf.length - o - 8));
  }
  if (!fmt || !data) throw new Error('wav has no fmt or data chunk');
  const pcm16 = fmt.format === 1 && fmt.bits === 16, f32 = fmt.format === 3 && fmt.bits === 32;
  if (!pcm16 && !f32) throw new Error(`unsupported wav: format ${fmt.format}, ${fmt.bits}-bit`);
  const step = fmt.bits / 8, frames = Math.floor(data.length / (step * fmt.channels));
  const channels = Array.from({ length: fmt.channels }, () => new Float32Array(frames));
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < fmt.channels; c++) {
      const o = (i * fmt.channels + c) * step;
      channels[c][i] = pcm16 ? data.readInt16LE(o) / 32768 : data.readFloatLE(o);
    }
  }
  return { rate: fmt.rate, channels };
}

// A soft knee: where a voice peak meets a score peak, the sum bends under full scale instead of clipping.
const KNEE = 0.9;
const soft = x => (Math.abs(x) <= KNEE ? x : Math.sign(x) * (KNEE + (1 - KNEE) * 0.95 * Math.tanh((Math.abs(x) - KNEE) / (1 - KNEE))));

function wav16(channels, rate) {
  const n = channels[0].length, k = channels.length;
  const data = Buffer.alloc(n * k * 2);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < k; c++) data.writeInt16LE(Math.round(soft(channels[c][i]) * 32767), (i * k + c) * 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(k, 22);
  head.writeUInt32LE(rate, 24); head.writeUInt32LE(rate * k * 2, 28); head.writeUInt16LE(k * 2, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

/** Linear interpolation to `to` Hz. Kokoro speaks at 24 kHz, an exact half of the score's 48. */
function resample(x, from, to) {
  if (from === to) return x;
  const n = Math.round((x.length * to) / from), y = new Float32Array(n), k = from / to;
  for (let i = 0; i < n; i++) {
    const p = i * k, j = Math.floor(p), f = p - j;
    y[i] = (x[j] ?? 0) + ((x[j + 1] ?? x[j] ?? 0) - (x[j] ?? 0)) * f;
  }
  return y;
}

/** RMS of the samples that are not silence: a line's loudness, whatever its pauses. */
function speechRms(x) {
  let sum = 0, n = 0;
  for (const s of x) if (Math.abs(s) > 0.003) { sum += s * s; n += 1; }
  return n ? Math.sqrt(sum / n) : 0;
}

/**
 * The film's mix: the score, ducked by `duckDb` under each voice-over line with
 * `ramp`-second ramps either side, plus the lines resampled to the score's rate,
 * each brought to `speechDb` RMS (the score's body sits near -17 dBFS; the soft
 * knee takes a speech peak). Node only, no ffmpeg. `lines`: [{ at, wav }].
 */
export function mixVoice(scoreWav, lines, { duckDb = -12, ramp = 0.12, speechDb = -19 } = {}) {
  const score = readWav(scoreWav);
  const { rate } = score, n = score.channels[0].length;
  const duck = new Float32Array(n).fill(1), vo = new Float32Array(n);
  const low = 10 ** (duckDb / 20), R = Math.round(ramp * rate);
  for (const { at, wav } of lines) {
    const v = readWav(fs.readFileSync(wav));
    const mono = v.channels.length === 1 ? v.channels[0] : v.channels[0].map((s, i) => v.channels.reduce((a, c) => a + c[i], 0) / v.channels.length);
    const up = resample(mono, v.rate, rate);
    const gain = 10 ** (speechDb / 20) / (speechRms(up) || 1);
    const i0 = Math.round(at * rate), i1 = i0 + up.length;
    for (let i = 0; i < up.length && i0 + i < n; i++) vo[i0 + i] += up[i] * gain;
    for (let i = Math.max(0, i0 - R); i < Math.min(n, i1 + R); i++) {
      const away = i < i0 ? (i0 - i) / R : i >= i1 ? (i - i1 + 1) / R : 0;
      duck[i] = Math.min(duck[i], low + (1 - low) * Math.min(1, away));
    }
  }
  return wav16(score.channels.map(ch => ch.map((s, i) => s * duck[i] + vo[i])), rate);
}
