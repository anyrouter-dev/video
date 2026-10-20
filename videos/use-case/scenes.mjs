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
import { PORTRAIT_CAPTION_BAND } from '../../shared/authoring/portrait.mjs';

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
    portrait: { sizes: [148, 140, 132, 124, 120], width: SAFE.portrait, lines: 5 } },
  // a step's label sits beside its marker (STEP.mark), so its box is the safe width less the marker and the gap
  step: { weight: 600, tracking: -0.035,
    landscape: { sizes: [120, 112, 104, 96, 88, 80, 72], width: SAFE.landscape - 96 - 36, lines: 2 },
    portrait: { sizes: [88, 80, 72, 64, 56], width: SAFE.portrait - 96 - 36, lines: 3 } },
};
TYPE.detail = { weight: 400, tracking: -0.01,
  landscape: { sizes: [56, 52, 48, 44, 40, 36], width: TYPE.step.landscape.width, lines: 3 },
  portrait: { sizes: [48, 44, 40, 36, 32], width: TYPE.step.portrait.width, lines: 7 } };
// A step: its marker and label beside it, active; a step done shrinks to a row at STEP.done of its size.
// The page's own sentence for a step sits under its label, indented to it, until the step is done.
export const STEP = { mark: 96, gap: 36, lh: 1.04, done: 0.5, rowGap: 18, headGap: 40, detailGap: 28 };

// The marks and the kicker over the headline in beat 1, as the CSS below sets them: tile, gap, kicker.
const HERO = { landscape: 160 + 40 + 80, portrait: 144 + 40 + 80 };

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
  const splits = k => (named(words[k - 1], k - 1) && named(words[k], k) && !/[,.:;]$/.test(words[k - 1]) ? 1 : 0);
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
  return best && { lines: best.starts.length + 1, breaks: best.starts };
}

/** How the headline is set at `px` in frame `o` (see breakSet): beat 1 fits the safe area once the camera has leaned in. */
export function titleSet(text, o, px) {
  const t = TYPE.title, w = WIN[o];
  return breakSet(text, { px, width: t[o].width, weight: t.weight, tracking: t.tracking, room: n => n <= t[o].lines && HERO[o] + w.gap + n * px * TITLE_LH <= w.sh / w.lean });
}

/** The headline's size per frame: the largest that sets. */
export const titleType = text => Object.fromEntries(['landscape', 'portrait'].map(o => [o, TYPE.title[o].sizes.find(px => titleSet(text, o, px))]));

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
// at 32px, the floor.
const WIN = {
  landscape: { sizes: [56, 52, 48, 44, 40], width: 1728, padX: 48, padTop: 40, padBottom: 44, sy: 64, sh: 836, gap: 56, lean: 1.02, pushMax: 1.02, adv: 0.6 },
  portrait: { sizes: [44, 40, 36, 32], width: 900, padX: 16, padTop: 44, padBottom: 52, sh: 1100, gap: 48, lean: 1.015, pushMax: 1.01, adv: 0.57 },
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
  padX: 28, room: { landscape: 1920 * 0.84, portrait: 900 }, say: 1.35,
};
const capFitsAt = (text, o, px) => widthOf(text, { px, weight: 500, tracking: -0.005 }) <= CAP.room[o] - 2 * CAP.padX - 4;
const capFits = text => ['landscape', 'portrait'].every(o => capFitsAt(text, o, CAP[o].px));
// a lone word wider than the chip (a short link) is set smaller, down to the 32px floor
const capPx = (text, o) => [CAP[o].px, 56, 52, 48, 44, 40, 36, 32].filter(px => px <= CAP[o].px).find(px => capFitsAt(text, o, px)) ?? 32;
// a word that is part of a name, as named() reads one: past a sentence's first word, any capitalised word
// pairs read as one term, so a phrase never ends between them
const BOUND = /^(base URL|API key|rate limited|typed answer|more than|model id|catalog id)[,.]?$/i;
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
    const end = Math.min(next ? next[0].at - 0.05 : Infinity, Math.max(p.at(-1).end + 0.3, at + 0.8));
    const text = p.map(w => w.text).join(' ');
    return { text, at, end: +end.toFixed(2), px: { landscape: capPx(text, 'landscape'), portrait: capPx(text, 'portrait') } };
  });
}

