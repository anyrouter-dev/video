/**
 * scenes: the one shot a use-case film is, and the type measurements that
 * decide how each fact is set.
 *
 * A film is one sub-composition in three beats (see kind.mjs). The headline is
 * the shared element: set large for the outcome, it shrinks into the caption
 * over the code, then settles above the lockup. The look is frame.md v3,
 * Monolith: one object fills each beat, entrances ease out (expo.out), exits
 * and the moves between beats are weighty (power4.inOut). Within a beat the
 * camera drifts at an even speed: an eased drift comes to rest, and a frame at
 * rest reads as dead air.
 *
 * Every size has a landscape value and a portrait value (CSS vars --fs and
 * --fs-p); the portrait one applies under `@media (orientation: portrait)`.
 * Sizes are picked by measuring the text against the frame with Geist's own
 * advance widths, so a headline that is "two lines" is two lines. Where things
 * sit is worked out in the page once the fonts are in, from the boxes the
 * layout gives them, so one timeline drives both renditions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SHARED } from '../../lib/paths.mjs';
import { esc, C } from './project.mjs';
import { markFor } from '../../lib/marks.mjs';
import { PORTRAIT_CAPTION_BAND, PORTRAIT_SAFE } from '../../shared/authoring/portrait.mjs';
import { fitRows } from '../../shared/authoring/portrait-fill.mjs';

// ── reading pace ────────────────────────────────────────────────────────────
export const READ_WPS = 3.5;
// A word has a letter or a digit in it: an arrow or a bullet is not read.
export const wordCount = s => String(s ?? '').split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
/** Seconds to read `text`: its words at `wps` words a second, plus a beat to find it. */
export const read = (text, wps = READ_WPS) => wordCount(text) / wps + 1;

// ── measuring type ─────────────────────────────────────────────────────────
// Geist advance widths in 1/1000 em for printable ASCII (32..126), taken from
// shared/fonts/geist.woff2 at wght 400 and 600. Geist Mono advances 600 for every glyph.
const ADVANCE = {
  400: '250,213,346,478,629,802,620,178,274,274,430,558,201,419,201,480,663,384,619,613,615,626,593,524,604,593,297,297,544,540,544,559,906,668,680,703,694,603,590,700,713,270,597,640,580,877,743,739,650,733,672,640,552,689,667,945,606,576,544,347,455,347,426,557,248,551,595,546,595,561,395,594,581,244,260,590,267,877,581,573,595,595,379,520,392,575,536,819,585,537,537,389,264,389,523',
  600: '236,243,376,552,656,818,677,195,306,306,424,566,225,418,225,508,683,427,642,637,643,656,615,538,644,618,306,306,548,548,548,581,944,709,695,724,708,615,600,726,719,290,617,672,586,902,748,763,664,757,689,668,584,699,709,991,660,613,577,375,485,375,450,560,268,580,621,580,621,591,429,620,601,269,308,628,297,892,601,603,621,621,409,553,427,597,584,839,628,570,567,401,284,401,523',
};
const TABLE = Object.fromEntries(Object.entries(ADVANCE).map(([w, s]) => [w, s.split(',').map(Number)]));
const WIDEST = 1000; // anything outside ASCII is measured as a full em: an overestimate is safe
const em = (ch, weight) => {
  const c = ch.codePointAt(0);
  if (weight === 'mono') return 0.6;
  const at = w => (c >= 32 && c < 127 ? TABLE[w][c - 32] : WIDEST) / 1000;
  return weight === 500 ? (at(400) + at(600)) / 2 : at(weight);
};

/** How wide `text` is set at `px`, in px. */
const widthOf = (text, { px, weight = 400, tracking = 0 }) => [...text].reduce((sum, ch) => sum + em(ch, weight) + tracking, 0) * px;

/** How many lines `text` takes at `px` in a box `width` wide, breaking at spaces as the browser does. */
export function linesOf(text, { px, width, weight = 400, tracking = 0, breakWords = true }) {
  const wide = w => widthOf(w, { px, weight, tracking });
  const space = (em(' ', weight) + tracking) * px;
  let lines = 1, x = 0;
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    const ww = wide(w);
    if (!breakWords && ww > width) return Infinity;
    if (x > 0 && x + space + ww > width) { lines++; x = 0; }
    x += (x > 0 ? space : 0) + ww;
    // a token wider than the line is broken anywhere (overflow-wrap)
    while (x > width) { lines++; x -= width; }
  }
  return lines;
}

// The boxes text is set in, in px of each frame: the safe area across, a hair
// under, since kerning can set a line a little wider than its advances. The
// headline breaks where titleSet says and nowhere else.
const SAFE = { landscape: 1728 * 0.99, portrait: 900 * 0.99 };

/** Type for each text role: sizes to try, the box, the line budget, per orientation. */
export const TYPE = {
  title: { weight: 600, tracking: -0.055,
    landscape: { sizes: [184, 176, 168, 160, 152, 144], width: SAFE.landscape, lines: 3 },
    portrait: { sizes: [168, 160, 152, 148, 140, 132, 124, 120], width: SAFE.portrait, lines: 6 } },
  // a step's label sits beside its marker (STEP.mark), so its box is the safe width less the marker and the gap
  step: { weight: 600, tracking: -0.035,
    landscape: { sizes: [120, 112, 104, 96, 88, 80, 72], width: SAFE.landscape - 96 - 36, lines: 2 },
    portrait: { sizes: [88, 80, 72, 64, 56], width: SAFE.portrait - 96 - 36, lines: 3 } },
};
TYPE.detail = { weight: 400, tracking: -0.01,
  landscape: { sizes: [56, 52, 48, 44, 40, 36], width: TYPE.step.landscape.width, lines: 3 },
  portrait: { sizes: [52, 48, 44, 40], width: TYPE.step.portrait.width, lines: 7 } };
// A step: its marker and label beside it, active; a step done shrinks to a row at STEP.done of its size.
// The page's own sentence for a step sits under its label, indented to it, until the step is done.
export const STEP = { mark: 96, gap: 36, lh: 1.04, done: 0.5, rowGap: 18, headGap: 40, detailGap: 28 };

// The marks and the kicker over the headline in beat 1, as the CSS below sets them: tile, gap, kicker.
const TILE = { landscape: 160, portrait: 192 };
const HERO = { landscape: TILE.landscape + 40 + 80, portrait: TILE.portrait + 40 + 80 };

// A word that is part of a name. Past the first word, any capitalised word; the first word only
// with a capital past its first letter, since "Run" opens a sentence and "NVIDIA" names a company.
const named = (w, i) => (i > 0 ? /^[A-Z0-9]/ : /^[A-Z0-9].*[A-Z]/).test(w);

/**
 * Where `text` breaks into lines at `px` in a box `width` wide: { lines, breaks },
 * where breaks are the word indices that start a line. Its fewest lines, as
 * even as they come, and never between two words of a name ("Claude Code",
 * "OpenAI SDK") when another set of breaks fits, taking one more line if it
 * has to. The browser's balancing knows no names, and takes extra lines to even
 * them out. `room(n)` says whether n lines fit. Null when nothing fits: a word
 * wider than the line (a word sits in its own mask, which never breaks), or no
 * line count with room.
 */
function breakSet(text, { px, width, weight, tracking, room }) {
  const words = text.split(/\s+/).filter(Boolean);
  const fewest = linesOf(text, { px, width, weight, tracking, breakWords: false });
  const wide = (a, b) => widthOf(words.slice(a, b).join(' '), { px, weight, tracking });
  // a break inside parentheses cuts a command or an aside in two, as costly as a split name
  const open = words.map((_, k) => words.slice(0, k).join(' ').split('(').length - words.slice(0, k).join(' ').split(')').length);
  const splits = k => (named(words[k - 1], k - 1) && named(words[k], k) && !/[,.:;]$/.test(words[k - 1]) ? 1 : 0) + (open[k] > 0 ? 1 : 0);
  // a split name costs more than an extra line, and an extra line more than any unevenness
  let best = null;
  const walk = (from, left, starts) => {
    if (left === 1) {
      const cuts = [0, ...starts, words.length], widths = cuts.slice(1).map((b, i) => wide(cuts[i], b));
      if (widths.some(x => x > width)) return;
      const most = Math.max(...widths);
      const cost = starts.reduce((c, k) => c + splits(k), 0) * 1e12 + (starts.length + 1 - fewest) * 1e9
        + widths.reduce((c, x) => c + (most - x) ** 2, 0);
      if (!best || cost < best.cost) best = { cost, starts };
      return;
    }
    for (let k = from + 1; k <= words.length - left + 1; k++) walk(k, left - 1, [...starts, k]);
  };
  for (const n of [fewest, fewest + 1].filter(room)) walk(0, n, []);
  return best && { lines: best.starts.length + 1, breaks: best.starts, splits: best.cost >= 1e12 };
}

/** How the headline is set at `px` in frame `o` (see breakSet): beat 1 fits the safe area once the camera has leaned in. */
export function titleSet(text, o, px) {
  const t = TYPE.title, w = WIN[o];
  return breakSet(text, { px, width: t[o].width, weight: t.weight, tracking: t.tracking, room: n => n <= t[o].lines && HERO[o] + w.gap + n * px * TITLE_LH <= w.sh / w.lean });
}

/** The headline's size per frame: the largest that sets without splitting a name, else the largest that sets. */
export const titleType = text => Object.fromEntries(['landscape', 'portrait'].map(o => [o, TYPE.title[o].sizes.find(px => titleSet(text, o, px) && !titleSet(text, o, px).splits) ?? TYPE.title[o].sizes.find(px => titleSet(text, o, px))]));

/** How a step's label is set at `px` in frame `o`, beside its marker, in at most two lines. */
export function labelSet(text, o, px) {
  const t = TYPE.step;
  return breakSet(text, { px, width: t[o].width, weight: t.weight, tracking: t.tracking, room: n => n <= t[o].lines });
}

/** How a step's detail, the page's own sentence for it, is set at `px` in frame `o`. */
export function detailSet(text, o, px) {
  const t = TYPE.detail;
  return breakSet(text, { px, width: t[o].width, weight: t.weight, tracking: t.tracking, room: n => n <= t[o].lines });
}
/** One size for every step detail of a film, per frame. */
export const detailType = texts => Object.fromEntries(['landscape', 'portrait'].map(o => [o, TYPE.detail[o].sizes.find(px => texts.every(d => detailSet(d, o, px)))]));

/** One size for every step label of a film, per frame: the largest at which each sets. */
export const stepType = labels => Object.fromEntries(['landscape', 'portrait'].map(o => [o, TYPE.step[o].sizes.find(px => labels.every(l => labelSet(l, o, px)))]));

/** Whether the headline can be set at some size in both frames. */
export const setIn = text => ['landscape', 'portrait'].every(o => TYPE.title[o].sizes.some(px => titleSet(text, o, px)));
const fsVars = (fs_, name = 'fs') => `--${name}:${fs_.landscape}px;--${name}-p:${fs_.portrait}px`;

// The code window sits under the step that shows it, in the safe area's height (`sh`) left below the
// steps above it. The camera leans in over beat 1 (`lean`) and dollies in over the steps, which grows
// the window by `push` about its middle, so the window is sized to stay in the safe area at full scale.
// A line of code is one row, so the longest line sets how small its code may go. Portrait has the
// least room: its window is as wide as stays inside the safe width leaned and dollied in, and sets its
// code a hair tighter (`adv` is a glyph's advance in em), which fits the API's 45-character URL whole
// at 32px, the floor: code goes under 40px only where a whole token needs the row. Portrait's safe
// height runs from y 200 to the caption band (PORTRAIT_SAFE).
const WIN = {
  landscape: { sizes: [56, 52, 48, 44, 40], width: 1728, padX: 48, padTop: 40, padBottom: 44, sy: 64, sh: 836, gap: 56, lean: 1.02, pushMax: 1.02, adv: 0.6 },
  portrait: { sizes: [56, 52, 48, 44, 40, 36, 32], width: 900, padX: 16, padTop: 44, padBottom: 52, sy: PORTRAIT_SAFE.top, sh: PORTRAIT_SAFE.bottom - PORTRAIT_SAFE.top, gap: 48, lean: 1.015, pushMax: 1.01, adv: 0.57 },
};
// The camera's perspective, and how far the deep layer dollies in so the window grows by `pushMax` at most.
const PERSPECTIVE = 2000;
const dollyOf = o => +(PERSPECTIVE * (1 - 1 / WIN[o].pushMax)).toFixed(1);
// The safe area's height each frame's steps have: the camera is square to them.
export const WIN_SH = { landscape: WIN.landscape.sh, portrait: WIN.portrait.sh };
// The safe area across each frame. The window is drawn at its own size while it is up (see .flat).
const ACROSS = { landscape: { left: 96, width: 1728 }, portrait: { left: 60, width: 900 } };
/** The window's left and right edges. */
export function windowSpan(o) {
  const w = WIN[o], a = ACROSS[o], mid = a.left + a.width / 2;
  return { left: mid - w.width / 2, right: mid + w.width / 2 };
}
/** The text inside the window's padding. */
export function codeSpan(o) {
  const w = WIN[o], a = ACROSS[o], mid = a.left + a.width / 2, half = (w.width - EDGE - 2 * w.padX) / 2;
  return { left: mid - half, right: mid + half };
}
const winLeft = o => ACROSS[o].left + (ACROSS[o].width - WIN[o].width) / 2;
// the window's 2px border, both sides
const BAR = 72, EDGE = 4, CODE_LH = 1.45, TITLE_LH = 0.98;
// a couple of px short of the box, so rounding in the browser can never add a row
const textWidth = o => WIN[o].width - EDGE - 2 * WIN[o].padX - 2;
const indentOf = text => text.match(/^ */)[0].length;
// the caret, as .caret draws it
const caretWidth = px => 0.56 * px + 4;

