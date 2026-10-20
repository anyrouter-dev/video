/**
 * use-case: one short silent film per use case on anyrouter.dev/use-cases,
 * embedded on that page above the steps. The page carries the steps; the film
 * shows the outcome and how little it takes, in three beats on one shot:
 *
 *   outcome  the page's title as a headline, with the tool's mark and AnyRouter's
 *   doing it the page's own command or code, typed into a terminal or an editor
 *   lockup   the headline again, the AnyRouter lockup and the page's URL
 *
 * The headline is the one element on screen the whole time: it shrinks into the
 * caption over the code, then settles above the lockup.
 *
 * Facts come from https://anyrouter.dev/use-cases.json, and the model ids a film
 * rolls through from https://anyrouter.dev/api/v1/models?all=1. Every word on screen is
 * a fact taken verbatim, with API keys redacted. Where the page's command names an
 * `anyrouter/*` preset, the id rolls through a few real ids the same key runs and
 * comes back to the preset, so the film never implies the presets are all there is.
 *
 * One collect holds every use case; `split` makes each its own release, whose
 * identity is the hash of the facts its film shows. Editing one use case
 * re-renders that film only.
 *
 *   --slug=SLUG          collect just this use case
 *   --from=FILE          build from a saved use-cases.json instead of the live site
 *   --models-from=FILE   read the catalog from a saved /api/v1/models?all=1 response
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { markFor } from '../../lib/marks.mjs';
import { writeProject } from './project.mjs';
import { CSS, read, setIn, codeSizes, idFitsRow, titleSet, filmScene, ROLL_EVERY } from './scenes.mjs';

export const API = 'https://anyrouter.dev/use-cases.json';
// every model, with the billing field that says which ones run on the user's own key
export const MODELS_API = 'https://anyrouter.dev/api/v1/models?all=1';
// A page with little to show runs short rather than holding a still frame.
export const FILM = { min: 10, max: 18 };

// ── facts: parsed at the boundary, trusted after ───────────────────────────
const fail = (where, what) => { throw new Error(`use-cases.json: ${where}: ${what}`); };
const str = (v, where) => (typeof v === 'string' && v.trim() ? v : fail(where, 'expected a non-empty string'));
const list = (v, where) => (Array.isArray(v) ? v : fail(where, 'expected an array'));

function parseUseCase(u, i) {
  const at = `useCases[${i}]${u?.slug ? ` (${u.slug})` : ''}`;
  const slug = str(u?.slug, `${at}.slug`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(`${at}.slug`, `"${slug}" is not a page slug`);
  return {
    slug,
    url: str(u.url, `${at}.url`),
    kicker: str(u.kicker, `${at}.kicker`),
    title: str(u.title, `${at}.title`),
    summary: str(u.summary, `${at}.summary`),
    logos: list(u.logos ?? [], `${at}.logos`),
    command: u.command?.text ? { text: str(u.command.text, `${at}.command.text`), shell: !!u.command.shell } : null,
    snippets: list(u.snippets ?? [], `${at}.snippets`).map(s => ({ code: String(s.code ?? ''), title: s.title ?? null })),
    // what the page's diagram says answers when the model asked for cannot
    fallbacks: list(u.diagram?.nodes ?? [], `${at}.diagram.nodes`).filter(n => n?.kind === 'fallback').map(n => String(n.note ?? '')),
  };
}

export function parseDoc(doc) {
  if (doc?.version !== 1) fail('version', `expected 1, got ${JSON.stringify(doc?.version)}`);
  const useCases = list(doc.useCases, 'useCases').map(parseUseCase);
  const dup = useCases.find((u, i) => useCases.findIndex(v => v.slug === u.slug) !== i);
  if (dup) fail('useCases', `slug "${dup.slug}" appears twice`);
  return useCases;
}

// ── the roll: real ids one AnyRouter key runs ──────────────────────────────
// The ids a roll may show, in order. Each answered on the platform route with
// AnyRouter credits (2026-10-19); moonshotai/kimi-k3 is left out, its route was
// exhausted. An id rolls only while the full catalog says one AnyRouter key runs
// it: a chat model whose billing is not "byok", which needs the user's own
// provider key. A page about anyrouter/free rolls ids priced 0 only, so "free"
// on screen stays true.
export const ROLL_IDS = ['deepseek/deepseek-v4-flash', 'nvidia/nemotron-3-super-120b-a12b', 'minimax/minimax-m3.1-flash'];

/** The roll pools from a /api/v1/models?all=1 response: the ROLL_IDS one key runs, and of those the free ones. */
export function rollPools(doc) {
  const byId = new Map(list(doc?.data, 'models.data').filter(m => typeof m?.id === 'string').map(m => [m.id, m]));
  const credit = m => !!m && !m.id.startsWith('anyrouter/') && m.pricing?.billing !== 'byok'
    && ['text', 'multimodal'].includes(m.category) && (m.capabilities ?? []).includes('chat');
  const free = m => credit(m) && Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0;
  return { credit: ROLL_IDS.filter(id => credit(byId.get(id))), free: ROLL_IDS.filter(id => free(byId.get(id))) };
}

