/**
 * use-case: one short narrated film per use case on anyrouter.dev/use-cases,
 * embedded on that page above the steps. It says what this is and why you
 * would want it, walks the page's steps one by one, and ends on the page's
 * short link, each beat held while its line of the narration (narration.mjs)
 * is said, with captions under the picture and a score of its own:
 *
 *   outcome  the page's title as a headline, with the tool's mark and AnyRouter's
 *   step-N   a numbered step card that tilts in and settles flat to read, the
 *            page's own sentence for it under the label; the step that shows
 *            the code brings in the window and types the page's command
 *   close    the headline again, the AnyRouter lockup and anyrouter.dev/u/<slug>
 *
 * Facts come from https://anyrouter.dev/use-cases.json, and the model ids a film
 * rolls through from https://anyrouter.dev/api/v1/models?all=1. Every word on screen
 * that is not the narration is a fact taken verbatim, with API keys redacted. Where
 * the page's command names an `anyrouter/*` preset, the request keeps it, and a line
 * under the window rolls through a few real ids the same key runs, so the film
 * never implies the presets are all there is.
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
import { loadNarration, scriptOf, voicedLine } from './narration.mjs';
import { CSS, read, setIn, codeSizes, codeCols, caretCols, SIZES, idFitsRow, titleSet, titleType, stepType, labelSet, detailSet, headOf, STEP, TYPE, WIN_SH, filmScene, ROLL_EVERY, sayType, diagramOf, fitPanel, boardOf } from './scenes.mjs';
import { reflow, standsAlone, closed, headless } from './reflow.mjs';

export const API = 'https://anyrouter.dev/use-cases.json';
// every model, with the billing field that says which ones run on the user's own key
export const MODELS_API = 'https://anyrouter.dev/api/v1/models?all=1';
// The voice sets a film's length; a page with little to say still runs long enough to read.
export const FILM = { min: 33, max: 62 };

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
    // the page's group lays out the film's board (scenes.mjs BOARDS)
    group: typeof u.group === 'string' ? u.group : null,
    kicker: str(u.kicker, `${at}.kicker`),
    title: str(u.title, `${at}.title`),
    summary: str(u.summary, `${at}.summary`),
    logos: list(u.logos ?? [], `${at}.logos`),
    command: u.command?.text ? { text: str(u.command.text, `${at}.command.text`), shell: !!u.command.shell } : null,
    snippets: list(u.snippets ?? [], `${at}.snippets`).map(s => ({ code: String(s.code ?? ''), title: s.title ?? null })),
    steps: list(u.steps ?? [], `${at}.steps`).map(String),
    // what the page's diagram says answers when the model asked for cannot
    fallbacks: list(u.diagram?.nodes ?? [], `${at}.diagram.nodes`).filter(n => n?.kind === 'fallback').map(n => String(n.note ?? '')),
    // the short link the site publishes for the page, once it does
    link: typeof u.shortUrl === 'string' ? u.shortUrl : Array.isArray(u.shortUrls) && typeof u.shortUrls[0] === 'string' ? u.shortUrls[0] : null,
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
 * "free": a viewer would read the promise as covering them. They roll on a line
 * under the window ("The same key also runs …"): the request keeps the page's own
 * model. An id too long for that line is left out.
 */
