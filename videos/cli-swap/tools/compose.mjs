// Writes the film's HyperFrames project from the figure and the voice: compositions/machine.html
// (the one shot: camera, turret frames, the screen's text, the lights, the readout and the end
// card), index.html, and tools/events.json (every sound the machine makes, for mix.mjs).
// Timing comes from audio_meta.json, so a re-voiced line moves its events with it.
//
//   node tools/compose.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as F from './figure.mjs';

const k = await import('/Users/duet/.claude/skills/anatomy/kit/iso-kit.mjs');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILM = path.resolve(HERE, '..');
const FPS = 30;

const meta = JSON.parse(fs.readFileSync(path.join(FILM, 'audio_meta.json'), 'utf8'));
const voices = [...meta.voices].sort((a, b) => a.frame - b.frame);
const starts = [];
voices.reduce((t, v) => (starts.push(t), t + v.duration_s), 0);
const DURATION = +voices.reduce((t, v) => t + v.duration_s, 0).toFixed(3);
const bare = (s) => s.toLowerCase().replace(/[^\w/.]+/g, '').replace(/\.$/, '');
/** Absolute start of a spoken word: frame, word, nth occurrence. */
const w = (frame, word, nth = 1) => {
  const v = voices[frame - 1];
  const hit = v.words.filter((x) => bare(x.text) === bare(word))[nth - 1];
  if (!hit) throw new Error(`frame ${frame} never says "${word}"`);
  return +(starts[frame - 1] + hit.start).toFixed(3);
};
const frameStart = (frame) => +starts[frame - 1].toFixed(3);

// ── The turret's turns: a spring that overshoots a little and settles into the detent ──
const SPRING = { zeta: 0.7, omega: 8.5 };
const spring = (tau) => {
  if (tau <= 0) return 0;
  const { zeta, omega } = SPRING;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * tau) * (Math.cos(wd * tau) + ((zeta * omega) / wd) * Math.sin(wd * tau));
};
const TURNS = [
  { at: w(5, 'pi') - 0.3, from: 0, to: -72, port: 'pi' },
  { at: w(6, 'opencode') + 0.06, from: -72, to: -144, port: 'opencode' },
  { at: w(7, 'more') + 0.02, from: -144, to: -216, port: 'codex' },
];
const SETTLE = 1.15;
const angleAt = (t) => {
  let angle = 0;
  for (const turn of TURNS) if (t >= turn.at) angle = turn.from + (turn.to - turn.from) * spring(t - turn.at);
  return angle;
};
const q = (a) => Math.round(a * 20) / 20;

// Turret frames: the rest pose of each port and every distinct angle a video frame shows mid-turn.
const frames = new Map();
const frameOf = (angle) => {
  const key = q(angle).toFixed(2);
  if (!frames.has(key)) frames.set(key, { index: frames.size, angle: q(angle) });
  return frames.get(key).index;
};
frameOf(0);
const schedule = [];
const events = [];
for (const turn of TURNS) {
  let last = null;
  let dropped = false;
  let prevAngle = turn.from;
  for (let i = 0; i <= Math.ceil(SETTLE * FPS); i++) {
    const t = turn.at + i / FPS;
    const angle = i === Math.ceil(SETTLE * FPS) ? turn.to : angleAt(t);
    const index = frameOf(angle);
    const drop = F.detentDrop(q(angle));
    if (index !== last) schedule.push([+t.toFixed(4), index, +drop.toFixed(3)]);
    last = index;
    // The ring's ticks passing the index mark, and the ball dropping into the notch.
    const tickAt = (a) => Math.floor((a - 4) / F.TICK);
    if (i > 0 && tickAt(angle) !== tickAt(prevAngle)) events.push({ kind: 'tick', at: +(t - 0.5 / FPS).toFixed(3), port: turn.port });
    if (!dropped && Math.abs(angle - turn.to) < 1.6 && i > 2) {
      dropped = true;
      events.push({ kind: 'detent', at: +t.toFixed(3), port: turn.port });
      turn.lands = +t.toFixed(3);
    }
    prevAngle = angle;
  }
}
const list = [...frames.values()].sort((a, b) => a.index - b.index);
console.log(`turret: ${list.length} frames for ${TURNS.length} turns`);

