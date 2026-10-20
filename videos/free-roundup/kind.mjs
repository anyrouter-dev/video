/**
 * free-roundup: one narrated film per run day of every model that is free on AnyRouter and was
 * created in the last 30 days, newest first, flipped onto a split-flap board (STYLE.md).
 *
 *   title   the wall sign, the board dropping in on its rods
 *   page-N  six models a page: date, maker, model, chat or decision
 *   pick    how to use one: its id, anyr claude, anyr decision
 *   close   anyrouter.dev/models
 *
 * "free" and "new" are lib/models.mjs's: a BYOK model is never on this board, whatever its
 * price. A release is the day it was made and the list it shows: a second run on the same day
 * with the same list is already released.
 *
 *   --from=FILE        a saved /api/v1/models?all=1 response instead of the live catalog
 *   --now=YYYY-MM-DD   the day the window ends (default: today, UTC)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SHARED } from '../../lib/paths.mjs';
import { MODELS_API, parseCatalog, isFree, isNew, isListing, isDecision, makerOf, dayOf, dateWords } from '../../lib/models.mjs';
import { writeProject } from '../../shared/authoring/film-project.mjs';
import { voicedLine, captionsOf, numberWords, speakName } from '../../shared/authoring/narrate.mjs';
import { cueSheet } from '../../shared/authoring/mixdown.mjs';
import { PER_PAGE, NAME_MAX, colsOf, entryRows, textPage, gridsOf, flipsOf, flipSpan } from './board.mjs';
import { css, body, inner, C } from './scene.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const VOICE_DIR = path.join(DIR, 'voice');
const AUDIO = f => path.join(DIR, 'audio', f);
export const DAYS = 30;
/** One voice for the board: Kokoro's am_michael, US English, a touch slower. */
export const VOICE = { engine: 'kokoro', id: 'am_michael', speed: 0.95, lang: 'en-us' };
// A film runs at most a minute: past this many models the last row says how many more there are.
export const MAX_SHOWN = 23;
export const MAX_SECONDS = 60;

const SAY = { anyr: 'any R', 'anyrouter.dev/models': 'any router dot dev slash models', AnyRouter: 'Any Router' };
const cap = s => s[0].toUpperCase() + s.slice(1);

/** The board's facts from the catalog: the free models created in the window, newest first. */
export function roundupOf(doc, { now }) {
  const models = parseCatalog(doc).filter(m => isListing(m) && isFree(m) && isNew(m, { now, days: DAYS }))
    .sort((a, b) => b.created - a.created || a.id.localeCompare(b.id));
  const entries = models.map(m => ({
    id: m.id,
    day: dayOf(m.created),
    date: dateWords(dayOf(m.created), { short: true }),
    maker: makerOf(m),
    name: m.display_name || m.name || m.id.split('/')[1],
    type: isDecision(m) ? 'decision' : 'chat',
  }));
  for (const e of entries) if (e.name.length > NAME_MAX) throw new Error(`${e.id}: "${e.name}" is longer than a board row (${NAME_MAX})`);
  return { asOf: dayOf(now / 1000), days: DAYS, entries };
}

/** What the film says, in order: { beat, text }. Each line from the board's own facts. */
export function scriptOf(d) {
  const n = d.entries.length, chat = d.entries.filter(e => e.type === 'chat'), dec = d.entries.filter(e => e.type === 'decision');
  const lines = [{ beat: 'title', text: `AnyRouter lists ${numberWords(n)} free models created in the last ${numberWords(DAYS)} days.`, from: 'catalog: not byok, $0/$0, created in the window' }];
  const pages = [];
  pages.push(`The newest is ${d.entries[0].name}, from ${d.entries[0].maker}.`);
  if (chat.length && dec.length) pages.push(`${cap(numberWords(chat.length))} are chat models, and ${numberWords(dec.length)} are decision models.`);
  if (dec.length) pages.push('Decision models answer typed questions with probabilities, not chat.');
  pages.push('Each one is free to call, with no daily cap.');
  pages.forEach((text, k) => lines.push({ beat: 'page', text, from: k === pages.length - 1 ? 'docs/features/free-tier.md: "Daily cap: None"' : 'catalog: capabilities (chat, systemone)' }));
  lines.push({ beat: 'pick', text: 'To use one, put its id in the model field, or run it with anyr claude.', from: 'anyr --help: anyr claude --model <id>' });
  if (dec.length) lines.push({ beat: 'pick', text: 'Decision models run with anyr decision.', from: 'anyr decision --help' });
  lines.push({ beat: 'close', text: 'See every model on anyrouter.dev/models.', from: 'the page anyrouter.dev/models' });
  return lines.map(l => ({ ...l, say: { ...SAY, [d.entries[0].name]: speakName(d.entries[0].name), [d.entries[0].maker]: d.entries[0].maker } }));
}