// The short link on the lockup sits on one row, as large as fits the safe width once the camera
// has leaned in; a link too long for that keeps the lockup still (`lean` 1) in that frame, and
// one that fits neither way fails the build: a link cut across rows reads as two addresses.
const URL_SIZES = { landscape: [48, 44, 40], portrait: [44, 40, 36, 32] }, URL_PAD = { landscape: 44, portrait: 24 }, URL_ADV = 0.57;
export function urlSet(link) {
  const set = o => {
    for (const lean of [2 * WIN[o].lean - 1, 1]) {
      const room = ACROSS[o].width / lean - 2 * URL_PAD[o], px = URL_SIZES[o].find(x => [...link].length * URL_ADV * x <= room);
      if (px) return { text: link, px, lean };
    }
    throw new Error(`the short link ${link} does not sit on one row of the ${o} lockup`);
  };
  return { landscape: set('landscape'), portrait: set('portrait') };
}

// ── the shot ───────────────────────────────────────────────────────────────
// How long each id holds in a roll. Each wash is shorter, so one never fades over the next.
export const ROLL_EVERY = 0.9;

/** The film's one sub-composition: { cls, body, inner, cues }. */
export function filmScene({ copy, beats, duration, timing, said }) {
  const caps = captionsOf(said);
  const url = urlSet(copy.link);
  const tiles = copy.marks.map(f => `<div class="tile card">${mark(f)}</div>`).join('');
  const { roll } = copy.window;
  const rolls = roll ? roll.ids.length : 0;
  const steps = copy.steps.map((st, k) => `<div class="stp" style="${fsVars(copy.type.step, 'ls')};${fsVars(copy.type.detail, 'ds')}">
      <div class="head"><span class="sm"><i class="ring"></i><b>${k + 1}</b></span><div class="sl">${masked(st.label, st.breaks)}</div></div>
      ${st.detail ? `<p class="dt">${masked(st.detail.text, st.detail.breaks)}</p>` : ''}</div>`).join('');
  // The camera scales and dollies the whole frame a few percent on purpose, so the layout audit is told so.
  const body = `<div class="cam" data-layout-allow-overflow><div class="deep">
    <div class="hero"><div class="tiles">${tiles}${tiles ? PLUS : ''}<div class="tile card">${mark('anyrouter-color.svg')}</div></div>
      <div class="badge kick">${esc(copy.kicker)}</div></div>
    <h1 class="h" style="${fsVars(copy.type.title)}">${masked(copy.title, copy.type.breaks)}</h1>
    ${steps}
    <div class="end"><div class="lock">${LOGO}<b>AnyRouter</b></div>
      <div class="url mono" style="--us:${url.landscape.px}px;--us-p:${url.portrait.px}px">${esc(copy.link)}</div></div></div>
    <div class="flat">${windowHtml(copy.window)}</div></div>
    <div class="caps" data-outside-safe-area>${caps.map(c => `<div class="cap" data-layout-allow-overlap><span style="${fsVars(c.px, 'cf')}">${esc(c.text)}</span></div>`).join('')}</div>`;
  const T = timing, S = T.steps;
  const inner = `
    const STEPS = ${JSON.stringify(S)}, T1 = STEPS[0].at, END = ${T.end}, W_IN = ${T.windowIn}, W_OUT = ${T.windowOut};
    const PRE_AT = ${T.preAt}, CMD_AT = ${T.cmdAt}, INSTALL = ${T.preAt != null}, EACH = ${T.each}, LINE_PAUSE = ${T.linePause};
    const ROLL_AT = ${T.rollAt}, ROLL_EVERY = ${ROLL_EVERY}, ROLLS = ${rolls}, ANSWER_AT = ${T.answerAt}, POINT_AT = ${T.pointAt};
    const uc = $(".uc"), css = getComputedStyle(uc), v = n => parseFloat(css.getPropertyValue(n));
    const SY = v("--sy"), SH = v("--sh"), G = v("--gap"), LEAN = v("--lean"), DONE = ${STEP.done}, RG = ${STEP.rowGap}, HG = ${STEP.headGap};
    const cam = $(".cam"), END_LEAN = v("--end");
    const hero = $(".hero"), h = $(".h"), win = $(".win"), end = $(".end"), stp = $$(".stp");
    // the code this frame shows
    const rows = $$(".rows").find(r => getComputedStyle(r).display !== "none"), R = s => Array.from(rows.querySelectorAll(s));

    // 1 · what and why. The headline sits in the middle of the safe area; the marks close in, the words
    // rise, the camera leans in.
    const fs = parseFloat(getComputedStyle(h).fontSize), heroH = hero.offsetHeight, hH = h.offsetHeight;
    const top1 = SY + (SH - heroH - G - hH) / 2;
    hero.style.top = top1 + "px";
    h.style.top = top1 + heroH + G + "px";
    const tiles = $$(".tile, .plus"), mid = (tiles.length - 1) / 2;
    tl.fromTo(tiles, { x: i => (i - mid) * 48 }, { x: 0, duration: 1.4, ease: "expo.out" }, 0);
    tl.fromTo(Q(".kick"), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, ease: "expo.out" }, 0.1);
    // every word is up within half a second, however long the headline: a word still under its
    // mask sits a line low, and on a long headline that line is past the safe area
    const words = $$(".h .w > span");
    tl.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 0.6, stagger: Math.min(0.05, 0.2 / words.length), ease: "expo.out" }, 0.05);
    tl.fromTo(cam, { scale: 1 }, { scale: LEAN, duration: T1, ease: "none" }, 0);

    // 1 → 2 · the headline falls back into the page as the steps begin, and the camera squares up to them.
    // it is gone before the first step comes in where it stood
    tl.to([hero, h], { z: -700, rotationX: 24, y: "-=140", opacity: 0, duration: 0.6, ease: "power3.in" }, T1 - 0.65);
    tl.to(cam, { scale: 1, duration: 0.8, ease: "power3.inOut" }, T1 - 0.65);

    // 2 · the steps. Each tilts in from deep in the page and settles flat to read; a step done shrinks to a
    // row above the next, a layer back, so the camera's slow dolly moves it less than the step in front.
    // a step done is its head alone, its detail gone
    const hs = stp.map(e => e.offsetHeight), heads = stp.map(e => e.querySelector(".head").offsetHeight), winH = win.offsetHeight;
    const doneY = k => SY + heads.slice(0, k).reduce((y, x) => y + x * DONE + RG, 0);
    // a step and, when it shows the window, the window under it: one block, centred in the room left
    const place = k => {
      const block = hs[k] + (STEPS[k].shows ? HG + winH : 0), top = doneY(k) + Math.max(0, (SY + SH - doneY(k) - block) / 2);
      return { top, win: top + hs[k] + HG };
    };
    tl.fromTo(Q(".deep"), { z: 0 }, { z: v("--dolly"), duration: END - T1, ease: "none" }, T1);
    STEPS.forEach((st, k) => {
      const el = stp[k], at = place(k).top, next = STEPS[k + 1];
      tl.set(el, { y: at }, 0);
      // a later step comes in once the one before has made room, so the two never cross
      const enter = st.at + (k ? 0.45 : 0);
      tl.fromTo(el, { z: -480, rotationX: -26, rotationY: k % 2 ? -9 : 9, y: at + 90, opacity: 0 },
        { z: 0, rotationX: 0, rotationY: 0, y: at, opacity: 1, duration: 1.1, ease: "expo.out", immediateRender: false }, enter);
      el.querySelectorAll(".sl .w > span").forEach(w => tl.fromTo(w, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: "expo.out", immediateRender: false }, enter + 0.15));
      // the page's sentence rises a row at a time while the step is said and after, and goes once the step is done
      const dw = Array.from(el.querySelectorAll(".dt .w")), until0 = (next ? next.at : END) - 0.5;
      if (dw.length) {
        const rowsOfDt = Object.values(Object.groupBy(dw, w => w.offsetTop)).map(ws => ws.map(w => w.firstElementChild));
        const gap = Math.min(1.2, Math.max(0.3, (until0 - st.voiceAt - 0.6) / rowsOfDt.length));
        rowsOfDt.forEach((ws, r) => tl.fromTo(ws, { yPercent: 110 }, { yPercent: 0, duration: 0.3, ease: "power3.out", immediateRender: false }, st.voiceAt + 0.3 + r * gap));
        if (next) tl.to(el.querySelector(".dt"), { opacity: 0, duration: 0.3, ease: "none" }, next.at);
      }
      // the marker lights as its step is said, and goes to ink once the next one comes
      tl.fromTo(el.querySelector(".sm"), { scale: 0.6 }, { scale: 1, duration: 0.5, ease: "back.out(2)", immediateRender: false }, st.voiceAt);
      // once its line is said, a ring breathes out of the marker until the next step: the step is still the one to do
      const ring = el.querySelector(".ring"), until = (next ? next.at : END) - 0.3;
      for (let r = st.voiceAt + 1.6; r + 0.9 < until; r += 1.2) tl.fromTo(ring, { scale: 1, opacity: 0.45 }, { scale: 2.6, opacity: 0, duration: 0.5, ease: "power2.out", immediateRender: false }, r);
      if (next) {
        tl.to(el, { y: doneY(k), z: -70, scale: DONE, duration: 0.6, ease: "power4.inOut" }, next.at - 0.1);
        tl.to(el.querySelector(".sm"), { backgroundColor: "${C.bg}", borderColor: "${C.ink}", color: "${C.ink}", duration: 0.4, ease: "none" }, next.at);
      }
    });
    tl.to(stp, { z: -600, y: "-=120", opacity: 0, duration: 0.5, stagger: 0.04, ease: "power3.in" }, END - 0.55);

    // The window comes in with the first step that shows it, follows its steps down, and drops back out.
    const firstWin = STEPS.findIndex(st => st.shows);
    tl.set(win, { autoAlpha: 0, y: place(firstWin).win }, 0);
    tl.set(win, { autoAlpha: 1 }, W_IN + 0.15);
    tl.fromTo(win, { z: -420, rotationX: 18, y: place(firstWin).win + 160 }, { z: 0, rotationX: 0, y: place(firstWin).win, duration: 1.1, ease: "expo.out", immediateRender: false }, W_IN + 0.15);
    STEPS.forEach((st, k) => { if (st.shows && k > firstWin) tl.to(win, { y: place(k).win, duration: 0.8, ease: "power4.inOut" }, st.at); });
    tl.to(win, { z: -500, rotationX: -14, y: "-=60", duration: 0.4, ease: "power3.in" }, W_OUT - 0.1);
    tl.set(win, { autoAlpha: 0 }, W_OUT + 0.3);

    // Lines of context paste in with the window; lines before the command are typed on their step, the command on its own.
    if (R(".ln.ctx, .ln.keep").length) tl.fromTo(R(".ln.ctx, .ln.keep"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }, W_IN + 0.5);
    const typed = R(".typed"), PRE = INSTALL ? Math.max(0, typed.findIndex(l => l.classList.contains("focus"))) : 0;
    let t = 0;
    typed.forEach((ln, k) => {
      if (k === 0) t = PRE ? PRE_AT : CMD_AT;
      else if (k === PRE) t = Math.max(t + LINE_PAUSE, CMD_AT);
      else t += LINE_PAUSE;
      // a later line, prompt and all, shows only once it starts
      if (k > 0) { tl.set(ln, { opacity: 0 }, 0); tl.set(ln, { opacity: 1 }, t); }
      // the rolled-in ids are not typed: only the characters of the line and its first id
      ln.querySelectorAll(".c").forEach(c => { tl.set(c, { opacity: 1 }, t); t += EACH; });
    });
    // the caret sits after the last line, blinking until the window leaves or the answer comes
    const caret = R(".caret").at(-1), still = ANSWER_AT ?? W_OUT;
    for (let b = t + 0.05, on = 1; b < still; b += 0.45, on = 1 - on) tl.set(caret, { opacity: on }, b);
    if (ANSWER_AT) tl.set(caret, { opacity: 0 }, still);

    // The request is answered through the fallback: the code scrolls up and the header the page's curl prints arrives under it.
    if (ANSWER_AT) {
      // it scrolls by the top padding and whole rows, so the window's top edge never cuts a row in half
      const out = R(".out")[0], cs = getComputedStyle($(".code")), row = parseFloat(cs.fontSize) * ${CODE_LH};
      let by = parseFloat(cs.paddingTop);
      while (by < out.offsetHeight - parseFloat(cs.paddingBottom)) by += row;
      tl.to(rows, { y: -by, duration: 0.6, ease: "power4.inOut" }, ANSWER_AT);
      tl.fromTo(out, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "expo.out" }, ANSWER_AT + 0.25);
    }

    // Under the window, the ids the same key runs come in one after another.
    if (ROLLS) {
      const also = $(".also"), slot = also.querySelector(".roll"), items = Array.from(slot.children);
      slot.style.width = Math.max(...items.map(x => x.offsetWidth)) + "px";
      tl.fromTo(also, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out", immediateRender: false }, ROLL_AT - 0.3);
      items.forEach((into, i) => {
        const at = ROLL_AT + i * ROLL_EVERY, out = items[i - 1];
        // the old id is gone before the new one shows, so two ids are never drawn over each other
        if (out) tl.fromTo(out, { y: 0, opacity: 1 }, { y: "-0.7em", opacity: 0, duration: 0.2, ease: "power4.in", immediateRender: false }, at);
        tl.fromTo(into, { y: "0.7em", opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "expo.out", immediateRender: false }, at + 0.2);
      });
    }

    // A tint comes up under the command as it starts to be typed (t is where the typing ended). Once all is said and
    // shown, it points out each line the page changes in turn until the window leaves; a lone line
    // breathes, so the frame never stands still.
    const lit = R(".ln.keep, .ln.focus, .ln.typed, .ln.out"), first = Math.max(0, lit.findIndex(l => l.classList.contains("focus")));
    if (lit.length) {
      const glow = document.createElement("div");
      glow.className = "glow";
      rows.prepend(glow);
      const to = ln => ({ y: ln.offsetTop, height: ln.offsetHeight });
      tl.set(glow, { ...to(lit[first]), opacity: 0 }, 0);
      tl.to(glow, { opacity: 1, duration: 0.3, ease: "power2.out" }, CMD_AT);
      // and flashes as the typing ends, so the line just typed is the one to read
      tl.fromTo(glow, { opacity: 0.2 }, { opacity: 1, duration: 0.3, ease: "power2.out", immediateRender: false }, t);
      for (let t = POINT_AT + 0.3, k = first + 1; t < W_OUT - 0.3; t += 1.1, k++) {
        if (lit.length > 1) tl.to(glow, { ...to(lit[k % lit.length]), duration: 0.5, ease: "power3.inOut" }, t);
        else tl.to(glow, { opacity: k % 2 ? 0.45 : 1, duration: 0.5, ease: "sine.inOut" }, t);
      }
    }

    // 3 · the lockup: the headline comes back above it, small, and the short link lands under it.
    const s3 = v("--cap3") / fs, cap3 = SY + (SH - hH * s3 - G - end.offsetHeight) / 2;
    end.style.top = cap3 + hH * s3 + G + "px";
    tl.set(h, { y: cap3 - (top1 + heroH + G), scale: s3, rotationX: 0 }, END);
    tl.fromTo(h, { z: -500, opacity: 0 }, { z: 0, opacity: 1, duration: 1.0, ease: "expo.out", immediateRender: false }, END + 0.2);
    tl.fromTo(Q(".lock svg"), { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.0, ease: "expo.out" }, END + 0.35);
    tl.fromTo(Q(".lock b"), { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 1.0, ease: "expo.out" }, END + 0.45);
    // the ink pill never fades (half faded it reads as grey): it shows whole and flies forward from the page
    tl.set(Q(".url"), { opacity: 0 }, 0);
    tl.set(Q(".url"), { opacity: 1 }, END + 0.6);
    tl.fromTo(Q(".url"), { y: 40, z: -200 }, { y: 0, z: 0, duration: 1.0, ease: "expo.out", immediateRender: false }, END + 0.6);
    // the lockup holds while the camera keeps leaning in, at an even speed to the last frame: an eased lean
    // comes to rest, and a frame at rest reads as dead air
    tl.fromTo(cam, { scale: 1 }, { scale: END_LEAN, duration: D - END, ease: "none", immediateRender: false }, END);

    // The captions: one phrase at a time, whole, under the picture, cut on and off as subtitles are:
    // a chip half faded in is grey text on grey
    const CAPS = ${JSON.stringify(caps.map(c => [c.at, c.end]))};
    $$(".cap").forEach((cap, i) => {
      const [at, end] = CAPS[i];
      tl.set(cap, { opacity: 1 }, at);
      tl.set(cap, { opacity: 0 }, end);
    });`;
  const cues = [
    { at: 0.15, kind: 'tick', gain: 0.45 },
    ...S.map(st => ({ at: st.at, kind: 'cut', gain: 0.35 })),
    ...(T.preAt != null ? [{ at: T.preAt, kind: 'type', dur: 1.2, gain: 0.4 }] : []),
    { at: T.cmdAt, kind: 'type', dur: Math.min(2.2, T.typing), gain: 0.45 },
    ...Array.from({ length: rolls }, (_, i) => ({ at: +(T.rollAt + i * ROLL_EVERY + 0.1).toFixed(2), kind: 'tick', gain: 0.4 })),
    ...(T.answerAt ? [{ at: +(T.answerAt + 0.25).toFixed(2), kind: 'tick', gain: 0.45 }] : []),
    { at: +(T.end + 0.35).toFixed(2), kind: 'end', gain: 0.55 },
  ];
  return { cls: 'film', body, inner, cues, duration, style: `--end-l:${url.landscape.lean};--end-p:${url.portrait.lean}` };
}