// An anyrouter/* preset inside a line of the page's code.
const PRESET = /anyrouter\/[a-z0-9-]+/;
// A page that names a price ("$0 markup", "free") is read as saying it of every id on screen.
const PRICE = /\$0\b|\bfree\b/i;
/**
 * The ids a use case's film rolls through, or null when its command names no
 * preset. Ids billed to credits never roll under a page that promises "$0" or
 * "free": a viewer would read the promise as covering them. An id too long to
 * sit whole on a row of the window is left out of that film's roll.
 */
export function rollOf(u, pools) {
  const preset = u.command?.text.match(PRESET)?.[0];
  if (!preset || !pools) return null;
  const free = preset === 'anyrouter/free';
  if (!free && PRICE.test(`${u.kicker} ${u.title} ${u.summary}`)) return null;
  const focus = windowOf(u).lines.find(l => l.focus);
  const ids = (free ? pools.free : pools.credit).filter(id => idFitsRow(focus, preset, id, u.command.shell));
  return ids.length >= 2 ? { preset, ids } : null;
}

// ── the fallback: what answers when the model asked for cannot ─────────────
// The response header that names the fallback, as the page's curl greps for it.
const FALLBACK_HEADER = /x-anyrouter-fallback/i;
/**
 * The line a page's curl prints when the request is answered through its
 * fallback: the header it greps for, reading the preset its diagram falls back
 * to ("x-anyrouter-fallback: anyrouter/free"). Null unless the page has both.
 */
export function fallbackOf(u) {
  const to = u.fallbacks.map(n => n.match(PRESET)?.[0]).find(Boolean);
  const header = u.snippets.map(s => s.code.match(FALLBACK_HEADER)?.[0]).find(Boolean);
  return to && header ? `${header}: ${to}` : null;
}

// ── copy: what of the facts reaches the screen ─────────────────────────────
// API keys are the one thing on screen that is not verbatim: past its prefix a
// key is bullets. The site's copy only ever shows prefixes; this guards the day it doesn't.
const KEY = /\b(sk-ar-v1-|sk-ar-|sk-or-v1-|sk-ant-|sk-proj-|sk-|nvapi-|xai-|gsk_|ghp_|AIza)[A-Za-z0-9_-]{8,}/g;
export const redact = s => String(s).replace(KEY, (_, prefix) => `${prefix}••••••••`);

// A line that sets what a page changes: the AnyRouter base URL, the key, the model.
// Around the command it is shown whole; only the other lines are context that may fade.
const CHANGED = /https:\/\/anyrouter\.dev\/api|ANYROUTER_API_KEY|sk-ar-|\bmodels?\b"?\s*[:=]/;

// A shell snippet up to this many lines is typed whole; a longer one up to the command.
const SHELL_LINES = 3;
// Lines of code an editor shows: from the snippet's top, so a call keeps its URL and its key header.
const EDITOR_LINES = 6;

/**
 * The code a film types: the page's command, inside the snippet that holds it.
 * A shell command is typed with the snippet's other commands (install, then run).
 * A line of code is typed into its snippet, between the lines around it.
 */
