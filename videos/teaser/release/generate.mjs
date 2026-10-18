#!/usr/bin/env node
/**
 * AnyRouter intro film :: generate
 *
 * Emits a HyperFrames project from release/facts.mjs + release/theme.mjs.
 * There is no second film here: the beat table, the copy, the timings and the
 * motion are fixed, and `--theme` swaps the token values underneath them.
 *
 *   node release/generate.mjs                  # dark
 *   node release/generate.mjs --theme=light    # light
 *   node release/generate.mjs --theme=light --out=build/light
 *
 * Architecture — each rule below is a hard `npm run check` failure, not a style
 * preference (see AGENTS.md):
 *
 *   1. The framework OWNS clip visibility. Never tween autoAlpha / opacity /
 *      visibility on an element carrying `data-start`. Every scene therefore
 *      animates `#punch` and its children, never the clip host.
 *   2. The root composition is built ONLY from sub-composition hosts
 *      (`data-composition-src`). Scenes are never nested elements — the plate
 *      layers are decorative siblings, not wrapped containers.
 *   3. Asset paths are project-root-relative (`fonts/…`, `assets/…`), never
 *      `../`. Marks are therefore copied INTO assets/providers/ at generate
 *      time, re-inked for the theme on the way through.
 *   4. Every font family needs an @font-face, in the root AND in every
 *      sub-composition (each is a standalone document).
 *   5. No scene may outlive the next one — see the overlap guard below.
 *   6. Contrast is enforced. release/theme.mjs throws on import if any token
 *      pair is under 4.5:1 (text) or 3:1 (non-text).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTheme, verify } from './theme.mjs';
import { inkMark } from './ink-marks.mjs';
import * as F from './facts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const COMPS = path.join(ROOT, 'compositions');
const MARKS = path.join(ROOT, 'assets/providers');
const MARKS_SRC = path.join(ROOT, '../../shared/assets/providers');

const argv = process.argv.slice(2);
const val = (k, d) => (argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];

const THEME = resolveTheme(val('theme', 'dark'));
const DURATION = parseFloat(val('seconds', '20'));
const FPS = 30;
const GSAP = 'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js';

// Fail loudly, here, rather than inside a headless browser three minutes later.
const contrast = verify(THEME.name);

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = (v) => +v.toFixed(3);
/**
 * A number for a CSS value. Forcing a decimal point keeps `960` from reading
 * as a bare token, which matters in inline `style=""` where `left:960px` is
 * fine but sloppy, and in generated values compared against each other.
 */
const u = (v) => {
  const r = n(v);
  return Number.isInteger(r) ? `${r}.0` : String(r);
};
/**
 * A length/angle for GSAP. It MUST be a quoted string: JavaScript has no
 * numeric unit literals, so `left:960px` is a syntax error ("Identifier
 * directly after number") and so is `left:960.0px`. `left:"960.0px"` parses.
 */
const g = (v, unit = 'px') => JSON.stringify(`${u(v)}${unit}`);

// ── the beat table ─────────────────────────────────────────────────────────
// 128 BPM: a beat is 0.46875s and an 8th is 0.234375s. These starts ride a
// 16-note grid but are deliberately UNEVEN (1.88 / 0.92 / 0.95 / 1.55 / …) —
// a uniform grid is the tell of a film cut to a metronome instead of the score.
// The three drop times are the score's own drop times: 1.88, 10.50, 17.20.
const BEATS = [
  { id: 'estab', start: 0.0, plate: 'mountain' },
  { id: 'brand', start: 1.88, plate: 'band', drop: 1 },
  { id: 'unify', start: 2.8, plate: 'mountain' },
  { id: 'catalog', start: 3.75, plate: 'nebula' },
  { id: 'endpoint', start: 5.3, plate: 'mountain' },
  { id: 'free', start: 6.56, plate: 'band' },
  { id: 'preset', start: 7.9, plate: 'mountain' },
  { id: 'auto', start: 8.85, plate: 'nebula' },
  { id: 'decision', start: 9.9, plate: 'mountain' },
  { id: 'byok', start: 10.5, plate: 'band', drop: 2 },
  { id: 'markup', start: 11.65, plate: 'nebula' },
  { id: 'pool', start: 12.85, plate: 'mountain', away: true },
  { id: 'domain', start: 14.35, plate: 'band' },
  { id: 'board', start: 15.7, plate: 'mountain' },
  { id: 'end', start: 17.2, plate: 'nebula', drop: 3 },
];

// ── copy every mark out of shared/assets/providers, re-inked for this theme ─────────
// 89 of the 141 marks are currentColor (black). On the dark plate that is a
// hole in the frame; on the light plate a near-white brand colour is. The same
// routine handles both by taking the ink as a parameter.
const needed = new Set([...F.ESTAB_MARKS, ...F.DONOR_MARKS]);
let inked = 0;
fs.rmSync(MARKS, { recursive: true, force: true });
fs.mkdirSync(MARKS, { recursive: true });
for (const m of needed) {
  const src = path.join(MARKS_SRC, `${m}.svg`);
  if (!fs.existsSync(src)) throw new Error(`missing provider mark: ${m}.svg`);
  const { out, rewritten } = inkMark(fs.readFileSync(src, 'utf8'), THEME.markInk, THEME.name);
  fs.writeFileSync(path.join(MARKS, `${m}.svg`), out);
  if (rewritten) inked++;
}
const logo = (m, cls = '') =>
  `<img class="mark ${cls}" src="assets/providers/${m}.svg" alt="${esc(m)}" />`;