// ── the look, in frame.md's tokens ─────────────────────────────────────────
// The terminal is the ink surface; an editor is a hairline card. The command is
// the line in focus: on the ink it is white, its other lines muted; in the
// editor it is ink, its context muted. The accent is on the id in the command.
export const CSS = `
  .film{--sy:${WIN.landscape.sy}px;--sh:${WIN.landscape.sh}px;--sl:96px;--sr:96px;--gap:${WIN.landscape.gap}px;--cap3:96px;--tw:${WIN.landscape.width}px;--lean:${WIN.landscape.lean};--dolly:${dollyOf('landscape')}px;--end:var(--end-l)}
  /* the camera leans in about the safe area's centre, so nothing drifts out of it, and looks into the page:
     the deep layer dollies in, so what sits further back moves less (parallax) */
  .film .cam{position:absolute;inset:0;transform-origin:50% 50%;perspective:${PERSPECTIVE}px;perspective-origin:50% 50%}
  .film .deep{position:absolute;inset:0;transform-style:preserve-3d}
  /* the window is drawn at its own size, out of the dolly: it fills the safe width and must not grow past it */
  .film .flat{position:absolute;inset:0;transform-style:preserve-3d}
  .film .hero,.film .h,.film .stp,.film .win,.film .end{backface-visibility:hidden}
  /* a step: its number in a marker, its label beside it; the marker is the accent while its step is said */
  .film .stp{position:absolute;left:var(--sl);right:var(--sr);top:0;transform-origin:0 0;opacity:0}
  .film .head{display:flex;align-items:flex-start;gap:${STEP.gap}px}
  .film .dt{margin:${STEP.detailGap}px 0 0 ${STEP.mark + STEP.gap}px;font-size:var(--ds);line-height:1.3;letter-spacing:-.01em;color:${C.ink2};white-space:nowrap}
  .film .dt .bp{display:none}
  .film .sm{flex:none;width:${STEP.mark}px;height:${STEP.mark}px;border-radius:50%;display:grid;place-items:center;background:${C.accent};border:3px solid ${C.accent};color:${C.onInk};font-size:68px;font-weight:600;line-height:1;letter-spacing:-.04em}
  .film .sm{position:relative}
  .film .sm b{font-weight:600}
  .film .ring{position:absolute;inset:-3px;border-radius:50%;background:${C.accent};opacity:0}
  .film .sm b{position:relative}
  .film .sl{font-size:var(--ls);font-weight:600;line-height:${STEP.lh};letter-spacing:-.035em;white-space:nowrap;padding-top:calc((${STEP.mark}px - var(--ls) * ${STEP.lh}) / 2)}
  .film .sl .bp{display:none}
  .film .hero,.film .h,.film .end{position:absolute;left:var(--sl);right:var(--sr);top:0;text-align:center}
  .film .hero{display:flex;flex-direction:column;align-items:center;gap:40px}
  .film .tiles{display:flex;align-items:center;justify-content:center;gap:24px}
  .film .tile{width:160px;height:160px;display:grid;place-items:center}
  .film .tile .mk{width:92px;height:92px}
  /* frame.md's badge a quarter larger: at 36px the kicker is a smudge on a phone */
  .film .kick{height:80px;padding:0 32px;font-size:45px}
  .film .plus{width:48px;height:48px;fill:none;stroke:${C.muted};stroke-width:2;stroke-linecap:round}
  .film .h{font-size:var(--fs);font-weight:600;line-height:${TITLE_LH};letter-spacing:-.055em;white-space:nowrap;transform-origin:50% 0}
  .film .h .bp{display:none}

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
  /* --adv is a glyph's advance: the unit rowsOf measures rows in */
  .film .code{--adv:${WIN.landscape.adv}em;padding:${WIN.landscape.padTop}px ${WIN.landscape.padX}px ${WIN.landscape.padBottom}px;font-family:'Geist Mono',ui-monospace,monospace;font-size:var(--cs);line-height:${CODE_LH}}
  /* a line of code is one row and never wraps; a blank line keeps its row */
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
  /* the answer: under the last row, behind a hairline, until the code scrolls up to it */
  .film .ans{overflow:hidden}
  .film .rows{position:relative}
  /* a line sits over the tint that points it out, which comes first in the rows */
  .film .rows > .ln{position:relative}
  .film .rows.rp{display:none}
  .film .glow{position:absolute;left:calc(var(--adv) * -1);right:calc(var(--adv) * -1);top:0;border-radius:10px;background:rgba(187,77,0,.14);pointer-events:none}
  .film .is-ink .glow{background:rgba(240,145,90,.24)}
  .film .ln.out{position:absolute;left:0;right:0;top:100%;padding-top:.3em;border-top:2px solid ${C.line};opacity:0}
  .film .is-ink .ln.out{border-top-color:${C.ink2}}
  .film .caret{display:inline-block;width:.56em;height:1.1em;margin-left:4px;vertical-align:-.2em;background:${C.ink};opacity:0}
  .film .is-ink .caret{background:${C.onInk}}

  .film .end{display:flex;flex-direction:column;align-items:center;gap:56px}
  .film .lock{display:flex;align-items:center;gap:32px}
  .film .lock svg{width:144px;height:144px;display:block}
  .film .lock b{font-size:144px;font-weight:600;letter-spacing:-.055em;line-height:1}
  /* the one thing to do next, so it is the ink card */
  .film .url{font-size:var(--us);letter-spacing:${(URL_ADV - 0.6).toFixed(2)}em;color:${C.onInk};background:${C.ink};padding:24px ${URL_PAD.landscape}px;border-radius:32px;white-space:pre}
  .film .url .up{display:none}

  .film .caps{position:absolute;left:0;right:0;top:${CAP.landscape.top}px;height:${CAP.landscape.height}px;pointer-events:none}
  .film .cap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0}
  .film .cap span{padding:12px ${CAP.padX}px 14px;border-radius:14px;background:rgba(10,10,10,.84);color:${C.onInk};font-size:var(--cf);font-weight:500;line-height:1.25;letter-spacing:-.005em;white-space:pre}

  @media (orientation: portrait){
    .film{--sy:200px;--sh:${WIN.portrait.sh}px;--sl:60px;--sr:120px;--gap:${WIN.portrait.gap}px;--cap3:80px;--tw:${WIN.portrait.width}px;--lean:${WIN.portrait.lean};--dolly:${dollyOf('portrait')}px;--end:var(--end-p)}
    .film .cam{transform-origin:510px 750px;perspective-origin:510px 750px}
    .film .sl{font-size:var(--ls-p);padding-top:calc((${STEP.mark}px - var(--ls-p) * ${STEP.lh}) / 2)}
    .film .sl .bl,.film .dt .bl{display:none}
    .film .sl .bp,.film .dt .bp{display:inline}
    .film .dt{font-size:var(--ds-p)}
    .film .tile{width:144px;height:144px}
    .film .tile .mk{width:84px;height:84px}
    .film .h{font-size:var(--fs-p)}
    .film .h .bl{display:none}
    .film .h .bp{display:inline}
    .film .win{left:${winLeft('portrait')}px}
    .film .term{border-radius:28px}
    /* a hair tighter than the font's own advance, so a 45-character URL sits whole across the safe width */
    .film .code{--adv:${WIN.portrait.adv}em;letter-spacing:${(WIN.portrait.adv - 0.6).toFixed(2)}em;font-size:var(--cs-p);padding:${WIN.portrait.padTop}px ${WIN.portrait.padX}px ${WIN.portrait.padBottom}px}
    .film .also{font-size:${ALSO.px.portrait}px}
    .film .rows.rl{display:none}
    .film .rows.rp{display:block}
    .film .ttl.off-l{display:block}
    .film .ttl.off-p{display:none}
    .film .lock svg{width:120px;height:120px}
    .film .lock b{font-size:120px}
    .film .url{font-size:var(--us-p);padding:24px ${URL_PAD.portrait}px;border-radius:28px}
    .film .url .ul{display:none}
    /* the band Reels, Shorts and TikTok leave clear (shared/authoring/portrait.mjs), across the safe width */
    .film .caps{left:${ACROSS.portrait.left}px;right:${1080 - ACROSS.portrait.left - ACROSS.portrait.width}px;top:${CAP.portrait.top}px;height:${CAP.portrait.height}px}
    .film .cap span{font-size:var(--cf-p)}
    .film .url .up{display:inline}
  }`;