export function windowOf(u) {
  if (!u.command) fail(u.slug, 'a use-case film needs the page\'s command');
  const cmd = u.command.text.trim();
  const snip = u.snippets.find(s => s.code.split('\n').some(l => l.includes(cmd)));
  if (!snip) return { shell: u.command.shell, title: null, lines: [{ text: cmd, focus: true }] };
  const all = snip.code.split('\n');
  const at = all.findIndex(l => l.includes(cmd));
  let from, to;
  if (u.command.shell) [from, to] = all.length <= SHELL_LINES ? [0, all.length] : [Math.max(0, at - SHELL_LINES + 1), at + 1];
  else {
    // the line after the command too, when there is one: the command is not the last thing in a file
    from = Math.max(0, Math.min(at, at + 2 - EDITOR_LINES));
    to = Math.min(all.length, from + EDITOR_LINES);
  }
  const shown = all.slice(from, to);
  // a terminal ends on the page's command, so a "\" that carries it onto lines the window does not show goes
  if (u.command.shell) shown[shown.length - 1] = shown.at(-1).replace(/ +\\$/, '');
  const indent = Math.min(...shown.filter(l => l.trim()).map(l => l.match(/^ */)[0].length));
  return {
    shell: u.command.shell,
    title: snip.title,
    lines: shown.map((l, k) => ({ text: l.slice(indent), focus: from + k === at })),
  };
}

/** Every string the film can show, and how each is set. Throws when one cannot be set legibly. */
export function copyOf(u, pools) {
  const title = redact(u.title);
  if (!setIn(title)) fail(`${u.slug}.title`, `"${title}" does not fit the headline in either frame`);
  const win = windowOf(u);
  const lines = win.lines.map(l => ({ ...l, text: redact(l.text), keep: !l.focus && CHANGED.test(l.text) }));
  const roll = rollOf(u, pools);
  // A window may drop its last lines of context, never the command or a line it changes. Larger
  // code wins over a line of context: of the cuts, the one whose code is set largest, then the
  // one that keeps the most lines. Only when none fits does it step down to the last-resort size.
  const cuts = [lines];
  while (!(win.shell || cuts.at(-1).at(-1).focus || cuts.at(-1).at(-1).keep)) cuts.push(cuts.at(-1).slice(0, -1));
  const fit = least => cuts.map(shown => ({ shown, code: codeSizes(shown, roll, win.shell, title, least) })).filter(c => c.code)
    .reduce((best, c) => (!best || c.code.landscape + c.code.portrait > best.code.landscape + best.code.portrait ? c : best), null);
  const { shown, code } = fit(false) ?? fit(true) ?? fail(`${u.slug}.command`, 'its code is too tall to sit under the caption in either frame');
  return {
    slug: u.slug,
    url: u.url,
    kicker: redact(u.kicker),
    title,
    marks: [...new Set(u.logos.map(markFor).filter(Boolean))],
    window: { shell: win.shell, title: win.title && redact(win.title), lines: shown, roll, answer: fallbackOf(u), code },
    type: { title: code.title, breaks: { landscape: titleSet(title, 'landscape', code.title.landscape).breaks, portrait: titleSet(title, 'portrait', code.title.portrait).breaks } },
  };
}

// ── timing ─────────────────────────────────────────────────────────────────
// Times are kept in tenths of a second: three frames, so every beat lands on a frame.
const tenths = s => Math.round(s * 10) / 10;
// Typing reads as typing at this pace, never slower than a comfortable typist.
const TYPE_EACH = 0.05, TYPE_MAX = 2.2, LINE_PAUSE = 0.3;
// The headline is up and read, the code typed and read, the URL found.
const MOVE = 0.7, TYPE_AT = 0.95, END_HOLD = 2.4;
// The typed line is read before its answer arrives.
const ANSWER_AFTER = 0.6;

/**
 * When everything happens. Beat 1 holds the headline for its reading time,
 * beat 2 types the code, rolls the id or shows the fallback answering, and
 * holds for reading it, beat 3 lands the lockup. A short film reads slower, in
 * proportion, up to FILM.min.
 */
