/**
 * marks — the provider logos a film can put on screen.
 *
 * The marks are vendored in shared/assets/providers. Anything that names a
 * provider — a model id ("mistralai/…"), a provider field ("Mistral AI"), or a
 * sentence ("OpenAI's GPT-6.1 Sol joins…") — resolves to a mark here, so every
 * kind shows the same logo for the same company. A scene only has to write
 * `markImg(file)`: writeFilm copies every mark a scene references into the
 * project by itself.
 *
 * Node builtins only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SHARED } from './paths.mjs';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const MARKS_DIR = path.join(SHARED, 'assets/providers');
const HAVE = new Set(fs.readdirSync(MARKS_DIR).filter(f => f.endsWith('.svg')));

// Names a provider goes by that are not its file name. Keys are lowercased and
// stripped to [a-z0-9]; values are file bases.
const ALIAS = {
  mistralai: 'mistral', mistral: 'mistral', stepfunai: 'stepfun', stepfun: 'stepfun', step: 'stepfun',
  zai: 'z-ai', zhipu: 'z-ai', zhipuai: 'z-ai', glm: 'z-ai', metallama: 'meta', meta: 'meta', llama: 'meta',
  moonshot: 'moonshotai', moonshotai: 'moonshotai', kimi: 'moonshotai', xai: 'xai', grok: 'xai',
  openai: 'openai', gpt: 'openai', anthropic: 'anthropic', claude: 'anthropic', google: 'google',
  gemini: 'google', gemma: 'google', deepseek: 'deepseek', deepinfra: 'deepinfra', liquid: 'liquid',
  liquidai: 'liquid', lfm: 'liquid', upstage: 'upstage', solar: 'upstage', qwen: 'qwen', alibaba: 'qwen',
  minimax: 'minimax', xiaomi: 'xiaomi', mimo: 'xiaomi', nvidia: 'nvidia', nemotron: 'nvidia',
  cohere: 'cohere', command: 'cohere', groq: 'groq', cerebras: 'cerebras', tencent: 'tencent',
  hunyuan: 'tencent', sakana: 'sakana', inclusionai: 'inclusionai', ling: 'inclusionai', ibm: 'ibm-granite',
  granite: 'ibm-granite', microsoft: 'microsoft', phi: 'microsoft', bytedance: 'bytedance', seed: 'bytedance',
  huggingface: 'huggingface', together: 'together', fireworks: 'fireworks', sambanova: 'sambanova',
  cloudflare: 'cloudflare', openrouter: 'openrouter', novita: 'novita', siliconflow: 'siliconflow',
  baseten: 'baseten', chutes: 'chutes', venice: 'venice', nousresearch: 'nousresearch', hermes: 'nousresearch',
  poolside: 'poolside', thinkingmachines: 'thinkingmachines', longcat: 'longcat', intern: 'intern',
  internlm: 'intern', blackforestlabs: 'black-forest-labs', flux: 'black-forest-labs', ollama: 'ollama',
  anyrouter: 'anyrouter', inception: 'inception', mercury: 'inception', elevenlabs: 'elevenlabs',
  deepgram: 'deepgram', dots: 'dots-studio', dotsstudio: 'dots-studio', stealth: 'stealth',
};

const key = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** The file of a base name, preferring the colour variant. */
function file(base) {
  if (!base) return null;
  for (const f of [`${base}-color.svg`, `${base}.svg`]) if (HAVE.has(f)) return f;
  return null;
}

/**
 * The mark for one provider name or model id, or null. "mistralai/mistral-small"
 * and "Mistral AI" both give mistral-color.svg.
 */
export function markFor(name) {
  if (!name) return null;
  const s = String(name);
  const owner = s.includes('/') ? s.split('/')[0] : s;
  for (const cand of [owner, owner.replace(/[-_ ](ai|labs|inc)$/i, ''), owner.split(/[\s-]/)[0]]) {
    const k = key(cand);
    const hit = file(ALIAS[k]) || file(cand.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    if (hit) return hit;
  }
  return null;
}

// Words that name a provider inside running text, longest first so "DeepInfra"
// is not read as "Deep…". Only whole words count: "Step" in "Step 5" names
// StepFun, but "stepped" does not.
const WORDS = Object.keys(ALIAS).filter(k => k.length >= 3).sort((a, b) => b.length - a.length);

/**
 * Every provider a piece of text names, in the order it names them, as mark
 * files. Reads model ids ("google/gemini-flash-latest") and names ("OpenAI's").
 */
export function marksIn(text) {
  const out = [];
  const add = f => { if (f && !out.includes(f)) out.push(f); };
  const s = String(text ?? '');
  const hits = [];
  for (const m of s.matchAll(/\b([a-z][a-z0-9-]{1,30})\/[a-z0-9]/gi)) hits.push([m.index, markFor(m[1])]);
  for (const m of s.matchAll(/[A-Za-z][A-Za-z0-9.]*(?:\s(?:AI|Labs))?/g)) {
    const k = key(m[0]);
    if (WORDS.includes(k) || WORDS.includes(key(m[0].replace(/\s(AI|Labs)$/, '')))) hits.push([m.index, markFor(m[0])]);
  }
  hits.sort((a, b) => a[0] - b[0]).forEach(([, f]) => add(f));
  return out;
}

/** An <img> for a mark. Plain (black) marks read on the white face as they are. */
export const markImg = (f, cls = 'mark') => `<img class="${cls}" src="assets/providers/${esc(f)}" alt="">`;

/**
 * A stand-in for a provider with no vendored mark: its initials, in ink, on a
 * dotted field — clearly a monogram, never a fake logo.
 */
export const monogram = (name, cls = 'mono-mark') => {
  const letters = String(name ?? '?').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/)
    .map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return `<span class="${cls}">${esc(letters)}</span>`;
};

/** The mark for a provider if one exists, else its monogram. */
export const markOrMonogram = (name, cls) => {
  const f = markFor(name);
  return f ? markImg(f, cls) : monogram(name);
};

/** Every mark file a piece of generated HTML references. */
export const marksUsed = html =>
  [...new Set([...String(html).matchAll(/assets\/providers\/([\w.-]+\.svg)/g)].map(m => m[1]))];