// ── the shared stylesheet ──────────────────────────────────────────────────
// Injected verbatim into the root and into every sub-composition, so each
// standalone document carries its own @font-face (rule 4).
const CSS = `
@font-face{font-family:'ArInter';src:url('fonts/inter.woff2') format('woff2-variations');
  font-weight:100 900;font-display:block}
@font-face{font-family:'ArMono';src:url('fonts/mono.woff2') format('woff2-variations');
  font-weight:100 800;font-display:block}
:root{
  --bg:${THEME.bg};--card:${THEME.card};--raised:${THEME.raised};--fg:${THEME.fg};
  --muted:${THEME.muted};--line:${THEME.line};--line-solid:${THEME.lineSolid};
  --primary:${THEME.primary};--gold:${THEME.gold};--free:${THEME.free};
  --glow:${THEME.glow};--glow-soft:${THEME.glowSoft};--scrim:${THEME.scrim};
  --node:${THEME.node};
  --shot-frame:${THEME.shotFrame};--shot-edge:${THEME.shotFrameEdge};
  --mark-plate:${THEME.markPlate};
${THEME.chart.map((c, i) => `  --c${i}:${c};`).join('\n')}
}
*{margin:0;padding:0;box-sizing:border-box}
/* NO background here. Each sub-composition is its own document, and the
   framework composites it over the root — an opaque body on every clip hides
   the plate layers underneath completely. The root's own html/body carries the
   page background; scene bodies must stay transparent. */
body{font-family:'ArInter',Inter,system-ui,sans-serif;color:var(--fg);
  -webkit-font-smoothing:antialiased;perspective:2400px;transform-style:preserve-3d}
.mono{font-family:'ArMono',ui-monospace,Menlo,monospace}
.stage{position:relative;width:100%;height:100%;overflow:hidden;display:grid;place-items:center;
  transform-style:preserve-3d}
/* Every scene animates this wrapper for camera-ish moves only (punch, flip,
   push-away). Entrances live on the children, so the two never fight over the
   same transform property.
   It MUST fill the stage: .stage is a centred grid, so a fit-content #punch
   would shrink-wrap its scene and any absolutely-positioned child measured
   from the frame centre (the estab orbit) would land off-frame. */
.punch{position:absolute;inset:0;display:grid;place-items:center;transform-style:preserve-3d}
.mark{width:76px;height:76px;object-fit:contain}
.mark-plate{background:var(--mark-plate);border:1px solid var(--line);border-radius:20px}
/* the estab orbit: every tile is placed once at the frame centre and moved
   with GSAP x/y, so nothing in this scene triggers a layout pass.
   data-layout-allow-overflow: the tiles legitimately streak in from off-frame. */
#ring{position:absolute;inset:0;width:100%;height:100%}
.tile{position:absolute;left:960px;top:540px;width:96px;height:96px;margin:-48px 0 0 -48px;
  display:grid;place-items:center;border-radius:22px;background:var(--mark-plate);
  border:1px solid var(--line);will-change:transform,opacity}
.tile .mark{width:56px;height:56px}

/* type scale — 40px is the floor; nothing in the film sets below it.
   Mono line-heights are generous on purpose: JetBrains Mono's em box is about
   1.39em tall, so a line-height under that makes the glyphs spill out of their
   own box and collide with whatever sits below. */
.t-chip{font-family:'ArMono',monospace;font-size:40px;line-height:1.4;letter-spacing:-.01em}
.t-body{font-size:46px;line-height:1.32;letter-spacing:-.012em}
.t-lead{font-size:60px;line-height:1.22;letter-spacing:-.022em}
.t-h2{font-size:104px;line-height:1.16;letter-spacing:-.038em;font-weight:700}
.t-h1{font-size:184px;line-height:1.06;letter-spacing:-.045em;font-weight:700}
.t-num{font-size:280px;line-height:1.3;letter-spacing:-.055em;font-weight:700}
.t-dom{font-size:180px;line-height:1.12;letter-spacing:-.05em;font-weight:700}
.muted{color:var(--muted)}
.gold{color:var(--gold)}
.green{color:var(--free)}
.amber{color:var(--primary)}

/* shared atoms */
.idline{font-family:'ArMono',monospace;font-weight:600;letter-spacing:-.03em}
.eyebrow{font-size:44px;letter-spacing:.34em;text-transform:uppercase;color:var(--muted);font-weight:600}
/* Anything that carries TEXT gets the solid card surface, not the translucent
   mark-plate tint. A tint over a photographic plate makes the backdrop a
   function of whatever happens to be behind it — the end card's amber "curl"
   measured 2.32:1 where the nebula plate brightened behind it. A solid
   surface is both crisper and provably contrast-safe. The mark-plate token is
   reserved for the decorative tiles that hold a provider mark and no text. */
.chip{display:flex;align-items:baseline;gap:26px;padding:24px 40px;border-radius:20px;
  border:2px solid var(--line-solid);background:var(--card)}
/* the path is the subject and the note is the annotation — 44 vs 40, not the
   other way round */
.chip .t-chip{font-size:44px}
.chip .note{font-size:40px;color:var(--muted);white-space:nowrap}
.kicker{font-size:40px;letter-spacing:.30em;text-transform:uppercase;color:var(--muted);font-weight:600}
.cmd{font-family:'ArMono',monospace;font-size:52px;padding:30px 48px;border-radius:18px;
  background:var(--card);border:2px solid var(--line-solid);white-space:nowrap}
.s1{color:var(--gold)} .s2{color:var(--muted)} .s3{color:var(--free)} .s4{color:var(--primary)}

/* the amber glow the monogram lands in. The halo is deliberately 200px larger
   than the 268px monogram on every side — that overspill IS the glow, so the
   wrapper carries data-layout-allow-overflow in the markup. */
.monowrap{position:relative;width:268px;height:268px;display:grid;place-items:center}
.orb{position:absolute;inset:-200px;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,var(--glow) 0%,var(--glow-soft) 46%,transparent 72%);
  filter:blur(14px)}
#mono{position:relative}
`;

