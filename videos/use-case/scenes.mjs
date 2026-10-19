/**
 * scenes: the one shot a use-case film is, and the type measurements that
 * decide how each fact is set.
 *
 * A film is one sub-composition in three beats (see kind.mjs). The headline is
 * the shared element: set large for the outcome, it shrinks into the caption
 * over the code, then settles above the lockup. Each beat has one camera move, at an even speed: an eased one comes to rest, and
 * a frame at rest reads as dead air.
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

/** How many lines `text` takes at `px` in a box `width` wide, breaking at spaces as the browser does. */
export function linesOf(text, { px, width, weight = 400, tracking = 0 }) {
  const wide = w => [...w].reduce((sum, ch) => sum + em(ch, weight) + tracking, 0) * px;
  const space = (em(' ', weight) + tracking) * px;
  let lines = 1, x = 0;
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    const ww = wide(w);
    if (x > 0 && x + space + ww > width) { lines++; x = 0; }
    x += (x > 0 ? space : 0) + ww;
    // a token wider than the line is broken anywhere (overflow-wrap)
    while (x > width) { lines++; x -= width; }
  }
  return lines;
}

/** The first size in `sizes` that sets `text` in at most `lines` lines, else null. */
export const sizeFor = (text, sizes, opts, lines) => sizes.find(px => linesOf(text, { ...opts, px }) <= lines) ?? null;

// The boxes text is set in, in px of each frame. Kept a few percent under the
// CSS widths below so rounding in the browser can never add a line.
const SAFE = { landscape: 1728 * 0.96, portrait: 900 * 0.96 };

/** Type for each text role: sizes to try, the box, the line budget, per orientation. */
export const TYPE = {
  title: { weight: 600, tracking: -0.035,
    landscape: { sizes: [140, 132, 124, 120], width: SAFE.landscape, lines: 3 },
    portrait: { sizes: [112, 108, 104], width: SAFE.portrait, lines: 5 } },
};

/** `--fs` and `--fs-p` for a text in a role, or null when no size fits either frame. */
export function setIn(role, text) {
  const t = TYPE[role];
  const at = o => sizeFor(text, t[o].sizes, { width: t[o].width, weight: t.weight, tracking: t.tracking }, t[o].lines);
  const landscape = at('landscape'), portrait = at('portrait');
  return landscape && portrait ? { landscape, portrait } : null;
}
const fsVars = (fs_, name = 'fs') => `--${name}:${fs_.landscape}px;--${name}-p:${fs_.portrait}px`;

// The code window: as wide as the safe area, its text inside the padding. In
// beat 2 the caption and the window share the safe area's height (`sh`); the
// caption is the headline scaled down, never below `capMin`.
const WIN = {
  landscape: { sizes: [56, 52, 48], wrap: 52, width: 1728, padX: 48, padTop: 52, padBottom: 60, sh: 888, gap: 56, capMin: 64 },
  portrait: { sizes: [44, 40], wrap: 40, width: 900, padX: 36, padTop: 44, padBottom: 52, sh: 1020, gap: 48, capMin: 56 },
};
const BAR = 84, CODE_LH = 1.45, TITLE_LH = 1.05;
// a couple of px short of the box, so rounding in the browser can never add a row
const textWidth = o => WIN[o].width - 2 * WIN[o].padX - 2;
const monoWidth = (text, px) => [...text].length * 0.6 * px;
const indentOf = text => text.match(/^ */)[0].length;
// the caret, as .caret draws it
const caretWidth = px => 0.56 * px + 4;

/**
 * Whether `id`, rolled into the preset's place in `line`, sits whole on a row
 * of its own in both frames at their smallest code size. An id that needs more
 * would break mid-roll, so it does not roll.
 */
export function idFitsRow(line, preset, id, shell) {
  const after = line.text.slice(line.text.indexOf(preset) + preset.length);
  const row = `${shell ? '$ ' : '  '}${id}${after}`;
  return Object.keys(WIN).every(o => { const px = WIN[o].sizes.at(-1); return monoWidth(row, px) + caretWidth(px) <= textWidth(o); });
}

/**
 * The code size per orientation. The largest at which every typed line fits on
 * one line, each roll id in place, with its prompt and caret, and the window
 * still leaves room for the caption at its smallest. A line too long for every
 * size is wrapped between tokens, at the `wrap` size or smaller. A line of
 * context may run past the window; it is clipped with a fade. When the longest
 * roll id does not fit, the id moves to a line of its own, for every id, so the
 * line never reflows mid-roll. Null when no size leaves the caption its room.
 */
