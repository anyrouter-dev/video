/**
 * model-launch: one narrated launch film per model, in the dark, kinetic look of STYLE.md.
 *
 *   reveal  the maker's mark, "NEW ON ANYROUTER" (only inside the launch window), the name
 *   spec    a card: maker, context, input, output, created date and id, row by row
 *   price   FREE ($0 in, $0 out, no daily cap) or BYOK (your own provider key, whose keys run it)
 *   reply   only where a real playground capture exists: the prompt and the reply it gave
 *   use     the id in a request, and `anyr claude --model <id>`
 *   close   the AnyRouter mark and anyrouter.dev/model/<id>
 *
 * Facts come from https://anyrouter.dev/api/v1/models?all=1, read through lib/models.mjs, so
 * "free" and "new" mean what they mean in every model film. A model's reply is shown only
 * from captures.json, each entry a real capture in shared/captures.
 *
 * Each model is its own release. Collect takes --model=<id>[,<id>…] (default: FEATURED) and
 * --from=FILE (a saved catalog response); --now=YYYY-MM-DD fixes the day the window ends.
 *
 * The voice is local and recorded ahead of the render: `node videos/model-launch/voice.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SHARED } from '../../lib/paths.mjs';
import { markFor } from '../../lib/marks.mjs';
import {
  MODELS_API, parseCatalog, billingOf, isNew, makerOf, dayOf, dateWords, contextLabel, modalitiesOf, keyProvidersOf, pricesOf,
} from '../../lib/models.mjs';
import { writeProject } from '../../shared/authoring/film-project.mjs';
import { voicedLine, captionsOf } from '../../shared/authoring/narrate.mjs';
import { cueSheet } from '../../shared/authoring/mixdown.mjs';
import { scriptOf } from './script.mjs';
import { css, body, inner, codeOf, C } from './scene.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const VOICE_DIR = path.join(DIR, 'voice');
const AUDIO = f => path.join(DIR, 'audio', f);

/** The models the owner asked for on 2026-10-21, as the catalog lists them. */
export const FEATURED = [
  'deepseek/deepseek-v4-flash',
  'minimax/minimax-m3.1-flash',
  'nvidia/nemotron-3.5-super-vl-120b-a12b',
  'inclusionai/ling-3.1-flash',
  'deepseek/deepseek-v4.1-flash',
];
/** "new" in a launch film: created in the 45 days before the film is made. */
export const WINDOW = 45;
/** One calm voice for every launch film: Kokoro's af_heart, US English. */
export const VOICE = { engine: 'kokoro', id: 'af_heart', speed: 1.0, lang: 'en-us' };

// Each maker's accent, set on the dark stage at 4.5:1 or more. A maker not listed takes the house orange.
const ACCENT = { deepseek: '#8EA2FF', minimax: '#FF6B86', nvidia: '#8FCF2A', inclusionai: '#B9A4FF', moonshotai: '#7FD3FF' };
const HOUSE = '#F0915A';

// How a provider whose own key runs a BYOK model is named on screen.
const PROVIDERS = {
  openrouter: 'OpenRouter', novita: 'Novita', commandcode: 'Command Code', vercel: 'Vercel', nvidia: 'NVIDIA', ollama: 'Ollama',
  aihubmix: 'AIHubMix', deepinfra: 'DeepInfra', siliconflow: 'SiliconFlow', gmicloud: 'GMI Cloud',
  huggingface: 'Hugging Face', venice: 'Venice', nousresearch: 'Nous Research', baseten: 'Baseten', fireworks: 'Fireworks',
  wafer: 'Wafer', onetoken: 'OneToken', deepseek: 'DeepSeek', minimax: 'MiniMax', moonshotai: 'Moonshot AI', zenmux: 'ZenMux',
  orcarouter: 'OrcaRouter', cline: 'Cline', 'opencode-go': 'OpenCode Go', 'opencode-zen': 'OpenCode Zen', experiential: 'Experiential',
  fpt: 'FPT', freebuff: 'Freebuff', liquid: 'Liquid AI', longcat: 'LongCat',
};

/** Real playground captures, by model id. Nothing else may put a reply on screen. */
export const CAPTURES = JSON.parse(fs.readFileSync(path.join(DIR, 'captures.json'), 'utf8'));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateLabel = day => { const [y, m, d] = day.split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };
const cap = s => s[0].toUpperCase() + s.slice(1);