// ── scene scaffolding ──────────────────────────────────────────────────────
// Scene ids are `sNN-<beat>` so the compositions directory sorts in beat order;
// the beat key is everything after the dash.
const sceneFile = (id, dur, body, inner) => `<!doctype html>

<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>${id}</title>
<script src="${GSAP}"></script>
<style>${CSS}</style></head>
<body>
<div id="root" data-composition-id="${id}" data-width="1920" data-height="1080"
     data-duration="${dur}" data-fps="${FPS}">
  <div class="stage" id="stage">
    <div class="punch" id="punch" data-layout-allow-overflow>${body}</div>
  </div>
</div>
<script>
  // Animate #punch and its children, never the clip host — the framework owns
  // clip visibility (rule 1).
  const tl = gsap.timeline({ paused: true });
  tl.set("#punch", { transformOrigin: "50% 50%" });
  ${inner}
  window.__timelines["${id}"] = tl;
</script>
</body></html>`;

/** Camera move for a beat: a zoom punch, a hard 3D flip, or a push-away. */
function camera(b, dur) {
  if (b.drop) {
    // Shorten to 0.20s or the flip smears across the beat's payload.
    return `tl.fromTo("#punch",{rotateY:80,rotateX:-9,scale:.80,z:-1100},{rotateY:0,rotateX:0,scale:1,z:0,duration:.20,ease:"power4.out"},0);`;
  }
  if (b.away) {
    // The pool beat is the one place the camera retreats, so the diagram reads
    // as a whole. It starts at exactly 1: the push-away IS this beat's camera
    // move, so an incoming punch on top of it is redundant motion — and a
    // 1.06 start makes the 1920x1080 box overflow the stage on the way in.
    // 0.865 is the floor; below that the stat row clips the frame edge.
    return `tl.fromTo("#punch",{scale:1},{scale:.865,duration:${n(dur * 0.92)},ease:"sine.out"},0);`;
  }
  return `tl.fromTo("#punch",{scale:1.046},{scale:1,duration:.44,ease:"expo.out"},0);`;
}

// ── the scenes ─────────────────────────────────────────────────────────────
const scenes = [];
const push = (id, start, dur, body, inner) => scenes.push({ id, start, dur, body, inner });

// 0 · estab — 22 real provider marks streak in from off-frame, settle into an
// orbit around centre, get pulled in, vanish.
//
// Every tile is laid out once at the frame centre and moved with GSAP's x/y
// (transform) rather than left/top: the linter rejects left/top tweens because
// they snap to integer device pixels under the seek-by-frame capture engine.
{
  const N = F.ESTAB_MARKS.length;
  const RX = 600;
  const RY = 340;
  const CX = 960;
  const CY = 540;
  const at = (i, k) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    return {
      ox: n(CX + RX * Math.cos(a)),
      oy: n(CY + RY * Math.sin(a)),
      sx: n(CX + 1460 * k * Math.cos(a)),
      sy: n(CY + 940 * k * Math.sin(a)),
      rot: n((a * 180) / Math.PI + 90),
    };
  };
  const tiles = F.ESTAB_MARKS.map(
    (m, i) => `<div class="tile" id="t${i}">${logo(m)}</div>`
  ).join('\n      ');
  const streak = F.ESTAB_MARKS.map((_, i) => {
    const p = at(i, 1);
    return `tl.fromTo("#t${i}",{x:${n(p.sx - CX)},y:${n(p.sy - CY)},scale:.30,opacity:0,rotation:${n(p.rot - 34)}},
      {x:${n(p.ox - CX)},y:${n(p.oy - CY)},scale:1,opacity:1,rotation:${n(p.rot)},duration:.60,ease:"expo.out"},${n(i * 0.014)});`;
  }).join('\n  ');
  push('s00-estab', 0, 1.88, `<div id="ring" data-layout-allow-overflow>
      ${tiles}
    </div>`,
    `tl.set("#ring",{transformOrigin:"50% 50%"});
  ${streak}
  // the orbit breathes for a beat, then everything is drawn into the centre
  tl.to("#ring",{rotate:20,duration:.72,ease:"sine.inOut"},.62);
  tl.to(".tile",{scale:.04,opacity:0,duration:.46,ease:"power3.in",stagger:{each:.008,from:"random"}},1.30);`);
}