/** The board's pages: the list six at a time, how to use one, and the close. */
export function pagesOf(d) {
  const shown = d.entries.length > MAX_SHOWN + 1 ? d.entries.slice(0, MAX_SHOWN) : d.entries;
  const nameCols = Math.max(...shown.map(e => e.name.length), 26);
  const cols = colsOf(nameCols);
  const rows = shown.map(e => entryRows(e, nameCols));
  if (shown.length < d.entries.length) {
    const more = `+ ${d.entries.length - shown.length} MORE ON ANYROUTER.DEV/MODELS`;
    rows.push({ landscape: [more], portrait: [`+ ${d.entries.length - shown.length} MORE`, 'ON ANYROUTER.DEV/MODELS'] });
  }
  const list = [];
  for (let k = 0; k < rows.length; k += PER_PAGE) {
    const page = rows.slice(k, k + PER_PAGE);
    list.push({ landscape: page.flatMap(r => r.landscape), portrait: page.flatMap(r => r.portrait) });
  }
  const chat = d.entries.find(e => e.type === 'chat'), dec = d.entries.find(e => e.type === 'decision');
  const pickRows = [{ landscape: ['TO USE ONE'], portrait: ['TO USE ONE'] }, { landscape: [''], portrait: [''] }];
  if (chat) {
    pickRows.push({ landscape: ['CHAT      anyr claude --model'], portrait: ['CHAT', 'anyr claude --model'] });
    pickRows.push({ landscape: [`          ${chat.id}`], portrait: [chat.id] });
  }
  if (dec) {
    pickRows.push({ landscape: ['DECISION  anyr decision --model'], portrait: ['DECISION', 'anyr decision --model'] });
    pickRows.push({ landscape: [`          ${dec.id}`], portrait: [dec.id] });
  }
  const left = (r, n) => r.padEnd(n);
  const pick = { landscape: pickRows.flatMap(r => r.landscape).map(s => left(s, cols.landscape)), portrait: pickRows.flatMap(r => r.portrait) };
  const close = textPage([{ landscape: [''], portrait: ['', '', ''] }, { landscape: ['ANYROUTER.DEV/MODELS'], portrait: ['ANYROUTER.DEV/MODELS'] },
    { landscape: [''], portrait: [''] }, { landscape: ['FREE TO CALL  ·  NO DAILY CAP'], portrait: ['FREE TO CALL', 'NO DAILY CAP'] }], cols);
  return { cols, list, pick, close, shown: shown.length };
}

// ── timing ─────────────────────────────────────────────────────────────────
const tenths = s => Math.round(s * 10) / 10;
const LEAD = 0.5, BETWEEN = 0.4, AFTER = 0.6, END_HOLD = 2.4;
// The board drops in, then the first page flips.
const DROP = 0.9, TITLE_MIN = 3.6;

/**
 * When everything happens. The title holds while the count is said; each page flips, then holds
 * while its line is said, or long enough to read its rows; the pick and close pages likewise.
 * Lines meant for pages the list does not need are said on its last page.
 */
export function storyOf(d, lines, pages) {
  const span = flipSpan(pages.cols);
  const holds = [];   // { key, lines }
  const pageLines = lines.filter(l => l.beat === 'page');
  const nPages = pages.list.length;
  holds.push({ key: 'title', lines: lines.filter(l => l.beat === 'title'), min: TITLE_MIN });
  pages.list.forEach((_, k) => holds.push({ key: `page-${k + 1}`, lines: k < nPages - 1 ? pageLines.slice(k, k + 1) : pageLines.slice(k), min: span + 2.8, flip: true }));
  holds.push({ key: 'pick', lines: lines.filter(l => l.beat === 'pick'), min: span + 3.6, flip: true });
  holds.push({ key: 'close', lines: lines.filter(l => l.beat === 'close'), min: span + 3.2, flip: true, end: true });

  const beats = [], said = [];
  let t = 0;
  for (const h of holds) {
    let at = t + (h.flip ? span * 0.5 : DROP) + LEAD;
    for (const l of h.lines) { said.push({ ...l, at: +at.toFixed(2) }); at += l.end + BETWEEN; }
    const dur = tenths(Math.max(h.min, at - BETWEEN - t + (h.end ? END_HOLD : AFTER)));
    beats.push({ key: h.key, at: tenths(t), dur, flip: !!h.flip });
    t = tenths(t + dur);
  }
  if (t > MAX_SECONDS) throw new Error(`the roundup needs ${t}s, over ${MAX_SECONDS}s`);
  const flipAt = beats.filter(b => b.flip).map(b => b.at);
  return { duration: t, beats, said, span, flipAt, captions: said.flatMap(l => captionsOf(l.text, { at: l.at, start: l.start, end: l.end })) };
}

// ── sound ──────────────────────────────────────────────────────────────────
// flaps.mp3 is a real split-flap board; each page flip plays a stretch of it as long as the flip.
const FLAP_TAKES = [0.4, 10.2, 20.0, 29.6, 38.9];
export const SOUNDS = {
  drop: { file: AUDIO('whoosh-short.mp3'), gain: -16, pitch: [0.85] },
  land: { file: AUDIO('click-soft.mp3'), gain: -10, big: true },
  flip: { file: AUDIO('flaps.mp3'), gain: -7 },
  close: { file: AUDIO('chime.mp3'), gain: -17, big: true },
};

