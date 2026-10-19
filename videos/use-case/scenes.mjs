/**
 * scenes: one builder per kind of scene in a use-case film, and the type
 * measurements that decide how each fact is set.
 *
 * A builder takes the film's copy (see kind.mjs) and returns
 * { cls, body, inner, cues, seconds }. `seconds` is the scene's own length:
 * the time to read it at READ_WPS plus a beat, plus whatever has to draw first.
 *
 * Every size has a landscape value and a portrait value (CSS vars --fs and
 * --fs-p); the portrait one applies under `@media (orientation: portrait)`.
 * Sizes are picked by measuring the text against the frame with Geist's own
 * advance widths, so a step that is "two lines" is two lines.
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
    landscape: { sizes: [140, 124, 112, 96, 80], width: SAFE.landscape, lines: 2 },
    portrait: { sizes: [112, 96, 84, 72, 64], width: SAFE.portrait, lines: 4 } },
  problem: { weight: 500, tracking: -0.02,
    landscape: { sizes: [72, 64, 56], width: (1728 - 128 - 112) * 0.96, lines: 3 },
    portrait: { sizes: [64, 56, 48, 44], width: (900 - 96) * 0.96, lines: 7 } },
  step: { weight: 500, tracking: -0.01,
    landscape: { sizes: [64, 56, 48, 44], width: SAFE.landscape, lines: 2 },
    portrait: { sizes: [64, 56, 48, 44], width: SAFE.portrait, lines: 5 } },
  // a short command is set large on one line; a long one wraps at the frame's code size
  code: { weight: 'mono', tracking: 0,
    landscape: { sizes: [64, 56, 48], width: (1400 - 96) * 0.98, lines: 1, wrap: 48 },
    portrait: { sizes: [60, 48], width: (900 - 96) * 0.98, lines: 1, wrap: 48 } },
  label: { weight: 600, tracking: 0,
    landscape: { sizes: [44], width: (500 - 56) * 0.96, lines: 2 },
    portrait: { sizes: [44], width: (430 - 56) * 0.96, lines: 2 } },
  note: { weight: 400, tracking: 0,
    landscape: { sizes: [36], width: (500 - 56) * 0.96, lines: 2 },
    portrait: { sizes: [36], width: (430 - 56) * 0.96, lines: 2 } },
};

/** `--fs` and `--fs-p` for a text in a role, or null when no size fits either frame. */
export function setIn(role, text) {
  const t = TYPE[role];
  const at = o => sizeFor(text, t[o].sizes, { width: t[o].width, weight: t.weight, tracking: t.tracking }, t[o].lines) ?? t[o].wrap ?? null;
  const landscape = at('landscape'), portrait = at('portrait');
  return landscape && portrait ? { landscape, portrait } : null;
}
const fsVars = fs_ => `--fs:${fs_.landscape}px;--fs-p:${fs_.portrait}px`;

// ── pieces ─────────────────────────────────────────────────────────────────
/** Each word in its own mask, so `rise` can lift it into place. Escaped here. */
// The mask clips its word on purpose while the word rises, so the layout audit is told so.
const masked = s => String(s).split(/\s+/).filter(Boolean)
  .map(w => `<span class="w" data-layout-allow-overflow><span>${esc(w)}</span></span>`).join(' ');
const mark = (f, cls = 'mk') => `<span class="${cls}" style="background-image:url('assets/providers/${esc(f)}')"></span>`;
const LOGO = fs.readFileSync(path.join(SHARED, 'assets/brand/anyrouter-logo-currentcolor.svg'), 'utf8')
  .replace(/<\?xml[^>]*>/, '').replace(/\s*\n\s*/g, ' ').trim();
const icon = d => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICONS = {
  tool: icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>'),
  provider: icon('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>'),
  gateway: icon('<circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6M12 3v6M12 15v6"/>'),
  alert: icon('<circle cx="12" cy="12" r="9.5"/><path d="M12 7.5v5.5M12 16.5h.01"/>'),
  plus: '<svg class="plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
};
ICONS.fallback = ICONS.provider;

// ── the scenes ─────────────────────────────────────────────────────────────
/** 1. What it is: the provider marks with AnyRouter's, the kicker, the title. */
export function titleScene(copy) {
  const tiles = copy.marks.map(f => `<div class="tile card">${mark(f)}</div>`).join('');
  return {
    cls: 'title',
    body: `<div class="tiles">${tiles}${tiles ? ICONS.plus : ''}<div class="tile card">${mark('anyrouter-color.svg')}</div></div>
      <div class="badge accent">${esc(copy.kicker)}</div>
      <h1 class="h" style="${fsVars(copy.type.title)}">${masked(copy.title)}</h1>`,
    // The first frame is the composed title card: it is what a page shows when autoplay
    // is blocked, and a near-blank frame 0 makes the renderer fall back to one worker.
    inner: `pop(".plus, .tile:last-child", 0.3, 0.1);`,
    cues: [{ at: 0.3, kind: 'tick', gain: 0.5 }],
    seconds: read(`${copy.kicker} ${copy.title}`, copy.wps),
  };
}