export function codeSizes(lines, roll, shell, title) {
  const prompt = shell ? '$ ' : '';
  const variants = l => (roll && l.focus ? [roll.preset, ...roll.ids].map(id => l.text.replace(roll.preset, id)) : [l.text]);
  const isTyped = l => shell || l.focus;
  const fits = (t, px, o) => monoWidth(`${prompt}${t}`, px) + caretWidth(px) <= textWidth(o);
  // a wrapped row hangs two characters past the line's indent, so it is measured that much short
  const rowsOf = (t, px, o) => (fits(t, px, o) ? 1 : linesOf(`${prompt}${t}█`, { px, width: textWidth(o) - (indentOf(t) + 2) * 0.6 * px, weight: 'mono' }));
  const breaks = (px, o) => !!roll && lines.some(l => l.focus && variants(l).some(t => !fits(t, px, o)));
  const rows = (px, o) => lines.reduce((n, l) => {
    if (!isTyped(l)) return n + 1;
    if (!(l.focus && breaks(px, o))) return n + Math.max(...variants(l).map(t => rowsOf(t, px, o)));
    const at = l.text.indexOf(roll.preset), after = l.text.slice(at + roll.preset.length);
    // the id's own row starts two characters in, where a shell line's prompt ends
    const lead = shell ? '' : '  ';
    return n + rowsOf(l.text.slice(0, at), px, o) + Math.max(...[roll.preset, ...roll.ids].map(id => rowsOf(lead + id + after, px, o)));
  }, 0);
  const pick = o => {
    const w = WIN[o], tLines = linesOf(title.text, { px: title.px[o], width: TYPE.title[o].width, weight: TYPE.title.weight, tracking: TYPE.title.tracking });
    const room = px => BAR + w.padTop + w.padBottom + rows(px, o) * px * CODE_LH + w.gap + tLines * TITLE_LH * w.capMin <= w.sh;
    // a line is set clean on one line, or, in a roll, with each id whole on a row of its own
    const clean = (l, px) => variants(l).every(t => fits(t, px, o)) || (l.focus && !!roll && (() => {
      const at = l.text.indexOf(roll.preset), after = l.text.slice(at + roll.preset.length), lead = shell ? '' : '  ';
      return fits(l.text.slice(0, at), px, o) && [roll.preset, ...roll.ids].every(id => fits(lead + id + after, px, o));
    })());
    // a clean line at a smaller size reads better than a wrapped one at a larger
    return w.sizes.find(px => lines.filter(isTyped).every(l => clean(l, px)) && room(px)) ?? w.sizes.find(px => px <= w.wrap && room(px)) ?? null;
  };
  const landscape = pick('landscape'), portrait = pick('portrait');
  if (!landscape || !portrait) return null;
  const clipped = (px, o) => lines.map(l => !isTyped(l) && monoWidth(l.text, px) > textWidth(o));
  return { landscape, portrait, breaks: { landscape: breaks(landscape, 'landscape'), portrait: breaks(portrait, 'portrait') }, clipped: { landscape: clipped(landscape, 'landscape'), portrait: clipped(portrait, 'portrait') } };
}

// ── pieces ─────────────────────────────────────────────────────────────────
/** Each word in its own mask, so it can rise into place. Escaped here. */
// The mask clips its word on purpose while the word rises, so the layout audit is told so.
const masked = s => String(s).split(/\s+/).filter(Boolean)
  .map(w => `<span class="w" data-layout-allow-overflow><span>${esc(w)}</span></span>`).join(' ');
const mark = (f, cls = 'mk') => `<span class="${cls}" style="background-image:url('assets/providers/${esc(f)}')"></span>`;
const LOGO = fs.readFileSync(path.join(SHARED, 'assets/brand/anyrouter-logo-currentcolor.svg'), 'utf8')
  .replace(/<\?xml[^>]*>/, '').replace(/\s*\n\s*/g, ' ').trim();
const PLUS = '<svg class="plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

// A model id inside a line of code (anyrouter/free, "google/gemma-4-31b:free") is
// the one accent in the window. Not a path or a URL: nothing word-like before it.
const MODEL_ID = /(?<![\w/.:~-])[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9.:[\]-]*/gi;

/**
 * Characters as spans a typist reveals one by one; model ids in the accent. A
 * token too long for its line breaks after an "=" or a path's "/", never inside
 * a model id.
 */