/**
 * Rows `text` takes at `px` in frame `o`, wrapping only at spaces as the browser
 * does in a .ln: its first row starts `lead` characters in (a prompt), and
 * every row after it `hang` characters in. With `caret`, the caret sits after
 * the last token, inside it. Infinity when a token is wider than its row.
 */
export function rowsOf(text, px, o, { lead = 0, hang = 0, caret = false } = {}) {
  const adv = WIN[o].adv * px, room = textWidth(o) / adv + 1e-9, tail = caret ? caretWidth(px) / adv : 0;
  const parts = tokensOf(text), last = parts.findLastIndex(p => p.trim());
  let rows = 1, x = lead, start = lead;
  for (let i = 0; i < parts.length; i++) {
    if (i % 2) { x += parts[i].length; continue; }
    if (!parts[i]) continue;
    const w = parts[i].length + (i === last ? tail : 0);
    if (x + w > room) {
      // spaces at the end of a row hang past it; a token too wide for a fresh row never fits
      if (x - (parts[i - 1]?.length ?? 0) <= start) return Infinity;
      rows++; x = start = hang;
      if (x + w > room) return Infinity;
    }
    x += w;
  }
  return rows;
}

// A shell line's first row starts after its "$ " prompt; a row that continues a command has none.
const leadOf = (l, shell) => (shell && !l.cont ? 2 : 0);

/** Characters a row of code holds at `px` in frame `o`, and how many the caret takes. */
export const SIZES = { landscape: WIN.landscape.sizes, portrait: WIN.portrait.sizes };
export const codeCols = (o, px) => textWidth(o) / (WIN[o].adv * px);
export const caretCols = (o, px) => caretWidth(px) / (WIN[o].adv * px);

// Under a window whose command names a preset, a line says the same key runs other ids, and rolls
// through them: the request keeps the page's own model, so the window never reads as calling another.
export const ALSO = { gap: 24, h: 64, label: 'The same key also runs', px: { landscape: 36, portrait: 32 } };

/** Whether `id` sits beside the label on that line, on one row, in both frames. */
export function idFitsRow(id) {
  return Object.keys(WIN).every(o => widthOf(`${ALSO.label} `, { px: ALSO.px[o], weight: 500 }) + [...id].length * 0.6 * ALSO.px[o] <= WIN[o].width - 8);
}

/**
 * The code size per frame. Every line of code sits on one row, with its prompt and caret: a line of code never wraps (reflow.mjs
 * rewrites one that is too wide). The code is the largest size at which it
 * does and the window fits the safe area under the step it shows on, `head[o]`
 * px of steps above it. `sizes` narrows the sizes a frame may take; with `only`, just that
 * frame's size. Null when none fits.
 */
export function codeSizes(lines, roll, shell, head, sizes = {}, only = null) {
  const isTyped = l => shell || l.focus;
  const oneRow = (px, o) => lines.every(l => rowsOf(l.text, px, o, { lead: leadOf(l, shell), caret: isTyped(l) }) === 1);
  const codeFor = o => {
    const w = WIN[o];
    // the camera stands square to the steps (lean 1) and the window stays out of its dolly, so it is drawn at its own size
    const room = px => EDGE + BAR + w.padTop + w.padBottom + lines.length * px * CODE_LH + (roll ? ALSO.gap + ALSO.h : 0) + head[o] <= w.sh;
    return (sizes[o] ?? w.sizes).find(px => oneRow(px, o) && room(px)) ?? null;
  };
  if (only) return codeFor(only);
  const l = codeFor('landscape'), p = codeFor('portrait');
  return l && p ? { landscape: l, portrait: p } : null;
}

/** How tall the steps above the window are, per frame, when step `k` (from 0) shows it: k steps done, then its own label. */
export function headOf(labels, k, type) {
  return Object.fromEntries(Object.keys(type).map(o => {
    const px = type[o], block = l => Math.max(STEP.mark, labelSet(l, o, px).lines * px * STEP.lh);
    const done = labels.slice(0, k).reduce((h, l) => h + block(l) * STEP.done + STEP.rowGap, 0);
    return [o, done + block(labels[k]) + STEP.headGap];
  }));
}

// ── pieces ─────────────────────────────────────────────────────────────────
/** Each word in its own mask, so it can rise into place. Escaped here. */
// The mask clips its word on purpose while the word rises, so the layout audit is told so.
// A line of the headline starts at each of `breaks` (word indices per frame, see titleSet).
const masked = (s, breaks = { landscape: [], portrait: [] }) => String(s).split(/\s+/).filter(Boolean)
  .map((w, i) => `${breaks.landscape.includes(i) ? '<br class="bl">' : ''}${breaks.portrait.includes(i) ? '<br class="bp">' : ''}<span class="w" data-layout-allow-overflow><span>${esc(w)}</span></span>`).join(' ');
const mark = (f, cls = 'mk') => `<span class="${cls}" style="background-image:url('assets/providers/${esc(f)}')"></span>`;
const LOGO = fs.readFileSync(path.join(SHARED, 'assets/brand/anyrouter-logo-currentcolor.svg'), 'utf8')
  .replace(/<\?xml[^>]*>/, '').replace(/\s*\n\s*/g, ' ').trim();
const PLUS = '<svg class="plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

// A model id inside a line of code (anyrouter/free, "google/gemma-4-31b:free") is
// the one accent in the window. Not a path or a URL: nothing word-like before it.
const MODEL_ID = /(?<![\w/.:~-])[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9.:[\]-]*/gi;

const spans = (text, re) => {
  const at = new Set();
  for (const m of text.matchAll(re)) for (let i = m.index; i < m.index + m[0].length; i++) at.add(i);
  return at;
};

/**
 * A line of code as its tokens and the spaces between them: [token, gap, token, …],
 * the first token empty when the line is indented. A row ends only at a gap, so
 * a token is never cut. A pipe stays with the command it feeds, and a closing
 * "\" with the word before it, so neither sits on a row alone.
 */
export const tokensOf = text => String(text).split(/(?<!(?:^| )\|)( +)(?!\\$)/);

/** Characters as spans a typist reveals one by one; in the command, model ids in the accent, since the id is what arrives there. */
function typedChars(text, focus) {
  const accents = focus ? spans(text, MODEL_ID) : new Set();
  return (s, at) => [...s].map((ch, k) => `<span class="c${accents.has(at + k) ? ' m' : ''}">${esc(ch)}</span>`).join('');
}

const CARET = '<span class="caret"></span>';

/**
 * One typed line, its tokens each in a box that never breaks inside: a model id
 * cut at "gemma-4-" reads as two things. In the focus line of a roll, the
 * preset is a slot holding every id, stacked, the first typed with the line.
 */
function typedLine(line) {
  const chars = typedChars(line.text, line.focus);
  const parts = tokensOf(line.text);
  // the caret sits in the last token, after its last character: after the token, it takes a row of its own once the token wraps
  const last = parts.findLastIndex(p => p.trim());
  if (last < 0) return `${chars(line.text, 0)}${CARET}`;
  let i = 0;
  return parts.map((part, n) => {
    const at = i, caret = n === last ? CARET : '';
    i += part.length;
    if (!part.trim()) return chars(part, at);
    return `<span class="tok">${chars(part, at)}${caret}</span>`;
  }).join('');
}

/** A line shown whole as it is, its tokens boxed as a typed line's are, so it wraps where codeSizes measured it. */
const wholeLine = text => tokensOf(text).map(part => (part.trim() ? `<span class="tok">${esc(part)}</span>` : esc(part))).join('');

// The window's bar holds its title on one row between the dots and as much room again, or not at all.
const TTL_PX = 36, TTL_PAD = 110;
const ttlFits = (title, o) => [...title].length * 0.6 * TTL_PX <= WIN[o].width - EDGE - 2 * TTL_PAD;

/**
 * The window: a terminal for shell commands, an editor for a line of code. An
 * answer waits under the last row, hidden, until the code scrolls up to it, so
 * the window is sized by its code alone. Every line is shown whole: a row ends
 * only at a space, and the sizes in `code` leave every token its row.
 */
function windowHtml(win) {
  const { shell, title, lines, roll, answer, code } = win;
  const cls = [shell ? 'sh' : 'ed', answer && 'ans'].filter(Boolean).join(' ');
  // each line is one row (codeSizes): the audit holds it to that with data-one-row
  const rowsOf = set => set.map(l => {
    const cls = `ln${l.cont ? ' cont' : ''}`;
    if (shell || l.focus) return `<div class="${cls} typed${l.focus ? ' focus' : ''}" data-one-row>${typedLine(l)}</div>`;
    return `<div class="${cls} ${l.keep ? 'keep' : 'ctx'}" data-one-row>${wholeLine(l.text)}</div>`;
  }).join('');
  // the value the header reads is the id that answered, so it takes the accent
  const value = answer && answer.indexOf(': ') + 2;
  const out = answer ? `<div class="ln out" data-layout-allow-overflow>${esc(answer.slice(0, value))}<span class="m">${esc(answer.slice(value))}</span></div>` : '';
  const ttl = title && ['landscape', 'portrait'].filter(o => !ttlFits(title, o)).map(o => ` off-${o[0]}`).join('');
  // each frame sets the code as fits it: the lines landscape shows, and portrait's, rewritten narrower where they must be
  // the ids the same key runs roll in beside the label, each read whole, never typed
  const also = roll ? `<div class="also"><span class="al">${esc(ALSO.label)}</span> <span class="roll mono" data-layout-allow-overlap>${roll.ids.map(id => `<em class="ri m" data-layout-allow-overlap>${esc(id)}</em>`).join('')}</span></div>` : '';
  return `<div class="win"><div class="term ${shell ? 'is-ink' : 'card'}">
      <div class="bar"><span class="dots"><i></i><i></i><i></i></span>${title ? `<span class="ttl${ttl}">${esc(title)}</span>` : ''}</div>
      <div class="code ${cls}" style="${fsVars(code, 'cs')}"><div class="rows rl">${rowsOf(lines.landscape)}${out}</div><div class="rows rp">${rowsOf(lines.portrait)}${out}</div></div></div>${also}</div>`;
}

// ── captions ───────────────────────────────────────────────────────────────
// The narration on screen, as the series' explainer sets it: one phrase at a time, whole, white
// Geist on an ink chip in the band under the picture, never over it. A phrase sits on one row in
// both frames; portrait's is the narrower, so it decides where a phrase ends.
export const CAP = {
  landscape: { px: 52, top: 924, height: 120 },
  portrait: { px: 60, top: PORTRAIT_CAPTION_BAND.top, height: PORTRAIT_CAPTION_BAND.height },
  padX: 28, room: { landscape: 1920 * 0.84, portrait: 900 }, say: 2.0,
};
const capFitsAt = (text, o, px) => widthOf(text, { px, weight: 500, tracking: -0.005 }) <= CAP.room[o] - 2 * CAP.padX - 4;
const capFits = text => ['landscape', 'portrait'].every(o => capFitsAt(text, o, CAP[o].px));
// a lone word wider than the chip (a short link) is set smaller, down to the 32px floor
const capPx = (text, o) => [CAP[o].px, 56, 52, 48, 44, 40, 36, 32].filter(px => px <= CAP[o].px).find(px => capFitsAt(text, o, px)) ?? 32;
// a word that is part of a name, as named() reads one: past a sentence's first word, any capitalised word
// pairs read as one term, so a phrase never ends between them
const BOUND = /^(base URL|API key|AnyRouter key|decision model|free model|request logs?|rate limited|typed answer|more than|model id|catalog id)[,.]?$/i;
const HANGING = /^(a|an|the|to|of|its|your|by|on|in|for|with|and|or|at|from|than|that)$/i;
const isName = (w, first) => (first ? /^[A-Z0-9].*[A-Z]/ : /^[A-Z0-9]/).test(w);

/**
 * The narration's phrases with their times on the film's clock. A sentence, or
 * a stretch of one between pauses, is one phrase when it sits on one row;
 * otherwise it is cut into the fewest phrases that do, as even as they come,
 * after a comma where one is, never between two words of a name or after a
 * small word that leads into the next. Each shows
 * from its first word until its last is said, held a beat.
 */