/** 2. Why: the problem's first sentence, as an alert. */
export function problemScene(copy) {
  return {
    cls: 'problem',
    body: `<div class="alert card">${ICONS.alert}<p class="pt" style="${fsVars(copy.type.problem)}">${masked(copy.problem)}</p></div>`,
    inner: `pop(".alert", 0.05); rise(".pt", 0.3);`,
    cues: [{ at: 0.3, kind: 'tick', gain: 0.4 }],
    seconds: read(copy.problem, copy.wps),
  };
}

// A model id inside a command (anyrouter/free, "google/gemini-2.5-pro") is the
// one accent in the terminal. Not a path or a URL: nothing word-like before it.
const MODEL_ID = /(?<![\w/.:~-])[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9.:[\]-]*/gi;
const TYPE_AT = 0.5;
const typing = text => Math.min(0.045, 1.2 / [...text].length);

/** 3. The one command, typed into a terminal. A `$` prompt only when it runs in a shell. */
export function commandScene(copy) {
  const { text, shell, title } = copy.command;
  const accents = new Set();
  for (const m of text.matchAll(MODEL_ID)) for (let i = m.index; i < m.index + m[0].length; i++) accents.add(i);
  // A token breaks only when it is wider than the whole line, never at its own
  // hyphens: a model id split at "gemma-4-" reads as two things.
  let i = 0;
  const chars = text.split(/( +)/).map(part => {
    const spans = [...part].map(ch => `<span class="c${accents.has(i++) ? ' m' : ''}">${esc(ch)}</span>`).join('');
    return part.trim() ? `<span class="tok">${spans}</span>` : spans;
  }).join('');
  // the caret is measured as one more character, so it never wraps onto a line of its own
  const size = setIn('code', `${shell ? '$ ' : ''}${text}█`);
  // One terminal width for every film: the same 1400px slab, whatever the command.
  const width = 1400;
  const each = typing(text), typed = TYPE_AT + each * [...text].length;
  const blink = Array.from({ length: 6 }, (_, k) => `tl.set(Q(".caret"), { opacity: ${k % 2 ? 1 : 0} }, ${(typed + 0.4 + k * 0.45).toFixed(2)});`).join(' ');
  return {
    cls: 'command',
    body: `<div class="term" style="--tw:${width}px"><div class="bar"><i></i><i></i><i></i>${title ? `<span class="ttl">${esc(title)}</span>` : ''}</div>
      <div class="code${shell ? ' sh' : ''}" style="${fsVars(size)}">${chars}<span class="caret"></span></div></div>`,
    inner: `pop(".term", 0.05); type(".code .c", ${TYPE_AT}, ${each.toFixed(4)}); ${blink}`,
    cues: [{ at: TYPE_AT, kind: 'type', dur: +(typed - TYPE_AT).toFixed(2), gain: 0.45 }],
    seconds: typed + read(text, copy.wps),
  };
}

/** 4. One step, with where it sits among the others. */
export function stepScene(copy, i) {
  const n = copy.steps.length, step = copy.steps[i];
  return {
    cls: 'step',
    body: `<div class="badge line stepno">Step ${i + 1} of ${n}</div>
      <p class="st" style="${fsVars(step.type)}">${masked(step.text)}</p>`,
    inner: `up(".stepno", 0.02); rise(".st", 0.25);`,
    cues: [{ at: 0.12, kind: 'tick', gain: 0.45 }],
    seconds: read(step.text, copy.wps),
  };
}

const LEVEL_EVERY = 0.85, DASHED_AFTER = 0.75, DRAW = 0.45;
/**
 * When each node lands: a level after the one before it. A node reached only by
 * dashed edges (the fallback path) lands once its level's solid edges are drawn,
 * so the dashed edge is drawn after them.
 */
export function landings(levels, edges) {
  const at = new Map();
  let t = 0.1;
  levels.forEach((lvl, d) => {
    if (d > 0) t += LEVEL_EVERY;
    const fallback = n => d > 0 && edges.filter(e => e.to === n.id).every(e => e.dashed);
    for (const n of lvl.filter(n => !fallback(n))) at.set(n.id, t);
    if (lvl.some(fallback)) {
      t += DASHED_AFTER;
      for (const n of lvl.filter(fallback)) at.set(n.id, t);
    }
  });
  return at;
}