// 1 · brand — DROP 1. The AR monogram lands in an amber glow; the key string.
push('s01-brand', 1.88, 0.92,
  `<div class="stack" style="display:grid;place-items:center;gap:52px">
    <div class="monowrap" data-layout-allow-overflow>
      <div class="orb" id="orb"></div>
      <img id="mono" src="${THEME.monogram}" alt="AnyRouter"
           style="width:268px;height:268px;object-fit:contain" />
    </div>
    <div class="t-chip" id="key" style="color:var(--primary);letter-spacing:.06em">
      ${esc(F.KEY_PREFIX)}<span class="s2">${'•'.repeat(14)}</span></div>
  </div>`,
  `tl.fromTo("#orb",{scale:.2,opacity:0},{scale:1,opacity:1,duration:.34,ease:"expo.out"},.06);
  tl.from("#mono",{scale:.72,opacity:0,duration:.30,ease:"back.out(1.5)"},.12);
  tl.from("#key",{y:34,opacity:0,duration:.26,ease:"power3.out"},.22);`);

// 2 · unify — the headline.
push('s02-unify', 2.8, 0.95,
  `<div class="t-h1" id="hd">
    <span class="w">Unify</span> <span class="w">every</span> <span class="w gold">model.</span></div>`,
  `tl.from("#hd .w",{y:78,opacity:0,duration:.34,ease:"power4.out",stagger:.055},0);
  tl.to("#hd .w",{y:-26,opacity:0,duration:.22,ease:"power2.in",stagger:.02},.72);`);

// 3 · catalog — editorial split. The numeral counts; the screenshot proves it.
push('s03-catalog', 3.75, 1.55,
  `<div class="split">
    <div class="left">
      <div class="nrow"><span class="t-num gold" id="count">0</span><span class="plus gold" id="plus">+</span></div>
      <div class="t-body muted" id="cap">models across ${F.CLAIM.providers}+ providers</div>
    </div>
    <div class="shot" id="shot">
      <img src="assets/catalog.png" alt="The AnyRouter model catalog" />
    </div>
  </div>`,
  `const c={v:0};
  tl.from("#shot",{x:96,scale:.94,opacity:0,duration:.46,ease:"expo.out"},0);
  tl.to(c,{v:${F.CLAIM.models},duration:.92,ease:"power2.out",onUpdate:()=>{document.getElementById("count").textContent=String(Math.round(c.v));}},.10);
  tl.from("#cap",{y:30,opacity:0,duration:.30,ease:"power3.out"},.34);
  tl.from("#plus",{opacity:0,scale:.6,duration:.24,ease:"back.out(2)"},1.00);`);

// 4 · endpoint — the four chat-shaped paths, stacked.
push('s04-endpoint', 5.3, 1.26,
  `<div class="stack" style="display:grid;gap:24px">
    <div class="kicker" id="ek">one key · one endpoint shape</div>
    ${F.ENDPOINTS.map(
      (e) => `<div class="chip"><span class="t-chip" style="color:var(--fg)">${esc(e.path)}</span>
      <span class="note">${esc(e.note)}</span></div>`
    ).join('\n    ')}
  </div>`,
  `tl.from("#ek",{opacity:0,y:-18,duration:.24,ease:"power3.out"},0);
  tl.from(".stack .chip",{x:-74,opacity:0,duration:.32,ease:"power4.out",stagger:.075},.10);`);

// 5 · free — $0.
push('s05-free', 6.56, 1.34,
  `<div class="stack" style="display:grid;place-items:center;gap:26px">
    <div class="t-num green" style="font-size:290px">$0</div>
    <div class="t-lead" style="color:var(--fg)">${esc(F.ALIASES.free.line)}</div>
    <div class="t-body muted">Curated $0 platform models. No credit deduction.</div>
  </div>`,
  `tl.from(".stack > *",{y:56,opacity:0,duration:.34,ease:"expo.out",stagger:.07},0);
  tl.to(".stack",{y:-34,opacity:0,duration:.22,ease:"power2.in"},1.10);`);

// 6 · preset — @preset/<name> is a real, documented shape.
push('s06-preset', 7.9, 0.95,
  `<div class="stack" style="display:grid;place-items:center;gap:34px">
    <div class="idline" style="font-size:150px;color:var(--fg)">${esc(F.PRESET.ref)}</div>
    <div class="t-body muted" style="max-width:26ch;text-align:center">${esc(F.PRESET.line)}</div>
  </div>`,
  `tl.from("#punch .idline",{y:64,opacity:0,duration:.32,ease:"expo.out"},0);
  tl.from("#punch .t-body",{y:28,opacity:0,duration:.28,ease:"power3.out"},.14);`);