// ── Shots: world boxes → figure units, fitted per rendition ──
const at = F.worldAt;
const boxOf = (points) => {
  const flat = points.map(at);
  const xs = flat.map((p) => p[0]);
  const ys = flat.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
const { OY, TURRET, FRONT, DECK, CONSOLE, BENCH } = F.FIG;
const ring = (cx, cy, r, z) => Array.from({ length: 16 }, (_, i) => [cx + r * Math.sin((i / 16) * Math.PI * 2), cy + r * Math.cos((i / 16) * Math.PI * 2), z]);
const bezel = [[-112, FRONT, 14], [112, FRONT, 14], [-112, FRONT, 114], [112, FRONT, 114]];
const SHOTS = {
  wide: boxOf([...k.boxCorners(BENCH, -16, 0), ...k.boxCorners(CONSOLE, 0, DECK), [0, -60, 372], [0, -90, 330]]),
  turret: boxOf([...ring(TURRET.x, TURRET.y, 40, 218), ...ring(TURRET.x, TURRET.y, 40, 300)]),
  intro: boxOf([...ring(TURRET.x, TURRET.y, 46, 210), ...ring(TURRET.x, TURRET.y, 46, 312), [-50, OY + 30, 206]]),
  screen: boxOf(bezel),
  lamp: boxOf([[-112, FRONT, 70], [112, FRONT, 114], ...ring(0, OY, 50, 146), ...ring(0, OY, 40, 230)]),
  swap: boxOf([...ring(TURRET.x, TURRET.y, 38, 268), ...ring(TURRET.x, TURRET.y, 38, 284), [-104, FRONT - 6, 100], [104, FRONT - 6, 100], [-104, FRONT - 6, 34], [70, FRONT - 6, 30]]),
};
const BOXES = {
  landscape: { content: [96, 96, 1824, 866], swap: [96, 52, 1824, 872], end: [96, 120, 1130, 866], stage: [1920, 1080] },
  portrait: { content: [60, 210, 1020, 1290], swap: [60, 230, 1020, 1180], end: [60, 170, 1020, 1000], stage: [1080, 1920] },
};
const fit = (rect, [x0, y0, x1, y1], grow = 1) => {
  const s = Math.min((x1 - x0) / (rect[2] - rect[0]), (y1 - y0) / (rect[3] - rect[1])) * grow;
  return { s: +s.toFixed(4), x: +((x0 + x1) / 2 - ((rect[0] + rect[2]) / 2) * s).toFixed(2), y: +((y0 + y1) / 2 - ((rect[1] + rect[3]) / 2) * s).toFixed(2) };
};
const CAMS = {};
for (const [name, b] of Object.entries(BOXES)) {
  CAMS[name] = Object.fromEntries(Object.entries(SHOTS).map(([shot, rect]) => [shot, fit(rect, b.content)]));
  CAMS[name].end = fit(SHOTS.wide, b.end);
  CAMS[name].swap = fit(SHOTS.swap, b.swap);
}

// ── The screen: text in the glass's own plane, sized so every shot that shows it reads ──
const G0 = F.GLASS;
const glassScale = (() => {
  const [a, b, c, d] = F.glassMatrix().match(/-?[\d.]+/g).map(Number);
  return Math.min(Math.hypot(a, b), Math.hypot(c, d));
})();
const TYPE = { row: 14, install: 9.6, pad: 7, lh: 1.2 };
for (const [name, cams] of Object.entries(CAMS)) {
  const px = (shot, size) => +(size * glassScale * cams[shot].s).toFixed(1);
  console.log(`${name}: screen text ${px('swap', TYPE.row)}px in the swap shot, ${px('lamp', TYPE.row)}px in the lamp shot, install ${px('screen', TYPE.install)}px close`);
  if (px('swap', TYPE.row) < 33 || px('screen', TYPE.install) < 33) throw new Error(`${name}: screen text under the 32px floor`);
}

// ── Story times ──
const DATA_EXTRA = {};
const T = {
  pull: w(1, 'With') - 0.15,
  names: [w(1, 'serves'), w(1, 'them'), w(1, 'all')],
  namesOff: frameStart(2) - 0.3,
  install: w(2, 'Install') + 0.02,
  installed: w(2, 'line') + 0.05,
  login: w(3, 'anyr'),
  lampOn: w(3, 'login') + 0.38,
  claude: w(4, 'anyr'),
  claudeLit: w(4, 'starts'),
  claudeNote: w(4, 'Claude'),
  model: w(4, 'model'),
  change: w(5, 'Change'),
  select1: w(5, 'word'),
  piNote: w(5, 'starts'),
  select2: frameStart(6) + 0.02,
  ocNote: w(6, 'starts'),
  sameKey: w(6, 'Same'),
  three: w(7, 'Three'),
  codex: w(7, 'Codex'),
  grok: w(7, 'Grok'),
  end: w(8, 'Get'),
  url: w(8, 'anyrouter.dev/cli'),
};
T.sameModel = w(6, 'same', 2);
const PUSH_ORIGIN = at([TURRET.x, TURRET.y, 270]).map((v) => +v.toFixed(1));
DATA_EXTRA.PUSH_ORIGIN = PUSH_ORIGIN;

// ── Markup ──
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const chars = (word, cls) => [...word].map((c) => `<span class="ch ${cls}">${esc(c)}</span>`).join('');
const AGENTS = [
  { id: 'claude', name: 'Claude Code' },
  { id: 'pi', name: 'Pi' },
  { id: 'opencode', name: 'opencode' },
];
const glassMatrixCss = F.glassMatrix().replace(/^matrix\((.*)\)$/, (_, v) => `matrix(${v.trim().split(/\s+/).join(', ')})`);
const screen = `
<div class="term" style="transform: ${glassMatrixCss} translate(${G0.x0}px, ${-G0.z1}px)">
  <div class="glass">
    <div class="pane pane-install">
      <div class="row install" data-one-row><span class="p">$</span> curl -fsSL</div>
      <div class="row install" data-one-row>https://anyrouter.dev/setup.sh</div>
      <div class="row install" data-one-row>| bash</div>
      <div class="row install out" data-one-row>Installed ~/.local/bin/anyr</div>
    </div>
    <div class="pane pane-login"><div class="row" data-one-row><span class="p">$</span> anyr login</div></div>
    <div class="pane pane-run">
      <div class="row" data-one-row><span class="p">$</span> anyr <span class="agent">${AGENTS.map((a) => `<span class="sel sel-${a.id}">${chars(a.id, `c-${a.id}`)}</span>`).join('')}</span><span class="caret"></span></div>
      <div class="row model" data-one-row>--model anyrouter/free</div>
      ${AGENTS.map((a) => `<div class="note note-${a.id}"><div class="row" data-one-row># launch ${esc(a.name)}</div><div class="row" data-one-row># through AnyRouter</div></div>`).join('\n      ')}
    </div>
  </div>
</div>`;

const built = F.build({ turn: 0, lamp: 1, lit: 'none' });
const turretFrames = list.map((f) => `<g class="tf" data-tf="${f.index}">${F.build({ turn: f.angle, lamp: 1, lit: 'none' }).turret}</g>`).join('');
const VB = { x: -1600, y: -1200, w: 4800, h: 3400 };
// The light: a column from the lamp's lens up to the condenser, and from the slide to the objective.
const column = (z0, z1, r) => k.cylinder(0, OY, r, z0, z1 - z0, F.P, 32).fill;
const beam = `<g class="beam"><path d="${column(F.FIG.FOOT_TOP + 5.8, 172, 6.2)}"/><path d="${column(F.FIG.SLIDE_TOP, TURRET.bottom - 44, 3.6)}"/></g>`;
const insertBeam = (svg) => svg.replace('<g data-part="slide">', `${beam}<g data-part="slide">`);
const figure = `<svg class="iso-svg fig" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" style="left:${VB.x}px; top:${VB.y}px; width:${VB.w}px; height:${VB.h}px" aria-label="A microscope on a bench console">${insertBeam(built.back)}<g class="turret">${turretFrames}</g>${built.front}</svg>`;

// Lighting keys: what each word in data-on lights.
const LIT = ['lamp', 'slide', 'claude', 'pi', 'opencode', 'codex', 'grok'];
const litCss = LIT.map((key) => {
  const host = key === 'lamp' || key === 'slide' ? `[data-part="${key}"]` : `[data-port="${key}"]`;
  return `
[data-composition-id="machine"] .mc[data-on~="${key}"] ${host} > .iso-solid > .iso-fill { fill: var(--anatomy-face); }
[data-composition-id="machine"] .mc[data-on~="${key}"] ${host} > .iso-solid > .iso-top { fill: var(--anatomy-lit-top); stroke: var(--anatomy-lit-top); }
[data-composition-id="machine"] .mc[data-on~="${key}"] ${host} > .iso-solid > .iso-shade { fill: var(--anatomy-lit-shade); stroke: var(--anatomy-lit-shade); }
[data-composition-id="machine"] .mc[data-on~="${key}"] ${host} > .iso-solid > .iso-edge { stroke: var(--anatomy-lit); }
[data-composition-id="machine"] .mc[data-on~="name-${key}"] .cs-engrave[data-name="${key}"] { fill: var(--anatomy-lit); }`;
}).join('');

const readouts = [
  ['claude', 'claude · anyrouter/free'],
  ['pi', 'pi · anyrouter/free'],
  ['opencode', 'opencode · anyrouter/free'],
  ['more', 'and more · codex, grok'],
];

const DATA = {
  ...DATA_EXTRA,
  DURATION, T, TURNS: TURNS.map(({ at, port, lands }) => ({ at, port, lands })), SCHEDULE: schedule,
  CAMS, DETENT: list.map((f) => k.translateAlong(F.P, [0, 0, -F.DETENT_DEPTH * F.detentDrop(f.angle)])),
};

const html = `<template>
  <style>
    @font-face { font-family: "Geist"; src: url("assets/fonts/geist.woff2") format("woff2"); font-weight: 100 900; font-display: block; }
    @font-face { font-family: "Geist Mono"; src: url("assets/fonts/geist-mono.woff2") format("woff2"); font-weight: 100 900; font-display: block; }
    ${k.ISO_CSS.replace(/\.iso\b/g, '[data-composition-id="machine"] .iso')}
    ${F.FIG_CSS.split('\n').filter(Boolean).map((r) => `[data-composition-id="machine"] ${r}`).join('\n    ')}
    [data-composition-id="machine"] .iso {
      --anatomy-paper: #151515; --anatomy-face: #262626; --anatomy-top: #1d1d1d;
      --anatomy-shade-0: #101010; --anatomy-shade-1: #141414; --anatomy-shade-2: #181818; --anatomy-shade-3: #1c1c1c;
      --anatomy-lit-top: #3b3b3b; --anatomy-lit-shade: #2e2e2e;
      --anatomy-hi: #e4e4e4; --anatomy-mid: #8e8e8e; --anatomy-lo: #585858; --anatomy-faint: #383838; --anatomy-lit: #ffffff;
      --anatomy-weight: 1.5px;
      --ink: #e6e6e6; --muted: #8a8a8a; --term: #cfe9dc; --term-dim: #7f9a8d;
      position: absolute; inset: 0; overflow: hidden; background: #0d0d0d;
      font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
    }
    [data-composition-id="machine"] .cam { position: absolute; left: 0; top: 0; width: 1px; height: 1px; transform-origin: 0 0; }
    [data-composition-id="machine"] .push { position: absolute; left: 0; top: 0; width: 1px; height: 1px; }
    [data-composition-id="machine"] .fig { position: absolute; display: block; overflow: visible; }
    [data-composition-id="machine"] .tf { display: none; }
    [data-composition-id="machine"] .tf[data-tf="0"] { display: inline; }
    [data-composition-id="machine"] .beam path { fill: #ffffff; opacity: 0.09; }
    [data-composition-id="machine"] .beam { opacity: 0; }
    [data-composition-id="machine"] .cs-glow { opacity: 0.35; }
    [data-composition-id="machine"] .term { position: absolute; left: 0; top: 0; width: ${G0.x1 - G0.x0}px; height: ${G0.z1 - G0.z0}px; transform-origin: 0 0; }
    [data-composition-id="machine"] .glass { position: absolute; inset: 0; box-sizing: border-box; overflow: hidden; font-family: "Geist Mono", ui-monospace, monospace; color: var(--term); }
    [data-composition-id="machine"] .pane { position: absolute; left: ${TYPE.pad + 1}px; top: ${TYPE.pad}px; right: ${TYPE.pad + 1}px; opacity: 0; display: grid; grid-template-columns: 1fr; }
    [data-composition-id="machine"] .pane > .note { grid-row: 3; grid-column: 1; }
    [data-composition-id="machine"] .row { font-size: ${TYPE.row}px; line-height: ${TYPE.lh}; white-space: pre; }
    [data-composition-id="machine"] .row.install { font-size: ${TYPE.install}px; }
    [data-composition-id="machine"] .row .p { color: var(--term-dim); }
    [data-composition-id="machine"] .row.out, [data-composition-id="machine"] .note .row { color: var(--term-dim); }
    [data-composition-id="machine"] .note { opacity: 0; }
    [data-composition-id="machine"] .row.model.is-on { color: #ffffff; }
    [data-composition-id="machine"] .ch { display: none; }
    [data-composition-id="machine"] .ch.on { display: inline; }
    [data-composition-id="machine"] .sel { border-radius: 1px; }
    [data-composition-id="machine"] .sel.is-on { background: #e6e6e6; color: #111111; }
    [data-composition-id="machine"] .caret { display: inline-block; width: 0.6em; height: 1.05em; vertical-align: -0.2em; background: var(--term); margin-left: 0.08em; }
    [data-composition-id="machine"] .chrome { position: absolute; top: 48px; font-family: "Geist Mono", ui-monospace, monospace; font-size: 34px; line-height: 1; color: var(--muted); white-space: nowrap; }
    [data-composition-id="machine"] .fig-no { left: 96px; }
    [data-composition-id="machine"] .fig-no b { color: var(--ink); font-weight: 500; margin-left: 18px; }
    [data-composition-id="machine"] .readout { right: 96px; text-align: right; }
    [data-composition-id="machine"] .readout span { position: absolute; right: 0; top: 0; opacity: 0; color: var(--ink); }
    [data-composition-id="machine"] .endcard { position: absolute; left: 1130px; top: 380px; width: 700px; opacity: 0; }
    [data-composition-id="machine"] .endcard img { display: block; width: 92px; height: 92px; filter: invert(1); margin-bottom: 40px; }
    [data-composition-id="machine"] .endcard .url { font-family: "Geist Mono", ui-monospace, monospace; font-size: 64px; letter-spacing: -0.02em; color: #ffffff; white-space: nowrap; }
    [data-composition-id="machine"] .endcard .sub { margin-top: 22px; font-size: 40px; color: var(--muted); white-space: nowrap; }
    ${litCss}
    @media (orientation: portrait) {
      [data-composition-id="machine"] .chrome { top: 110px; font-size: 32px; }
      [data-composition-id="machine"] .fig-no { left: 60px; }
      [data-composition-id="machine"] .readout { right: 60px; }
      [data-composition-id="machine"] .endcard { left: 60px; right: 60px; width: auto; top: 1010px; text-align: center; }
      [data-composition-id="machine"] .endcard img { margin: 0 auto 36px; }
      [data-composition-id="machine"] .endcard .url { font-size: 60px; }
    }
  </style>
  <div id="root" data-composition-id="machine" data-width="1920" data-height="1080" data-duration="${DURATION}">
    <div id="mc-stage" class="iso mc clip" data-on="" data-start="0" data-duration="${DURATION}" data-track-index="0">
      <div class="cam" data-layout-allow-overflow><div class="push" style="transform-origin: ${PUSH_ORIGIN[0]}px ${PUSH_ORIGIN[1]}px">${figure}${screen}</div></div>
      <div class="chrome fig-no" data-outside-safe-area>Fig. 1<b>anyr</b></div>
      <div class="chrome readout" data-outside-safe-area>${readouts.map(([id, text]) => `<span class="ro-${id}">${esc(text)}</span>`).join('')}</div>
      <div class="endcard"><img src="assets/anyrouter-logo-black.svg" alt="" /><div class="url">anyrouter.dev/cli</div><div class="sub">One key for every agent.</div></div>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js" integrity="sha384-sG0Hv1tP1lZCk9KQmrIbY/XNwi+OY84GQqhMscbnsoBFqAz8KNCil1kvfL3Hbbk2" crossorigin="anonymous"></script>
  <script>
${fs.readFileSync(path.join(HERE, 'timeline.js'), 'utf8').replace('/*DATA*/', `const D = ${JSON.stringify(DATA)};`)}
  </script>
</template>
`;
fs.mkdirSync(path.join(FILM, 'compositions'), { recursive: true });
fs.writeFileSync(path.join(FILM, 'compositions/machine.html'), html);
console.log(`machine.html: ${(html.length / 1e6).toFixed(2)} MB, ${DURATION}s`);

// Events the mix needs, besides the turret's own.
events.push(
  { kind: 'whoosh', at: T.install - 0.14 },
  { kind: 'out', at: T.installed },
  { kind: 'key', at: T.login, n: 1 },
  { kind: 'lamp', at: T.lampOn },
  { kind: 'type', at: T.claude + 0.12, n: 6, step: 0.055 },
  { kind: 'start', at: T.claudeLit },
  { kind: 'select', at: T.select1 },
  { kind: 'type', at: T.select1 + 0.36, n: 2, step: 0.1 },
  { kind: 'select', at: T.select2 },
  { kind: 'type', at: T.select2 + 0.14, n: 8, step: 0.05 },
  { kind: 'riser', at: TURNS[1].lands },
  { kind: 'key-ping', at: T.sameKey },
  { kind: 'names', at: T.names[0] },
  { kind: 'chime', at: T.end },
  { kind: 'sparkle', at: T.url },
);
events.sort((a, b) => a.at - b.at);
fs.writeFileSync(path.join(HERE, 'events.json'), JSON.stringify({ duration: DURATION, events }, null, 1));

const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js" integrity="sha384-sG0Hv1tP1lZCk9KQmrIbY/XNwi+OY84GQqhMscbnsoBFqAz8KNCil1kvfL3Hbbk2" crossorigin="anonymous"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #0d0d0d; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #0d0d0d; }
      .scene { position: absolute; inset: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${DURATION}" data-width="1920" data-height="1080">
      <div id="el-machine" class="scene" data-composition-id="machine" data-composition-src="compositions/machine.html" data-start="0" data-duration="${DURATION}" data-track-index="1"></div>
      <div id="el-captions" class="scene" data-track-kind="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${DURATION}" data-track-index="2"></div>
      <audio id="el-mix" src="assets/mix.wav" data-start="0" data-duration="${DURATION}" data-track-index="10" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(FILM, 'index.html'), index);
console.log(`index.html: ${DURATION}s, ${events.length} sound events`);