export function captionsOf(said = []) {
  const words = said.flatMap((line, l) => line.words.map((w, k) => ({ text: w.text, at: line.at + w.start, end: line.at + w.end, line: l, first: k === 0 })));
  // stretches: a line's sentences, cut again at a pause
  const stretches = [];
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const fresh = !prev || prev.line !== w.line || /[.!?]["')]*$/.test(prev.text) || w.at - prev.end > 0.35;
    if (fresh) stretches.push([]);
    stretches.at(-1).push({ ...w, sentenceStart: fresh });
  });
  const width = ws => widthOf(ws.map(w => w.text).join(' '), { px: CAP.portrait.px, weight: 500, tracking: -0.005 });
  // a phrase is said in at most CAP.say seconds: a caption that sits longer reads as a still frame
  const ok = ws => ws.length === 1 || (ws.length <= 6 && ws.at(-1).end - ws[0].at <= CAP.say && capFits(ws.map(w => w.text).join(' ')));
  const phrases = stretches.flatMap(ws => {
    // the cut that holds: no name split, no phrase hanging on a small word, the fewest phrases, then commas, then the most even
    let best = null;
    const walk = (from, cuts) => {
      if (from === ws.length) {
        const parts = [0, ...cuts].map((c, i, a) => ws.slice(c, a[i + 1] ?? ws.length));
        // a command stays whole too: "anyr claude" is one thing to type
        const named = cuts.filter(c => (!/[,;:]$/.test(ws[c - 1].text) && isName(ws[c - 1].text, ws[c - 1].sentenceStart) && isName(ws[c].text, false))
          || ws[c - 1].text === 'anyr' || BOUND.test(`${ws[c - 1].text} ${ws[c].text}`)).length;
        const plain = cuts.filter(c => !/[,;:]$/.test(ws[c - 1].text)).length;
        // a phrase that ends on "the", "to" or "its" leaves its reader hanging
        const hanging = cuts.filter(c => HANGING.test(ws[c - 1].text)).length;
        const cost = named * 1e12 + hanging * 1e10 + parts.length * 1e9 + plain * 1e5 + Math.max(...parts.map(width)) - Math.min(...parts.map(width));
        if (!best || cost < best.cost) best = { cost, parts };
        return;
      }
      for (let to = from + 1; to <= ws.length; to++) if (ok(ws.slice(from, to))) walk(to, to < ws.length ? [...cuts, to] : cuts);
    };
    walk(0, []);
    return best ? best.parts : ws.map(w => [w]);
  });
  return phrases.map((p, i) => {
    const next = phrases[i + 1];
    const at = +(p[0].at - 0.05).toFixed(2);
    // held a beat past its last word, until the next phrase, and long enough to read
    const end = Math.min(next ? next[0].at - 0.05 : Infinity, Math.max(p.at(-1).end + 0.15, at + 0.8));
    const text = p.map(w => w.text).join(' ');
    return { text, at, end: +end.toFixed(2), px: { landscape: capPx(text, 'landscape'), portrait: capPx(text, 'portrait') } };
  });
}

// The link on the lockup sits on one row, in Geist, as large as fits the safe width; a link that
// fits no size fails the build: a link cut across rows reads as two addresses.
const URL_SIZES = { landscape: [48, 44, 40, 36, 32], portrait: [44, 40, 36, 32] }, URL_PAD = { landscape: 36, portrait: 20 };
// Landscape sets the headline and lockup beside the live page (.pagef, CLOSE.page px wide), the link under both.
const CLOSE = { page: 860, gap: 64 };
export function urlSet(link) {
  const set = o => {
    const room = ACROSS[o].width - 2 * URL_PAD[o] - 8, px = URL_SIZES[o].find(x => widthOf(link, { px: x, weight: 500, tracking: -0.01 }) <= room);
    if (!px) throw new Error(`the link ${link} does not sit on one row of the ${o} lockup`);
    return { text: link, px };
  };
  return { landscape: set('landscape'), portrait: set('portrait') };
}

// ── kinetic type and diagrams ──────────────────────────────────────────────
// The problem and the result are set as kinetic type: the line the voice says, each word rising
// as it is spoken. It is its own caption, so no caption chip runs under it.
TYPE.say = { weight: 600, tracking: -0.04,
  landscape: { sizes: [112, 104, 96, 88, 80, 72, 64, 60, 56], width: SAFE.landscape, lines: 3 },
  portrait: { sizes: [120, 112, 104, 100, 96, 92, 88, 84, 80, 76, 72, 68, 64, 60, 56], width: SAFE.portrait, lines: 5 } };

/** How a spoken line is set as kinetic type, per frame: { px, breaks, lines }, or null when it sets in neither. */
export function sayType(text) {
  const t = TYPE.say, out = {};
  for (const o of ['landscape', 'portrait']) {
    for (const px of t[o].sizes) {
      const set = breakSet(text, { px, width: t[o].width, weight: t.weight, tracking: t.tracking, room: n => n <= t[o].lines });
      if (set) { out[o] = { px, ...set }; break; }
    }
    if (!out[o]) return null;
  }
  return out;
}

// A diagram card: its label in Geist, or in Geist Mono when it is an id or a path. Sizes per frame,
// largest first; a card is as wide as its label, up to its column.
const NODE = { padX: 34, mark: 60, markGap: 20,
  landscape: { sizes: [64, 60, 56, 52, 48, 44, 40], mono: [52, 48, 46, 44, 40, 36, 34] },
  portrait: { sizes: [72, 66, 60, 56, 52, 48, 44, 40, 36], mono: [58, 54, 48, 44, 42, 40, 36, 34, 32] } };
// The room a diagram has across, per frame, and the gaps its edges take: a problem is two columns
// (what you have, what it costs you), a result three (your side, AnyRouter, what answers), across
// in landscape. Portrait stacks them down the frame, its tall side, except rows of pairs, which
// read across.
const ACROSS_DG = { landscape: 1720, portrait: 900 };
const GAPS = { problem: { landscape: 200, portrait: 60 }, result: { landscape: 220, portrait: 0 } };
// an id or a path is set in mono: no spaces, and a slash or a colon in it
// the tag on an edge: Geist Mono at TAG_PX in a pill (.tg)
const TAG_PX = 38, TAG_MARGIN = 96;
const tagWidth = tag => [...tag].length * 0.6 * TAG_PX + 2 * 22 + 6;
const isId = label => !/\s/.test(label) && /[/:]/.test(label);
const nodeWidth = (label, o, k, marked) => {
  const px = (isId(label) ? NODE[o].mono : NODE[o].sizes)[k];
  return widthOf(label, isId(label) ? { px, weight: 'mono' } : { px, weight: 600, tracking: -0.02 }) + 2 * NODE.padX + 4 + (marked ? NODE.mark + NODE.markGap : 0);
};

/**
 * A problem's picture or a result's route, from narration.json, as columns of cards and the
 * edges between them. A problem: `single` (one thing, the one thing it depends on, and a tag on
 * the edge or a word for how it fails), `rows` (each thing and what it costs), `sprawl` (one thing
 * fanning out to what it needs), `chips` (what you want, no edges). A result: your side, AnyRouter,
 * and what answers, the ones after the first dashed when they are fallbacks. Each card takes the
 * largest size at which every card of its diagram fits its column in both frames.
 */
export function diagramOf(spec, kind, slug) {
  if (!spec) throw new Error(`${slug}: narration.json has no ${kind === 'problem' ? 'motif' : 'flow'}`);
  let d;
  if (kind === 'result') d = { left: spec.left, right: spec.right, edges: 'via', fallback: !!spec.fallback, note: spec.note ?? null };
  else if (spec.kind === 'single') d = { left: [spec.a], right: [spec.b], edges: 'pairs', tag: spec.tag ?? null, fail: spec.fail ?? null };
  else if (spec.kind === 'rows') d = { left: spec.rows.map(r => r[0]), right: spec.rows.map(r => r[1]), edges: 'pairs' };
  else if (spec.kind === 'sprawl') d = { left: [spec.a], right: spec.rows, edges: 'fan' };
  else if (spec.kind === 'chips') d = { left: [], right: spec.items, edges: 'none' };
  else throw new Error(`${slug}: unknown motif "${spec.kind}"`);
  d = { tag: null, fail: null, fallback: false, note: null, ...d, kind };
  d.stack = kind === 'result' || spec.kind !== 'rows';
  d.tall = { left: false, right: false };
  const marks = l => !!markFor(l) && !isId(l);
  d.size = {};
  for (const o of ['landscape', 'portrait']) {
    const widest = (ls, i) => Math.max(0, ...ls.map(l => nodeWidth(l, o, i, marks(l))));
    const hub = i => (kind === 'result' ? nodeWidth('AnyRouter', o, i, true) : 0);
    const stacked = o === 'portrait' && d.stack;
    // a stacked result sets each side's cards in a row where one fits, else one under another
    const row = (ls, i) => ls.reduce((w, l) => w + nodeWidth(l, o, i, marks(l)), 0) + 18 * Math.max(0, ls.length - 1);
    const side = (ls, i, tall) => (tall ? widest(ls, i) : row(ls, i));
    // a tag sits on its edge, so the edge is at least as long as the tag and a margin each side
    const gap = Math.max(GAPS[kind][o], d.tag ? tagWidth(d.tag) + TAG_MARGIN : 0);
    const fits = (i, tall) => (stacked ? (kind === 'result' ? Math.max(side(d.left, i, tall), hub(i), side(d.right, i, tall)) : Math.max(widest(d.left, i), widest(d.right, i)))
      : widest(d.left, i) + hub(i) + widest(d.right, i) + gap) <= ACROSS_DG[o];
    let k = NODE[o].sizes.findIndex((_, i) => fits(i, false));
    if (k < 0 && stacked) {
      k = NODE[o].sizes.findIndex((_, i) => fits(i, true));
      if (k >= 0) d.tall = { left: row(d.left, k) > ACROSS_DG[o], right: row(d.right, k) > ACROSS_DG[o] };
    }
    if (k < 0) throw new Error(`${slug}: the ${kind} diagram is too wide for the ${o} frame: ${[...d.left, ...d.right].join(', ')}`);
    d.size[o] = { sans: NODE[o].sizes[k], mono: NODE[o].mono[k] };
  }
  d.marks = Object.fromEntries([...d.left, ...d.right].filter(marks).map(l => [l, markFor(l)]));
  return d;
}

// ── real screens ───────────────────────────────────────────────────────────
// A real screen is shown in a frame: a browser bar with the page's address for a page, a terminal
// bar with the command for its output. The bar's words are set at BAR_PX in one row in the narrowest
// frame; an address too long for it shows its host alone.
const BAR_PX = 32, BAR_ROOM = 900 - 2 * 28 - 120;
const fitsBar = t => widthOf(t, { px: BAR_PX, weight: 500 }) <= BAR_ROOM;
/** The words in a real screen's bar: its address without the scheme, or the command it ran. */
export function barOf(c) {
  if (c.kind === 'terminal') return fitsBar(`$ ${c.command}`) ? `$ ${c.command}` : c.command.split(' ').slice(0, 2).join(' ');
  // too long for the bar, it keeps its host and its last part, the elided middle marked
  const u = new URL(c.url), path = u.pathname.replace(/\/$/, ''), full = `${u.host}${path}${u.search}`;
  const short = `${u.host}/…/${path.split('/').at(-1)}`;
  return [full, `${u.host}${path}`, short].find(fitsBar) ?? u.host;
}
const frameHtml = (c, cls, img = `<img class="si" src="assets/captures/${esc(c.name)}" alt="">`) => `<div class="sf ${cls}${c.kind === 'terminal' ? ' tm' : ''}" data-layout-allow-overflow>
      <div class="sb"><span class="dots"><i></i><i></i><i></i></span><span class="su">${esc(c.bar)}</span></div><div class="sv">${img}${c.line ? '<i class="hl"></i>' : ''}</div></div>`;

// Portrait shows a step's real screen cropped to the column its line sits in (captures.mjs crops), at
// the safe width less the frame's border. Text a phone draws under READ_PX does not read, so where the
// screen's own text comes out smaller, its line is set again as live text under it: in Geist, or in
// Geist Mono at code's advance for code, as large as sits in two rows; under 40px only as code is,
// where a whole token needs the row.
export const READ_PX = 28;
const SCREEN_W = ACROSS.portrait.width - 4;
const LIVE = { sizes: [52, 48, 44, 40], mono: [52, 48, 44, 40, 36, 32], padX: 24, border: 3, rows: 2, gap: 28 };
/**
 * How a step's line is set under its screen in portrait: { text, mono, px, shown } where `shown` is
 * the px the screen draws its text at, the smaller of its column's lines and the line's own box (a
 * dialog's borders run its rows together); null when the screen reads on its own.
 */
export function liveOf(c) {
  const { crop, line } = c, shown = Math.min(crop.text || Infinity, line.box[3] - line.box[1]) * SCREEN_W / (crop.x1 - crop.x0);
  if (shown >= READ_PX) return null;
  const width = ACROSS.portrait.width - 2 * (LIVE.padX + LIVE.border) - 4;
  const set = px => linesOf(line.text, line.mono ? { px, width, weight: 'mono', tracking: -0.03, breakWords: false } : { px, width, weight: 600, tracking: -0.02, breakWords: false });
  const px = (line.mono ? LIVE.mono : LIVE.sizes).find(x => set(x) <= LIVE.rows);
  if (!px) throw new Error(`the line "${line.text}" on ${c.name} does not sit in ${LIVE.rows} rows of the portrait frame: pick a shorter one`);
  return { text: line.text, mono: line.mono, px, shown: +shown.toFixed(1) };
}
const liveHtml = (c, k) => {
  const l = c.line && liveOf(c);
  return l ? `<div class="ll s${k}"><p class="lt${l.mono ? ' mono' : ''}" style="font-size:${l.px}px">${esc(l.text)}</p></div>` : '';
};
// What the page needs to crop a step's screen: the planned column and gaps, and the line's box.
const cropData = c => c && { x0: c.crop.x0, x1: c.crop.x1, w: c.crop.w, gaps: c.crop.gaps, box: c.line && { x0: c.line.box[0], y0: c.line.box[1], x1: c.line.box[2], y1: c.line.box[3] } };