export function rollOf(u, pools) {
  const preset = u.command?.text.match(PRESET)?.[0];
  if (!preset || !pools) return null;
  const free = preset === 'anyrouter/free';
  if (!free && PRICE.test(`${u.kicker} ${u.title} ${u.summary}`)) return null;
  const ids = (free ? pools.free : pools.credit).filter(idFitsRow);
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
// The films never show a long dash: in the page's own sentences one becomes a sentence break.
export const undash = s => String(s).replace(/\s+—\s+(\w)/g, (_, c) => `. ${c.toUpperCase()}`);

// A line that sets what a page changes: the AnyRouter base URL, the key, the model.
// Around the command it is shown whole; only the other lines are context that may fade.
const CHANGED = /https:\/\/anyrouter\.dev\/api|ANYROUTER_API_KEY|sk-ar-|\bmodels?\b"?\s*[:=]/;

// A shell snippet up to this many lines is typed whole; a longer one up to the command.
const SHELL_LINES = 3;
// A request or a file up to this many lines is shown whole.
const WHOLE_LINES = 12;

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
    // a request or a file from its top, so it reads as whole code, through the command and the lines
    // right after it that set what the page changes; reflow.mjs closes what is left open
    from = 0;
    to = at + 1;
    while (to < all.length && CHANGED.test(all[to])) to++;
    // a short request is shown whole: what it sends after its model is part of the point
    if (all.length <= WHOLE_LINES) to = all.length;
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
  if (!u.narration) fail(u.slug, 'no script in videos/use-case/narration.json');
  // a step that does not show the window shows the page's own sentence for it: the page step sharing most words with it
  const wordsOf = t => new Set(t.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const pageStep = label => {
    const mine = wordsOf(label);
    return u.steps.map(t => ({ t, n: [...wordsOf(t)].filter(w => mine.has(w)).length })).reduce((a, b) => (b.n > a.n ? b : a), { t: null, n: 0 }).t;
  };
  // a page sentence that opens by repeating the label shows only what follows it
  const beyond = (label, t) => (t && t.toLowerCase().startsWith(`${label.toLowerCase()}.`) ? t.slice(label.length + 1).trim() || null : t);
  const steps = u.narration.lines.filter(l => l.beat === 'step' && !l.more).map(l => ({ label: redact(l.label), shows: l.shows, detail: !l.shows && pageStep(l.label) ? undash(redact(beyond(l.label, pageStep(l.label)) ?? '')) || null : null }));
  const shown = steps.map((st, k) => (st.shows ? k : -1)).filter(k => k >= 0);
  if (!shown.length || !steps.some(st => st.shows === 'command')) fail(u.slug, 'no step shows the command');
  const detailSizes = { landscape: TYPE.detail.landscape.sizes, portrait: TYPE.detail.portrait.sizes };
  if (!['landscape', 'portrait'].every(o => stepType(steps.map(st => st.label))[o])) fail(u.slug, 'a step label does not fit beside its marker in two lines');
  const labels = steps.map(st => st.label), stepT = {};
  const win = windowOf(u);
  const lines = win.lines.map(l => ({ ...l, text: redact(l.text), keep: !l.focus && CHANGED.test(l.text) }));
  let roll = rollOf(u, pools);
  // Every line of code sits on one row, in each frame on its own: the code takes the largest size, down
  // to the floor, at which every line fits as the page wrote it; only past the floor are lines rewritten
  // narrower (reflow.mjs). A window too tall drops its trailing context, then context that stands alone,
  // never the command or a line it changes; of the cuts, the one set largest wins, then the one keeping most lines.
  const fitIn = (o, head, mode) => {
    const fitAt = (px, narrower, mode = 'cut') => {
      const width = (l, t) => (win.shell && !l.cont ? 2 : 0) + t.length + (win.shell || l.focus ? caretCols(o, px) : 0);
      const set = narrower ? reflow(lines, codeCols(o, px), { shell: win.shell, width }) : lines.every(l => width(l, l.text) <= codeCols(o, px)) && lines;
      if (!set) return null;
      const cuts = [set];
      while (!(win.shell || cuts.at(-1).at(-1).focus || cuts.at(-1).at(-1).keep)) cuts.push(cuts.at(-1).slice(0, -1));
      // then, top down, lines of context that stand alone, so the code around them stays whole
      const alone = (ls, i) => !!ls[i] && !ls[i].focus && !ls[i].keep && !ls[i].cont && !ls[i + 1]?.cont && standsAlone(ls[i].text);
      // lines left out of the middle are marked "…", which takes a row, so that is worth it for two or more;
      // a lone line goes unmarked only when nothing else fits
      for (const cut of [...cuts]) for (let ls = cut, i; (i = ls.findIndex((_, k) => alone(ls, k) && alone(ls, k + 1))) >= 0;) cuts.push(ls = [...ls.slice(0, i), { text: ls[i].text.match(/^ */)[0] + '…', ctx: true }, ...ls.slice(i + 2)]);
      if (mode === 'loose') for (const cut of [...cuts]) for (let ls = cut, i; (i = ls.findIndex((_, k) => alone(ls, k))) >= 0;) cuts.push(ls = ls.filter((_, k) => k !== i));
      // then without what leads into the call, shown as a "…" row
      for (const cut of [...cuts]) { const h = headless(cut); if (h) cuts.push(h); }
      // a window that stops inside its request or call shows "…" and closes what is still open
      const trim = ls => { let a = 0, b = ls.length; while (a < b && !ls[a].text.trim()) a++; while (b > a && !ls[b - 1].text.trim()) b--; return ls.slice(a, b); };
      const whole = ls => (win.shell ? ls : closed(trim(ls)));
      const fits = (mode === 'whole' ? cuts.slice(0, 1) : cuts).map(whole).filter(ls => ls.every(l => width(l, l.text) <= codeCols(o, px)) && codeSizes(ls, roll, win.shell, { [o]: head }, { [o]: [px] }, o));
      return fits.length ? { lines: fits.reduce((a, b) => (b.length > a.length ? b : a)), px } : null;
    };
    // every line the page wrote, at any size it fits, before a larger size that leaves lines out
    const tries = [false, true].flatMap(narrower => SIZES[o].map(px => [px, narrower]));
    return tries.map(([px, n]) => fitAt(px, n, mode)).find(Boolean) ?? null;
  };
  // The step labels take the largest size at which the window still fits under whichever of its steps
  // has the most above it.
  // every line the page wrote, then lines left out under a "…", and only then a lone line left out unmarked:
  // the labels step down before the code loses a line
  const fitWith = o => {
    for (const mode of ['whole', 'cut', 'loose']) {
      for (const px of TYPE.step[o].sizes.filter(x => labels.every(l => labelSet(l, o, x)))) {
        const head = Math.max(...shown.map(k => headOf(labels, k, { [o]: px })[o])), fit = fitIn(o, head, mode);
        if (fit) { stepT[o] = px; return fit; }
      }
    }
    return null;
  };
  // the line of ids the same key runs goes before the code would
  let fitL = fitWith('landscape'), fitP = fitL && fitWith('portrait');
  if (!(fitL && fitP) && roll) { roll = null; fitL = fitWith('landscape'); fitP = fitL && fitWith('portrait'); }
  if (!(fitL && fitP)) fail(`${u.slug}.command`, `its code does not fit under its step in the ${fitL ? 'portrait' : 'landscape'} frame, one row a line`);
  // a detail too long for the room under its step at the smallest size is left out
  const roomFor = (k, o, px) => {
    const set = detailSet(steps[k].detail, o, px), above = headOf(steps.map(st => st.label), k, stepT)[o] - STEP.headGap;
    return set && above + STEP.detailGap + set.lines * px * 1.3 <= WIN_SH[o];
  };
  for (const [k, st] of steps.entries()) {
    if (st.detail && !['landscape', 'portrait'].every(o => detailSizes[o].some(px => roomFor(k, o, px)))) st.detail = null;
  }
  const detailT = Object.fromEntries(['landscape', 'portrait'].map(o => [o, detailSizes[o].find(px => steps.every((st, k) => !st.detail || roomFor(k, o, px)))]));

  // the problem and the result are said and set as kinetic type, each word rising as it is spoken,
  // over a diagram drawn from the page: the problem's picture, and the route that removes it
  const lineOf = beat => u.narration.lines.find(l => l.beat === beat).text;
  const kinetic = beat => {
    const text = redact(lineOf(beat)), type = sayType(text);
    if (!type) fail(u.slug, `its ${beat} line does not set in either frame: shorten it`);
    return { text, type };
  };
  const problem = { ...kinetic('problem'), diagram: diagramOf(u.narration.motif, 'problem', u.slug) };
  const result = { ...kinetic('result'), diagram: diagramOf(u.narration.flow, 'result', u.slug) };
  for (const panel of [problem, result]) fitPanel(panel, panel.diagram, u.slug);

  const code = { landscape: fitL.px, portrait: fitP.px };
  const code_lines = { landscape: fitL.lines, portrait: fitP.lines };
  const titleT = titleType(title);
  return {
    slug: u.slug,
    url: u.url,
    link: u.narration.lines.find(l => l.beat === 'close').text,
    kicker: redact(u.kicker),
    title,
    marks: [...new Set(u.logos.map(markFor).filter(Boolean))],
    problem, result,
    steps: steps.map(st => ({
      ...st,
      breaks: { landscape: labelSet(st.label, 'landscape', stepT.landscape).breaks, portrait: labelSet(st.label, 'portrait', stepT.portrait).breaks },
      detail: st.detail && { text: st.detail, breaks: { landscape: detailSet(st.detail, 'landscape', detailT.landscape).breaks, portrait: detailSet(st.detail, 'portrait', detailT.portrait).breaks } },
    })),
    window: { shell: win.shell, title: win.title && redact(win.title), lines: code_lines, roll, answer: fallbackOf(u), code },
    type: { title: titleT, step: stepT, detail: detailT, breaks: { landscape: titleSet(title, 'landscape', titleT.landscape).breaks, portrait: titleSet(title, 'portrait', titleT.portrait).breaks } },
  };
}

// ── timing ─────────────────────────────────────────────────────────────────
// Times are kept in tenths of a second: three frames, so every beat lands on a frame.
const tenths = s => Math.round(s * 10) / 10;
// Typing reads as typing at this pace, never slower than a comfortable typist.
const TYPE_EACH = 0.05, TYPE_MAX = 1.4, LINE_PAUSE = 0.3;
// The camera travels between beats for TRAVEL seconds, half before the beat starts and half after
// (MOTION.md: 33 to 39 frames); a beat's voice starts once the camera has arrived.
export const TRAVEL = 1.2;
const VOICE_AT = { intro: 0.6, problem: 0.55, step: 0.55, result: 0.7, close: 0.8 };
// A step reads for this long at least; the beat after its last word before the next one comes.
const STEP_MIN = 2.2, AFTER = 0.6;
// A step's second line follows its first after a breath.
const MORE_GAP = 0.2;
// The window has settled before its code is typed; the lockup holds once the link is said.
const TYPE_AT = 1.0, END_HOLD = 2.0, END_MIN = 4.5;

/** A film's voiced lines: { intro, problem, steps: [{ line, more }], result, close }. */
export function voiceOf(u) {
  if (!u.narration) fail(u.slug, 'no script in videos/use-case/narration.json');
  const voiced = u.narration.lines.map(l => voicedLine(u.narration, l));
  const one = beat => voiced.find(l => l.beat === beat);
  const steps = voiced.filter(l => l.beat === 'step' && !l.more).map(line => ({ line, more: voiced.find(l => l.more && l.step === line.step) ?? null }));
  return { intro: one('intro'), problem: one('problem'), steps, result: one('result'), close: one('close') };
}
const spoken = line => line.words.at(-1).end;
// A line that says the headline again, give or take its small words, needs no caption under it.
const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'to', 'of', 'with', 'for', 'on', 'in', 'through']);
export const restates = (line, title) => {
  const words = t => t.toLowerCase().match(/[a-z0-9/]+/g).filter(w => !SMALL.has(w));
  const said = words(line), shown = new Set(words(title));
  return said.filter(w => shown.has(w)).length >= 0.75 * said.length;
};
const typingOf = lines => {
  const chars = lines.reduce((n, l) => n + [...l.text].length, 0);
  const each = chars ? Math.min(TYPE_EACH, TYPE_MAX / chars) : 0;
  return { each, dur: chars * each + Math.max(0, lines.length - 1) * LINE_PAUSE };
};