function typedChars(text) {
  const accents = new Set();
  for (const m of text.matchAll(MODEL_ID)) for (let i = m.index; i < m.index + m[0].length; i++) accents.add(i);
  const breakAfter = i => !accents.has(i) && (text[i] === '=' || (text[i] === '/' && text[i + 1] !== '/' && text[i - 1] !== '/'));
  return (s, at) => [...s].map((ch, k) => `<span class="c${accents.has(at + k) ? ' m' : ''}">${esc(ch)}</span>${breakAfter(at + k) ? '<wbr>' : ''}`).join('');
}

/**
 * One typed line, split at spaces into tokens that never break inside: a model
 * id cut at "gemma-4-" reads as two things. In the focus line of a roll, the
 * preset is a slot holding every id, stacked, the first typed with the line.
 */
function typedLine(line, roll) {
  const chars = typedChars(line.text);
  const slotAt = roll && line.focus ? line.text.indexOf(roll.preset) : -1;
  let i = 0;
  // a pipe stays with the command it feeds, and a closing "\" with the word before it,
  // so neither sits on a row alone
  return line.text.split(/(?<!(?:^| )\|)( +)(?!\\$)/).map(part => {
    const at = i;
    i += part.length;
    if (!part.trim()) return chars(part, at);
    if (slotAt < at || slotAt >= at + part.length) return `<span class="tok">${chars(part, at)}</span>`;
    const k = slotAt - at, ids = [...roll.ids, roll.preset];
    // the rolled-in ids are their own elements: each is read as a whole id, never typed
    const slot = `<span class="roll" data-layout-allow-overlap><span class="ri" data-layout-allow-overlap>${chars(roll.preset, slotAt)}</span>${ids.map(id => `<em class="ri m" data-layout-allow-overlap>${esc(id)}</em>`).join('')}</span>`;
    return `<span class="brk"></span><span class="tok">${chars(part.slice(0, k), at)}${slot}${chars(part.slice(k + roll.preset.length), slotAt + roll.preset.length)}</span>`;
  }).join('');
}

/** The window: a terminal for shell commands, an editor for a line of code. */
function windowHtml(win) {
  const { shell, title, lines, roll, code } = win;
  const cls = [shell ? 'sh' : 'ed', code.breaks.landscape && 'brk-l', code.breaks.portrait && 'brk-p'].filter(Boolean).join(' ');
  const body = lines.map((l, k) => {
    const typed = shell || l.focus;
    const clip = ['landscape', 'portrait'].filter(o => code.clipped[o][k]).map(o => ` clip-${o[0]}`).join('');
    return typed
      ? `<div class="ln typed${l.focus ? ' focus' : ''}" style="--in:${indentOf(l.text)}">${typedLine(l, roll)}<span class="caret"></span></div>`
      : `<div class="ln ctx${clip}" data-layout-allow-overflow>${esc(l.text)}</div>`;
  }).join('');
  return `<div class="win"><div class="push"><div class="term">
      <div class="bar"><i></i><i></i><i></i>${title ? `<span class="ttl" data-layout-allow-overflow>${esc(title)}</span>` : ''}</div>
      <div class="code ${cls}" style="${fsVars(code, 'cs')}">${body}</div></div></div></div>`;
}

// ── the shot ───────────────────────────────────────────────────────────────
// How long each id holds in a roll. Each wash is shorter, so one never fades over the next.
export const ROLL_EVERY = 0.9;