// ── the shot ───────────────────────────────────────────────────────────────
// How long each id holds in a roll. Each wash is shorter, so one never fades over the next.
export const ROLL_EVERY = 0.9;
// The camera's perspective per frame (MOTION.md, 3D camera language).
const CAM_PERSPECTIVE = { landscape: 1600, portrait: 1400 };
// The camera's language (MOTION.md): the five panels lie on a board tilted back from the viewer,
// and the camera cranes along it from panel to panel, pulling back as it goes and squaring up to
// each so it reads flat. A film's group lays the board out its own way, so films of one kind share
// a shape and films of different kinds do not: `path` is each panel's place in panel widths along
// the board and across it, `rx` how far the board leans back, `ry` how far each panel turns aside.
// Portrait runs the board down the frame instead of across it.
export const BOARDS = {
  row: { path: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], rx: 48, ry: 0 },
  climb: { path: [[0, 0], [1, -0.45], [2, -0.9], [3, -1.35], [4, -1.8]], rx: 40, ry: 0 },
  zigzag: { path: [[0, 0], [1, 0.42], [2, 0], [3, 0.42], [4, 0]], rx: 44, ry: 0 },
  deck: { path: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], rx: 18, ry: -34 },
  descend: { path: [[0, 0], [1, 0.45], [2, 0.9], [3, 1.35], [4, 1.8]], rx: 40, ry: 0 },
};
/** The board a film's group lays out (BOARDS). */
export const boardOf = group => ({ 'coding-agents': 'row', sdks: 'climb', 'free-cheap': 'zigzag', 'keys-pool': 'deck', mcp: 'descend' })[group] ?? 'row';

const words = (text, set) => masked(text, { landscape: set.landscape.breaks, portrait: set.portrait.breaks });
const kineticHtml = (cls, line) => `<p class="kt ${cls}" style="${fsVars({ landscape: line.type.landscape.px, portrait: line.type.portrait.px }, 'ks')}">${words(line.text, line.type)}</p>`;

function nodeHtml(label, d, role) {
  const m = d.marks[label];
  return `<div class="nd card${isId(label) ? ' id' : ''}" data-role="${role}">${m ? mark(m) : ''}<span class="nl${isId(label) ? ' mono' : ''}">${esc(label)}</span></div>`;
}

function diagramHtml(d) {
  const size = `--nd:${d.size.landscape.sans}px;--nd-p:${d.size.portrait.sans}px;--ndm:${d.size.landscape.mono}px;--ndm-p:${d.size.portrait.mono}px`;
  const center = d.edges === 'via' ? `<div class="col mid"><div class="nd card hub">${LOGO}<span class="nl">AnyRouter</span></div></div>` : '';
  return `<div class="dg ${d.kind} e-${d.edges}${d.left.length ? '' : ' no-left'}${d.stack ? ' stack-p' : ''}" style="${size}">
      <svg class="edges" aria-hidden="true"></svg>
      ${d.left.length ? `<div class="col l${d.tall.left ? ' tall' : ''}">${d.left.map(l => nodeHtml(l, d, 'l')).join('')}</div>` : ''}
      ${center}
      <div class="col r${d.tall.right ? ' tall' : ''}">${d.right.map((l, i) => nodeHtml(l, d, d.fallback && i > 0 ? 'fb' : 'r')).join('')}</div>
      ${d.tag ? `<div class="tg mono">${esc(d.tag)}</div>` : ''}
      ${d.fail ? `<div class="fl">${esc(d.fail)}</div>` : ''}
      ${d.note ? `<div class="nt mono"><span>${esc(d.note)}</span></div>` : ''}
    </div>`;
}

// How tall a problem or result panel's block is set, per frame: its badge, the gaps, the kinetic
// line, and the diagram. The block sits in the safe area's height (WIN sh).
const BLOCK = { badge: 76, landscape: { gap: 44, pad: 24, rowGap: 22, stackGap: 0 }, portrait: { gap: 40, pad: 18, rowGap: 22, stackGap: 72 } };
const NOTE_H = 44 + 52, FAIL_H = 18 + 64;

/**
 * Fits a panel's kinetic line and diagram together into the safe height of each frame: the
 * largest line, then the largest cards, that sit in it. Sets `line.type` and `d.size` in place;
 * throws when nothing fits.
 */
export function fitPanel(line, d, slug) {
  for (const o of ['landscape', 'portrait']) {
    const b = BLOCK[o], room = WIN[o].sh;
    const cardH = k => Math.max(NODE.mark, NODE[o].sizes[k] * 1.1) + 2 * b.pad;
    const col = (n, k) => n * cardH(k) + Math.max(0, n - 1) * b.rowGap;
    const stacked = o === 'portrait' && d.stack;
    const height = k => {
      let h;
      if (d.kind === 'result' && stacked) h = (d.tall.left ? col(d.left.length, k) : cardH(k)) + cardH(k) + (d.tall.right ? col(d.right.length, k) : cardH(k)) + 2 * b.stackGap;
      else if (d.kind === 'result') h = Math.max(col(d.left.length, k), cardH(k), col(d.right.length, k));
      else if (stacked) h = (d.left.length ? col(d.left.length, k) + Math.max(b.stackGap, d.tag ? 60 + TAG_MARGIN : 0) : 0) + col(d.right.length, k);
      else h = Math.max(col(d.left.length, k), col(d.right.length, k));
      return h + (d.note ? NOTE_H : 0) + (d.fail ? FAIL_H : 0);
    };
    const k0 = NODE[o].sizes.indexOf(d.size[o].sans);
    let done = false;
    for (const px of TYPE.say[o].sizes.filter(x => x <= line.type[o].px)) {
      const set = breakSet(line.text, { px, width: TYPE.say[o].width, weight: TYPE.say.weight, tracking: TYPE.say.tracking, room: n => n <= TYPE.say[o].lines });
      if (!set) continue;
      const k = NODE[o].sizes.findIndex((_, i) => i >= k0 && BLOCK.badge + 2 * b.gap + set.lines * px * 1.08 + height(i) <= room);
      if (k < 0) continue;
      line.type[o] = { px, ...set };
      d.size[o] = { sans: NODE[o].sizes[k], mono: NODE[o].mono[k] };
      done = true;
      break;
    }
    if (!done) throw new Error(`${slug}: the ${d.kind} line and diagram do not fit the ${o} frame's height`);
  }
}

/**
 * When each piece of a diagram lands, in seconds on the film's clock: a card lands on the spoken
 * word its label ends on, so "one more key" lands on "key"; a card no word matches, in order
 * across the line. `words` are the line's words with their times, `from` when the panel is up.
 */
export function landings(d, said, from) {
  const norm = w => w.toLowerCase().replace(/[^a-z0-9]/g, '');
  const ws = said.words.map(w => ({ w: norm(w.text), at: said.at + w.start }));
  const first = ws[0]?.at ?? from, last = ws.at(-1)?.at ?? from + 1;
  let i = 0;
  const onWord = (label, fallbackAt) => {
    const key = norm(label.split(/[\s/]+/).filter(Boolean).at(-1));
    const k = ws.findIndex((w, j) => j >= i && key && w.w === key);
    if (k < 0) return fallbackAt;
    i = k + 1;
    return ws[k].at;
  };
  const spread = (n, k) => +(first + (last - first) * ((k + 1) / (n + 1))).toFixed(2);
  if (d.kind === 'result') {
    const lead = from;
    return { left: d.left.map((_, k) => +(lead + k * 0.08).toFixed(2)), hub: +(lead + 0.3).toFixed(2), right: d.right.map((_, k) => +(lead + 0.55 + k * 0.12).toFixed(2)), mark: null, note: +(last + 0.2).toFixed(2) };
  }
  const left = d.left.map((_, k) => +(from + k * 0.15).toFixed(2));
  const right = d.right.map((l, k) => +(onWord(l, spread(d.right.length, k)) - 0.05).toFixed(2));
  const word = d.fail ?? d.tag;
  return { left, right, mark: word ? +(onWord(word, last) - 0.05).toFixed(2) : null, note: null };
}

