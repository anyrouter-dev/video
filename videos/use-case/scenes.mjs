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
};

// The marks and the kicker over the headline in beat 1, as the CSS below sets them: tile, gap, kicker.
const HERO = { landscape: 160 + 40 + 80, portrait: 144 + 40 + 80 };

// A word that is part of a name. Past the first word, any capitalised word; the first word only
// with a capital past its first letter, since "Run" opens a sentence and "NVIDIA" names a company.
const named = (w, i) => (i > 0 ? /^[A-Z0-9]/ : /^[A-Z0-9].*[A-Z]/).test(w);

/**
 * How the headline is set at `px` in frame `o`: { lines, breaks }, where breaks
 * are the word indices that start a line. Its fewest lines, as even as they
 * come, and never between two words of a name ("Claude Code", "OpenAI SDK")
 * when another set of breaks fits, taking one more line if it has to. The
 * browser's balancing knows no names, and takes extra lines to even them out.
 * Null when it cannot be set there: a word wider than the line (a word sits in
 * its own mask, which never breaks), more lines than the budget, or a beat 1
 * taller than the safe area once the camera has leaned in.
 */
export function titleSet(text, o, px) {
  const t = TYPE.title, w = WIN[o], words = text.split(/\s+/).filter(Boolean);
  const fewest = linesOf(text, { px, width: t[o].width, weight: t.weight, tracking: t.tracking, breakWords: false });
  const room = n => n <= t[o].lines && HERO[o] + w.gap + n * px * TITLE_LH <= w.sh / w.lean;
  const wide = (a, b) => widthOf(words.slice(a, b).join(' '), { px, weight: t.weight, tracking: t.tracking });
  const splits = k => (named(words[k - 1], k - 1) && named(words[k], k) && !/[,.:;]$/.test(words[k - 1]) ? 1 : 0);
  // a split name costs more than an extra line, and an extra line more than any unevenness
  let best = null;
  const walk = (from, left, starts) => {
    if (left === 1) {
      const cuts = [0, ...starts, words.length], widths = cuts.slice(1).map((b, i) => wide(cuts[i], b));
      if (widths.some(x => x > t[o].width)) return;
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

/** Whether the headline can be set at some size in both frames. */
export const setIn = text => ['landscape', 'portrait'].every(o => TYPE.title[o].sizes.some(px => titleSet(text, o, px)));
const fsVars = (fs_, name = 'fs') => `--${name}:${fs_.landscape}px;--${name}-p:${fs_.portrait}px`;

// The code window: as wide as the safe area, its text inside the padding. In
// beat 2 the caption and the window share the safe area's height (`sh`); the
// caption is the headline scaled down, never below `capMin`. The camera leans in
// over beat 1 (`lean`) and the window pushes in over beat 2, both about the
// middle, so a beat's column is sized to stay in the safe area at full scale.
// The push is at least `push`, which the code's room allows for, and as far as
// `pushMax` where the column leaves room: a slow push on a short window reads as a still.
// A row of code ends only at a space, so the longest token of a line sets how
// small its code may go. Portrait has the least room: its window spans the
// whole safe width, never pushes in, and sets its code a hair tighter (`adv`
// is a glyph's advance in em), which fits the API's 45-character URL whole at
// 32px. It steps down to `least` only when nothing larger has room.
const WIN = {
  landscape: { sizes: [56, 52, 48], width: 1728, padX: 48, padTop: 52, padBottom: 60, sy: 64, sh: 836, gap: 56, capMin: 64, lean: 1.02, push: 1.02, pushMax: 1.02, adv: 0.6 },
  portrait: { sizes: [44, 40, 36], least: 32, width: 900, padX: 16, padTop: 44, padBottom: 52, sh: 1020, gap: 48, capMin: 56, lean: 1.02, push: 1, pushMax: 1, adv: 0.57 },
};
// The safe area across each frame. The camera leans and the window pushes in about its centre.
const ACROSS = { landscape: { left: 96, width: 1728 }, portrait: { left: 60, width: 900 } };
/** The window's left and right edges at its fullest, leaned and pushed in all the way. */
export function windowSpan(o) {
  const w = WIN[o], a = ACROSS[o], mid = a.left + a.width / 2, half = w.width * w.lean * w.pushMax / 2;
  return { left: mid - half, right: mid + half };
}
/** The text inside the window's padding at its fullest, leaned and pushed in all the way. */
export function codeSpan(o) {
  const w = WIN[o], a = ACROSS[o], mid = a.left + a.width / 2, half = (w.width - EDGE - 2 * w.padX) * w.lean * w.pushMax / 2;
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

/**
 * A roll line cut where the id's own row starts: before the token that holds the
 * preset, as typedLine breaks it, so `anyrouter("anyrouter/free"),` keeps its
 * `anyrouter("` on the id's row.
 */
const slotOf = (text, preset) => {
  const at = text.indexOf(preset), start = text.lastIndexOf(' ', at - 1) + 1;
  return { before: text.slice(0, start), row: id => text.slice(start, at) + id + text.slice(at + preset.length) };
};

// Where a line's rows start: a shell line after its "$ " prompt, and wraps back to the
// left edge as a terminal does; a line of code at its indent, and wraps two past it, or
// at its indent when a token needs those two characters.
const leadOf = shell => (shell ? 2 : 0);
const hangsOf = (l, shell) => (shell ? [0] : [indentOf(l.text) + 2, indentOf(l.text)]);
// an id on a row of its own sits where a wrapped row of its line does, or two in from the edge in code
const idLead = shell => (shell ? 0 : 2);

/**
 * Whether `id`, rolled into the preset's place in `line`, sits whole on a row
 * of its own in both frames at their smallest code size. An id that needs more
 * would break mid-roll, so it does not roll.
 */
export function idFitsRow(line, preset, id, shell) {
  const row = slotOf(line.text, preset).row(id);
  return Object.keys(WIN).every(o => rowsOf(row, WIN[o].least ?? WIN[o].sizes.at(-1), o, { lead: idLead(shell), caret: true }) === 1);
}

/**
 * The headline and code sizes per orientation. The headline is the largest that
 * fits its line budget and leaves the window room for the code at its largest
 * size, since the caption keeps the headline's lines. The code is the largest at
 * which every line, each roll id in place, wraps only at spaces with its prompt
 * and caret, and the window still leaves room for the caption at its smallest.
 * A size that sets the command, and each line it changes, on one row wins over a larger one that wraps them.
 * When the longest roll id does not fit its line, the id moves to a row of its
 * own, for every id, so the line never reflows mid-roll. With `least`, portrait
 * may step down to its last-resort size. Null when no size leaves the caption its room.
 */
export function codeSizes(lines, roll, shell, title, least = false) {
  const isTyped = l => shell || l.focus;
  const variants = l => (roll && l.focus ? [roll.preset, ...roll.ids].map(id => l.text.replace(roll.preset, id)) : [l.text]);
  const rowsWith = (l, t, px, o, hang) => rowsOf(t, px, o, { lead: leadOf(shell), hang, caret: isTyped(l) });
  // the first hang every variant of the line fits with
  const hangOf = (l, px, o) => hangsOf(l, shell).find(h => variants(l).every(t => rowsWith(l, t, px, o, h) < Infinity)) ?? hangsOf(l, shell)[0];
  const rowsAt = (l, t, px, o) => rowsWith(l, t, px, o, hangOf(l, px, o));
  const breaks = (px, o) => !!roll && lines.some(l => l.focus && variants(l).some(t => rowsAt(l, t, px, o) > 1));
  const rows = (px, o) => lines.reduce((n, l) => {
    if (!(l.focus && breaks(px, o))) return n + Math.max(...variants(l).map(t => rowsAt(l, t, px, o)));
    const slot = slotOf(l.text, roll.preset), hang = hangOf(l, px, o);
    const before = rowsOf(slot.before, px, o, { lead: leadOf(shell), hang });
    return n + before + Math.max(...[roll.preset, ...roll.ids].map(id => rowsOf(slot.row(id), px, o, { lead: idLead(shell), hang, caret: true })));
  }, 0);
  const codeFor = (o, tLines) => {
    const w = WIN[o];
    // the window pushes in about its own middle, so its bottom edge drops by half its growth
    const room = px => (EDGE + BAR + w.padTop + w.padBottom + rows(px, o) * px * CODE_LH) * w.push + w.gap + tLines * TITLE_LH * w.capMin <= w.sh / w.lean;
    const sizes = least && w.least ? [...w.sizes, w.least] : w.sizes;
    // a command, or a line it changes, on one row at a smaller size reads better than wrapped at a larger;
    // a line of context may wrap
    const clean = px => lines.filter(l => isTyped(l) || l.keep).every(l => variants(l).every(t => rowsAt(l, t, px, o) === 1));
    return sizes.find(px => clean(px) && room(px)) ?? sizes.find(px => room(px)) ?? null;
  };
  // the code reads first: the largest code size, then the largest headline that leaves it its room
  const pick = o => TYPE.title[o].sizes.map(px => {
    const tLines = titleSet(title, o, px)?.lines;
    return { title: px, code: tLines && codeFor(o, tLines) };
  }).filter(c => c.code).reduce((best, c) => (!best || c.code > best.code ? c : best), null);
  const l = pick('landscape'), p = pick('portrait');
  if (!l || !p) return null;
  return {
    title: { landscape: l.title, portrait: p.title }, landscape: l.code, portrait: p.code,
    breaks: { landscape: breaks(l.code, 'landscape'), portrait: breaks(p.code, 'portrait') },
    hangs: { landscape: lines.map(x => hangOf(x, l.code, 'landscape')), portrait: lines.map(x => hangOf(x, p.code, 'portrait')) },
  };
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
function typedLine(line, roll) {
  const chars = typedChars(line.text, line.focus);
  const slotAt = roll && line.focus ? line.text.indexOf(roll.preset) : -1;
  const parts = tokensOf(line.text);
  // the caret sits in the last token, after its last character: after the token, it takes a row of its own once the token wraps
  const last = parts.findLastIndex(p => p.trim());
  if (last < 0) return `${chars(line.text, 0)}${CARET}`;
  let i = 0;
  return parts.map((part, n) => {
    const at = i, caret = n === last ? CARET : '';
    i += part.length;
    if (!part.trim()) return chars(part, at);
    if (slotAt < at || slotAt >= at + part.length) return `<span class="tok">${chars(part, at)}${caret}</span>`;
    const k = slotAt - at, ids = [...roll.ids, roll.preset];
    // the rolled-in ids are their own elements: each is read as a whole id, never typed
    const slot = `<span class="roll" data-layout-allow-overlap><span class="ri" data-layout-allow-overlap>${chars(roll.preset, slotAt)}</span>${ids.map(id => `<em class="ri m" data-layout-allow-overlap>${esc(id)}</em>`).join('')}</span>`;
    return `<span class="brk"></span><span class="tok">${chars(part.slice(0, k), at)}${slot}${chars(part.slice(k + roll.preset.length), slotAt + roll.preset.length)}${caret}</span>`;
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
  const cls = [shell ? 'sh' : 'ed', answer && 'ans', code.breaks.landscape && 'brk-l', code.breaks.portrait && 'brk-p'].filter(Boolean).join(' ');
  const body = lines.map((l, k) => {
    const vars = `--in:${indentOf(l.text)};--hang:${code.hangs.landscape[k]};--hang-p:${code.hangs.portrait[k]}`;
    if (shell || l.focus) return `<div class="ln typed${l.focus ? ' focus' : ''}" style="${vars}">${typedLine(l, roll)}</div>`;
    return `<div class="ln ${l.keep ? 'keep' : 'ctx'}" style="${vars}">${wholeLine(l.text)}</div>`;
  }).join('');
  // the value the header reads is the id that answered, so it takes the accent
  const value = answer && answer.indexOf(': ') + 2;
  const out = answer ? `<div class="ln out" data-layout-allow-overflow>${esc(answer.slice(0, value))}<span class="m">${esc(answer.slice(value))}</span></div>` : '';
  const ttl = title && ['landscape', 'portrait'].filter(o => !ttlFits(title, o)).map(o => ` off-${o[0]}`).join('');
  return `<div class="win"><div class="push"><div class="term ${shell ? 'is-ink' : 'card'}">
      <div class="bar"><span class="dots"><i></i><i></i><i></i></span>${title ? `<span class="ttl${ttl}">${esc(title)}</span>` : ''}</div>
      <div class="code ${cls}" style="${fsVars(code, 'cs')}"><div class="rows">${body}${out}</div></div></div></div></div>`;
}

// ── captions ───────────────────────────────────────────────────────────────
// The narration on screen, as the series' explainer sets it: one phrase at a time, whole, white
// Geist on an ink chip in the band under the picture, never over it. A phrase sits on one row in
// both frames; portrait's is the narrower, so it decides where a phrase ends.
export const CAP = {
  landscape: { px: 52, top: 924, height: 120 },
  portrait: { px: 60, top: 1240, height: 240 },
  padX: 28, room: { landscape: 1920 * 0.84, portrait: 900 },
};
const capFits = text => ['landscape', 'portrait'].every(o => widthOf(text, { px: CAP[o].px, weight: 500, tracking: -0.005 }) <= CAP.room[o] - 2 * CAP.padX - 4);
// a word that is part of a name, as named() reads one: past a sentence's first word, any capitalised word
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
  const ok = ws => ws.length <= 6 && capFits(ws.map(w => w.text).join(' '));
  const phrases = stretches.flatMap(ws => {
    // the cut that holds: no name split, no phrase hanging on a small word, the fewest phrases, then commas, then the most even
    let best = null;
    const walk = (from, cuts) => {
      if (from === ws.length) {
        const parts = [0, ...cuts].map((c, i, a) => ws.slice(c, a[i + 1] ?? ws.length));
        const named = cuts.filter(c => !/[,;:]$/.test(ws[c - 1].text) && isName(ws[c - 1].text, ws[c - 1].sentenceStart) && isName(ws[c].text, false)).length;
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
    return { text: p.map(w => w.text).join(' '), at, end: +end.toFixed(2) };
  });
}

// The page's URL on the lockup sits on one row, as large as fits the safe width once the
// camera has leaned in. Where a long slug would set it under URL_SIZES, the card names the
// list every use case is on instead: a URL cut across rows reads as two addresses.
const URL_SIZES = { landscape: [48], portrait: [44, 40, 36] }, URL_PAD = { landscape: 44, portrait: 36 };
const LIST = 'anyrouter.dev/use-cases';
export function urlSet(href) {
  const page = href.replace(/^https:\/\//, '');
  const set = o => {
    const room = ACROSS[o].width / (2 * WIN[o].lean - 1) - 2 * URL_PAD[o], fit = t => URL_SIZES[o].find(px => [...t].length * 0.6 * px <= room);
    return fit(page) ? { text: page, px: fit(page) } : { text: LIST, px: fit(LIST) };
  };
  return { landscape: set('landscape'), portrait: set('portrait') };
}

// ── the shot ───────────────────────────────────────────────────────────────
// How long each id holds in a roll. Each wash is shorter, so one never fades over the next.
export const ROLL_EVERY = 0.9;

/** The film's one sub-composition: { cls, body, inner, cues }. */
export function filmScene({ copy, beats, duration, timing, said }) {
  const [, doing, lockup] = beats;
  const caps = captionsOf(said);
  const url = urlSet(copy.url);
  const tiles = copy.marks.map(f => `<div class="tile card">${mark(f)}</div>`).join('');
  const { roll } = copy.window;
  const rolls = roll ? roll.ids.length + 1 : 0;
  // The camera scales the whole frame a few percent on purpose, so the layout audit is told so.
  const body = `<div class="cam" data-layout-allow-overflow>
    <div class="hero"><div class="tiles">${tiles}${tiles ? PLUS : ''}<div class="tile card">${mark('anyrouter-color.svg')}</div></div>
      <div class="badge kick">${esc(copy.kicker)}</div></div>
    <h1 class="h" style="${fsVars(copy.type.title)}">${masked(copy.title, copy.type.breaks)}</h1>
    ${windowHtml(copy.window)}
    <div class="end"><div class="lock">${LOGO}<b>AnyRouter</b></div>
      <div class="url mono" style="--us:${url.landscape.px}px;--us-p:${url.portrait.px}px">${url.landscape.text === url.portrait.text ? esc(url.landscape.text)
        : `<span class="ul">${esc(url.landscape.text)}</span><span class="up">${esc(url.portrait.text)}</span>`}</div></div></div>
    <div class="caps" data-outside-safe-area>${caps.map(c => `<div class="cap" data-layout-allow-overlap><span>${esc(c.text)}</span></div>`).join('')}</div>`;
  const inner = `
    const T1 = ${doing.start}, T2 = ${lockup.start};
    const TYPE_AT = ${timing.typeAt}, EACH = ${timing.each}, LINE_PAUSE = ${timing.linePause}, ROLL_AT = ${timing.rollAt}, ROLL_EVERY = ${ROLL_EVERY}, ROLLS = ${rolls}, ANSWER_AT = ${timing.answerAt};
    const uc = $(".uc"), css = getComputedStyle(uc), v = n => parseFloat(css.getPropertyValue(n));
    const SY = v("--sy"), SH = v("--sh"), G = v("--gap"), LEAN = v("--lean");
    const hero = $(".hero"), h = $(".h"), win = $(".win"), end = $(".end");

    // Where the headline sits in each beat. It scales from its top edge, so a
    // beat's column is centred in the safe area from the boxes the layout gave.
    const fs = parseFloat(getComputedStyle(h).fontSize);
    const heroH = hero.offsetHeight, hH = h.offsetHeight;
    const top1 = SY + (SH - heroH - G - hH) / 2;
    hero.style.top = top1 + "px";
    h.style.top = top1 + heroH + G + "px";
    // the caption is as large as fits above the window, up to the headline itself, so the two fill the safe area as one block
    // leaned and pushed in, it still sits in the safe area (see codeSizes)
    const winH = win.offsetHeight;
    const s2 = Math.min(v("--cap2") / fs, (SH / LEAN - G - winH * v("--push")) / hH), s3 = v("--cap3") / fs;
    const PUSH = Math.min(v("--push-max"), (SH / LEAN - G - hH * s2) / winH);
    const cap2 = SY + (SH - hH * s2 - G - win.offsetHeight) / 2;
    win.style.top = cap2 + hH * s2 + G + "px";
    const cap3 = SY + (SH - hH * s3 - G - end.offsetHeight) / 2;
    end.style.top = cap3 + hH * s3 + G + "px";
    const at1 = top1 + heroH + G;

    // 1 · the outcome. The marks close in, the words rise, the camera leans in.
    const tiles = $$(".tile, .plus"), mid = (tiles.length - 1) / 2;
    tl.fromTo(tiles, { x: i => (i - mid) * 48 }, { x: 0, duration: 1.4, ease: "expo.out" }, 0);
    tl.fromTo(Q(".kick"), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, ease: "expo.out" }, 0.1);
    // every word is up within half a second, however long the headline: a word still under its
    // mask sits a line low, and on a long headline that line is past the safe area
    const words = $$(".h .w > span");
    tl.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 0.6, stagger: Math.min(0.05, 0.2 / words.length), ease: "expo.out" }, 0.05);
    tl.fromTo(Q(".cam"), { scale: 1 }, { scale: v("--lean"), duration: T1, ease: "none" }, 0);

    // 1 → 2 · the headline shrinks into the caption as the window rises under it.
    tl.to(hero, { y: -80, opacity: 0, duration: 0.45, ease: "power4.inOut" }, T1);
    tl.to(h, { y: cap2 - at1, scale: s2, duration: 0.8, ease: "power4.inOut" }, T1);
    // it rises once the headline has cleared its place, so the two never cross
    // A dark slab half faded reads as grey, so it never fades: it slides in from below the frame.
    const below = uc.offsetHeight - win.offsetTop;
    // off the stage it is hidden, so it never counts as text outside the frame
    tl.set(win, { autoAlpha: 0 }, 0);
    tl.set(win, { autoAlpha: 1 }, T1 + 0.35);
    tl.fromTo(win, { y: below }, { y: 0, duration: 0.9, ease: "expo.out" }, T1 + 0.35);

    // 2 · doing it. Lines of context paste in, the command is typed, the camera pushes in.
    tl.fromTo(Q(".push"), { scale: 1 }, { scale: PUSH, duration: T2 - T1 - 0.4, ease: "none" }, T1 + 0.4);
    if (has(".ln.ctx, .ln.keep")) tl.fromTo(Q(".ln.ctx, .ln.keep"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }, T1 + 0.6);
    let t = TYPE_AT;
    $$(".typed").forEach((ln, k) => {
      // a later line, prompt and all, shows only once it starts
      if (k > 0) { t += LINE_PAUSE; tl.set(ln, { opacity: 0 }, 0); tl.set(ln, { opacity: 1 }, t); }
      // the rolled-in ids are not typed: only the characters of the line and its first id
      ln.querySelectorAll(".c").forEach(c => { tl.set(c, { opacity: 1 }, t); t += EACH; });
    });
    // the caret sits after the last line, blinking until the window leaves or the answer comes
    const caret = $$(".caret").at(-1), still = ANSWER_AT ?? T2;
    for (let b = t + 0.05, on = 1; b < still; b += 0.45, on = 1 - on) tl.set(caret, { opacity: on }, b);
    if (ANSWER_AT) tl.set(caret, { opacity: 0 }, still);

    // The request is answered through the fallback: the code scrolls up and the header the page's curl prints arrives under it.
    if (ANSWER_AT) {
      // it scrolls by the top padding and whole rows, so the window's top edge never cuts a row in half
      const out = $(".out"), cs = getComputedStyle($(".code")), row = parseFloat(cs.fontSize) * ${CODE_LH};
      let by = parseFloat(cs.paddingTop);
      while (by < out.offsetHeight - parseFloat(cs.paddingBottom)) by += row;
      tl.to(Q(".rows"), { y: -by, duration: 0.6, ease: "power4.inOut" }, ANSWER_AT);
      tl.fromTo(out, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "expo.out" }, ANSWER_AT + 0.25);
    }

    // The preset rolls through real ids one key runs, then comes back to the page's own.
    if (ROLLS) {
      const slot = $(".roll"), items = Array.from(slot.children);
      slot.style.width = items[0].offsetWidth + "px";
      for (let i = 0; i < ROLLS; i++) {
        const at = ROLL_AT + i * ROLL_EVERY, out = items[i], into = items[i + 1];
        // the old id is gone before the new one shows, so two ids are never drawn over each other
        tl.fromTo(out, { y: 0, opacity: 1 }, { y: "-0.7em", opacity: 0, duration: 0.2, ease: "power4.in", immediateRender: false }, at);
        tl.fromTo(into, { y: "0.7em", opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "expo.out", immediateRender: false }, at + 0.2);
        tl.to(slot, { width: into.offsetWidth, duration: 0.45, ease: "power4.inOut" }, at + 0.05);
      }
    }

    // 2 → 3 · the window drops away; the headline settles above the lockup.
    tl.to(win, { y: below, duration: 0.5, ease: "power4.inOut" }, T2);
    tl.set(win, { autoAlpha: 0 }, T2 + 0.5);
    tl.to(h, { y: cap3 - at1, scale: s3, duration: 0.8, ease: "power4.inOut" }, T2 + 0.05);
    tl.fromTo(Q(".lock svg"), { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.0, ease: "expo.out" }, T2 + 0.35);
    tl.fromTo(Q(".lock b"), { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 1.0, ease: "expo.out" }, T2 + 0.45);
    tl.fromTo(Q(".url"), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, ease: "expo.out" }, T2 + 0.6);

    // 3 · the lockup holds while the camera keeps leaning in.
    tl.fromTo(Q(".cam"), { scale: v("--lean") }, { scale: 2 * v("--lean") - 1, duration: D - T2, ease: "power1.out", immediateRender: false }, T2);

    // The captions: one phrase at a time, whole, under the picture; back to back they swap with no gap.
    const CAPS = ${JSON.stringify(caps.map(c => [c.at, c.end]))};
    $$(".cap").forEach((cap, i) => {
      const [at, end] = CAPS[i], next = CAPS[i + 1];
      tl.fromTo(cap, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none", immediateRender: false }, at);
      if (next && next[0] - end < 0.05) tl.set(cap, { opacity: 0 }, next[0]);
      else tl.to(cap, { opacity: 0, duration: 0.12, ease: "none" }, end - 0.12);
    });`;
  const cues = [
    { at: 0.15, kind: 'tick', gain: 0.45 },
    { at: doing.start, kind: 'cut', gain: 0.4 },
    { at: timing.typeAt, kind: 'type', dur: timing.typing, gain: 0.45 },
    ...Array.from({ length: rolls }, (_, i) => ({ at: +(timing.rollAt + i * ROLL_EVERY + 0.1).toFixed(2), kind: 'tick', gain: 0.4 })),
    ...(timing.answerAt ? [{ at: +(timing.answerAt + 0.25).toFixed(2), kind: 'tick', gain: 0.45 }] : []),
    { at: +(lockup.start + 0.35).toFixed(2), kind: 'end', gain: 0.55 },
  ];
  return { cls: 'film', body, inner, cues, duration };
}

// ── the look, in frame.md's tokens ─────────────────────────────────────────
// The terminal is the ink surface; an editor is a hairline card. The command is
// the line in focus: on the ink it is white, its other lines muted; in the
// editor it is ink, its context muted. The accent is on the id in the command.
export const CSS = `
  .film{--sy:${WIN.landscape.sy}px;--sh:${WIN.landscape.sh}px;--sl:96px;--sr:96px;--gap:${WIN.landscape.gap}px;--cap2:184px;--cap3:96px;--tw:${WIN.landscape.width}px;--push:${WIN.landscape.push};--push-max:${WIN.landscape.pushMax};--lean:${WIN.landscape.lean}}
  /* the camera leans in about the safe area's centre, so nothing drifts out of it */
  .film .cam{position:absolute;inset:0;transform-origin:50% 50%}
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
  /* a row ends only at a space; a wrapped row of code hangs past its indent, a terminal's wraps to the edge; a blank line keeps its row */
  .film .ln{min-height:${CODE_LH}em;white-space:pre-wrap;padding:0 0 0 calc(var(--hang, 0) * var(--adv));text-indent:calc(var(--hang, 0) * var(--adv) * -1)}
  .film .ln.ctx{color:${C.muted}}
  .film .sh .ln.typed:not(.focus){color:${C.onInkMuted}}
  .film .sh .ln::before{content:"$ ";color:${C.onInkMuted}}
  .film .tok{display:inline-block;white-space:pre;vertical-align:top;text-indent:0}
  .film .c{opacity:0}
  .film .m{color:${C.accent}}
  .film .is-ink .m{color:${C.accentOnInk}}
  .film .roll{position:relative;display:inline-block;height:1.45em;vertical-align:top}
  .film .ri{position:absolute;left:0;top:0;white-space:pre;font-style:normal}
  .film em.ri{opacity:0}
  .film .brk{display:none}
  .film .brk-l .brk{display:block}
  /* in code an id on its own row sits two characters in, not past the line's indent: the longest id needs the width */
  .film .ed.brk-l .brk + .tok{margin-left:calc(var(--in, 0) * var(--adv) * -1)}
  /* the answer: under the last row, behind a hairline, until the code scrolls up to it */
  .film .ans{overflow:hidden}
  .film .rows{position:relative}
  .film .ln.out{position:absolute;left:0;right:0;top:100%;padding-top:.3em;border-top:2px solid ${C.line};opacity:0}
  .film .is-ink .ln.out{border-top-color:${C.ink2}}
  .film .caret{display:inline-block;width:.56em;height:1.1em;margin-left:4px;vertical-align:-.2em;background:${C.ink};opacity:0}
  .film .is-ink .caret{background:${C.onInk}}

  .film .end{display:flex;flex-direction:column;align-items:center;gap:56px}
  .film .lock{display:flex;align-items:center;gap:32px}
  .film .lock svg{width:144px;height:144px;display:block}
  .film .lock b{font-size:144px;font-weight:600;letter-spacing:-.055em;line-height:1}
  /* the one thing to do next, so it is the ink card */
  .film .url{font-size:var(--us);color:${C.onInk};background:${C.ink};padding:24px ${URL_PAD.landscape}px;border-radius:32px;white-space:pre}
  .film .url .up{display:none}

  .film .caps{position:absolute;left:0;right:0;top:${CAP.landscape.top}px;height:${CAP.landscape.height}px;pointer-events:none}
  .film .cap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0}
  .film .cap span{padding:12px ${CAP.padX}px 14px;border-radius:14px;background:rgba(10,10,10,.84);color:${C.onInk};font-size:${CAP.landscape.px}px;font-weight:500;line-height:1.25;letter-spacing:-.005em;white-space:pre}

  @media (orientation: portrait){
    .film{--sy:200px;--sh:${WIN.portrait.sh}px;--sl:60px;--sr:120px;--gap:${WIN.portrait.gap}px;--cap2:148px;--cap3:80px;--tw:${WIN.portrait.width}px;--push:${WIN.portrait.push};--push-max:${WIN.portrait.pushMax};--lean:${WIN.portrait.lean}}
    .film .cam{transform-origin:510px 710px}
    .film .tile{width:144px;height:144px}
    .film .tile .mk{width:84px;height:84px}
    .film .h{font-size:var(--fs-p)}
    .film .h .bl{display:none}
    .film .h .bp{display:inline}
    .film .win{left:${winLeft('portrait')}px}
    .film .term{border-radius:28px}
    /* a hair tighter than the font's own advance, so a 45-character URL sits whole across the safe width */
    .film .code{--adv:${WIN.portrait.adv}em;letter-spacing:${(WIN.portrait.adv - 0.6).toFixed(2)}em;font-size:var(--cs-p);padding:${WIN.portrait.padTop}px ${WIN.portrait.padX}px ${WIN.portrait.padBottom}px}
    .film .ln{padding-left:calc(var(--hang-p, 0) * var(--adv));text-indent:calc(var(--hang-p, 0) * var(--adv) * -1)}
    .film .ttl.off-l{display:block}
    .film .ttl.off-p{display:none}
    .film .brk-l .brk{display:none}
    .film .brk-p .brk{display:block}
    .film .ed.brk-l .brk + .tok{margin-left:0}
    .film .ed.brk-p .brk + .tok{margin-left:calc(var(--in, 0) * var(--adv) * -1)}
    .film .lock svg{width:120px;height:120px}
    .film .lock b{font-size:120px}
    .film .url{font-size:var(--us-p);padding:24px ${URL_PAD.portrait}px;border-radius:28px}
    .film .url .ul{display:none}
    /* the band Reels, Shorts and TikTok leave clear (shared/authoring/portrait.mjs), across the safe width */
    .film .caps{left:${ACROSS.portrait.left}px;right:${1080 - ACROSS.portrait.left - ACROSS.portrait.width}px;top:${CAP.portrait.top}px;height:${CAP.portrait.height}px}
    .film .cap span{font-size:${CAP.portrait.px}px}
    .film .url .up{display:inline}
  }`;