/**
 * When everything happens, set by the voice. The film is five panels the camera
 * travels between: what this is, the problem, the steps, the result, the short
 * link. Each beat holds while its line is said. Each step holds while its line,
 * and the line that explains it, are said; the window comes in with the first
 * step that shows it and stays while the next steps do. On an `install` step
 * its lines before the command are typed, on the `command` step the command
 * (and, with no install step, the lines before it), and the roll or the answer
 * comes on the `result` step, or after the command when there is none. A film
 * shorter than FILM.min holds its last window step longer, where a tint points
 * out the lines it changes.
 */
export function storyOf(u, pools) {
  const copy = copyOf(u, pools), voice = voiceOf(u);
  const { roll, answer, shell } = copy.window;
  const has = shows => copy.steps.some(st => st.shows === shows);
  // the frames type the same code, set in rows of their own: the one with more rows types longer
  const groupsOf = set => {
    const typed = set.filter(l => shell || l.focus), at = Math.max(0, typed.findIndex(l => l.focus));
    return has('install') ? { pre: typed.slice(0, at), cmd: typed.slice(at) } : { pre: [], cmd: typed };
  };
  const sets = ['landscape', 'portrait'].map(o => groupsOf(copy.window.lines[o]));
  const groups = sets[1];
  const pre = typingOf(groups.pre), cmd = typingOf(groups.cmd);
  for (const g of sets) { pre.dur = Math.max(pre.dur, typingOf(g.pre).dur); cmd.dur = Math.max(cmd.dur, typingOf(g.cmd).dur); }
  const each = Math.max(pre.each, cmd.each) || TYPE_EACH;
  const rolling = roll ? roll.ids.length * ROLL_EVERY : 0;

  // each step, in seconds from its start: how long it needs, and what lands in it
  const plan = copy.steps.map((st, k) => {
    const v = voice.steps[k], first = VOICE_AT.step + spoken(v.line), lands = { moreAt: v.more ? first + MORE_GAP : null };
    const said = v.more ? lands.moreAt + spoken(v.more) : first;
    // a step with no window holds until its page sentence is read
    // a step with no window holds while its page sentence is read, up to a couple of seconds past its voice
    let need = Math.max(STEP_MIN, said + AFTER, st.detail ? Math.min(VOICE_AT.step + 0.4 + read(st.detail.text), said + AFTER + 2.0) : 0);
    if (st.shows === 'install') { lands.preAt = TYPE_AT; need = Math.max(need, TYPE_AT + pre.dur + 0.6); }
    if (st.shows === 'command') {
      lands.cmdAt = TYPE_AT;
      const typedEnd = TYPE_AT + cmd.dur;
      need = Math.max(need, typedEnd + Math.max(roll ? 0.8 : 1.2, read(groups.cmd.map(l => l.text).join(' ')) - cmd.dur));
      if (!has('result')) {
        if (roll) { lands.rollAt = typedEnd + 0.5; need = Math.max(need, lands.rollAt + rolling + 0.4); }
        if (answer) { lands.answerAt = typedEnd + 0.6; need = Math.max(need, lands.answerAt + read(answer)); }
      }
    }
    if (st.shows === 'result') {
      const at = VOICE_AT.step + 0.6;
      if (roll) { lands.rollAt = at; need = Math.max(need, at + rolling + 0.4); }
      if (answer) { lands.answerAt = at; need = Math.max(need, at + read(answer)); }
    }
    // once all in it is said and shown, a tint points out the lines the page changes until it ends
    if (st.shows) lands.pointAt = Math.max(said, lands.rollAt != null ? lands.rollAt + rolling : 0, lands.answerAt != null ? lands.answerAt + 0.8 : 0, lands.cmdAt != null ? TYPE_AT + cmd.dur : 0) + 0.2;
    return { need, lands };
  });
  const intro = Math.max(3.4, VOICE_AT.intro + spoken(voice.intro) + AFTER, read(copy.title) + 0.6);
  // the problem's picture is complete on its last word, and holds to be read
  const problem = Math.max(3.6, VOICE_AT.problem + spoken(voice.problem) + AFTER + 0.9);
  // the result holds while the request runs its route, and a beat after
  let result = Math.max(5.2, VOICE_AT.result + spoken(voice.result) + AFTER + 1.2);
  const close = Math.max(END_MIN, VOICE_AT.close + spoken(voice.close) + END_HOLD);
  // A short film holds its last window step longer, where the tint points out the lines it changes,
  // and its result, where the request runs its route: the beats that keep moving without a word.
  const extra = Math.max(0, FILM.min - (intro + problem + plan.reduce((t, p) => t + p.need, 0) + result + close));
  plan[copy.steps.map(st => !!st.shows).lastIndexOf(true)].need += extra / 2;
  result += extra / 2;

  const beats = [{ key: 'intro', start: 0, dur: tenths(intro) }];
  const next = (key, dur) => beats.push({ key, start: tenths(beats.at(-1).start + beats.at(-1).dur), dur: tenths(dur) });
  next('problem', problem);
  for (const [k, p] of plan.entries()) next(`step-${k + 1}`, p.need);
  next('result', result);
  const end = tenths(beats.at(-1).start + beats.at(-1).dur);
  const duration = Math.max(FILM.min, tenths(end + close));
  if (duration > FILM.max) fail(u.slug, `the film needs ${duration}s (max ${FILM.max})`);
  beats.push({ key: 'close', start: end, dur: tenths(duration - end) });

  const S0 = 2; // the beat index of step 1
  const at = (k, t) => (t == null ? null : +(beats[k + S0].start + t).toFixed(2));
  const pick = key => plan.map((p, k) => at(k, p.lands[key])).find(t => t != null) ?? null;
  const beatAt = key => beats.find(b => b.key === key).start;
  // a line on screen as kinetic type is its own caption; the others are captioned under the picture
  const said = [
    { ...voice.intro, at: VOICE_AT.intro, cap: !restates(voice.intro.text, copy.title) },
    { ...voice.problem, at: +(beatAt('problem') + VOICE_AT.problem).toFixed(2), cap: false },
    ...voice.steps.flatMap((v, k) => [
      { ...v.line, at: at(k, VOICE_AT.step), cap: false },
      ...(v.more ? [{ ...v.more, at: at(k, plan[k].lands.moreAt), cap: true }] : []),
    ]),
    { ...voice.result, at: +(beatAt('result') + VOICE_AT.result).toFixed(2), cap: false },
    { ...voice.close, at: +(end + VOICE_AT.close).toFixed(2), cap: false },
  ];
  const winSteps = copy.steps.map((st, k) => (st.shows ? k : -1)).filter(k => k >= 0);
  const word = line => line.words.map(w => +(line.at + w.start).toFixed(2));
  return {
    copy, beats, duration, said,
    timing: {
      travel: TRAVEL,
      intro: { at: 0, voiceAt: VOICE_AT.intro },
      problem: { at: beatAt('problem'), words: word(said[1]) },
      steps: copy.steps.map((st, k) => ({ at: beats[k + S0].start, voiceAt: at(k, VOICE_AT.step), words: word(said.find(l => l.id === voice.steps[k].line.id)), shows: st.shows ?? null })),
      result: { at: beatAt('result'), words: word(said.find(l => l.beat === 'result')) },
      windowIn: beats[winSteps[0] + S0].start, windowOut: beats[winSteps.at(-1) + S0 + 1].start,
      each: +each.toFixed(4), linePause: LINE_PAUSE,
      preAt: pick('preAt'), cmdAt: pick('cmdAt'), typing: +(pre.dur + cmd.dur).toFixed(2),
      rollAt: pick('rollAt'), answerAt: pick('answerAt'), pointAt: plan.map((p, k) => at(k, p.lands.pointAt)).filter(t => t != null).at(-1),
      end,
    },
  };
}