/** The film's one sub-composition: { cls, body, inner, cues }. */
export function filmScene({ copy, beats, duration, timing, said }, board = 'row') {
  const B = BOARDS[board];
  if (!B) throw new Error(`no board "${board}"`);
  const caps = captionsOf(said.filter(l => l.cap));
  const url = urlSet(copy.link);
  const tiles = copy.marks.map(f => `<div class="tile card">${mark(f)}</div>`).join('');
  const { roll } = copy.window;
  const rolls = roll ? roll.ids.length : 0;
  const T = timing, S = T.steps;
  const problemLine = said.find(l => l.beat === 'problem'), resultLine = said.find(l => l.beat === 'result');
  // a diagram's cards ride in with the camera, so it arrives at a composed frame; the rest lands on the voice
  const land = { problem: landings(copy.problem.diagram, problemLine, T.problem.at - 0.35), result: landings(copy.result.diagram, resultLine, T.result.at - 0.35) };
  const steps = copy.steps.map((st, k) => `<div class="stp" style="${fsVars(copy.type.step, 'ls')};${fsVars(copy.type.detail, 'ds')}">
      <div class="head"><span class="sm"><i class="ring"></i><b>${k + 1}</b></span><div class="sl">${masked(st.label, st.breaks)}</div></div>
      ${st.detail ? `<p class="dt">${masked(st.detail.text, st.detail.breaks)}</p>` : ''}</div>`).join('');
  const back = '<div class="bk" aria-hidden="true"></div>';
  // the camera moves the world through five wrappers, one move each, so every move is a plain tween
  const body = `<div class="cam" data-layout-allow-overflow><div class="cpull"><div class="carc"><div class="cpush"><div class="crotx"><div class="croty"><div class="cpos">
    <section class="pn p-intro">${back}
      <div class="hero"><div class="tiles">${tiles}${tiles ? PLUS : ''}<div class="tile card">${mark('anyrouter-color.svg')}</div></div>
        <div class="badge kick">${esc(copy.kicker)}</div></div>
      <h1 class="h" style="${fsVars(copy.type.title)}">${masked(copy.title, copy.type.breaks)}</h1></section>
    <section class="pn p-problem">${back}<div class="blk"><div class="badge lbl">The problem</div>${kineticHtml('kp', copy.problem)}${diagramHtml(copy.problem.diagram)}</div></section>
    <section class="pn p-steps">${back}${steps}<div class="win-host">${windowHtml(copy.window)}${copy.steps.map((st, k) => (st.capture ? frameHtml(st.capture, `sk s${k}`) + liveHtml(st.capture, k) : '')).join('')}</div></section>
    <section class="pn p-result">${back}<div class="blk"><div class="badge lbl">The result</div>${kineticHtml('kr', copy.result)}${diagramHtml(copy.result.diagram)}</div></section>
    <section class="pn p-close">${back}<div class="cblk"><div class="crow">
      ${frameHtml(copy.page.landscape, 'pagef', `<img class="si il" src="assets/captures/${esc(copy.page.landscape.name)}" alt=""><img class="si ip" src="assets/captures/${esc(copy.page.portrait.name)}" alt="">`)}
      <div class="ccol"><p class="h2" style="${fsVars(copy.type.title)}">${masked(copy.title, copy.type.breaks)}</p>
      <div class="end"><div class="lock">${LOGO}<b>AnyRouter</b></div></div></div></div>
      <div class="url" style="--us:${url.landscape.px}px;--us-p:${url.portrait.px}px">${esc(copy.link)}</div></div></section>
    </div></div></div></div></div></div></div>
    <div class="caps" data-outside-safe-area>${caps.map(c => `<div class="cap" data-layout-allow-overlap><span style="${fsVars(c.px, 'cf')}">${esc(c.text)}</span></div>`).join('')}</div>`;

  // the panel each beat reads, and when the camera travels: centred on each beat change
  const cuts = [T.problem.at, S[0].at, T.result.at, T.end];
  const inner = `
    const BOARD = ${JSON.stringify(B)}, TRAVEL = ${T.travel}, CUTS = ${JSON.stringify(cuts)};
    const STEPS = ${JSON.stringify(S)}, T1 = STEPS[0].at, END = ${T.end}, W_IN = ${T.windowIn}, W_OUT = ${T.windowOut}, RESULT = ${T.result.at};
    const PRE_AT = ${T.preAt}, CMD_AT = ${T.cmdAt}, INSTALL = ${T.preAt != null}, EACH = ${T.each}, LINE_PAUSE = ${T.linePause};
    const ROLL_AT = ${T.rollAt}, ROLL_EVERY = ${ROLL_EVERY}, ROLLS = ${rolls}, ANSWER_AT = ${T.answerAt}, POINT_AT = ${T.pointAt};
    const LAND = ${JSON.stringify(land)}, PWORDS = ${JSON.stringify(T.problem.words)}, RWORDS = ${JSON.stringify(T.result.words)};
    const uc = $(".uc"), css = getComputedStyle(uc), v = n => parseFloat(css.getPropertyValue(n));
    const SY = v("--sy"), SH = v("--sh"), G = v("--gap"), DONE = ${STEP.done}, RG = ${STEP.rowGap}, HG = ${STEP.headGap};
    const W = uc.offsetWidth, H = uc.offsetHeight, TALL = H > W;
    const panels = $$(".pn"), [pIntro, pProblem, pSteps, pResult, pClose] = panels;
    const hero = $(".hero"), h = $(".h"), win = $(".win"), end = $(".end"), h2 = $(".h2"), stp = $$(".stp");
    const rows = $$(".rows").find(r => getComputedStyle(r).display !== "none"), R = s => Array.from(rows.querySelectorAll(s));

    // ── the camera. Each panel has a pose in the world; at rest the camera is that pose's inverse, so
    // the panel it reads is square to it at 1:1. Between beats it travels, pulling back on the way.
    const poseOf = i => {
      const [along, across] = BOARD.path[i];
      return TALL ? { x: across * W * 0.6, y: along * H * 1.12, z: 0, rx: BOARD.rx, ry: BOARD.ry / 2 }
        : { x: along * W * 1.12, y: across * H, z: 0, rx: BOARD.rx, ry: BOARD.ry };
    };
    panels.forEach((p, i) => { const q = poseOf(i); gsap.set(p, { x: q.x, y: q.y, z: q.z, rotationX: q.rx, rotationY: q.ry }); });
    const cpos = $(".cpos"), crotx = $(".crotx"), croty = $(".croty"), cpush = $(".cpush"), carc = $(".carc"), cpull = $(".cpull");
    // the inverse of a panel's pose: undo its turn aside (inner), then its lean back (outer), then its place
    const at = i => { const q = poseOf(i); return { pos: { x: -q.x, y: -q.y, z: -q.z }, rx: { rotationX: -q.rx }, ry: { rotationY: -q.ry } }; };
    tl.set(cpos, at(0).pos, 0);
    tl.set(crotx, at(0).rx, 0);
    tl.set(croty, at(0).ry, 0);
    // the travel pulls back further on a long move, and swings a little to the side on the way
    const PULL = 420, SWING = TALL ? 4 : 8, LIFT = TALL ? 10 : 16;
    // between travels the camera pushes in at an even speed: a frame at rest reads as dead air
    // it breathes, in on one beat and out on the next, so every step of the steps panel moves too.
    // A push in grows what spans the safe width past its edge, into the strip Shorts draws its
    // buttons on, so a phone's camera breathes by rising instead
    const [AXIS, PUSH] = TALL ? ["y", -18] : ["z", 48], rests = [0, ...CUTS.map(c => c + TRAVEL / 2)], restEnds = [...CUTS.map(c => c - TRAVEL / 2), D];
    const endPush = [];
    rests.forEach((a, i) => {
      const marks = [a, ...STEPS.map(st => st.at).filter(t => t > a + 0.5 && t < restEnds[i] - 0.5), restEnds[i]];
      for (let k = 0; k + 1 < marks.length; k++) tl.fromTo(cpush, { [AXIS]: k % 2 ? PUSH : 0 }, { [AXIS]: k % 2 ? 0 : PUSH, duration: Math.max(0.1, marks[k + 1] - marks[k]), ease: "none", immediateRender: false }, marks[k]);
      endPush.push((marks.length - 1) % 2 ? PUSH : 0);
    });
    CUTS.forEach((c, i) => {
      const a = c - TRAVEL / 2, from = at(i), to = at(i + 1), side = i % 2 ? -1 : 1;
      tl.fromTo(cpos, from.pos, { ...to.pos, duration: TRAVEL, ease: "power3.inOut", immediateRender: false }, a);
      tl.fromTo(crotx, from.rx, { ...to.rx, duration: TRAVEL, ease: "power3.inOut", immediateRender: false }, a);
      tl.fromTo(croty, from.ry, { ...to.ry, duration: TRAVEL, ease: "power3.inOut", immediateRender: false }, a);
      tl.fromTo(cpush, { [AXIS]: endPush[i] }, { [AXIS]: 0, duration: TRAVEL, ease: "power3.inOut", immediateRender: false }, a);
      // the audit reads no text while the camera carries it (stage-audit.mjs, flight)
      tl.set(cpull, { attr: { "data-in-flight": "1" } }, a);
      tl.set(cpull, { attr: { "data-in-flight": "0" } }, a + TRAVEL);
      tl.fromTo(cpull, { z: 0 }, { z: -PULL, duration: TRAVEL / 2, ease: "power2.out", immediateRender: false }, a);
      tl.fromTo(cpull, { z: -PULL }, { z: 0, duration: TRAVEL / 2, ease: "power2.in", immediateRender: false }, a + TRAVEL / 2);
      {
        // on the way the camera rises off the board, so it is seen lying back, and swings a little aside
        tl.fromTo(carc, { rotationX: 0, rotationY: 0, x: 0 }, { rotationX: LIFT, rotationY: SWING * side, x: -side * W * 0.04, duration: TRAVEL / 2, ease: "power2.out", immediateRender: false }, a);
        tl.fromTo(carc, { rotationX: LIFT, rotationY: SWING * side, x: -side * W * 0.04 }, { rotationX: 0, rotationY: 0, x: 0, duration: TRAVEL / 2, ease: "power2.in", immediateRender: false }, a + TRAVEL / 2);
      }
    });
    // a panel is drawn only around its own beats
    const spans = [[0, CUTS[0]], [CUTS[0], CUTS[1]], [CUTS[1], CUTS[2]], [CUTS[2], CUTS[3]], [CUTS[3], D + 1]];
    panels.forEach((p, i) => {
      const [a, b] = spans[i];
      tl.set(p, { autoAlpha: i ? 0 : 1 }, 0);
      if (i) tl.set(p, { autoAlpha: 1 }, a - TRAVEL / 2);
      if (i < 4) tl.set(p, { autoAlpha: 0 }, b + TRAVEL / 2);
    });
    // the dots behind each panel drift at their own speed, so depth reads even while the text holds still
    $$(".bk").forEach((b, i) => tl.fromTo(b, { x: 0, y: 0 }, { x: i % 2 ? -60 : 60, y: -40, duration: D, ease: "none" }, 0));

    // ── 1 · what and why. The headline sits in the middle of the safe area; the marks close in, the words rise.
    // A phone's frame is a poster: the marks at the top of the safe area, the headline at its foot.
    const heroH = hero.offsetHeight, hH = h.offsetHeight, top1 = TALL ? SY : SY + (SH - heroH - G - hH) / 2;
    hero.style.top = top1 + "px";
    h.style.top = (TALL ? SY + SH - hH : top1 + heroH + G) + "px";
    const tiles = $$(".tile, .plus"), mid = (tiles.length - 1) / 2;
    tl.fromTo(tiles, { x: i => (i - mid) * 56, z: -200, rotationY: i => (i - mid) * -14 }, { x: 0, z: 0, rotationY: 0, duration: 1.3, ease: "expo.out" }, 0);
    tl.fromTo(Q(".kick"), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out" }, 0.15);
    const hw = $$(".h .w > span");
    // every word is up within half a second, however long the headline
    tl.fromTo(hw, { yPercent: 110 }, { yPercent: 0, duration: 0.4, stagger: Math.min(0.04, 0.08 / hw.length), ease: "expo.out" }, 0);

    // ── kinetic type: each word of the line rises as it is said, out of its own mask
    const kinetic = (sel, times) => {
      const ws = $$(sel + " .w > span");
      ws.forEach((w, i) => tl.fromTo(w, { yPercent: 115 }, { yPercent: 0, duration: 0.45, ease: "expo.out", immediateRender: true }, Math.max(0, (times[i] ?? times.at(-1)) - 0.08)));
    };
    kinetic(".kp", PWORDS);
    kinetic(".kr", RWORDS);

    // ── a diagram: its cards fly in from depth onto the panel, each on its word; the edges draw between them
    const svgNS = "http://www.w3.org/2000/svg";
    const diagram = (panel, L) => {
      const dg = panel.querySelector(".dg"), svg = dg.querySelector(".edges");
      const box = e => { let x = 0, y = 0, n = e; while (n && n !== dg) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y, w: e.offsetWidth, h: e.offsetHeight }; };
      svg.setAttribute("width", dg.offsetWidth); svg.setAttribute("height", dg.offsetHeight);
      const left = Array.from(dg.querySelectorAll('.col.l .nd')), right = Array.from(dg.querySelectorAll('.col.r .nd')), hub = dg.querySelector(".hub");
      // an edge leaves the side of a card that faces the next one: across in landscape, down a stacked portrait
      // a column of cards one under another is reached by a trunk down its left side, never through a card
      const stackedCol = e => { const c = Array.from(e.parentElement.children); return c.length > 1 && c[1].offsetTop >= c[0].offsetTop + c[0].offsetHeight - 2; };
      const trunk = e => Math.min(...Array.from(e.parentElement.children).map(c => box(c).x)) - 40;
      const link = (a, b, dashed) => {
        const A = box(a), B = box(b), across = B.x >= A.x + A.w - 1;
        const p = across ? [A.x + A.w, A.y + A.h / 2, B.x, B.y + B.h / 2] : [A.x + A.w / 2, A.y + A.h, B.x + B.w / 2, B.y];
        const path = document.createElementNS(svgNS, "path"), m = across ? (p[0] + p[2]) / 2 : (p[1] + p[3]) / 2;
        let d = across ? "M" + p[0] + " " + p[1] + " C" + m + " " + p[1] + " " + m + " " + p[3] + " " + p[2] + " " + p[3] : "M" + p[0] + " " + p[1] + " C" + p[0] + " " + m + " " + p[2] + " " + m + " " + p[2] + " " + p[3];
        if (!across && stackedCol(b)) { const x = trunk(b), y = A.y + A.h + 28; d = "M" + p[0] + " " + p[1] + " V" + y + " H" + x + " V" + (B.y + B.h / 2) + " H" + B.x; }
        else if (!across && stackedCol(a)) { const x = trunk(a), y = B.y - 28; d = "M" + A.x + " " + (A.y + A.h / 2) + " H" + x + " V" + y + " H" + p[2] + " V" + B.y; }
        path.setAttribute("d", d);
        path.setAttribute("class", dashed ? "ed dash" : "ed");
        svg.appendChild(path);
        const len = path.getTotalLength();
        return { path, a, b, len, mid: path.getPointAtLength(len / 2), end: path.getPointAtLength(len) };
      };
      const lands = (els, times, z) => els.forEach((e, k) => tl.fromTo(e, { z, rotationX: 22, y: 60, opacity: 0 }, { z: 0, rotationX: 0, y: 0, opacity: 1, duration: 0.55, ease: "expo.out", immediateRender: true }, times[k]));
      lands(left, L.left, -520);
      if (hub) lands([hub], [L.hub], -380);
      lands(right, L.right, -640);
      const draw = (e, a) => { tl.fromTo(e.path, { strokeDasharray: e.len, strokeDashoffset: e.len }, { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut", immediateRender: true }, a); if (e.path.classList.contains("dash")) tl.set(e.path, { strokeDasharray: "10 10", strokeDashoffset: 0 }, a + 0.46); };
      const edges = [];
      if (hub) {
        left.forEach((l, k) => { const e = link(l, hub); draw(e, L.hub + 0.1); edges.push(e); });
        right.forEach((r, k) => { const e = link(hub, r, r.dataset.role === "fb"); draw(e, L.right[k] + 0.1); edges.push(e); });
      } else if (dg.classList.contains("e-pairs")) left.forEach((l, k) => { const e = link(l, right[k]); draw(e, Math.max(L.left[k], L.right[k]) + 0.1); edges.push(e); });
      else if (dg.classList.contains("e-fan")) right.forEach((r, k) => { const e = link(left[0], r); draw(e, L.right[k] + 0.1); edges.push(e); });
      // the tag sits on the edge it names; a failure breaks the edge and greys out what it reached
      const tg = dg.querySelector(".tg"), fl = dg.querySelector(".fl");
      if (tg && edges[0]) {
        tg.style.left = edges[0].mid.x - tg.offsetWidth / 2 + "px"; tg.style.top = edges[0].mid.y - tg.offsetHeight / 2 + "px";
        tl.fromTo(tg, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.6)", immediateRender: true }, L.mark);
      }
      if (fl && edges[0]) {
        const r = box(right[0]);
        fl.style.left = r.x + r.w / 2 - fl.offsetWidth / 2 + "px"; fl.style.top = r.y + r.h + 18 + "px";
        tl.set(edges[0].path, { strokeDasharray: "4 14", attr: { class: "ed broke" } }, L.mark);
        tl.set(right[0], { attr: { "data-state": "off" } }, L.mark);
        tl.fromTo(fl, { scale: 0.6, opacity: 0, y: -10 }, { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.6)", immediateRender: true }, L.mark);
      }
      const nt = dg.querySelector(".nt");
      if (nt) tl.fromTo(nt, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "expo.out", immediateRender: true }, L.note);
      return { edges, hub };
    };
    // an edge that carries a tag is long enough to show the tag whole with the edge either side
    $$(".dg").forEach(dg => {
      const tg = dg.querySelector(".tg");
      if (!tg) return;
      const cs = getComputedStyle(dg), down = cs.flexDirection === "column";
      if (down) dg.style.rowGap = Math.max(parseFloat(cs.rowGap) || 0, tg.offsetHeight + ${TAG_MARGIN}) + "px";
      else dg.style.columnGap = Math.max(parseFloat(cs.columnGap) || 0, tg.offsetWidth + ${TAG_MARGIN}) + "px";
    });
    // the panel's block (badge, line, diagram) sits in the middle of the safe area
    const centre = p => { const b = p.querySelector(".blk"); b.style.top = SY + Math.max(0, (SH - b.offsetHeight) / 2) + "px"; };
    centre(pProblem); centre(pResult);
    diagram(pProblem, LAND.problem);
    const route = diagram(pResult, LAND.result);
    // a request runs the route while the result is said: out from your side, through AnyRouter, to what answers
    if (route.hub && route.edges.length) {
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("r", 13); dot.setAttribute("class", "pulse");
      pResult.querySelector(".edges").appendChild(dot);
      const into = route.edges.find(e => e.b === route.hub), out = route.edges.filter(e => e.a === route.hub);
      const primary = out.find(e => !e.path.classList.contains("dash")) ?? out[0], backup = out.find(e => e.path.classList.contains("dash"));
      let t0 = Math.max(LAND.result.right.at(-1) + 0.4, RWORDS[0] ?? 0);
      tl.set(dot, { opacity: 0 }, 0);
      // set frame by frame along the path: a seek renders a set, where a callback may be skipped
      const ease = gsap.parseEase("power2.inOut");
      // a request runs the route again and again while the result holds, so the frame keeps its pulse.
      // Where the route has a fallback, the first request is answered by the model asked for; then that
      // model goes down, and the next requests run the dashed edge to the fallback, which answers.
      for (let run = 0; t0 + 1.5 < END - 0.4; run++) {
        const leg = backup && run ? backup : primary;
        if (backup && run === 1) { tl.set(primary.b, { attr: { "data-state": "off" } }, t0); tl.set(primary.path, { attr: { class: "ed broke" }, strokeDasharray: "4 14" }, t0); }
        tl.set(dot, { opacity: 1 }, t0);
        [into, leg].filter(Boolean).forEach(l => {
          for (let f = 0; f <= 21; f++) { const q = l.path.getPointAtLength(ease(f / 21) * l.len); tl.set(dot, { attr: { cx: q.x, cy: q.y } }, t0 + f / 30); }
          t0 += 0.75;
        });
        // the card that answered takes the accent as the request reaches it
        if (run < 2) tl.set(leg.b, { attr: { "data-state": "on" } }, t0 - 0.05);
        tl.set(dot, { opacity: 0 }, t0);
        t0 += 0.45;
      }
    }

    // ── 2 · the steps. Each tilts in from deep in the page and settles flat to read; its words rise as
    // they are said. A step done shrinks to a row above the next.
    const hs = stp.map(e => e.offsetHeight), heads = stp.map(e => e.querySelector(".head").offsetHeight);
    const doneY = k => SY + heads.slice(0, k).reduce((y, x) => y + x * DONE + RG, 0);
    // on a phone the window reaches down to the foot of the safe area under every step that shows it
    if (TALL) {
      const term = win.querySelector(".term"), room = Math.min(...STEPS.map((st, k) => (st.shows ? SY + SH - doneY(k) - hs[k] - HG : Infinity)));
      term.style.minHeight = room - (win.offsetHeight - term.offsetHeight) + "px";
    }
    const winH = win.offsetHeight;
    // a step's real screen spans the safe width under its step. Landscape shows it zoomed in, as much
    // of its top as the room under the step allows: the part the capture was scrolled to. A phone shows
    // the column its line sits in, as many whole rows as the room holds, every edge in whitespace
    // (captures.mjs crops), the line marked on it and, where the screen's text is too small to read,
    // set again under it (liveOf)
    const sk = STEPS.map((_, k) => $(".sk.s" + k)), ll = STEPS.map((_, k) => $(".ll.s" + k));
    const CROP = ${JSON.stringify(copy.steps.map(st => cropData(st.capture)))}, LLG = ${LIVE.gap};
    const fitRows = ${fitRows};
    const llH = k => (TALL && ll[k] ? ll[k].offsetHeight + LLG : 0);
    const SF_W = TALL ? ${ACROSS.portrait.width} : 1500, ZOOM = 1.45, SF_H = SF_W * 0.5625;
    const skH = sk.map((f, k) => {
      if (!f) return 0;
      const bar = f.querySelector(".sb").offsetHeight, room = SY + SH - doneY(k) - hs[k] - HG - (TALL ? llH(k) : 24);
      const sv = f.querySelector(".sv"), img = f.querySelector(".si");
      f.style.width = SF_W + "px";
      f.style.left = (TALL ? ${ACROSS.portrait.left} : (W - SF_W) / 2) + "px";
      if (TALL) {
        const c = CROP[k], s = sv.clientWidth / (c.x1 - c.x0), { y0, y1 } = fitRows(c.gaps, c.box, (room - (f.offsetHeight - sv.offsetHeight)) / s);
        sv.style.height = (y1 - y0) * s + "px";
        Object.assign(img.style, { width: c.w * s + "px", marginLeft: -c.x0 * s + "px", marginTop: -y0 * s + "px" });
        const b = c.box, hl = f.querySelector(".hl");
        if (hl && b) Object.assign(hl.style, { left: (b.x0 - c.x0) * s - 12 + "px", top: (b.y0 - y0) * s - 8 + "px", width: (b.x1 - b.x0) * s + 24 + "px", height: (b.y1 - b.y0) * s + 16 + "px" });
      } else {
        sv.style.height = Math.max(240, Math.min(room - bar - 20, SF_H)) + "px";
        img.style.width = SF_W * ZOOM + "px";
        img.style.marginLeft = -SF_W * ZOOM * 0.12 + "px";
      }
      return f.offsetHeight;
    });
    const place = k => {
      const block = hs[k] + (STEPS[k].shows ? HG + winH : sk[k] ? HG + skH[k] + llH(k) : 0), top = doneY(k) + Math.max(0, (SY + SH - doneY(k) - block) / 2);
      return { top, win: top + hs[k] + HG };
    };
    // a step's real screen tilts in under its step, is pushed into while the step is said, and goes when the next comes
    STEPS.forEach((st, k) => {
      const f = sk[k];
      if (!f) return;
      const next = STEPS[k + 1], at = st.at + (k ? 0.5 : 0.2), out = next ? next.at - 0.15 : RESULT - TRAVEL / 2, y = place(k).win + (TALL ? 0 : 16);
      tl.set(f, { autoAlpha: 0, y }, 0);
      tl.set(f, { autoAlpha: 1 }, at);
      // the audit reads its bar once it has landed, and not while it leaves (stage-audit.mjs, flight)
      tl.set(f, { attr: { "data-in-flight": "1" } }, at);
      tl.set(f, { attr: { "data-in-flight": "0" } }, at + 0.7);
      if (next) tl.set(f, { attr: { "data-in-flight": "1" } }, out - 0.05);
      tl.fromTo(f, { z: -460, rotationX: 16, rotationY: TALL ? -5 : -12, y: y + 140 }, { z: 0, rotationX: 0, rotationY: 0, y, duration: 1.0, ease: "expo.out", immediateRender: false }, at);
      // the camera inside the frame drifts down the page and in, a reader's pace; on a phone the crop
      // holds still, so its edges stay in whitespace, and the camera's own breath carries the frame
      if (!TALL) tl.fromTo(f.querySelector(".si"), { scale: 1, y: 0 }, { scale: 1.08, y: -Math.min(120, f.querySelector(".sv").offsetHeight * 0.2), duration: Math.max(0.5, out - at), ease: "sine.inOut", immediateRender: false }, at);
      // once the frame has landed the line is marked on the screen, and rises under it to be read
      const hl = f.querySelector(".hl"), line = TALL && ll[k];
      if (TALL && hl) {
        tl.set(hl, { opacity: 0 }, 0);
        tl.fromTo(hl, { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.6)", immediateRender: false }, at + 0.8);
      }
      if (line) {
        const ly = y + skH[k] + LLG;
        tl.set(line, { autoAlpha: 0, y: ly }, 0);
        tl.set(line, { autoAlpha: 1 }, at + 0.95);
        tl.fromTo(line, { y: ly + 40, z: -160, rotationX: 24 }, { y: ly, z: 0, rotationX: 0, duration: 0.7, ease: "expo.out", immediateRender: false }, at + 0.95);
        tl.set(line, { attr: { "data-in-flight": "1" } }, at + 0.95);
        tl.set(line, { attr: { "data-in-flight": "0" } }, at + 1.65);
        if (next) { tl.set(line, { attr: { "data-in-flight": "1" } }, out - 0.05); tl.to(line, { z: -380, rotationX: -10, y: "-=50", duration: 0.35, ease: "power3.in" }, out - 0.05); tl.set(line, { autoAlpha: 0 }, out + 0.3); }
      }
      if (next) { tl.to(f, { z: -380, rotationX: -10, y: "-=50", duration: 0.35, ease: "power3.in" }, out - 0.05); tl.set(f, { autoAlpha: 0 }, out + 0.3); }
    });
    STEPS.forEach((st, k) => {
      const el = stp[k], at = place(k).top, next = STEPS[k + 1];
      tl.set(el, { y: at }, 0);
      const enter = st.at + (k ? 0.45 : 0.1);
      tl.set(el, { opacity: 1 }, enter);
      tl.fromTo(el, { z: -480, rotationX: -26, rotationY: k % 2 ? -9 : 9, y: at + 90 },
        { z: 0, rotationX: 0, rotationY: 0, y: at, duration: 1.1, ease: "expo.out", immediateRender: false }, enter);
      // the label rises with its card, word after word, and is whole before the voice reads it
      const lw = Array.from(el.querySelectorAll(".sl .w > span"));
      tl.set(lw, { yPercent: 110 }, 0);
      tl.fromTo(lw, { yPercent: 110 }, { yPercent: 0, duration: 0.5, stagger: Math.min(0.06, 0.3 / lw.length), ease: "expo.out", immediateRender: false }, enter + 0.12);
      const dw = Array.from(el.querySelectorAll(".dt .w")), until0 = (next ? next.at : RESULT) - 0.5;
      if (dw.length) {
        const rowsOfDt = Object.values(Object.groupBy(dw, w => w.offsetTop)).map(ws => ws.map(w => w.firstElementChild));
        const gap = Math.min(1.2, Math.max(0.3, (until0 - st.voiceAt - 0.6) / rowsOfDt.length));
        rowsOfDt.forEach((ws, r) => tl.fromTo(ws, { yPercent: 110 }, { yPercent: 0, duration: 0.3, ease: "power3.out", immediateRender: false }, st.voiceAt + 0.3 + r * gap));
        if (next) tl.set(el.querySelector(".dt"), { opacity: 0 }, next.at);
      }
      tl.fromTo(el.querySelector(".sm"), { scale: 0.6 }, { scale: 1, duration: 0.5, ease: "back.out(2)", immediateRender: false }, st.voiceAt);
      const ring = el.querySelector(".ring"), until = (next ? next.at : RESULT) - 0.3;
      // once its line is said, a ring breathes out of the marker: this is the step to do
      if (st.voiceAt + 1.2 + 0.5 < until) tl.fromTo(ring, { scale: 1, opacity: 0.7 }, { scale: 3, opacity: 0, duration: 0.6, ease: "power2.out", immediateRender: false }, st.voiceAt + 1.2);
      if (next) {
        tl.to(el, { y: doneY(k), scale: DONE, duration: 0.6, ease: "power4.inOut" }, next.at - 0.1);
        tl.set(el.querySelector(".sm"), { backgroundColor: "${C.bg}", borderColor: "${C.ink}", color: "${C.ink}" }, next.at);
      }
    });

    // The window comes in with the first step that shows it, turning to face the viewer, follows its steps down, and goes.
    const firstWin = STEPS.findIndex(st => st.shows);
    tl.set(win, { autoAlpha: 0, y: place(firstWin).win }, 0);
    tl.set(win, { autoAlpha: 1 }, W_IN + 0.15);
    tl.fromTo(win, { z: -420, rotationX: 18, rotationY: TALL ? -6 : -14, y: place(firstWin).win + 160 }, { z: 0, rotationX: 0, rotationY: 0, y: place(firstWin).win, duration: 1.1, ease: "expo.out", immediateRender: false }, W_IN + 0.15);
    STEPS.forEach((st, k) => { if (st.shows && k > firstWin) tl.to(win, { y: place(k).win, duration: 0.8, ease: "power4.inOut" }, st.at); });
    if (W_OUT < RESULT) {
      tl.to(win, { z: -500, rotationX: -14, y: "-=60", duration: 0.4, ease: "power3.in" }, W_OUT - 0.1);
      tl.set(win, { autoAlpha: 0 }, W_OUT + 0.3);
    }

    if (R(".ln.ctx, .ln.keep").length) tl.fromTo(R(".ln.ctx, .ln.keep"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }, W_IN + 0.5);
    const typed = R(".typed"), PRE = INSTALL ? Math.max(0, typed.findIndex(l => l.classList.contains("focus"))) : 0;
    let t = 0;
    typed.forEach((ln, k) => {
      if (k === 0) t = PRE ? PRE_AT : CMD_AT;
      else if (k === PRE) t = Math.max(t + LINE_PAUSE, CMD_AT);
      else t += LINE_PAUSE;
      if (k > 0) { tl.set(ln, { opacity: 0 }, 0); tl.set(ln, { opacity: 1 }, t); }
      ln.querySelectorAll(".c").forEach(c => { tl.set(c, { opacity: 1 }, t); t += EACH; });
    });
    const caret = R(".caret").at(-1), still = ANSWER_AT ?? W_OUT;
    for (let b = t + 0.05, on = 1; b < still; b += 0.45, on = 1 - on) tl.set(caret, { opacity: on }, b);
    if (ANSWER_AT) tl.set(caret, { opacity: 0 }, still);

    if (ANSWER_AT) {
      const out = R(".out")[0], cs = getComputedStyle($(".code")), row = parseFloat(cs.fontSize) * ${CODE_LH};
      let by = parseFloat(cs.paddingTop);
      while (by < out.offsetHeight - parseFloat(cs.paddingBottom)) by += row;
      tl.to(rows, { y: -by, duration: 0.6, ease: "power4.inOut" }, ANSWER_AT);
      tl.fromTo(out, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "expo.out" }, ANSWER_AT + 0.25);
    }

    if (ROLLS) {
      const also = $(".also"), slot = also.querySelector(".roll"), items = Array.from(slot.children);
      slot.style.width = Math.max(...items.map(x => x.offsetWidth)) + "px";
      tl.set(also, { opacity: 1 }, ROLL_AT - 0.3);
      tl.fromTo(also, { y: 20 }, { y: 0, duration: 0.5, ease: "expo.out", immediateRender: false }, ROLL_AT - 0.3);
      items.forEach((into, i) => {
        const at = ROLL_AT + i * ROLL_EVERY, out = items[i - 1];
        if (out) tl.fromTo(out, { y: 0, opacity: 1 }, { y: "-0.7em", opacity: 0, duration: 0.2, ease: "power4.in", immediateRender: false }, at);
        tl.fromTo(into, { y: "0.7em", opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "expo.out", immediateRender: false }, at + 0.2);
      });
    }

    const lit = R(".ln.keep, .ln.focus, .ln.typed, .ln.out"), first = Math.max(0, lit.findIndex(l => l.classList.contains("focus")));
    if (lit.length) {
      const glow = document.createElement("div");
      glow.className = "glow";
      rows.prepend(glow);
      const to = ln => ({ y: ln.offsetTop, height: ln.offsetHeight });
      tl.set(glow, { ...to(lit[first]), opacity: 0 }, 0);
      tl.to(glow, { opacity: 1, duration: 0.3, ease: "power2.out" }, CMD_AT);
      tl.fromTo(glow, { opacity: 0.2 }, { opacity: 1, duration: 0.3, ease: "power2.out", immediateRender: false }, t);
      const sel = document.createElement("div");
      sel.className = "sel";
      rows.prepend(sel);
      tl.set(sel, { opacity: 0 }, 0);
      let on = null;
      const stop = Math.min(W_OUT, RESULT) - 0.7;
      for (let t = POINT_AT + 0.3, k = first; t < stop; t += 1.1, k++) {
        const ln = lit[k % lit.length];
        if (on) tl.set(on, { attr: { "data-on": "0" } }, t);
        tl.set(sel, { ...to(ln), opacity: 1 }, t);
        tl.set(ln, { attr: { "data-on": "1" } }, t);
        if (lit.length === 1) { tl.set(sel, { opacity: 0 }, t + 0.8); tl.set(ln, { attr: { "data-on": "0" } }, t + 0.8); }
        on = ln;
      }
      tl.set(sel, { opacity: 0 }, stop + 0.1);
      if (on) tl.set(on, { attr: { "data-on": "0" } }, stop + 0.1);
    }

    // ── 5 · the lockup: the headline, small, above the AnyRouter lockup, and the short link under it.
    const cblk = $(".cblk"), pagef = $(".pagef");
    // on a phone the page runs the safe width and takes the height the lockup leaves, cut between its rows
    if (TALL) {
      const sv = pagef.querySelector(".sv"), img = pagef.querySelector(".ip"), c = ${JSON.stringify(cropData({ crop: copy.page.portrait.crop }))}, s = sv.clientWidth / c.w;
      sv.style.height = "0px";
      const { y0, y1 } = fitRows(c.gaps, null, (SH - cblk.offsetHeight) / s);
      sv.style.height = (y1 - y0) * s + "px";
      img.style.marginTop = -y0 * s + "px";
    }
    cblk.style.top = SY + Math.max(0, (SH - cblk.offsetHeight) / 2) + "px";
    // the live page the film ends on swings in beside the lockup and scrolls a little, as a visitor would
    tl.fromTo(pagef, { z: -420, rotationY: TALL ? 0 : -24, rotationX: TALL ? 14 : 0, opacity: 0 }, { z: 0, rotationY: 0, rotationX: 0, opacity: 1, duration: 1.1, ease: "expo.out", immediateRender: true }, END + 0.25);
    // the audit reads the page's bar and the link once they have landed (stage-audit.mjs, flight)
    const landing = (el, a, b) => { tl.set(el, { attr: { "data-in-flight": "1" } }, a); tl.set(el, { attr: { "data-in-flight": "0" } }, b); };
    landing(pagef, END + 0.25, END + 1.35);
    landing(Q(".url"), END + 0.6, END + 1.6);
    if (!TALL) tl.fromTo(pagef.querySelectorAll(".si"), { yPercent: 0 }, { yPercent: -6, duration: Math.max(0.5, D - END - 1.2), ease: "sine.inOut", immediateRender: false }, END + 1.2);
    const h2w = $$(".h2 .w > span");
    tl.fromTo(h2w, { yPercent: 110 }, { yPercent: 0, duration: 0.6, stagger: Math.min(0.04, 0.25 / h2w.length), ease: "expo.out", immediateRender: false }, END + 0.15);
    tl.fromTo(Q(".lock svg"), { scale: 0.8, opacity: 0, rotationY: -40 }, { scale: 1, opacity: 1, rotationY: 0, duration: 1.0, ease: "expo.out" }, END + 0.35);
    tl.fromTo(Q(".lock b"), { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 1.0, ease: "expo.out" }, END + 0.45);
    tl.set(Q(".url"), { opacity: 0 }, 0);
    tl.set(Q(".url"), { opacity: 1 }, END + 0.6);
    tl.fromTo(Q(".url"), { y: 40, z: -200, rotationX: 30 }, { y: 0, z: 0, rotationX: 0, duration: 1.0, ease: "expo.out", immediateRender: false }, END + 0.6);

    const CAPS = ${JSON.stringify(caps.map(c => [c.at, c.end]))};
    $$(".cap").forEach((cap, i) => {
      const [at, end] = CAPS[i];
      tl.set(cap, { opacity: 1 }, at);
      tl.set(cap, { opacity: 0 }, end);
    });`;
  const cues = cuesOf({ timing: T, cuts, land, rolls, copy });
  return { cls: 'film', body, inner, cues, duration, style: `--persp:${CAM_PERSPECTIVE.landscape}px;--persp-p:${CAM_PERSPECTIVE.portrait}px` };
}