/** 5. How a request flows: the diagram's nodes as cards, level by level, edges drawn between. */
export function flowScene(copy, id) {
  const { levels, edges } = copy.diagram;
  const at = landings(levels, edges);
  const t = nodeId => at.get(nodeId).toFixed(2);
  const node = n => `<div class="node card ${n.kind}" data-id="${esc(n.id)}" data-t="${t(n.id)}">
        ${n.mark ? mark(n.mark) : ICONS[n.kind]}<b>${esc(n.label)}</b>${n.note ? `<i>${esc(n.note)}</i>` : ''}</div>`;
  const svg = edges.map((e, k) => `<g data-from="${esc(e.from)}" data-to="${esc(e.to)}" data-t="${t(e.to)}">
        <mask id="${id}-m${k}" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><path class="km"/></mask>
        <path class="e${e.dashed ? ' dash' : ''}" mask="url(#${id}-m${k})"/><path class="ah"/></g>`).join('');
  const lastAt = Math.max(...at.values());
  const lastWords = levels.flat().filter(n => at.get(n.id) === lastAt).map(n => `${n.label} ${n.note ?? ''}`).join(' ');
  return {
    cls: 'flow',
    body: `<div class="fl"><svg class="edges" aria-hidden="true">${svg}</svg>
      ${levels.map((lvl, d) => `<div class="lvl" data-d="${d}">${lvl.map(node).join('')}</div>`).join('\n      ')}</div>`,
    inner: `
    // Edges are drawn between the cards where the layout put them, so one
    // timeline serves the landscape row and the portrait column.
    const portrait = matchMedia("(orientation: portrait)").matches, GAP = 14, AH = 16, DRAW = ${DRAW};
    const box = id => { const el = $('.node[data-id="' + id + '"]');
      return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; };
    $$(".edges g").forEach(g => {
      const a = box(g.dataset.from), b = box(g.dataset.to);
      let d, head;
      if (portrait) {
        const x1 = a.x + a.w / 2, y1 = a.y + a.h + GAP, x2 = b.x + b.w / 2, y2 = b.y - GAP - AH, m = (y1 + y2) / 2;
        d = "M" + x1 + " " + y1 + " C" + x1 + " " + m + " " + x2 + " " + m + " " + x2 + " " + y2;
        head = "M" + (x2 - 11) + " " + y2 + " L" + x2 + " " + (y2 + AH) + " L" + (x2 + 11) + " " + y2 + " Z";
      } else {
        const x1 = a.x + a.w + GAP, y1 = a.y + a.h / 2, x2 = b.x - GAP - AH, y2 = b.y + b.h / 2, m = (x1 + x2) / 2;
        d = "M" + x1 + " " + y1 + " C" + m + " " + y1 + " " + m + " " + y2 + " " + x2 + " " + y2;
        head = "M" + x2 + " " + (y2 - 11) + " L" + (x2 + AH) + " " + y2 + " L" + x2 + " " + (y2 + 11) + " Z";
      }
      g.querySelector(".e").setAttribute("d", d);
      const km = g.querySelector(".km"), len = (km.setAttribute("d", d), km.getTotalLength()), t = +g.dataset.t;
      g.querySelector(".ah").setAttribute("d", head);
      // drawn into its target, which lands as the line arrives
      tl.fromTo(km, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: DRAW, ease: "power2.inOut" }, t - DRAW - 0.05);
      tl.fromTo(g.querySelector(".ah"), { opacity: 0 }, { opacity: 1, duration: 0.1 }, t - 0.1);
    });
    $$(".node").forEach(el => tl.fromTo(el, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.7)" }, +el.dataset.t));`,
    cues: [...new Set(at.values())].map(t => ({ at: +t.toFixed(2), kind: 'tick', gain: 0.4 })),
    seconds: lastAt + DRAW + read(lastWords, copy.wps),
  };
}