/** What one film shows and says about its model, from its catalog entry. */
export function factsOf(m, { now }) {
  const billing = billingOf(m);
  const mods = modalitiesOf(m);
  const capture = CAPTURES[m.id] ?? null;
  // a reply is a claim that the model answers on AnyRouter's own routes at $0: only a free model's capture is shown
  if (capture && billing !== 'free') throw new Error(`${m.id}: a capture is listed, but the catalog bills it as ${billing}`);
  if (capture && !fs.existsSync(path.join(SHARED, '..', capture.file))) throw new Error(`${m.id}: capture ${capture.file} is missing`);
  const owner = m.id.split('/')[0];
  const day = dayOf(m.created);
  return {
    id: m.id,
    name: m.display_name || m.name || m.id.split('/')[1],
    maker: makerOf(m),
    mark: markFor(m.id),
    accent: ACCENT[owner] ?? HOUSE,
    day,
    dateLabel: dateLabel(day),
    dateWords: dateWords(day),
    isNew: isNew(m, { now, days: WINDOW }),
    window: WINDOW,
    billing,
    price: pricesOf(m),
    context: m.context_length ?? null,
    contextLabel: contextLabel(m.context_length),
    inputs: mods.in,
    inputsLabel: cap(mods.in.join(', ')),
    outputsLabel: cap(mods.out.join(', ')),
    keyNames: billing === 'byok' ? keyProvidersOf(m).map(p => ({ name: PROVIDERS[p] ?? p, named: !!PROVIDERS[p] })) : [],
    capture: capture && { ...capture, dateLabel: dateLabel(capture.date) },
  };
}

// ── timing ─────────────────────────────────────────────────────────────────
const tenths = s => Math.round(s * 10) / 10;
// The voice starts once the beat's picture has begun to land.
const LEAD = { reveal: 0.9, spec: 0.5, price: 1.3, reply: 0.4, use: 0.5, close: 1.3 };
// Each beat holds at least this long, and this long after its last word.
const MIN = { reveal: 3.4, spec: 4.0, price: 3.4, reply: 4.2, use: 4.6, close: 4.2 };
const AFTER = 0.55, BETWEEN = 0.35, END_HOLD = 2.2;
const ROW_EVERY = 0.34, TYPE_EACH = 0.024, LINE_PAUSE = 0.14, REPLY_EACH = 0.04;

/**
 * When everything happens, set by the voice. Each beat starts when the one before it ends;
 * its lines are said one after the other from LEAD; it ends AFTER its last word, or when its
 * picture has had MIN seconds.
 */
export function storyOf(f, lines) {
  const beats = {}, said = [];
  let t = 0;
  for (const beat of ['reveal', 'spec', 'price', 'reply', 'use', 'close']) {
    const mine = lines.filter(l => l.beat === beat);
    if (!mine.length) continue;
    let at = t + LEAD[beat];
    for (const l of mine) { said.push({ ...l, at: +at.toFixed(2) }); at += l.end + BETWEEN; }
    const spoken = at - BETWEEN - t;
    const extra = beat === 'close' ? END_HOLD : AFTER;
    const dur = tenths(Math.max(MIN[beat], spoken + extra));
    beats[beat] = { at: tenths(t), dur };
    t = tenths(t + dur);
  }
  const duration = t;

  const at = { mark: 0.15, kicker: 0.35, name: 0.55, rule: 1.25 };
  at.rows = [...Array(6).keys()].map(k => +(beats.spec.at + 0.75 + k * ROW_EVERY).toFixed(2));
  at.stamp = +(beats.price.at + 0.5).toFixed(2);
  if (beats.reply) {
    at.bubble = +(beats.reply.at + 0.45).toFixed(2);
    at.reply = +(beats.reply.at + 1.3).toFixed(2);
    at.replyEach = REPLY_EACH;
    at.meta = +(at.reply + [...f.capture.reply].length * REPLY_EACH + 0.35).toFixed(2);
  }
  // the request is typed, then the command
  const code = codeOf(f.id);
  at.typed = [];
  let k = beats.use.at + 0.75;
  for (const block of [code.request.map(l => l.text), code.term]) {
    for (const l of block) { for (let i = 0; i < [...l].length; i++) { at.typed.push(+k.toFixed(3)); k += TYPE_EACH; } k += LINE_PAUSE; }
    k += 0.35;
  }
  at.typingEnd = +k.toFixed(2);

  const panes = [{ cls: 'spec', at: beats.spec.at + 0.15 }, { cls: 'price', at: beats.price.at + 0.1 }];
  if (beats.reply) panes.push({ cls: 'reply-pane', at: beats.reply.at + 0.1 });
  panes.push({ cls: 'use', at: beats.use.at + 0.1 });

  const captions = said.flatMap(l => captionsOf(l.text, { at: l.at, start: l.start, end: l.end }));
  return { duration, beats, said, at, panes: panes.map(p => ({ ...p, at: +p.at.toFixed(2) })), captions };
}

// ── sound: one event → one sound ───────────────────────────────────────────
export const SOUNDS = {
  mark: { file: AUDIO('pop.mp3'), gain: -17 },
  name: { file: AUDIO('whoosh-short.mp3'), gain: -16 },
  card: { file: AUDIO('whoosh.mp3'), gain: -20 },
  pane: { file: AUDIO('whoosh-short.mp3'), gain: -22, pitch: [1.08, 0.94, 1.02] },
  row: { file: AUDIO('thump.mp3'), gain: -21, pitch: [1, 1.07, 0.95, 1.12, 0.9, 1.04] },
  stamp: { file: AUDIO('stamp.mp3'), gain: -9, big: true },
  reply: { file: AUDIO('ping.mp3'), gain: -19 },
  typing: { file: AUDIO('typing.mp3'), gain: -24, pitch: [1, 1.05], dur: 1.5 },
  close: { file: AUDIO('chime.mp3'), gain: -19, big: true },
};