export function cuesOf(s) {
  const events = [{ event: 'drop', at: s.beats[0].at + DROP - 0.1 }, { event: 'land', at: s.beats[0].at + DROP + 0.75 }];
  s.flipAt.forEach(at => events.push({ event: 'flip', at }));
  events.push({ event: 'close', at: s.flipAt.at(-1) + s.span + 0.2 });
  // each flip takes its own stretch of the board, as long as the page takes to flip
  let k = 0;
  return cueSheet(events, SOUNDS).map(c => (c.event === 'flip'
    ? { ...c, from: FLAP_TAKES[k++ % FLAP_TAKES.length], dur: +(s.span + 0.25).toFixed(2), rate: [1, 1.03, 0.97][k % 3] } : c));
}

const MUSIC = { file: AUDIO('music.mp3'), offset: 0, gain: -13, duck: 10, fadeIn: 1.0, fadeOut: 2.6 };

// ── release ────────────────────────────────────────────────────────────────
const hash = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} answered HTTP ${r.status}`);
  return r.json();
}

export const voicedOf = d => scriptOf(d).map(l => ({ ...l, ...voicedLine(VOICE_DIR, VOICE, l.text, l.say, { kind: 'free-roundup' }) }));

export default {
  id: 'free-roundup',
  title: 'Free models roundup',
  scheduled: false,
  audited: true,

  async collect({ flags }) {
    const doc = flags.from ? readJson(path.resolve(flags.from)) : await fetchJson(MODELS_API);
    const now = flags.now ? Date.parse(`${flags.now}T23:59:59Z`) : Date.now();
    const d = roundupOf(doc, { now });
    for (const e of d.entries) console.log(`  ${e.day}  ${e.id.padEnd(42)} ${e.type}`);
    return { notable: d.entries.length > 0, label: d.asOf, parts: [`${d.asOf}:${hash(d.entries)}`], ...d };
  },

  film(d) {
    const lines = voicedOf(d);
    const pages = pagesOf(d);
    const grids = gridsOf([...pages.list, pages.pick, pages.close], pages.cols);
    const s = storyOf(d, lines, pages);
    const flips = Object.fromEntries(['landscape', 'portrait'].map(o => [o, flipsOf(grids, s.flipAt, o).map(f => [f.r, f.c, f.at, f.from, f.to])]));
    const nameCols = pages.cols.landscape - 29;
    const labels = [['DATE', 1, 6], ['MAKER', 8, 12], ['MODEL', 21, nameCols], ['TYPE', 22 + nameCols, 8]];
    const facts = {
      grids, days: DAYS, asOf: dateWords(d.asOf, { short: true }).replace(/ 0?/, ' ') + `, ${d.asOf.slice(0, 4)}`, labels,
      count: d.entries.length, chat: d.entries.filter(e => e.type === 'chat').length, decision: d.entries.filter(e => e.type === 'decision').length,
    };
    const listPages = pages.list.length;
    const t = {
      drop: DROP, listPages, captions: s.captions, flips, closeAt: s.flipAt.at(-1),
      pageAt: s.flipAt, pageLabels: [...pages.list.map((_, k) => `PAGE ${k + 1} OF ${listPages}`), 'HOW TO USE', 'ANYROUTER.DEV'],
    };
    return {
      title: 'Free models on AnyRouter',
      duration: s.duration,
      bg: C.wall,
      css: css(pages.cols),
      fonts: [{ family: 'Barlow Condensed', file: 'barlow-condensed-500.woff2', weight: 500 }, { family: 'Barlow Condensed', file: 'barlow-condensed-600.woff2', weight: 600 },
        { family: 'Barlow Condensed', file: 'barlow-condensed-700.woff2', weight: 700 }],
      assets: [{ from: path.join(SHARED, 'assets/brand/anyrouter-logo-black.svg'), to: 'assets/brand/anyrouter-logo-black.svg' }],
      scenes: [{ id: 's01-board', start: 0, dur: s.duration, body: body(facts, t), inner: inner(t) }],
      sound: { music: MUSIC, voice: s.said.map(l => ({ file: l.file, at: l.at, start: l.start, end: l.end })), sfx: cuesOf(s) },
      beats: s.beats,
      summary: `free-roundup ${d.asOf}: ${d.entries.length} models, ${s.beats.map(b => `${b.key} ${b.dur}s`).join(' · ')}`,
    };
  },

  write: writeProject,

  headline: d => `${d.entries.length} free models created in the last ${DAYS} days`,

  notes: d => [
    `Every model free on AnyRouter (not BYOK, $0 in and out) with a created date in the ${DAYS} days to ${d.asOf}, newest first.`,
    ...d.entries.map(e => `${e.day}  ${e.id}  (${e.type})`),
    'https://anyrouter.dev/models',
  ],

  link: () => 'https://anyrouter.dev/models',

  asset: entry => `${entry.label}`,

  /** The first page, flipped in. */
  coverAt: film => +(film.beats[1].at + film.beats[1].dur - 0.4).toFixed(2),
};