// 7 · auto
push('s07-auto', 8.85, 1.05,
  `<div class="stack" style="display:grid;place-items:center;gap:34px">
    <div class="idline" style="font-size:132px;color:var(--gold)">${esc(F.ALIASES.auto.id)}</div>
    <div class="t-lead" style="color:var(--fg)">${esc(F.ALIASES.auto.line)}</div>
  </div>`,
  `tl.from("#punch .idline",{y:60,opacity:0,duration:.30,ease:"expo.out"},0);
  tl.from("#punch .t-lead",{y:26,opacity:0,duration:.26,ease:"power3.out"},.12);`);

// 8 · decision — the shortest beat in the film, 0.60s. Reads as a hard tag.
push('s08-decision', 9.9, 0.6,
  `<div class="stack" style="display:grid;place-items:center;gap:28px">
    <div class="idline" style="font-size:104px;color:var(--fg)">${esc(F.ALIASES.decision.id)}</div>
    <div class="t-body" style="color:var(--free)">${esc(F.ALIASES.decision.line)}</div>
  </div>`,
  `tl.from("#punch .idline",{x:-56,opacity:0,duration:.20,ease:"power4.out"},0);
  tl.from("#punch .t-body",{x:56,opacity:0,duration:.20,ease:"power4.out"},.04);
  tl.to("#punch .stack",{opacity:0,duration:.12,ease:"power2.in"},.48);`);

// 9 · byok — DROP 2. Second line amber.
push('s09-byok', 10.5, 1.15,
  `<div class="stack" style="display:grid;place-items:center;gap:30px;text-align:center">
    <div class="t-h2" id="l1">${esc(F.BYOK.line1)}</div>
    <div class="t-h2 amber" id="l2">${esc(F.BYOK.line2)}</div>
  </div>`,
  `tl.from("#l1",{x:-70,opacity:0,duration:.28,ease:"expo.out"},.04);
  tl.from("#l2",{x:70,opacity:0,duration:.28,ease:"expo.out"},.14);`);

// 10 · markup
push('s10-markup', 11.65, 1.2,
  `<div class="stack" style="display:grid;place-items:center;gap:22px">
    <div class="mrow">
      <span class="t-num green" style="font-size:280px">$0</span>
      <span class="mlab">markup</span></div>
    <div class="t-body muted">${esc(F.BYOK.markSub)}</div>
  </div>`,
  `tl.from("#punch .mrow",{scale:.86,opacity:0,duration:.34,ease:"expo.out"},0);
  tl.from("#punch .mlab",{x:-40,opacity:0,duration:.26,ease:"power3.out"},.12);
  tl.from("#punch .t-body",{y:26,opacity:0,duration:.26,ease:"power3.out"},.22);`);

// 11 · pool — the camera pushes AWAY. 8 real donor brands, flow-lines into one
// node, three counting stats. Positions are computed so the SVG curves land on
// the marks and on the node.
{
  const N = F.DONOR_MARKS.length;
  const LX = 168;
  const NX = 604;
  const px = (i) => n(960 + (i - (N - 1) / 2) * 192);
  const rows = F.DONOR_MARKS.map((m, i) => `<div class="pk" id="pk${i}" style="left:${px(i)}px;top:${LX}px">
      ${logo(m)}</div>`).join('\n      ');
  const paths = F.DONOR_MARKS.map((_, i) => {
    const x = px(i);
    return `      <path class="fl" data-i="${i}" d="M${x} ${LX + 58} C${x} 400, 960 400, 960 ${NX - 66}" />`;
  }).join('\n');
  const stops = THEME.chart
    .map((c, i) => `        <stop offset="${(i / (THEME.chart.length - 1)).toFixed(2)}" stop-color="${c}"/>`)
    .join('\n');
  const stats = [
    { v: F.POOL.activeKeys, label: 'active keys', pad: 0 },
    { v: F.POOL.donors, label: 'donors', pad: 0 },
    { v: F.POOL.requestsTotal, label: 'requests, all time', pad: 1 },
  ];
  const statHtml = stats
    .map(
      (s, i) => `<div class="stat"><b class="idline" id="st${i}">0</b><i>${esc(s.label)}</i></div>`
    )
    .join('\n      ');
  const counts = stats
    .map(
      (s, i) => `const s${i}={v:0};
  tl.to(s${i},{v:${s.v},duration:.72,ease:"power2.out",onUpdate:()=>{document.getElementById("st${i}").textContent=Math.round(s${i}.v).toLocaleString("en-US");}},.34);`
    )
    .join('\n  ');
  const drop = stats
    .map((_, i) => `tl.from("#st${i}",{y:30,opacity:0,duration:.26,ease:"power3.out"},${n(0.16 + i * 0.07)});`)
    .join('\n  ');

  push('s11-pool', 12.85, 1.5,
    `<div class="poolwrap" data-layout-allow-overflow>
      <div class="pkrow" style="position:absolute;inset:0">
      ${rows}
      </div>
      <svg class="flow" viewBox="0 0 1920 1080" aria-hidden="true">
      <defs>
        <linearGradient id="flg" x1="0" y1="0" x2="0" y2="1">
${stops}
        </linearGradient>
      </defs>
${paths}
      </svg>
      <div class="node" id="node"></div>
      <div class="statrow">
      ${statHtml}
      </div>
    </div>`,
    `${counts}
  // The lines are one tween, not eight. A per-line stagger gives each connector
  // its own clock, so a shaft starts drawing while the mark it grows out of is
  // still arriving — the layout pass reads that as a connector_orphan. All eight
  // marks land at 0.035*7 + 0.28 = 0.525s, so the flow starts after that.
  tl.from(".pk",{y:-46,opacity:0,scale:.6,duration:.28,ease:"back.out(1.8)",stagger:.035},0);
  tl.fromTo(".fl",{strokeDasharray:1500,strokeDashoffset:1500},
    {strokeDashoffset:0,duration:.34,ease:"power2.inOut"},.54);
  tl.from("#node",{scale:.2,opacity:0,duration:.32,ease:"back.out(2.2)"},.64);
  ${drop}`);
}