// ── sound events ───────────────────────────────────────────────────────────
/**
 * The film's sound effects, on its clock, each a motion event the picture makes (MOTION.md, sound
 * events): the camera's travel, a card tilting in, a step marker lighting (a step higher each
 * step), the command typed, a result arriving, the end card. mix.mjs maps each kind to its sound.
 */
function cuesOf({ timing: T, cuts, land, rolls, copy }) {
  const cue = (at, kind, extra = {}) => ({ at: +at.toFixed(2), kind, ...extra });
  const out = [];
  for (const c of cuts) out.push(cue(c - T.travel / 2 + 0.05, 'travel'));
  out.push(cue(0.1, 'tilt'));
  out.push(cue(land.problem.right[0] ?? land.problem.left[0], 'land'));
  if (land.problem.mark != null) out.push(cue(land.problem.mark, 'arrive'));
  T.steps.forEach((st, k) => out.push(cue(st.voiceAt, 'step', { step: k })));
  out.push(cue(T.windowIn + 0.15, 'tilt'));
  // a key press every few characters typed, only while text is typed
  const typed = copy.window.lines.landscape.filter(l => copy.window.shell || l.focus).reduce((n, l) => n + [...l.text].length, 0);
  const start = T.preAt ?? T.cmdAt, every = Math.max(T.each * 3, 0.07);
  for (let t = start, n = 0; n < Math.min(typed / 3, 40) && t < start + T.typing; t += every, n++) out.push(cue(t, 'key', { n }));
  for (let i = 0; i < rolls; i++) out.push(cue(T.rollAt + i * ROLL_EVERY + 0.2, 'arrive'));
  if (T.answerAt) out.push(cue(T.answerAt + 0.25, 'arrive'));
  out.push(cue(land.result.hub, 'land'));
  // the first request reaching the card that answered
  out.push(cue(Math.max(land.result.right.at(-1) + 0.4, T.result.words[0] ?? 0) + 1.5, 'arrive', { n: 1 }));
  out.push(cue(T.end + 0.6, 'end'));
  return out.sort((a, b) => a.at - b.at);
}