export function storyOf(u, pools) {
  const copy = copyOf(u, pools);
  const { lines, roll, answer, shell } = copy.window;
  const typed = lines.filter(l => shell || l.focus);
  const chars = typed.reduce((n, l) => n + [...l.text].length, 0);
  const each = Math.min(TYPE_EACH, TYPE_MAX / chars);
  const typing = chars * each + (typed.length - 1) * LINE_PAUSE;
  const rolling = roll ? (roll.ids.length + 1) * ROLL_EVERY : 0;
  // the answer scrolls in once the line is typed, and holds for its own read
  const answering = answer ? ANSWER_AFTER + read(answer) : 0;
  // typing and the roll are time to read the line, so the hold after them is what is left
  const reading = { outcome: read(`${copy.kicker} ${copy.title}`) - 0.4, code: Math.max(roll ? 0.8 : 1.2, read(typed.map(l => l.text).join(' ')) - typing - rolling) };
  const fixed = MOVE + TYPE_AT + typing + rolling + answering + MOVE + END_HOLD;
  const stretch = Math.max(1, (FILM.min - fixed) / (reading.outcome + reading.code));
  const outcome = tenths(Math.max(2.4, reading.outcome * stretch));
  const doing = tenths(MOVE + TYPE_AT + typing + rolling + answering + reading.code * stretch);
  const duration = tenths(outcome + doing + MOVE + END_HOLD);
  if (duration > FILM.max) fail(u.slug, `the film needs ${duration}s (max ${FILM.max})`);
  const beats = [
    { key: 'outcome', start: 0, dur: outcome },
    { key: 'doing', start: outcome, dur: doing },
    { key: 'lockup', start: tenths(outcome + doing), dur: tenths(duration - outcome - doing) },
  ];
  const typeAt = tenths(outcome + TYPE_AT);
  return { copy, beats, duration, timing: { each: +each.toFixed(4), typeAt, typing: +typing.toFixed(2), rollAt: +(typeAt + typing + 0.5).toFixed(2), answerAt: answer ? +(typeAt + typing + rolling + ANSWER_AFTER).toFixed(2) : null, linePause: LINE_PAUSE } };
}

// ── identity ───────────────────────────────────────────────────────────────
const stable = v => (Array.isArray(v) ? `[${v.map(stable).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
  : JSON.stringify(v ?? null));
/** The facts a film and its release notes are cut from. Fields the film never shows (steps, hook, notes) are left out. */
const filmed = (u, pools) => ({
  slug: u.slug, url: u.url, kicker: u.kicker, title: u.title, summary: u.summary, logos: u.logos,
  window: u.command && windowOf(u), roll: rollOf(u, pools),
  // only a film that shows a fallback carries one, so the others keep their identity
  ...(fallbackOf(u) && { answer: fallbackOf(u) }),
});
const partsOf = (u, pools) => [`${u.slug}:${crypto.createHash('sha256').update(stable(filmed(u, pools))).digest('hex')}`];

/** Collected facts in the shape every release has, for one use case or many. */
const releaseOf = (useCases, pools) => ({
  notable: useCases.length > 0,
  label: useCases.length === 1 ? useCases[0].slug : 'use-cases',
  parts: useCases.flatMap(u => partsOf(u, pools)),
  useCases,
  pools,
});
const one = data => data.useCases[0];

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} answered HTTP ${r.status}`);
  return r.json();
}

export default {
  id: 'use-case',
  title: 'Use case',
  scheduled: false,
  // a film embedded on its page is read on a phone in both shapes: every rendition passes the stage audit
  audited: true,

  async collect({ flags }) {
    const doc = flags.from ? readJson(path.resolve(flags.from)) : await fetchJson(API);
    const all = parseDoc(doc);
    const useCases = flags.slug ? all.filter(u => u.slug === flags.slug) : all;
    if (flags.slug && !useCases.length) throw new Error(`no use case "${flags.slug}". The use cases are: ${all.map(u => u.slug).join(', ')}`);
    const pools = rollPools(flags['models-from'] ? readJson(path.resolve(flags['models-from'])) : await fetchJson(MODELS_API));
    for (const u of useCases) console.log(`  ${u.slug.padEnd(32)} ${u.title}`);
    console.log(`  roll: ${pools.credit.join(', ')} · free: ${pools.free.join(', ')}`);
    return releaseOf(useCases, pools);
  },

  split: data => data.useCases.map(u => releaseOf([u], data.pools)),

  film(data) {
    const u = one(data);
    const story = storyOf(u, data.pools);
    return {
      title: u.title,
      duration: story.duration,
      palette: 'intro',
      volume: 0.5,
      css: CSS,
      beats: story.beats,
      scenes: [{ ...filmScene(story), id: 's01-film', key: 'film', start: 0, dur: story.duration }],
      summary: `${u.slug}: ${story.beats.map(b => `${b.key} ${b.dur}s`).join(' · ')}`,
    };
  },

  write: writeProject,

  headline: data => one(data).title,

  notes: data => [one(data).summary, one(data).url],

  link: data => one(data).url,

  // Several use cases ship on one day, so each film is named by its page.
  asset: entry => entry.label,

  /** The headline once its words have risen and before it moves. */
  coverAt: film => film.beats[1].start - 0.3,
};