/** The film's one sub-composition: { cls, body, inner, cues }. */
export function filmScene({ copy, beats, duration, timing }) {
  const [, doing, lockup] = beats;
  const shown = copy.url.replace(/^https:\/\//, '');
  const cut = shown.lastIndexOf('/') + 1;
  const tiles = copy.marks.map(f => `<div class="tile card">${mark(f)}</div>`).join('');
  const { roll } = copy.window;
  const rolls = roll ? roll.ids.length + 1 : 0;
  // The camera scales the whole frame a few percent on purpose, so the layout audit is told so.
  const body = `<div class="cam" data-layout-allow-overflow>
    <div class="hero"><div class="tiles">${tiles}${tiles ? PLUS : ''}<div class="tile card">${mark('anyrouter-color.svg')}</div></div>
      <div class="badge accent kick">${esc(copy.kicker)}</div></div>
    <h1 class="h" style="${fsVars(copy.type.title)}">${masked(copy.title)}</h1>
    ${windowHtml(copy.window)}
    <div class="end"><div class="lock">${LOGO}<b>AnyRouter</b></div>
      <div class="url mono"><span>${esc(shown.slice(0, cut))}</span><wbr><span>${esc(shown.slice(cut))}</span></div></div></div>`;
  const inner = `
    const T1 = ${doing.start}, T2 = ${lockup.start};
    const TYPE_AT = ${timing.typeAt}, EACH = ${timing.each}, LINE_PAUSE = ${timing.linePause}, ROLL_AT = ${timing.rollAt}, ROLL_EVERY = ${ROLL_EVERY}, ROLLS = ${rolls};
    const uc = $(".uc"), css = getComputedStyle(uc), v = n => parseFloat(css.getPropertyValue(n));
    const SY = v("--sy"), SH = v("--sh"), G = v("--gap");
    const hero = $(".hero"), h = $(".h"), win = $(".win"), end = $(".end");

    // Where the headline sits in each beat. It scales from its top edge, so a
    // beat's column is centred in the safe area from the boxes the layout gave.
    const fs = parseFloat(getComputedStyle(h).fontSize);
    const heroH = hero.offsetHeight, hH = h.offsetHeight;
    const top1 = SY + (SH - heroH - G - hH) / 2;
    hero.style.top = top1 + "px";
    h.style.top = top1 + heroH + G + "px";
    // the caption is as large as fits above the window, so the two fill the safe area as one block
    const s2 = Math.min(v("--cap2") / fs, (SH - G - win.offsetHeight) / hH), s3 = v("--cap3") / fs;
    const cap2 = SY + (SH - hH * s2 - G - win.offsetHeight) / 2;
    win.style.top = cap2 + hH * s2 + G + "px";
    const cap3 = SY + (SH - hH * s3 - G - end.offsetHeight) / 2;
    end.style.top = cap3 + hH * s3 + G + "px";
    const at1 = top1 + heroH + G;

    // 1 · the outcome. The marks close in, the words rise, the camera leans in.
    const tiles = $$(".tile, .plus"), mid = (tiles.length - 1) / 2;
    tl.fromTo(tiles, { x: i => (i - mid) * 36 }, { x: 0, duration: 1.1, ease: "expo.out" }, 0);
    tl.fromTo(Q(".kick"), { scale: 0.92 }, { scale: 1, duration: 0.8, ease: "back.out(2)" }, 0.05);
    // every word is up within half a second, however long the headline: a word still under its
    // mask sits a line low, and on a long headline that line is past the safe area
    const words = $$(".h .w > span");
    tl.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 0.6, stagger: Math.min(0.05, 0.2 / words.length), ease: "expo.out" }, 0.05);
    tl.fromTo(Q(".cam"), { scale: 1 }, { scale: v("--lean"), duration: T1, ease: "none" }, 0);

    // 1 → 2 · the headline shrinks into the caption as the window rises under it.
    tl.to(hero, { y: -48, opacity: 0, duration: 0.35, ease: "power2.in" }, T1);
    tl.to(h, { y: cap2 - at1, scale: s2, duration: 0.75, ease: "power3.inOut" }, T1);
    // it rises once the headline has cleared its place, so the two never cross
    // A dark slab half faded reads as grey, so it never fades: it slides in from below the frame.
    const below = uc.offsetHeight - win.offsetTop;
    // off the stage it is hidden, so it never counts as text outside the frame
    tl.set(win, { autoAlpha: 0 }, 0);
    tl.set(win, { autoAlpha: 1 }, T1 + 0.35);
    tl.fromTo(win, { y: below }, { y: 0, duration: 0.9, ease: "expo.out" }, T1 + 0.35);

    // 2 · doing it. Lines of context paste in, the command is typed, the camera pushes in.
    tl.fromTo(Q(".push"), { scale: 1 }, { scale: v("--push"), duration: T2 - T1 - 0.4, ease: "none" }, T1 + 0.4);
    if (has(".ctx")) tl.fromTo(Q(".ctx"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }, T1 + 0.6);
    let t = TYPE_AT;
    $$(".typed").forEach((ln, k) => {
      // a later line, prompt and all, shows only once it starts
      if (k > 0) { t += LINE_PAUSE; tl.set(ln, { opacity: 0 }, 0); tl.set(ln, { opacity: 1 }, t); }
      // the rolled-in ids are not typed: only the characters of the line and its first id
      ln.querySelectorAll(".c").forEach(c => { tl.set(c, { opacity: 1 }, t); t += EACH; });
    });
    if (has(".focus")) tl.fromTo(Q(".focus"), { backgroundColor: "rgba(240,145,90,0)" }, { backgroundColor: "rgba(240,145,90,0.14)", duration: 0.4, ease: "power2.out" }, TYPE_AT);
    // the caret sits after the last line, blinking until the window leaves
    const caret = $$(".caret").at(-1);
    for (let b = t + 0.05, on = 1; b < T2; b += 0.45, on = 1 - on) tl.set(caret, { opacity: on }, b);

    // The preset rolls through real ids one key runs, then comes back to the page's own.
    if (ROLLS) {
      const slot = $(".roll"), items = Array.from(slot.children);
      slot.style.width = items[0].offsetWidth + "px";
      const HL = { backgroundColor: "rgba(240,145,90,0.34)", boxShadow: "0 0 0 6px rgba(240,145,90,0.34)" };
      const HL_OFF = { backgroundColor: "rgba(240,145,90,0)", boxShadow: "0 0 0 6px rgba(240,145,90,0)" };
      for (let i = 0; i < ROLLS; i++) {
        const at = ROLL_AT + i * ROLL_EVERY, out = items[i], into = items[i + 1];
        // the old id is gone before the new one shows, so two ids are never drawn over each other
        tl.fromTo(out, { y: 0, opacity: 1 }, { y: "-0.7em", opacity: 0, duration: 0.2, ease: "power2.in", immediateRender: false }, at);
        tl.fromTo(into, { y: "0.7em", opacity: 0 }, { y: 0, opacity: 1, duration: 0.36, ease: "power3.out", immediateRender: false }, at + 0.2);
        tl.to(slot, { width: into.offsetWidth, duration: 0.36, ease: "power2.inOut" }, at + 0.05);
        tl.set(slot, HL, at + 0.1);
        tl.fromTo(slot, HL, { ...HL_OFF, duration: 0.3, ease: "power2.out", immediateRender: false }, at + 0.4);
      }
    }

    // 2 → 3 · the window drops away; the headline settles above the lockup.
    tl.to(win, { y: below, duration: 0.5, ease: "power2.in" }, T2);
    tl.set(win, { autoAlpha: 0 }, T2 + 0.5);
    tl.to(h, { y: cap3 - at1, scale: s3, duration: 0.8, ease: "power3.inOut" }, T2 + 0.05);
    tl.fromTo(Q(".lock svg"), { scale: 0.5, rotation: -40, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.7, ease: "back.out(1.6)" }, T2 + 0.35);
    tl.fromTo(Q(".lock b"), { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "expo.out" }, T2 + 0.45);
    tl.fromTo(Q(".url"), { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, T2 + 0.6);

    // 3 · the lockup holds while the camera keeps leaning in.
    tl.fromTo(Q(".cam"), { scale: v("--lean") }, { scale: 2 * v("--lean") - 1, duration: D - T2, ease: "power1.out", immediateRender: false }, T2);`;
  const cues = [
    { at: 0.15, kind: 'tick', gain: 0.45 },
    { at: doing.start, kind: 'cut', gain: 0.4 },
    { at: timing.typeAt, kind: 'type', dur: timing.typing, gain: 0.45 },
    ...Array.from({ length: rolls }, (_, i) => ({ at: +(timing.rollAt + i * ROLL_EVERY + 0.1).toFixed(2), kind: 'tick', gain: 0.4 })),
    { at: +(lockup.start + 0.35).toFixed(2), kind: 'end', gain: 0.55 },
  ];
  return { cls: 'film', body, inner, cues, duration };
}

// ── the look, in frame.md's tokens ─────────────────────────────────────────
export const CSS = `
  .film{--sy:96px;--sh:${WIN.landscape.sh}px;--sl:96px;--sr:96px;--gap:${WIN.landscape.gap}px;--cap2:104px;--cap3:84px;--tw:${WIN.landscape.width}px;--push:1.05;--lean:1.03}
  /* the camera leans in about the safe area's centre, so nothing drifts out of it */
  .film .cam{position:absolute;inset:0;transform-origin:50% 50%}
  .film .hero,.film .h,.film .end{position:absolute;left:var(--sl);right:var(--sr);top:0;text-align:center}
  .film .hero{display:flex;flex-direction:column;align-items:center;gap:40px}
  .film .tiles{display:flex;align-items:center;justify-content:center;gap:24px}
  .film .tile{width:152px;height:152px;display:grid;place-items:center;border-radius:30px}
  .film .tile .mk{width:92px;height:92px}
  .film .plus{width:48px;height:48px;fill:none;stroke:${C.muted};stroke-width:2;stroke-linecap:round}
  .film .h{font-size:var(--fs);font-weight:600;line-height:${TITLE_LH};letter-spacing:-.035em;text-wrap:balance;transform-origin:50% 0}

  .film .win{position:absolute;top:0;left:var(--sl);width:var(--tw)}
  .film .term{background:${C.termBg};border-radius:24px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,.05)}
  .film .bar{height:${BAR}px;display:flex;align-items:center;gap:14px;padding:0 30px;background:${C.termBar}}
  .film .bar i{width:18px;height:18px;border-radius:50%;background:#3F3F46;flex:none}
  .film .ttl{margin-left:18px;min-width:0;flex:1;overflow:hidden;font-family:'Geist Mono',ui-monospace,monospace;font-size:36px;color:${C.termDim};white-space:nowrap;
    -webkit-mask-image:linear-gradient(to right,#000 calc(100% - 64px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 64px),transparent)}
  .film .code{padding:${WIN.landscape.padTop}px ${WIN.landscape.padX}px ${WIN.landscape.padBottom}px;font-family:'Geist Mono',ui-monospace,monospace;font-size:var(--cs);line-height:${CODE_LH};color:${C.termInk}}
  /* a wrapped line hangs past its prompt and its own indent, so it reads as one command */
  .film .ln{white-space:pre-wrap;border-radius:10px;margin:0 -16px;padding:0 16px 0 calc(16px + (var(--in, 0) + 2) * 1ch);text-indent:calc((var(--in, 0) + 2) * -1ch)}
  .film .ln.ctx{white-space:pre;overflow:hidden;color:${C.termDim}}
  .film .ln.clip-l{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 120px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 120px),transparent)}
  .film .sh .ln::before{content:"$ ";color:${C.termDim}}
  .film .tok{display:inline-block;max-width:100%;overflow-wrap:anywhere;white-space:pre-wrap;vertical-align:top;text-indent:0}
  .film .c{opacity:0}
  .film .m{color:${C.model}}
  .film .roll{position:relative;display:inline-block;height:1.45em;vertical-align:top;border-radius:8px}
  .film .ri{position:absolute;left:0;top:0;white-space:pre;font-style:normal}
  .film em.ri{opacity:0}
  .film .brk{display:none}
  .film .brk-l .brk{display:block}
  /* an id on its own row hangs two characters in, not past the line's indent: the longest id needs the width */
  .film .brk-l .brk + .tok{margin-left:calc(var(--in, 0) * -1ch);max-width:calc(100% + var(--in, 0) * 1ch)}
  .film .caret{display:inline-block;width:.56em;height:1.1em;margin-left:4px;vertical-align:-.2em;background:${C.termInk};opacity:0}

  .film .end{display:flex;flex-direction:column;align-items:center;gap:48px}
  .film .lock{display:flex;align-items:center;gap:28px}
  .film .lock svg{width:120px;height:120px;display:block}
  .film .lock b{font-size:120px;font-weight:600;letter-spacing:-.04em;line-height:1}
  .film .url{font-size:48px;color:${C.primary};padding:22px 40px;border:2px solid ${C.line};border-radius:16px;background:${C.surface}}
  .film .url span{white-space:nowrap}

  @media (orientation: portrait){
    .film{--sy:200px;--sh:${WIN.portrait.sh}px;--sl:60px;--sr:120px;--gap:${WIN.portrait.gap}px;--cap2:88px;--cap3:72px;--tw:${WIN.portrait.width}px;--push:1.04;--lean:1.04}
    .film .cam{transform-origin:510px 710px}
    .film .tile{width:136px;height:136px;border-radius:28px}
    .film .tile .mk{width:84px;height:84px}
    .film .h{font-size:var(--fs-p)}
    .film .code{font-size:var(--cs-p);padding:${WIN.portrait.padTop}px ${WIN.portrait.padX}px ${WIN.portrait.padBottom}px}
    .film .ln.clip-l{-webkit-mask-image:none;mask-image:none}
    .film .ln.clip-p{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 96px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 96px),transparent)}
    .film .brk-l .brk{display:none}
    .film .brk-p .brk{display:block}
    .film .brk-l .brk + .tok{margin-left:0;max-width:100%}
    .film .brk-p .brk + .tok{margin-left:calc(var(--in, 0) * -1ch);max-width:calc(100% + var(--in, 0) * 1ch)}
    .film .lock svg{width:104px;height:104px}
    .film .lock b{font-size:104px}
    .film .url{font-size:44px;padding:22px 32px}
  }`;