// ── the look, in frame.md's tokens ─────────────────────────────────────────
// The terminal is the ink surface; an editor and a diagram card are hairline cards. The accent is on
// what just changed: the id in the command, the step being said, the card a request reached.
// Behind every panel a field of dots on a far plane drifts, so depth reads while the text holds still.
const DOTS = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ccircle cx='24' cy='24' r='2.4' fill='%23DCDCDC'/%3E%3C/svg%3E")`;
export const CSS = `
  .film{--sy:${WIN.landscape.sy}px;--sh:${WIN.landscape.sh}px;--sl:96px;--sr:96px;--gap:${WIN.landscape.gap}px;--cap3:64px;--tw:${WIN.landscape.width}px}
  /* the camera: a perspective, then one wrapper per move (pull back, swing, push in, turn, travel) */
  .film .cam{position:absolute;inset:0;perspective:var(--persp);perspective-origin:50% 50%}
  .film .cpull,.film .carc,.film .cpush,.film .crotx,.film .croty,.film .cpos{position:absolute;inset:0;transform-style:preserve-3d;transform-origin:50% 50% 0}
  .film .pn{position:absolute;inset:0;transform-style:preserve-3d;transform-origin:50% 50% 0;backface-visibility:hidden}
  .film .bk{position:absolute;left:-50%;top:-50%;width:200%;height:200%;transform:translateZ(-520px);background-image:${DOTS};background-size:48px 48px;pointer-events:none}
  .film .hero,.film .h,.film .stp,.film .win,.film .end,.film .h2,.film .blk{backface-visibility:hidden}
  .film .win-host{position:absolute;inset:0;transform-style:preserve-3d}

  /* a step: its number in a marker, its label beside it; the marker is the accent while its step is said */
  .film .stp{position:absolute;left:var(--sl);right:var(--sr);top:0;transform-origin:0 0;opacity:0}
  .film .head{display:flex;align-items:flex-start;gap:${STEP.gap}px}
  .film .dt{margin:${STEP.detailGap}px 0 0 ${STEP.mark + STEP.gap}px;font-size:var(--ds);line-height:1.3;letter-spacing:-.01em;color:${C.ink2};white-space:nowrap}
  .film .dt .bp{display:none}
  .film .sm{position:relative;flex:none;width:${STEP.mark}px;height:${STEP.mark}px;border-radius:50%;display:grid;place-items:center;background:${C.accent};border:3px solid ${C.accent};color:${C.onInk};font-size:68px;font-weight:600;line-height:1;letter-spacing:-.04em}
  .film .sm b{position:relative;font-weight:600}
  .film .ring{position:absolute;inset:-3px;border-radius:50%;background:${C.accent};opacity:0}
  .film .sl{font-size:var(--ls);font-weight:600;line-height:${STEP.lh};letter-spacing:-.035em;white-space:nowrap;padding-top:calc((${STEP.mark}px - var(--ls) * ${STEP.lh}) / 2)}
  .film .sl .bp{display:none}
  .film .hero,.film .h,.film .end,.film .h2{position:absolute;left:var(--sl);right:var(--sr);top:0;text-align:center}
  .film .hero{display:flex;flex-direction:column;align-items:center;gap:40px;transform-style:preserve-3d}
  .film .tiles{display:flex;align-items:center;justify-content:center;gap:24px;transform-style:preserve-3d}
  .film .tile{width:160px;height:160px;display:grid;place-items:center}
  .film .tile .mk{width:92px;height:92px}
  .film .kick{height:80px;padding:0 32px;font-size:45px}
  .film .plus{width:48px;height:48px;fill:none;stroke:${C.muted};stroke-width:2;stroke-linecap:round}
  .film .h{font-size:var(--fs);font-weight:600;line-height:${TITLE_LH};letter-spacing:-.055em;white-space:nowrap}
  .film .h2{font-size:var(--cap3);font-weight:600;line-height:${TITLE_LH};letter-spacing:-.05em;white-space:nowrap}
  .film .h .bp,.film .h2 .bp,.film .kt .bp{display:none}

  /* the problem and the result: a badge, the line as kinetic type, and the diagram */
  .film .blk{position:absolute;left:var(--sl);right:var(--sr);top:0;display:flex;flex-direction:column;align-items:center;gap:${BLOCK.landscape.gap}px;transform-style:preserve-3d}
  .film .lbl{height:${BLOCK.badge}px;padding:0 32px;font-size:42px;color:${C.ink2}}
  .film .kt{font-size:var(--ks);font-weight:600;line-height:1.08;letter-spacing:-.04em;white-space:nowrap;text-align:center}
  .film .dg{position:relative;display:flex;align-items:center;justify-content:center;gap:200px;transform-style:preserve-3d}
  .film .dg.result{gap:110px}
  .film .dg:has(.nt){margin-bottom:${NOTE_H}px}
  .film .col{display:flex;flex-direction:column;align-items:center;gap:22px;transform-style:preserve-3d}
  .film .col.l{align-items:flex-end}
  .film .col.r{align-items:flex-start}
  .film .no-left .col.r{align-items:center}
  .film .edges{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
  .film .ed{fill:none;stroke:${C.ink2};stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
  .film .ed.broke{stroke:${C.muted}}
  .film .pulse{fill:${C.accent}}
  .film .nd{display:inline-flex;align-items:center;gap:${NODE.markGap}px;padding:22px ${NODE.padX}px;border-radius:28px;font-size:var(--nd);font-weight:600;letter-spacing:-.02em;line-height:1.1;white-space:nowrap;color:${C.ink}}
  .film .nd .mk{width:${NODE.mark}px;height:${NODE.mark}px}
  .film .nd .nl.mono{font-size:var(--ndm);font-weight:500;letter-spacing:0}
  .film .nd[data-state="off"]{color:${C.muted};border-style:dashed}
  .film .nd[data-state="on"]{border-color:${C.accent};color:${C.accent}}
  .film .nd.hub{background:${C.ink};border-color:${C.ink};color:${C.onInk}}
  .film .nd.hub svg{width:${NODE.mark}px;height:${NODE.mark}px;display:block}
  .film .tg{position:absolute;left:0;top:0;padding:8px 22px;border-radius:999px;border:3px solid ${C.accent};background:${C.bg};color:${C.accent};font-size:${TAG_PX}px;white-space:nowrap}
  .film .fl{position:absolute;left:0;top:0;padding:10px 26px;border-radius:999px;background:${C.accent};color:${C.onInk};font-size:42px;font-weight:600;white-space:nowrap}
  /* the note is centred on the diagram even when it is wider than it */
  .film .nt{position:absolute;left:-1000px;right:-1000px;top:100%;margin-top:44px;text-align:center;font-size:40px;color:${C.ink2};white-space:nowrap}

  .film .win{position:absolute;top:0;left:${winLeft('landscape')}px;width:var(--tw)}
  .film .term{overflow:hidden;border-radius:32px}
  .film .term.is-ink{background:${C.ink};border:2px solid ${C.ink};color:${C.onInk}}
  .film .term.card{color:${C.ink}}
  .film .bar{position:relative;height:${BAR}px;display:flex;align-items:center;justify-content:center;padding:0 ${TTL_PAD}px;border-bottom:2px solid ${C.line}}
  .film .is-ink .bar{border-bottom-color:${C.ink2}}
  .film .dots{position:absolute;left:30px;top:50%;margin-top:-7px;display:flex;gap:10px}
  .film .dots i{width:14px;height:14px;border-radius:50%;background:${C.line};flex:none}
  .film .is-ink .dots i{background:${C.ink2}}
  .film .ttl{text-align:center;font-family:'Geist Mono',ui-monospace,monospace;font-size:${TTL_PX}px;color:${C.muted};white-space:pre}
  .film .ttl.off-l{display:none}
  .film .is-ink .ttl{color:${C.onInkMuted}}
  .film .code{--adv:${WIN.landscape.adv}em;padding:${WIN.landscape.padTop}px ${WIN.landscape.padX}px ${WIN.landscape.padBottom}px;font-family:'Geist Mono',ui-monospace,monospace;font-size:var(--cs);line-height:${CODE_LH}}
  .film .ln{min-height:${CODE_LH}em;white-space:pre}
  .film .ln.ctx{color:${C.muted}}
  .film .sh .ln.typed:not(.focus){color:${C.onInkMuted}}
  .film .sh .ln::before{content:"$ ";color:${C.onInkMuted}}
  .film .sh .ln.cont::before{content:none}
  .film .tok{display:inline-block;white-space:pre;vertical-align:top;text-indent:0}
  .film .c{opacity:0}
  .film .m{color:${C.accent}}
  .film .is-ink .m{color:${C.accentOnInk}}
  .film .also{margin-top:${ALSO.gap}px;height:${ALSO.h}px;display:flex;align-items:center;gap:.4em;font-size:${ALSO.px.landscape}px;font-weight:500;color:${C.ink2};white-space:pre;opacity:0}
  .film .roll{position:relative;display:inline-block;height:1.45em;vertical-align:top}
  .film .ri{position:absolute;left:0;top:0;white-space:pre;font-style:normal}
  .film em.ri{opacity:0}
  .film .ans{overflow:hidden}
  .film .rows{position:relative}
  .film .rows > .ln{position:relative}
  .film .rows.rp{display:none}
  .film .glow{position:absolute;left:calc(var(--adv) * -1);right:calc(var(--adv) * -1);top:0;border-radius:10px;background:rgba(187,77,0,.14);pointer-events:none}
  .film .is-ink .glow{background:rgba(240,145,90,.24)}
  .film .sel{position:absolute;left:calc(var(--adv) * -1);right:calc(var(--adv) * -1);top:0;border-radius:10px;background:${C.accent};pointer-events:none}
  .film .ln[data-on="1"],.film .ln[data-on="1"] *{color:${C.onInk}}
  .film .ln.out{position:absolute;left:0;right:0;top:100%;padding-top:.3em;border-top:2px solid ${C.line};opacity:0}
  .film .is-ink .ln.out{border-top-color:${C.ink2}}
  .film .caret{display:inline-block;width:.56em;height:1.1em;margin-left:4px;vertical-align:-.2em;background:${C.ink};opacity:0}
  .film .is-ink .caret{background:${C.onInk}}

  /* a real screen in its frame: a browser bar with its address, or a terminal bar with its command */
  .film .sf{position:absolute;top:0;left:0;border-radius:24px;overflow:hidden;border:2px solid ${C.line};background:${C.bg}}
  .film .sb{position:relative;height:64px;display:flex;align-items:center;justify-content:center;padding:0 120px;border-bottom:2px solid ${C.line}}
  .film .su{font-size:${BAR_PX}px;font-weight:500;color:${C.muted};white-space:pre}
  .film .sv{position:relative;overflow:hidden;aspect-ratio:16/9;background:${C.bg}}
  .film .sk .sv{aspect-ratio:auto}
  .film .si{display:block;width:100%;max-width:none;transform-origin:30% 0}
  .film .hl{position:absolute;left:0;top:0;border:4px solid ${C.accent};border-radius:10px;background:rgba(187,77,0,.08);display:none}
  .film .ll{position:absolute;left:${ACROSS.portrait.left}px;top:0;width:${ACROSS.portrait.width}px;display:none;transform-style:preserve-3d}
  .film .lt{padding:14px ${LIVE.padX}px 16px;border:${LIVE.border}px solid ${C.accent};border-radius:22px;background:${C.bg};color:${C.ink};font-weight:600;letter-spacing:-.02em;line-height:1.22}
  .film .lt.mono{font-weight:500;letter-spacing:-.03em}
  .film .sf.tm{background:${C.ink};border-color:${C.ink}}
  .film .sf.tm .sb{border-bottom-color:${C.ink2}}
  .film .sf.tm .su{color:${C.onInkMuted}}
  /* the end card: the live page beside the lockup, or over it in portrait */
  .film .cblk{position:absolute;left:var(--sl);right:var(--sr);top:0;display:flex;flex-direction:column;align-items:center;gap:48px;transform-style:preserve-3d}
  .film .crow{display:flex;flex-direction:row-reverse;align-items:center;justify-content:center;gap:${CLOSE.gap}px;width:100%;transform-style:preserve-3d}
  .film .pagef{position:relative;flex:none;width:${CLOSE.page}px}
  .film .pagef .ip{display:none}
  /* the page's own column, zoomed past its margins; the link is in the pill beside it */
  .film .pagef .sv{aspect-ratio:16/10}
  .film .pagef .il{width:140%;margin-left:-23%}
  .film .ccol{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:40px;transform-style:preserve-3d}
  .film .ccol .h2,.film .ccol .end{position:relative;left:auto;right:auto;top:auto}
  .film .p-close .lock svg{width:104px;height:104px}
  .film .p-close .lock b{font-size:104px}
  .film .end{display:flex;flex-direction:column;align-items:center;gap:48px;transform-style:preserve-3d}
  .film .lock{display:flex;align-items:center;gap:32px;transform-style:preserve-3d}
  .film .lock svg{width:144px;height:144px;display:block}
  .film .lock b{font-size:144px;font-weight:600;letter-spacing:-.055em;line-height:1}
  .film .url{font-size:var(--us);font-weight:500;letter-spacing:-.01em;color:${C.onInk};background:${C.ink};padding:22px ${URL_PAD.landscape}px;border-radius:32px;white-space:pre}

  .film .caps{position:absolute;left:0;right:0;top:${CAP.landscape.top}px;height:${CAP.landscape.height}px;pointer-events:none}
  .film .cap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0}
  .film .cap span{padding:12px ${CAP.padX}px 14px;border-radius:14px;background:rgba(10,10,10,.84);color:${C.onInk};font-size:var(--cf);font-weight:500;line-height:1.25;letter-spacing:-.005em;white-space:pre}

  @media (orientation: portrait){
    .film{--sy:${WIN.portrait.sy}px;--sh:${WIN.portrait.sh}px;--sl:60px;--sr:120px;--gap:${WIN.portrait.gap}px;--cap3:64px;--tw:${WIN.portrait.width}px}
    .film .cblk{gap:36px}
    .film .crow{flex-direction:column;gap:36px}
    .film .pagef{width:900px}
    .film .pagef .sv{aspect-ratio:auto}
    .film .hl{display:block}
    .film .ll{display:block}
    .film .pagef .ip{width:100%;margin-left:0}
    .film .pagef .il{display:none}
    .film .pagef .ip{display:block}
    .film .p-close .lock svg{width:88px;height:88px}
    .film .p-close .lock b{font-size:88px}
    .film .cam{perspective:var(--persp-p)}
    .film .sl{font-size:var(--ls-p);padding-top:calc((${STEP.mark}px - var(--ls-p) * ${STEP.lh}) / 2)}
    .film .sl .bl,.film .dt .bl{display:none}
    .film .sl .bp,.film .dt .bp{display:inline}
    .film .dt{font-size:var(--ds-p)}
    .film .tile{width:${TILE.portrait}px;height:${TILE.portrait}px}
    .film .tile .mk{width:112px;height:112px}
    .film .h{font-size:var(--fs-p)}
    .film .h .bl,.film .h2 .bl,.film .kt .bl{display:none}
    .film .h .bp,.film .h2 .bp,.film .kt .bp{display:inline}
    .film .kt{font-size:var(--ks-p)}
    /* the line under its badge at the top of the safe area, the picture at its foot */
    .film .blk{gap:${BLOCK.portrait.gap}px;height:var(--sh)}
    .film .blk .kt{margin-bottom:auto}
    .film .dg:has(.fl){margin-bottom:${FAIL_H}px}
    .film .dg{gap:60px}
    .film .dg.stack-p{flex-direction:column;gap:${BLOCK.portrait.stackGap}px}
    .film .dg.stack-p .col{align-items:center}
    .film .dg.result .col{flex-direction:row;flex-wrap:nowrap;justify-content:center;gap:18px}
    .film .dg.result .col.tall{flex-direction:column;align-items:center}
    .film .nd{font-size:var(--nd-p);padding:16px 26px}
    .film .nd .nl.mono{font-size:var(--ndm-p)}
    .film .win{left:${winLeft('portrait')}px}
    .film .term{border-radius:28px}
    .film .code{--adv:${WIN.portrait.adv}em;letter-spacing:${(WIN.portrait.adv - 0.6).toFixed(2)}em;font-size:var(--cs-p);padding:${WIN.portrait.padTop}px ${WIN.portrait.padX}px ${WIN.portrait.padBottom}px}
    .film .also{font-size:${ALSO.px.portrait}px}
    .film .rows.rl{display:none}
    .film .rows.rp{display:block}
    .film .ttl.off-l{display:block}
    .film .ttl.off-p{display:none}
    .film .lock svg{width:120px;height:120px}
    .film .lock b{font-size:120px}
    .film .url{font-size:var(--us-p);padding:24px ${URL_PAD.portrait}px;border-radius:28px}
    .film .caps{left:${ACROSS.portrait.left}px;right:${1080 - ACROSS.portrait.left - ACROSS.portrait.width}px;top:${CAP.portrait.top}px;height:${CAP.portrait.height}px}
    .film .cap span{font-size:var(--cf-p)}
  }`;