export function eventsOf(s) {
  const ev = (event, at) => ({ event, at });
  const out = [ev('mark', s.beats.reveal.at + s.at.mark), ev('name', s.beats.reveal.at + s.at.name - 0.1), ev('card', s.beats.spec.at)];
  for (const p of s.panes.slice(1)) out.push(ev('pane', p.at - 0.05));
  for (const r of s.at.rows) out.push(ev('row', r));
  out.push(ev('stamp', s.at.stamp - 0.05));
  if (s.at.reply) out.push(ev('reply', s.at.meta - 0.3));
  // typing runs as long as the code is typed, in 1.5 s takes
  const from = s.at.typed[0], to = s.at.typingEnd;
  for (let t = from; t < to - 0.3; t += 1.5) out.push(ev('typing', t));
  out.push(ev('close', s.beats.close.at + 0.45));
  return out;
}

const MUSIC = { file: AUDIO('music.mp3'), offset: 0, gain: -15, duck: 9, fadeIn: 0.6, fadeOut: 2.4 };

// ── identity ───────────────────────────────────────────────────────────────
const hash = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** What a film shows and says: the same facts make the same release. */
const partsOf = (f, lines) => [`${f.id}:${hash({ f, said: lines.map(l => l.text) })}`];

const releaseOf = films => ({
  notable: films.length > 0,
  label: films.length === 1 ? films[0].id.replace('/', '-') : 'models',
  parts: films.flatMap(f => partsOf(f, scriptOf(f))),
  films,
});

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} answered HTTP ${r.status}`);
  return r.json();
}

/** The voiced lines of a film, in order, each with its recording. */
export const voicedOf = f => scriptOf(f).map(l => ({ ...l, ...voicedLine(VOICE_DIR, VOICE, l.text, l.say, { kind: 'model-launch' }) }));

export default {
  id: 'model-launch',
  title: 'Model launch',
  scheduled: false,
  audited: true,

  async collect({ flags }) {
    const doc = flags.from ? readJson(path.resolve(flags.from)) : await fetchJson(MODELS_API);
    const byId = new Map(parseCatalog(doc).map(m => [m.id, m]));
    const ids = flags.model ? String(flags.model).split(',') : FEATURED;
    const now = flags.now ? Date.parse(`${flags.now}T23:59:59Z`) : Date.now();
    const films = ids.map(id => {
      const m = byId.get(id);
      if (!m) throw new Error(`the catalog has no model "${id}"`);
      return factsOf(m, { now });
    });
    for (const f of films) console.log(`  ${f.id.padEnd(42)} ${f.billing.padEnd(7)} ${f.isNew ? 'new' : 'not new'}  ${f.day}${f.capture ? '  capture' : ''}`);
    return releaseOf(films);
  },

  split: data => data.films.map(f => releaseOf([f])),

  film(data) {
    const f = data.films[0];
    const lines = voicedOf(f);
    const s = storyOf(f, lines);
    const cues = cueSheet(eventsOf(s), SOUNDS);
    const t = { beats: s.beats, at: s.at, panes: s.panes, captions: s.captions };
    return {
      title: `${f.name} on AnyRouter`,
      duration: s.duration,
      bg: C.bg,
      css: css(f.accent),
      fonts: [{ family: 'Geist', file: 'geist.woff2', weight: '100 900' }, { family: 'Geist Mono', file: 'geist-mono.woff2', weight: '100 900' }],
      assets: [{ from: path.join(SHARED, 'assets/brand/anyrouter-logo-white.svg'), to: 'assets/brand/anyrouter-logo-white.svg' }],
      scenes: [{ id: 's01-launch', start: 0, dur: s.duration, body: body(f, t), inner: inner(t) }],
      sound: {
        music: MUSIC,
        voice: s.said.map(l => ({ file: l.file, at: l.at, start: l.start, end: l.end })),
        sfx: cues,
      },
      beats: s.beats,
      claims: s.said.map(l => ({ says: l.text, at: l.at, from: l.from })),
      said: s.said,
      cues,
      summary: `${f.id}: ${Object.entries(s.beats).map(([k, b]) => `${k} ${b.dur}s`).join(' · ')}`,
    };
  },

  write: writeProject,

  headline: data => `${data.films[0].name}: ${data.films[0].billing === 'free' ? 'free on AnyRouter' : data.films[0].billing === 'byok' ? 'bring your own key' : 'on AnyRouter'}`,

  notes: data => {
    const f = data.films[0];
    return [
      `${f.name} from ${f.maker}. ${f.billing === 'free' ? 'Free on AnyRouter: $0 in, $0 out, no daily cap.' : f.billing === 'byok' ? 'Runs with your own provider key (BYOK), no AnyRouter markup.' : 'Runs on AnyRouter credits.'}`,
      `https://anyrouter.dev/model/${f.id}`,
    ];
  },

  link: data => `https://anyrouter.dev/model/${data.films[0].id}`,

  asset: entry => entry.label,

  /** The spec card with every row in. */
  coverAt: film => +(film.beats.spec.at + film.beats.spec.dur - 0.3).toFixed(2),
};