// 12 · domain
push('s12-domain', 14.35, 1.35,
  `<div class="t-dom" id="dom"><span>anyrouter</span><span class="gold">.dev</span></div>`,
  `tl.from("#dom span",{y:96,opacity:0,duration:.40,ease:"expo.out",stagger:.07},0);
  tl.to("#dom",{scale:1.07,duration:.62,ease:"sine.in"},.40);`);

// 13 · board — a grid of real catalog ids, staggering in.
push('s13-board', 15.7, 1.5,
  `<div class="grid">
    ${F.BOARD_IDS.map(
      (id) => `<div class="cell"><span class="own">${esc(id.split('/')[0])}</span><span class="mdl">${esc(
        id.split('/')[1] ?? id
      )}</span></div>`
    ).join('\n    ')}
  </div>`,
  `tl.from(".grid .cell",{scale:.88,opacity:0,y:34,duration:.26,ease:"power3.out",stagger:.028},0);`);

// 14 · end — DROP 3. Domain, one line of stats, the install command.
push('s14-end', 17.2, 2.8,
  `<div class="stack" style="display:grid;place-items:center;gap:44px">
    <div class="t-h2" id="edom"><span>anyrouter</span><span class="gold">.dev</span></div>
    <div class="t-lead" id="eline">
      <b>${F.CLAIM.models}+</b> models &nbsp;·&nbsp; <b>${F.CLAIM.providers}+</b> providers
      &nbsp;·&nbsp; <b class="green">$0 in / $0 out</b></div>
    <div class="cmd" id="ecmd"><span class="s4">curl</span> -fsSL
      https://${esc(F.DOMAIN)}/setup.sh <span class="s2">|</span> <span class="s1">bash</span></div>
  </div>`,
  `tl.from("#edom",{y:60,opacity:0,duration:.34,ease:"expo.out"},.04);
  tl.from("#eline",{y:32,opacity:0,duration:.28,ease:"power3.out"},.16);
  // No back.out here: this is the widest nowrap box in the film (1598px), and
  // an overshoot ease briefly scales it ~6% past its own container's width,
  // which the layout pass reads as nowrap overflow.
  tl.from("#ecmd",{scale:.94,opacity:0,duration:.30,ease:"expo.out"},.28);`);

// ── attach each beat's camera move ─────────────────────────────────────────
for (const s of scenes) {
  const b = BEATS.find((x) => x.id === s.id.replace(/^s\d+-/, ''));
  if (!b) throw new Error(`scene "${s.id}" has no entry in the BEATS table`);
  s.beat = b;
  s.inner = `${camera(b, s.dur)}\n  ${s.inner}`;
}

// ── OVERLAP GUARD ──────────────────────────────────────────────────────────
// Two full layouts on screen at once is the `content_overlap` failure. This has
// shipped twice before, so it is a hard clamp, not a warning.
if (scenes.length !== BEATS.length) {
  throw new Error(`${scenes.length} scenes vs ${BEATS.length} beats — they must be pushed in step`);
}
scenes.forEach((s, i) => {
  if (s.beat !== BEATS[i]) throw new Error(`scene order diverges from the beat table at "${s.id}"`);
});
// Each beat runs until the next one begins. The last runs to the end.
const D = BEATS.map((b, i) => ({
  id: b.id,
  start: b.start,
  dur: n((i + 1 < BEATS.length ? BEATS[i + 1].start : DURATION) - b.start),
  warn: null,
}));
for (let i = 0; i < D.length - 1; i++) {
  // Tolerance is the rounding granularity, not an epsilon: starts carry 2
  // decimals and durations 3, so an exact hand-off reads as
  // 3.7500000000000004 > 3.75 and would otherwise "clamp" every beat.
  const room = n(D[i + 1].start - D[i].start);
  if (D[i].dur - room > 0.0005) {
    D[i].warn = `clamped ${D[i].dur} → ${room} (would overlap ${D[i + 1].id})`;
    D[i].dur = room;
  }
}
D.forEach((d, i) => {
  scenes[i].dur = d.dur;
  if (d.warn) console.log(`  clamped  ${d.id}: ${d.warn}`);
});