// ── the camera ─────────────────────────────────────────────────────────────

// ── identity ───────────────────────────────────────────────────────────────
const stable = v => (Array.isArray(v) ? `[${v.map(stable).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
  : JSON.stringify(v ?? null));
/** The facts a film and its release notes are cut from, and what it says. Fields the film never shows (hook, problem, notes) are left out. */
const filmed = (u, pools) => ({
  slug: u.slug, url: u.url, kicker: u.kicker, title: u.title, summary: u.summary, logos: u.logos,
  window: u.command && windowOf(u), roll: rollOf(u, pools),
  // only a film that shows a fallback carries one, so the others keep their identity
  ...(fallbackOf(u) && { answer: fallbackOf(u) }),
  said: u.narration ? u.narration.lines.map(l => l.text) : null,
  steps: u.steps,
});

/**
 * Each use case with what its film says, from narration.json: its lines, how
 * words are spoken, and the voice. A page with no script yet has none, and its
 * film fails to build until it is written.
 */
export function narrate(useCases, narration = loadNarration()) {
  return useCases.map(u => ({
    ...u,
    narration: narration.films[u.slug] ? { voice: narration.voice, say: narration.say, lines: scriptOf(narration, u.slug, u.link), motif: narration.films[u.slug].motif, flow: narration.films[u.slug].flow } : null,
  }));
}
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
    const said = narrate(useCases);
    for (const u of said) console.log(`  ${u.slug.padEnd(32)} ${u.narration ? '' : '(no script) '}${u.title}`);
    console.log(`  roll: ${pools.credit.join(', ')} · free: ${pools.free.join(', ')}`);
    return releaseOf(said, pools);
  },

  split: data => data.useCases.map(u => releaseOf([u], data.pools)),

  film(data, { board = boardOf(one(data).group) } = {}) {
    const u = one(data);
    const story = storyOf(u, data.pools);
    return {
      title: u.title,
      duration: story.duration,
      slug: u.slug,
      // the voice, each line where the story puts it; the music steps down under its words (mix.mjs)
      said: story.said.map(l => ({ id: l.id, file: l.file, at: l.at, speaks: +(l.at + l.words[0].start).toFixed(2), dur: +(l.words.at(-1).end - l.words[0].start).toFixed(2) })),
      css: CSS,
      beats: story.beats,
      scenes: [{ ...filmScene(story, board), id: 's01-film', key: 'film', start: 0, dur: story.duration }],
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