/** 6. Where to go: the AnyRouter mark and the use case's page, held `copy.endHold` seconds. */
export function endScene(copy) {
  const shown = copy.url.replace(/^https:\/\//, '');
  const cut = shown.lastIndexOf('/') + 1;
  return {
    cls: 'end',
    body: `<div class="lock">${LOGO}<b>AnyRouter</b></div>
      <div class="url mono"><span>${esc(shown.slice(0, cut))}</span><wbr><span>${esc(shown.slice(cut))}</span></div>`,
    inner: `pop(".lock", 0.08); up(".url", 0.35);`,
    cues: [{ at: 0.08, kind: 'end', gain: 0.55 }],
    seconds: Math.max(copy.endHold, read(`AnyRouter ${shown}`, copy.wps)),
  };
}

// ── the look of the scenes, in frame.md's tokens ───────────────────────────
export const CSS = `
  .badge.line{background:${C.bg};border:2px solid ${C.line};color:${C.ink}}
  .title .safe{align-items:center;text-align:center}
  .title .tiles{display:flex;align-items:center;gap:24px}
  .title .tile{width:152px;height:152px;display:grid;place-items:center;border-radius:30px}
  .title .tile .mk{width:92px;height:92px}
  .title .plus{width:48px;height:48px;fill:none;stroke:${C.muted};stroke-width:2;stroke-linecap:round}
  .title .h{font-size:var(--fs);font-weight:600;line-height:1.05;letter-spacing:-.035em;text-wrap:balance}

  .problem .alert{display:flex;align-items:flex-start;gap:40px;width:100%;padding:56px 64px}
  .problem .ic{width:72px;height:72px;flex:none;margin-top:.1em;fill:none;stroke:${C.primary};stroke-width:2;stroke-linecap:round}
  .problem .pt{font-size:var(--fs);font-weight:500;line-height:1.2;letter-spacing:-.02em}

  .command .safe{align-items:center}
  .command .term{width:var(--tw);max-width:100%;background:${C.termBg};border-radius:24px;overflow:hidden;
    box-shadow:0 2px 4px rgba(0,0,0,.05)}
  .command .bar{height:76px;display:flex;align-items:center;gap:14px;padding:0 30px;background:${C.termBar}}
  .command .bar i{width:18px;height:18px;border-radius:50%;background:#3F3F46}
  .command .ttl{margin-left:18px;font-family:'Geist Mono',ui-monospace,monospace;font-size:36px;color:${C.termDim};white-space:nowrap}
  .command .code{padding:44px 48px 52px;font-family:'Geist Mono',ui-monospace,monospace;font-size:var(--fs);line-height:1.45;
    color:${C.termInk};white-space:pre-wrap;overflow-wrap:anywhere}
  .command .code.sh::before{content:"$ ";color:${C.termDim}}
  .command .code .m{color:${C.model}}
  .command .code .tok{display:inline-block;max-width:100%;overflow-wrap:anywhere;white-space:pre-wrap}
  .command .caret{display:inline-block;width:.56em;height:1.1em;margin-left:4px;vertical-align:-.2em;background:${C.termInk};opacity:0}

  .step .st{font-size:var(--fs);font-weight:500;line-height:1.22;letter-spacing:-.01em}

  .flow .safe{align-items:stretch}
  .flow .fl{position:relative;display:flex;align-items:center;justify-content:space-between}
  .flow .lvl{display:flex;flex-direction:column;gap:44px}
  .flow .node{width:500px;height:320px;display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:12px;padding:24px 28px;text-align:center}
  .flow .node .mk,.flow .node .ic{width:88px;height:88px;margin-bottom:8px}
  .flow .node .ic{fill:none;stroke:${C.muted};stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
  .flow .node b{font-size:44px;font-weight:600;line-height:1.15}
  .flow .node i{font-style:normal;font-size:36px;line-height:1.2;color:${C.muted}}
  .flow .node.gateway{border-color:${C.primary};box-shadow:0 0 0 6px rgba(187,77,0,.16)}
  .flow .node.fallback{border-style:dashed;border-color:${C.lineStrong}}
  .flow .edges{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible}
  .flow .edges .e{fill:none;stroke:${C.muted};stroke-width:4;stroke-linecap:round}
  .flow .edges .e.dash{stroke-dasharray:14 12}
  .flow .edges .km{fill:none;stroke:#FFFFFF;stroke-width:16}
  .flow .edges .ah{fill:${C.muted};opacity:0}

  .end .safe{align-items:center;text-align:center;gap:64px}
  .end .lock{display:flex;align-items:center;gap:30px}
  .end .lock svg{width:140px;height:140px;display:block}
  .end .lock b{font-size:140px;font-weight:600;letter-spacing:-.04em;line-height:1}
  .end .url{font-size:48px;color:${C.primary};padding:22px 40px;border:2px solid ${C.line};border-radius:16px;background:${C.surface}}
  .end .url span{white-space:nowrap}

  @media (orientation: portrait){
    .title .tile{width:136px;height:136px;border-radius:28px}
    .title .tile .mk{width:84px;height:84px}
    .title .h{font-size:var(--fs-p)}
    .problem .alert{flex-direction:column;gap:32px;padding:48px}
    .problem .pt{font-size:var(--fs-p)}
    .command .term{width:100%}
    .command .code{font-size:var(--fs-p)}
    .step .st{font-size:var(--fs-p)}
    .flow .fl{flex-direction:column;align-items:stretch;gap:100px}
    .flow .lvl{flex-direction:row;gap:40px}
    .flow .node{width:auto;flex:1;height:270px;max-width:560px;margin-left:auto;margin-right:auto}
    .end .lock svg{width:112px;height:112px}
    .end .lock b{font-size:112px}
    .end .url{font-size:44px;padding:22px 32px}
  }`;