// ── write the sub-compositions ─────────────────────────────────────────────
fs.rmSync(COMPS, { recursive: true, force: true });
fs.mkdirSync(COMPS, { recursive: true });
scenes.forEach((s) => {
  fs.writeFileSync(path.join(COMPS, `${s.id}.html`), sceneFile(s.id, s.dur, s.body, s.inner));
});

// ── the root: plates, clip hosts, the score, the camera ────────────────────
const plates = ['mountain', 'band', 'nebula'];
const plateLayer = (id) => `
    <div class="platewrap" data-layout-allow-overflow>
      <img class="plate blur" id="pb-${id}" src="assets/plates/${THEME.plates[id]}-blur.jpg" alt="" />
      <img class="plate" id="p-${id}" src="assets/plates/${THEME.plates[id]}.jpg" alt="" />
    </div>`;

// Cross-fade the three plates on the beat grid.
//
// Every plate starts hidden and exactly one is lit. The earlier version only
// ever tweened opacity *down*, so a plate with no tween before its first beat
// sat at the CSS default of 1 — all three were stacked from frame 0 with nebula
// on top, which is why the background looked like flat black.
//
// Each cut crossfades across the seam: the outgoing plate leaves 0.18s early,
// the incoming arrives 0.18s late, so the two overlap instead of blinking
// through a gap.
const XF = 0.36;
// `overwrite: "auto"` is required, not optional: a plate can come back and go
// again inside one crossfade window (mountain returns at the `decision` beat
// and leaves 0.6s later at `byok`), so the leaving tween has to kill the
// arriving one mid-flight. Without it GSAP runs both and the plate flickers.
const fade = (sel, to, at) =>
  `  tl.to("#${sel}",{opacity:${to},duration:${XF},ease:"sine.inOut",overwrite:"auto"},${n(at)});`;

const fades = [
  // hidden until a beat asks for them
  ...plates.flatMap((id) => [`  tl.set("#p-${id}",{opacity:0},0);`, `  tl.set("#pb-${id}",{opacity:0},0);`]),
  `  tl.set("#p-${BEATS[0].plate}",{opacity:1},0);`,
  `  tl.set("#pb-${BEATS[0].plate}",{opacity:1},0);`,
  ...BEATS.slice(1).flatMap((b, k) => {
    const prev = BEATS[k].plate; // already the plate id, not a beat object
    const t = BEATS[k + 1].start;
    if (prev === b.plate) return [];
    return [
      fade(`p-${prev}`, 0, t - 0.18),
      fade(`pb-${prev}`, 0, t - 0.18),
      fade(`p-${b.plate}`, 1, t + 0.18),
      fade(`pb-${b.plate}`, 1, t + 0.18),
    ];
  }),
].join('\n');

// Parallax: the blurred underlayer drifts further than the sharp plate, so the
// background has depth instead of sitting flat behind the type.
const parallax = plates
  .map(
    (id) => `  tl.fromTo("#p-${id}",{scale:1.16,x:0},{scale:1.26,x:-46,duration:${DURATION},ease:"sine.inOut"},0);
  tl.fromTo("#pb-${id}",{scale:1.34,x:0},{scale:1.52,x:-96,duration:${DURATION},ease:"sine.inOut"},0);`
  )
  .join('\n');

const index = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>AnyRouter — intro (${THEME.name})</title>
<script src="${GSAP}"></script>
<style>
${CSS}
html,body{width:1920px;height:1080px;overflow:hidden;background:${THEME.bg}}
#root{position:relative;width:1920px;height:1080px;overflow:hidden;transform-style:preserve-3d;
  will-change:transform}
.clip{position:absolute;inset:0}
.platewrap{position:absolute;inset:0;overflow:hidden}
.plate{position:absolute;left:50%;top:50%;width:100%;height:100%;object-fit:cover;
  margin-left:-960px;margin-top:-540px;transform-origin:50% 50%;will-change:transform,opacity}
.plate.blur{filter:blur(6px)}
/* Centre-weighted, not a corner vignette: the type field is the middle of the
   frame in every beat, so the scrim is densest there and the plate is left
   visible in the outer third where nothing is read. */
.vig{position:absolute;inset:0;background:
  radial-gradient(56% 48% at 50% 50%,${THEME.scrim} 0%,${THEME.scrim} 44%,transparent 84%),
  radial-gradient(100% 100% at 50% 50%,transparent 50%,${THEME.vignette} 100%),
  linear-gradient(180deg,${THEME.vignette},transparent 20%,transparent 80%,${THEME.vignette})}

/* per-scene layout that only the root needs */
.t-dom #dom,#edom{color:var(--fg)}
.split{display:grid;grid-template-columns:1fr 1fr;gap:90px;align-items:center;width:1720px}
.split .left{display:grid;justify-items:start;gap:14px}
.nrow{display:flex;align-items:flex-start;gap:10px}
/* the "+" sits on the numeral's cap line, not the 280px line box top */
.plus{font-size:132px;line-height:1.32;font-weight:700;margin-top:-14px}
.split .t-body{font-size:50px}
.shot{border-radius:26px;overflow:hidden;background:${THEME.shotFrame};
  border:1px solid ${THEME.shotFrameEdge};box-shadow:0 70px 160px rgba(0,0,0,.42);
  transform-style:preserve-3d}
.shot img{display:block;width:100%}
.mrow{display:flex;align-items:baseline;gap:30px}
.mlab{font-size:150px;font-weight:700;letter-spacing:-.045em;color:var(--free);line-height:1}
.poolwrap{position:relative;width:1920px;height:1080px}
.pkrow .pk{position:absolute;transform:translate(-50%,-50%);width:84px;height:84px;
  display:grid;place-items:center;border-radius:20px;background:var(--mark-plate);
  border:1px solid var(--line)}
.pkrow .pk .mark{width:52px;height:52px}
.flow{position:absolute;inset:0;width:1920px;height:1080px;overflow:visible}
.fl{fill:none;stroke:url(#flg);stroke-width:3.5;stroke-linecap:round}
.node{position:absolute;left:960px;top:604px;width:112px;height:112px;margin-left:-56px;
  margin-top:-56px;border-radius:50%;background:var(--node);filter:blur(2px)}
.statrow{position:absolute;left:0;right:0;top:800px;display:grid;grid-template-columns:repeat(3,1fr);
  justify-items:center;gap:60px}
.stat{display:grid;justify-items:center;gap:10px}
/* 40px and .14em, not 44px and .22em: "requests, all time" is 17 characters
   and at the larger setting it wrapped to two lines, knocking the third stat
   out of line with the other two. nowrap keeps all three labels on one line. */
.stat b{font-size:150px;line-height:1.0;letter-spacing:-.05em;color:var(--fg)}
.stat i{font-style:normal;font-size:40px;line-height:1.4;letter-spacing:.14em;
  text-transform:uppercase;color:var(--muted);white-space:nowrap}
/* The board grid is sized from the longest id, not guessed. JetBrains Mono
   advances 0.656em, so the longest model part (14 chars) at 42px needs 386px;
   4 cells x (386 + 2x20 padding) + 3 x 20 gap = 1764px, leaving 78px margins.
   There is deliberately no overflow/text-overflow here: a silently truncated
   model id would be a false claim. facts.mjs caps model parts at 15 chars. */
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;width:1764px}
.cell{display:grid;gap:2px;padding:18px 20px;border-radius:16px;background:var(--card);
  border:1px solid var(--line);min-width:0}
.cell .own{font-size:40px;line-height:1.35;color:var(--muted);letter-spacing:.06em}
.cell .mdl{font-family:'ArMono',monospace;font-size:42px;line-height:1.45;color:var(--fg);
  letter-spacing:-.02em;white-space:nowrap}
</style></head>
<body>
<div id="root" data-composition-id="main" data-width="1920" data-height="1080"
     data-duration="${DURATION}" data-fps="${FPS}">
${plates.map(plateLayer).join('')}
  <div class="vig" data-layout-allow-overflow></div>
${scenes
  .map(
    (s) => `  <div id="clip-${s.id}" class="clip" data-composition-id="${s.id}"
     data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${s.dur}"></div>`
  )
  .join('\n')}
  <audio id="music" data-start="0" data-duration="${DURATION}" data-track-index="9"
         src="audio/score.wav" data-volume="1"></audio>
</div>
<script>
  // The camera is ONE continuous slow push on #root — capped at 1.06, because
  // past that the catalog card and the 280px numerals clip the frame edge.
  // Per-beat punches, the pool push-away and the three drops' 3D flips live in
  // the sub-compositions (on #punch) so no two tweens ever fight over one
  // element's transform.
  const tl = gsap.timeline({ paused: true });
  tl.set("#root", { scale: 1.005, transformOrigin: "50% 50%" });
  tl.to("#root", { scale: 1.06, duration: ${DURATION}, ease: "sine.inOut" }, 0);
${parallax}
${fades}
  window.__timelines["main"] = tl;
</script>
</body></html>
`;

const outDir = path.resolve(ROOT, val('out', '.'));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), index);
// Sub-compositions live in one place regardless of --out; copy them alongside.
if (outDir !== ROOT) {
  fs.rmSync(path.join(outDir, 'compositions'), { recursive: true, force: true });
  fs.cpSync(COMPS, path.join(outDir, 'compositions'), { recursive: true });
}

console.log(`theme       ${THEME.name}`);
console.log(`duration    ${DURATION}s @${FPS}fps = ${Math.round(DURATION * FPS)} frames`);
console.log(`beats       ${scenes.length} sub-compositions`);
console.log(`marks       ${needed.size} copied, ${inked} re-inked for ${THEME.name}`);
console.log(`contrast    ${contrast.filter((r) => r.theme === THEME.name).length} pairs verified`);
console.log(`out         ${path.relative(ROOT, outDir) || '.'}`);
console.log(`\nnext:  npm run check   →   npm run render`);
