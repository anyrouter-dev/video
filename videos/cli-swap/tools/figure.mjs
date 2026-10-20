// The film's one object, built with the Anatomy kit: a microscope on a bench console.
// The lamp in the foot is the AnyRouter key, the slide on the stage is the model, the
// objectives on the revolving turret are the agents, and the console's screen is the terminal.
// Only the turret turns; everything else is drawn once.
//
//   node tools/figure.mjs --audit        the kit's geometry audit at rest, mid-turn and past each detent
//   node tools/figure.mjs --page         a standalone preview page per detent (shots/figure-*.html)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as fontkit from 'fontkit';

const KIT = '/Users/duet/.claude/skills/anatomy';
const k = await import(`${KIT}/kit/iso-kit.mjs`);
const G = await import(`${KIT}/kit/lathe.mjs`);
const { tubePieces, tubeSvg } = await import(`${KIT}/kit/tube.mjs`);
const A = await import(`${KIT}/kit/audit.mjs`);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILM = path.resolve(HERE, '..');

// World units are about one px of the real thing; x, y on the bench, z up.
export const W = 1600;
export const H = 1000;

const BENCH = { x: -168, y: -150, w: 336, d: 300, r: 12 };
const BENCH_H = 10;
const FOOT_H = 6;
const CONSOLE = { x: -124, y: -108, w: 248, d: 200, r: 9 };
const PLINTH_H = 6;
const DECK = 122;
const FRONT = CONSOLE.y + CONSOLE.d;
const SIDE = CONSOLE.x + CONSOLE.w;
export const BEZEL = { x0: -112, x1: 112, z0: 14, z1: 114, r: 7, depth: 1.8 };
export const GLASS = { x0: -104, x1: 104, z0: 21, z1: 107, r: 5, depth: 4 };
export const GLASS_Y = FRONT - BEZEL.depth - GLASS.depth;

const OY = 18;
const FOOT = { x: -58, y: -96, w: 116, d: 150, r: 14 };
const FOOT_TOP = DECK + 24;
const COLUMN = { x: -18, y: -88, w: 36, d: 32, r: 7 };
const HEAD = { x: -23, y: -90, w: 46, d: 108, r: 9 };
const HEAD_Z = 304;
const HEAD_TOP = 326;
const STAGE = { x: -50, y: -12, w: 100, d: 62, r: 4 };
const STAGE_Z = 206;
const STAGE_TOP = 214;
const SLIDE = { x: -38, y: OY - 13, w: 76, d: 26, r: 1 };
const SLIDE_TOP = STAGE_TOP + 1.4;
const CONDENSER = { z0: 172, z1: 198, r: 13 };

export const TURRET = { x: 0, y: OY - 22, bottom: 266, ports: 22 };
const T_PROFILE = [[0, 33], [2.4, 33], [2.4, 35.5], [10.4, 35.5], [10.4, 37.4], [17.4, 37.4], [17.4, 34.6, 1], [20, 33, 1], [23, 29.4, 1], [26, 24, 1], [28, 18.6, 1], [29.4, 13]];
const BAND = [2.4, 10.4, 35.5];
const RING = [10.4, 17.4, 37.4];
const HUB = { r: 12, z0: TURRET.bottom + 29.4, z1: HEAD_Z };
const RIBS = 60;
export const TICK = 360 / RIBS;

// The agents, in turret order. A turn of the turret by -72° brings the next port over the slide.
export const PORTS = [
  { id: 'claude', profile: [[0, 8.6], [3, 8.6], [3, 10], [10, 10], [10, 9.2], [23, 9.2], [23, 9.8], [25.5, 9.8], [25.5, 8.6], [30, 8.2], [34, 6.8], [36, 5.6], [36, 4.6], [44, 4.1]] },
  { id: 'pi', profile: [[0, 8.6], [3, 8.6], [3, 9.6], [19, 9.6], [19, 10.2], [21.5, 10.2], [21.5, 9.6], [26, 8.4], [31, 6], [33, 5.2], [33, 4.4], [44, 4.4]] },
  { id: 'opencode', profile: [[0, 8.6], [3, 8.6], [3, 9.4], [8, 9.4], [8, 8.4], [27, 8.4], [27, 9], [29.5, 9], [29.5, 7.6], [37, 5.4], [40, 4.6], [44, 3.9]] },
  { id: 'codex', empty: true },
  { id: 'grok', empty: true },
];
export const STEP_DEG = 360 / PORTS.length;
const INDEX_AT = 31;

const V3 = (a) => a;
export const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), ...k.boxCorners(CONSOLE, 0, DECK), ...k.boxCorners(HEAD, HEAD_Z, HEAD_TOP + 50)],
  W, H, { pad: 40, azimuth: 56 },
);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const KS = G.scaleOf(P);
const rad = (deg) => (deg * Math.PI) / 180;
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const planeOf = (y) => k.sideMatrix([0, y], 0, P, 'left');
const flat = (x0, z0, x1, z1, r, steps = 6) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);
const sideSlot = (y, z0, z1, half = 0.9) => k.pathOf(k.roundedPlan({ x: y - half, y: z0, w: half * 2, d: z1 - z0, r: half }, 4).map(([u, z]) => at([SIDE, u, z])), true);
// A world angle measured from +y toward +x, as seen from above.
const around = (cx, cy, r, deg, z) => [cx + r * Math.sin(rad(deg)), cy + r * Math.cos(rad(deg)), z];

/** The figure's items: three layers, the turret's own sorted in the middle. */
function scene(R, { turn, lamp, lit }) {
  const layers = { back: [], turret: [], front: [] };
  let order = 0;
  const put = (layer, ref, svg, shapes = [], name, { last = false } = {}) => {
    const key = layer === 'back' ? order++ * 0.001 : layer === 'turret' ? (last ? 150000 + order++ : 100000 + k.depthOf(ref, P)) : 200000 + order++ * 0.001;
    layers[layer].push(R.put({ at: ref, key, svg, shapes: shapes.map(R.solid), name: name ? R.nameFor(name) : undefined, piece: layer }));
  };
  const slab = (layer, plan, z, h, style, { steps = 4, bevel = 0, inner, name, extra = '', owner } = {}) =>
    put(layer, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { ...style, inner }) + extra, [A.slab(plan, z, h, { name: name ?? 'stand.slab', owner, ground: layer === 'back' && z <= 0 })], name);
  const can = (layer, cx, cy, r, z, h, style, { steps = 28, bevel = 0, name, extra = '', inner, last, owner } = {}) =>
    put(layer, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { ...style, inner }) + extra, [A.cylinder(cx, cy, r, z, h, { name: name ?? 'stand.can', owner })], name, { last });
  const turned = (layer, F, profile, style, { name, extra = '', inner = '', smooth, last, owner, cut } = {}) => {
    const soft = smooth ?? profile.some((p) => p[2]);
    const paths = G.solidOf(profile, F, P, soft ? { smooth: { rows: 4 } } : {});
    const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
    put(layer, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: 'hi', ...style, inner }) + extra, [A.solid(F, profile, { name: name ?? 'part', owner, cut, seated: !!cut, curve: soft ? profile : undefined })], name, { last });
  };

  // The bench: a plate on feet, a ruler strip and a label plate.
  layers.back.push({ svg: `<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`, key: -1 });
  for (const [x, y] of byDepth([...k.corners(BENCH, 24), [0, BENCH.y + 24], [0, BENCH.y + BENCH.d - 24]])) {
    can('back', x, y, 8, -BENCH_H - FOOT_H, 1.8, { tone: 'lo' }, { name: 'stand.foot-flange' });
    can('back', x, y, 6.2, -BENCH_H - FOOT_H + 1.8, FOOT_H - 1.8, { tone: 'mid' }, { name: 'stand.foot' });
  }
  const benchScrews = k.corners(BENCH, 11);
  slab('back', BENCH, -BENCH_H, BENCH_H, { tone: 'mid' }, { steps: 8, bevel: 1.6, name: 'stand.bench', extra: L(k.planOutline(k.insetPlan(BENCH, 6), 0, P), { tone: 'lo' }) + L(benchScrews.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(''), { tone: 'lo' }) + D(benchScrews.map(([x, y]) => at([x, y, 0])), { size: 0.55 }) });
  const strip = { x: -140, y: BENCH.y + BENCH.d - 17, w: 280, d: 8, r: 1 };
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 5, 5, strip.y + 0.8, 0.7, [2.2, 4], P);
  slab('back', strip, 0, 0.7, { tone: 'lo', crease: 'none' }, { steps: 3, name: 'stand.ruler', extra: L(ticks.minor, { tone: 'lo' }) + L(ticks.major, { tone: 'mid' }) + D([at([strip.x + 2, strip.y + 4, 0.7]), at([strip.x + strip.w - 2, strip.y + 4, 0.7])], { size: 0.45 }) });
  const plate = { x: 100, y: BENCH.y + 20, w: 44, d: 12, r: 1.4 };
  slab('back', plate, 0, 0.9, { tone: 'lo', crease: 'none' }, { steps: 3, name: 'stand.label', extra: L(k.planOutline(k.insetPlan(plate, 1.6), 0.9, P, 3), { tone: 'faint' }) + L([30, 22, 14].map((w, i) => k.lineOnTop([plate.x + 4, plate.y + 3 + i * 3], [plate.x + 4 + w, plate.y + 3 + i * 3], 0.9, P)).join(''), { tone: 'lo', free: true }) + D([at([plate.x + plate.w - 3.4, plate.y + plate.d / 2, 0.9])], { size: 0.45 }) });

  // The console: plinth, case, the terminal screen in its front, vents, a seam and screws.
  layers.back.push({ svg: `<path class="iso-halo" d="${k.haloOf(CONSOLE, 0, 8, P)}"/>`, key: order++ * 0.001 });
  slab('back', k.insetPlan(CONSOLE, 4), 0, PLINTH_H, { tone: 'lo' }, { steps: 8, name: 'stand.plinth' });
  const seam = k.sideSeam(CONSOLE, DECK - 10, P, 8);
  const deckScrews = k.corners(CONSOLE, 9);
  const vents = Array.from({ length: 14 }, (_, i) => CONSOLE.y + 22 + i * 4.2).map((y) => sideSlot(y, 62, 98)).join('');
  const lowVents = Array.from({ length: 10 }, (_, i) => CONSOLE.y + 22 + i * 4.2).map((y) => sideSlot(y, 18, 34)).join('');
  slab('back', CONSOLE, PLINTH_H, DECK - PLINTH_H, { tone: 'mid' }, {
    steps: 8, bevel: 1.6, name: 'stand.console', inner: L(seam, { tone: 'faint' }),
    extra: L(deckScrews.map(([x, y]) => k.ring(x, y, 2.2, DECK, P, 16)).join(''), { tone: 'lo' }) + D(deckScrews.map(([x, y]) => at([x, y, DECK])), { size: 0.5 }) + L(vents + lowVents, { tone: 'faint' })
      + recess(BEZEL, FRONT, '', 'cs-bezel', recess(GLASS, FRONT - BEZEL.depth, `<path class="cs-glow" d="${flat(-80, GLASS.z0 + 10, 80, GLASS.z1 - 10, 30, 10)}"/>`, 'cs-glass'))
      + `<g transform="${planeOf(FRONT)}">${L(Array.from({ length: 6 }, (_, i) => flat(BEZEL.x1 - 26 + i * 4, BEZEL.z0 - 9, BEZEL.x1 - 24.6 + i * 4, BEZEL.z0 - 3, 0.7, 4)).join(''), { tone: 'lo' })}</g>`
      + `<g data-part="power-led">${D([at([BEZEL.x0 + 4, FRONT, BEZEL.z0 - 6])], { size: 0.9, tone: 'hi' })}</g>`,
  });
  const deckLabel = { x: 72, y: 50, w: 40, d: 11, r: 1.2 };
  slab('back', deckLabel, DECK, 0.8, { tone: 'lo', crease: 'none' }, { steps: 3, name: 'console.label', extra: L([28, 18].map((w, i) => k.lineOnTop([deckLabel.x + 4, deckLabel.y + 3.6 + i * 3.6], [deckLabel.x + 4 + w, deckLabel.y + 3.6 + i * 3.6], DECK + 0.8, P)).join(''), { tone: 'lo', free: true }) + D([at([deckLabel.x + deckLabel.w - 3, deckLabel.y + deckLabel.d / 2, DECK + 0.8])], { size: 0.45 }) });

  // The cable socket on the deck, where the lamp's cable lands.
  const SOCKET = { x: 104, y: -56, w: 14, d: 18, r: 2 };
  slab('back', SOCKET, DECK, 18, { tone: 'mid' }, { steps: 3, bevel: 0.5, name: 'console.socket', extra: D([at([SOCKET.x + 7, SOCKET.y + 4, DECK + 18]), at([SOCKET.x + 7, SOCKET.y + SOCKET.d - 4, DECK + 18])], { size: 0.45 }) + L(k.planOutline(k.insetPlan(SOCKET, 2), DECK + 18, P, 3), { tone: 'faint' }) });
  for (const [x, y] of byDepth(k.corners(CONSOLE, 14))) can('back', x, y, 4.4, DECK, 1.6, { tone: 'lo' }, { steps: 20, name: 'console.bumper' });
  [-98, -86, -74].forEach((x, i) => slab('back', { x, y: FRONT, w: 8, d: 1.6, r: 0.6 }, PLINTH_H + 1.5, 5, { tone: i ? 'mid' : 'hi' }, { steps: 2, name: 'console.button' }));

  // The microscope foot, with the lamp under its window and a brightness dial on its side.
  layers.back.push({ svg: `<path class="iso-halo" d="${k.haloOf(FOOT, DECK, 4, P)}"/>`, key: order++ * 0.001 });
  slab('back', k.insetPlan(FOOT, 3), DECK, 4, { tone: 'lo' }, { steps: 8, name: 'scope.foot-pad' });
  const footSeam = k.sideSeam(FOOT, FOOT_TOP - 6, P, 8);
  slab('back', FOOT, DECK + 4, FOOT_TOP - DECK - 4, { tone: 'mid' }, { steps: 8, bevel: 1.2, name: 'scope.foot', inner: L(footSeam, { tone: 'faint' }), extra: L(k.planOutline(k.insetPlan(FOOT, 6), FOOT_TOP, P, 8), { tone: 'faint' }) + D(k.corners(FOOT, 9).map(([x, y]) => at([x, y, FOOT_TOP])), { size: 0.45 }) });
  const DIAL = [FOOT.x + FOOT.w, 30, DECK + 14];
  const FD = G.frameAlong([DIAL[0], DIAL[1], DIAL[2]], [1, 0, 0]);
  turned('back', FD, [[0, 4], [2, 4], [2, 7.5], [8, 7.5], [8, 6.6], [9, 6.6]], { tone: 'mid' }, { name: 'scope.dim-dial', extra: k.fadedSvg(G.ribsOf(FD, 2, 8, 7.5, 28, P, { fade: [0.1, 0.55], phase: rad(lamp * 120) }), { tone: 'lo' }) + L(G.circleOf(FD, 9, 3, P, 16), { tone: 'faint' }) });
  // The lamp window: collar, field ring and lens. The lens is the key: lit while it comes on.
  can('back', 0, OY, 16, FOOT_TOP, 3, { tone: 'mid' }, { steps: 40, name: 'scope.lamp-collar', extra: L(k.knurl(0, OY, 16, FOOT_TOP, FOOT_TOP + 3, 48, P, 0.3), { tone: 'lo' }) });
  can('back', 0, OY, 12, FOOT_TOP + 3, 2, { tone: 'mid' }, { steps: 40, name: 'scope.lamp-ring', extra: L(k.ring(0, OY, 9.6, FOOT_TOP + 5, P, 40), { tone: 'lo' }) });
  put('back', [0, OY, FOOT_TOP + 5.4], `<g data-part="lamp">${S(k.cylinder(0, OY, 8.6, FOOT_TOP + 5, 0.8, P, 40), { tone: lamp > 0.5 ? 'hi' : 'lo', lit: lit === 'lamp' })}<path class="cs-lamp" d="${k.pathOf(k.circleRing(0, OY, 7, 32).map(([x, y]) => at([x, y, FOOT_TOP + 5.8])), true)}" style="opacity:${lamp.toFixed(3)}"/></g>`, [A.cylinder(0, OY, 8.6, FOOT_TOP + 5, 0.8, { name: 'scope.lamp' })], 'scope.lamp');

  // The cable from the foot's side to the socket on the deck.
  const CABLE_R = 2.2;
  const cableStart = [FOOT.x + FOOT.w + 2.6, -66, DECK + 13];
  const cableEnd = [SOCKET.x - 3.2, SOCKET.y + 9, DECK + 13];
  const route = G.fillet([cableStart, [76, cableStart[1], cableStart[2]], [92, cableEnd[1], cableStart[2]], cableEnd], 14, 12, { P, tube: CABLE_R });
  const GLAND = G.frameAlong([FOOT.x + FOOT.w, -66, DECK + 13], [1, 0, 0]);
  turned('back', GLAND, [[0, 4], [2.6, 4], [2.6, 3.2]], { tone: 'mid' }, { name: 'scope.cable-gland' });
  const plugF = G.frameAlong(cableEnd, [-1, 0, 0]);
  R.route('scope.cable', route, CABLE_R, { owner: 'scope.cable', limp: true, rims: [3.2, 3.2], piece: 'back' });
  tubePieces(route, CABLE_R, P, { maxLength: 18 }).forEach((part, i) => put('back', part.mid, tubeSvg(part, { tone: 'mid' }), [A.tube(part.points, part.radii, { name: 'scope.cable', owner: 'scope.cable', limp: true })], `scope.cable:${i}`));
  turned('back', plugF, [[-3.2, 3.6], [0, 3.6]], { tone: 'mid' }, { name: 'scope.cable-plug', extra: L(G.ribsOf(plugF, -3.2, 0, 3.6, 14, P), { tone: 'lo' }) });

  // The column and its focus knobs.
  slab('back', COLUMN, FOOT_TOP, HEAD_Z - FOOT_TOP, { tone: 'mid' }, { steps: 6, bevel: 1, name: 'scope.column', inner: L(k.sideSeam(COLUMN, FOOT_TOP + 40, P, 6) + k.sideSeam(COLUMN, FOOT_TOP + 120, P, 6), { tone: 'faint' }) });
  const KNOB = [COLUMN.x + COLUMN.w, COLUMN.y + 14, FOOT_TOP + 28];
  const FK = G.frameAlong(KNOB, [1, 0, 0]);
  turned('back', FK, [[0, 5], [2, 5], [2, 16], [9, 16], [9, 14.4], [10, 14.4]], { tone: 'mid' }, { name: 'scope.coarse-knob', extra: k.fadedSvg(G.ribsOf(FK, 2, 9, 16, 48, P, { fade: [0.1, 0.55] }), { tone: 'lo' }) });
  turned('back', FK, [[10, 4], [11.5, 4], [11.5, 9], [17, 9], [17, 8], [18, 8]], { tone: 'mid' }, { name: 'scope.fine-knob', extra: k.fadedSvg(G.ribsOf(FK, 11.5, 17, 9, 32, P, { fade: [0.1, 0.55] }), { tone: 'lo' }) + L(G.circleOf(FK, 18, 3, P, 16), { tone: 'faint' }) });

  const FK2 = G.frameAlong([COLUMN.x, KNOB[1], KNOB[2]], [-1, 0, 0]);
  turned('back', FK2, [[0, 5], [2, 5], [2, 16], [9, 16], [9, 14.4], [10, 14.4]], { tone: 'mid' }, { name: 'scope.coarse-knob-left' });
  slab('back', { x: COLUMN.x + COLUMN.w, y: COLUMN.y + 4, w: 3, d: 7, r: 1 }, KNOB[2] + 22, 5, { tone: 'mid' }, { steps: 2, name: 'scope.focus-lock' });

  // The condenser under the stage, on its bracket.
  const CB = { x: -10, y: COLUMN.y + COLUMN.d, w: 20, d: OY - 13 - COLUMN.y - COLUMN.d, r: 2 };
  slab('back', CB, CONDENSER.z0 + 6, 8, { tone: 'mid' }, { steps: 3, bevel: 0.5, name: 'scope.condenser-arm', extra: D([at([0, CB.y + 6, CONDENSER.z0 + 14]), at([0, CB.y + CB.d - 8, CONDENSER.z0 + 14])], { size: 0.45 }) });
  can('back', 0, OY, CONDENSER.r, CONDENSER.z0, CONDENSER.z1 - CONDENSER.z0, { tone: 'mid' }, { steps: 40, name: 'scope.condenser', inner: L(k.sideArc(0, OY, CONDENSER.r, CONDENSER.z0 + 9, P, 32), { tone: 'faint' }), extra: L(k.knurl(0, OY, CONDENSER.r, CONDENSER.z1 - 6, CONDENSER.z1, 44, P), { tone: 'lo' }) });

  const FL = G.frameAlong([CONDENSER.r, OY, CONDENSER.z0 + 18], [1, 0, 0]);
  turned('back', FL, [[0, 0.9], [10, 0.9]], { tone: 'mid' }, { name: 'scope.condenser-lever' });
  put('back', G.pointOf(FL, 11.6, 0, 0), S(G.sphereOf(G.pointOf(FL, 11.6, 0, 0), 1.8, P), { tone: 'hi' }), [A.ball(G.pointOf(FL, 11.6, 0, 0), 1.8, { name: 'scope.condenser-lever-ball' })], 'scope.condenser-lever-ball');
  const SK = [STAGE.x + STAGE.w - 9, STAGE.y + 12];
  can('back', SK[0], SK[1], 5.4, STAGE_Z - 30, 6, { tone: 'mid' }, { steps: 24, name: 'scope.stage-knob-y', extra: L(k.knurl(SK[0], SK[1], 5.4, STAGE_Z - 30, STAGE_Z - 24, 24, P), { tone: 'lo' }) });
  can('back', SK[0], SK[1], 2, STAGE_Z - 24, 4, { tone: 'mid' }, { steps: 16, name: 'scope.stage-shaft' });
  can('back', SK[0], SK[1], 7.4, STAGE_Z - 20, 6, { tone: 'mid' }, { steps: 28, name: 'scope.stage-knob-x', extra: L(k.knurl(SK[0], SK[1], 7.4, STAGE_Z - 20, STAGE_Z - 14, 30, P), { tone: 'lo' }) });
  can('back', SK[0], SK[1], 2, STAGE_Z - 14, 14, { tone: 'mid' }, { steps: 16, name: 'scope.stage-shaft-top' });

  // The stage on its bracket, the aperture, the ruler, the clips and the slide: the model.
  const SB = { x: -16, y: COLUMN.y + COLUMN.d, w: 32, d: STAGE.y - COLUMN.y - COLUMN.d + 6, r: 2 };
  slab('back', SB, STAGE_Z - 10, 10, { tone: 'mid' }, { steps: 3, bevel: 0.6, name: 'scope.stage-arm' });
  const stageRule = { x: STAGE.x + 6, y: STAGE.y + STAGE.d - 8, w: STAGE.w - 12, d: 5, r: 0.8 };
  const sTicks = k.topTicks(stageRule.x + 2, stageRule.x + stageRule.w - 2, 2.5, 4, stageRule.y + 0.5, STAGE_TOP + 0.5, [1.4, 2.6], P);
  slab('back', STAGE, STAGE_Z, STAGE_TOP - STAGE_Z, { tone: 'mid' }, { steps: 4, bevel: 0.9, name: 'scope.stage', extra: L(k.ring(0, OY, 9, STAGE_TOP, P, 32), { tone: 'lo' }) + D(k.corners(STAGE, 4).map(([x, y]) => at([x, y, STAGE_TOP])), { size: 0.45 }) });
  slab('back', stageRule, STAGE_TOP, 0.5, { tone: 'lo', crease: 'none' }, { steps: 2, name: 'scope.stage-rule', extra: L(sTicks.minor, { tone: 'lo' }) + L(sTicks.major, { tone: 'mid' }) });
  put('back', [0, OY, SLIDE_TOP], `<g data-part="slide">${S(k.slabOf(SLIDE, STAGE_TOP, SLIDE_TOP - STAGE_TOP, P, 2), { tone: 'hi', lit: lit === 'slide', crease: 'lo' })}${L(k.planOutline({ x: SLIDE.x + 50, y: SLIDE.y + 2, w: 23, d: SLIDE.d - 4, r: 0.6 }, SLIDE_TOP, P, 2), { tone: 'lo' })}${L([16, 11].map((w, i) => k.lineOnTop([SLIDE.x + 53, SLIDE.y + 9 + i * 4], [SLIDE.x + 53 + w, SLIDE.y + 9 + i * 4], SLIDE_TOP, P)).join(''), { tone: 'mid', free: true })}${L(k.planOutline({ x: -9, y: OY - 9, w: 18, d: 18, r: 0.5 }, SLIDE_TOP, P, 2), { tone: 'mid' })}${D([at([0, OY, SLIDE_TOP])], { size: 0.9, tone: 'hi' })}</g>`, [A.slab(SLIDE, STAGE_TOP, SLIDE_TOP - STAGE_TOP, { name: 'scope.slide' })], 'scope.slide');
  for (const side of [-1, 1]) {
    const clip = { x: side > 0 ? 30 : -41, y: OY - 3, w: 11, d: 6, r: 1.2 };
    can('back', side * 44, OY, 3, STAGE_TOP, 3.4, { tone: 'mid' }, { steps: 16, name: 'scope.clip-post', extra: D([at([side * 44, OY, STAGE_TOP + 3.4])], { size: 0.5, tone: 'hi' }) });
    slab('back', clip, SLIDE_TOP, 1.2, { tone: 'mid' }, { steps: 2, name: 'scope.clip' });
  }

  // The turret: ports and objectives first, then its body over them.
  const FT = G.frameOf([TURRET.x, TURRET.y, TURRET.bottom], [0, 0, 1], [0, 1, 0], [1, 0, 0]);
  const port = (i) => around(TURRET.x, TURRET.y, TURRET.ports, i * STEP_DEG + turn, TURRET.bottom);
  const active = PORTS.findIndex((_, i) => Math.abs(((i * STEP_DEG + turn) % 360 + 540) % 360 - 180) < 0.5);
  PORTS.forEach((p, i) => {
    const o = port(i);
    const F = G.frameOf(o, [0, 0, -1], [0, 1, 0], [1, 0, 0]);
    const isLit = lit === 'objective' && i === active;
    if (p.empty) {
      turned('turret', F, [[0, 9.4], [4.4, 9.4]], { tone: 'mid' }, { name: `turret.port-${p.id}`, extra: k.fadedSvg(G.ribsOf(F, 0.4, 4, 9.4, 30, P, { fade: [0.1, 0.55], phase: rad(turn) }), { tone: 'lo' }) });
      return;
    }
    const grip = p.profile.findIndex(([s], j) => j > 1 && s > 3) - 1;
    const [g0, g1] = [p.profile[2][0], p.profile[grip + 1][0]];
    turned('turret', F, p.profile, { tone: 'hi', lit: isLit }, {
      name: `turret.objective-${p.id}`, smooth: false, inner: L(G.arcOf(F, g1, p.profile[2][1], P), { tone: 'lo' }),
      extra: k.fadedSvg(G.ribsOf(F, g0, g1, p.profile[2][1], 34, P, { fade: [0.12, 0.6], phase: rad(turn) }), { tone: 'lo' }),
    });
  });
  const ribs = G.ribsOf(FT, RING[0] + 0.5, RING[1] - 0.5, RING[2], RIBS, P, { fade: [0.1, 0.55], phase: rad(turn) });
  const notches = PORTS.map((_, i) => notchOf(FT, rad(i * STEP_DEG + turn + INDEX_AT))).join('');
  const names = PORTS.map((p, i) => engrave(p.id, FT, i * STEP_DEG + turn, { lit: lit === 'objective' && i === active })).join('');
  turned('turret', FT, T_PROFILE, { tone: 'mid' }, {
    name: 'turret.body', last: true,
    inner: L(G.arcOf(FT, BAND[0], BAND[2], P) + G.arcOf(FT, RING[1], RING[2], P), { tone: 'faint' }),
    extra: k.fadedSvg(ribs, { tone: 'lo' }) + notches + names,
  });
  can('turret', TURRET.x, TURRET.y, HUB.r, HUB.z0, HUB.z1 - HUB.z0, { tone: 'mid' }, { steps: 32, last: true, name: 'turret.hub', inner: L(k.sideArc(TURRET.x, TURRET.y, HUB.r, HUB.z0 + 4, P, 24), { tone: 'faint' }) });

  // The column head over the turret, and the index and detent block at the ring.
  slab('front', HEAD, HEAD_Z, HEAD_TOP - HEAD_Z, { tone: 'mid' }, { steps: 6, bevel: 1.2, name: 'scope.head', extra: L(k.planOutline(k.insetPlan(HEAD, 5), HEAD_TOP, P, 6), { tone: 'faint' }) + D([[0, HEAD.y + 10], [0, HEAD.y + HEAD.d - 10]].map(([x, y]) => at([x, y, HEAD_TOP])), { size: 0.5 }) });
  const headPlate = { x: -14, y: HEAD.y + 46, w: 28, d: 12, r: 1.2 };
  slab('front', headPlate, HEAD_TOP, 0.8, { tone: 'lo', crease: 'none' }, { steps: 3, name: 'scope.head-label', extra: L([18, 11].map((w, i) => k.lineOnTop([headPlate.x + 4, headPlate.y + 3.6 + i * 3.6], [headPlate.x + 4 + w, headPlate.y + 3.6 + i * 3.6], HEAD_TOP + 0.8, P)).join(''), { tone: 'lo', free: true }) });
  const BINO = { x: -20, y: HEAD.y + 6, w: 40, d: 34, r: 6 };
  const binoShape = A.slab(BINO, HEAD_TOP, 16, { name: 'scope.bino-head', owner: 'scope.bino' });
  put('front', [0, BINO.y + BINO.d / 2, HEAD_TOP + 8], S(k.slabOf(BINO, HEAD_TOP, 16, P, 6, 0.8), { tone: 'mid', inner: L(k.sideSeam(BINO, HEAD_TOP + 5, P, 6), { tone: 'faint' }) }), [binoShape], 'scope.bino-head');
  const EYE_A = G.unit3([0, 0.62, 0.78]);
  for (const ex of [-10, 10]) {
    const FE = G.frameAlong([ex, BINO.y + BINO.d - 10, HEAD_TOP + 16], EYE_A);
    turned('front', FE, [[0, 5.2], [24, 5.2], [24, 6.2], [31, 6.2], [31, 6.8], [38, 6.8]], { tone: 'mid' }, { name: 'scope.eyepiece', owner: 'scope.bino', cut: [binoShape], extra: k.fadedSvg(G.ribsOf(FE, 31.4, 37.6, 6.8, 26, P, { fade: [0.12, 0.6] }), { tone: 'lo' }) + L(G.circleOf(FE, 38, 4, P, 20), { tone: 'faint' }) });
  }
  const IDX = around(TURRET.x, TURRET.y, RING[2] + 6.4, INDEX_AT, 0);
  const arm = { x: 14, y: HEAD.y + HEAD.d - 4, w: 9, d: IDX[1] - HEAD.y - HEAD.d + 4 + 2, r: 1.5 };
  slab('front', arm, HEAD_Z - 6, 6, { tone: 'mid' }, { steps: 3, bevel: 0.4, name: 'scope.index-arm' });
  const ringZ = TURRET.bottom + (RING[0] + RING[1]) / 2;
  const IDX_R = 5;
  const face = around(TURRET.x, TURRET.y, RING[2] + 6.4 - IDX_R, INDEX_AT, ringZ);
  can('front', IDX[0], IDX[1], IDX_R, TURRET.bottom + 8, HEAD_Z - 6 - TURRET.bottom - 8, { tone: 'mid' }, { steps: 24, bevel: 0.4, name: 'scope.index-post', owner: 'scope.index',
    inner: L(k.pathOf([at(G.add3(face, [0, 0, 3.4])), at(G.add3(face, [0, 0, -3.4]))]), { tone: 'lit', free: true }) + L(k.sideArc(IDX[0], IDX[1], IDX_R, TURRET.bottom + 12, P, 16), { tone: 'faint' }) });
  // The detent ball: it rides the ring between notches and drops into one at each port.
  const off = ((turn + 0) % STEP_DEG + STEP_DEG) % STEP_DEG;
  const into = Math.max(0, 1 - Math.min(off, STEP_DEG - off) / 2.4);
  const ballAt = around(TURRET.x, TURRET.y, RING[2] + 0.7 - 0.45 * into, INDEX_AT, ringZ);
  put('front', ballAt, S(G.sphereOf(ballAt, 0.7, P), { tone: 'hi' }), [A.ball(ballAt, 0.7, { name: 'scope.detent-ball', owner: 'scope.index' })], 'scope.detent-ball');

  return layers;
}

/** A V-notch on the ring: a short dark slot where the detent ball drops. Hidden when it turns away. */
function notchOf(F, angle) {
  const facing = G.dot3(G.radialOf(F, angle), V);
  if (facing < 0.05) return '';
  const w = 0.045;
  const pts = [[RING[0] + 0.8, angle - w], [RING[1] - 0.8, angle - w], [RING[1] - 0.8, angle + w], [RING[0] + 0.8, angle + w]].map(([s, a]) => at(G.pointOf(F, s, RING[2], a)));
  return `<path class="cs-notch" d="${k.pathOf(pts, true)}" style="opacity:${G.fadeOf(facing, [0.05, 0.4]).toFixed(2)}"/>`;
}

// Engraved names on the turret's label band: Geist Mono outlines wrapped onto the cylinder.
const MONO = fontkit.openSync(path.join(FILM, 'assets/fonts/geist-mono.woff2'));
const GLYPHS = new Map();
function outline(text) {
  if (GLYPHS.has(text)) return GLYPHS.get(text);
  const run = MONO.layout(text);
  const polys = [];
  let pen = 0;
  run.glyphs.forEach((glyph, gi) => {
    let poly = null;
    let cur = [0, 0];
    const push = (p) => poly.push([pen + p[0], p[1]]);
    for (const { command, args } of glyph.path.commands) {
      if (command === 'moveTo') { poly = []; polys.push(poly); cur = args; push(cur); }
      else if (command === 'lineTo') { cur = args; push(cur); }
      else if (command === 'quadraticCurveTo') {
        const [cx, cy, x, y] = args;
        for (let t = 0.25; t <= 1; t += 0.25) push([(1 - t) ** 2 * cur[0] + 2 * (1 - t) * t * cx + t * t * x, (1 - t) ** 2 * cur[1] + 2 * (1 - t) * t * cy + t * t * y]);
        cur = [x, y];
      } else if (command === 'bezierCurveTo') {
        const [c1x, c1y, c2x, c2y, x, y] = args;
        for (let t = 0.25; t <= 1; t += 0.25) {
          const u = 1 - t;
          push([u ** 3 * cur[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t ** 3 * x, u ** 3 * cur[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t ** 3 * y]);
        }
        cur = [x, y];
      }
    }
    pen += run.positions[gi].xAdvance;
  });
  const out = { polys, width: pen, em: MONO.unitsPerEm };
  GLYPHS.set(text, out);
  return out;
}
function engrave(text, F, deg, { lit }) {
  const { polys, width, em } = outline(text);
  const size = 5.2;
  const s0 = BAND[0] + (BAND[1] - BAND[0]) / 2 - size * 0.36;
  const r = BAND[2] + 0.05;
  const centre = rad(deg);
  const facing = G.dot3(G.radialOf(F, centre), V);
  if (facing < 0.08) return '';
  const toWorld = ([u, v]) => G.pointOf(F, s0 + (v / em) * size, r, centre + ((u - width / 2) / em) * size / r);
  const d = polys.map((poly) => k.pathOf(poly.map((p) => at(toWorld(p))), true)).join('');
  return `<path class="cs-engrave${lit ? ' is-lit' : ''}" fill-rule="evenodd" d="${d}" style="opacity:${G.fadeOf(facing, [0.08, 0.45]).toFixed(2)}"/>`;
}

let clips = 0;
function recess({ x0, x1, z0, z1, r, depth }, y, back = '', backClass = 'cs-well', inside = '') {
  const id = `cs-clip-${clips++}`;
  const ring = k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 6);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const { sinA } = k.cameraOf(P);
  const tops = [];
  const sides = [[], [], [], []];
  ring.forEach(([ax, az], index) => {
    const [bx, bz] = ring[(index + 1) % ring.length];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    let [nx, nz] = [(bz - az) / length, -(bx - ax) / length];
    if (nx * (cx - (ax + bx) / 2) + nz * (cz - (az + bz) / 2) < 0) [nx, nz] = [-nx, -nz];
    if (nx <= 0 && nz <= 0) return;
    const quad = k.pathOf([at([ax, y, az]), at([bx, y, bz]), at([bx, y - depth, bz]), at([ax, y - depth, az])], true);
    if (nz >= nx) tops.push(quad);
    else sides[Math.min(3, Math.max(0, Math.floor(((nx * -sinA + 1) / 2) * 4)))].push(quad);
  });
  const shape = flat(x0, z0, x1, z1, r);
  return [
    `<clipPath id="${id}"><path transform="${planeOf(y)}" d="${shape}"/></clipPath>`,
    `<g clip-path="url(#${id})">`,
    `<path class="iso-top" d="${tops.join('')}"/>`,
    ...sides.map((d, shade) => (d.length ? `<path class="iso-shade" data-shade="${shade}" d="${d.join('')}"/>` : '')),
    `<g transform="${planeOf(y - depth)}"><path class="${backClass}" d="${shape}"/>${back}<path class="iso-line" data-tone="faint" d="${shape}"/></g>`,
    inside,
    `</g>`,
    `<g transform="${planeOf(y)}"><path class="iso-line" data-tone="lo" d="${shape}"/></g>`,
  ].join('');
}

/** The figure at one turret angle. `lamp` 0..1, `lit` names the one accent. */
export function build({ turn = 0, lamp = 1, lit = 'objective' } = {}) {
  clips = 0;
  const R = A.recorder(P);
  const layers = scene(R, { turn, lamp, lit });
  const sorted = (list) => [...list].sort((a, b) => a.key - b.key).map((item) => item.svg).join('');
  return { R, back: sorted(layers.back), turret: sorted(layers.turret), front: sorted(layers.front), count: R.items.length, solids: R.solids.length };
}

/** The screen's plane, for the terminal text laid on it: local x along the face, y down. */
export const glassMatrix = () => planeOf(GLASS_Y);
export const screenPoint = (x, z) => at([x, GLASS_Y, z]);
export const worldAt = at;
export const FIG = { OY, SLIDE_TOP, STAGE_TOP, FOOT_TOP, HEAD_TOP, TURRET, RING, FRONT, DECK, CONSOLE, BENCH };

export const FIG_CSS = `
.cs-bezel{fill:var(--anatomy-shade-0)}
.cs-glass{fill:#0a0d0c}
.cs-glow{fill:#0f1513}
.cs-notch{fill:var(--anatomy-paper)}
.cs-engrave{fill:var(--anatomy-lo)}
.cs-engrave.is-lit{fill:var(--anatomy-lit)}
.cs-lamp{fill:var(--anatomy-lit)}
`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  if (argv.includes('--audit')) {
    let failed = 0;
    for (const turn of [0, -36, -72, -74, -108, -144, -146]) {
      const { R, count, solids } = build({ turn });
      console.log(`\n── turret at ${turn}° (${count} items, ${solids} solids)`);
      A.auditOrExit(R, P, { argv: ['--audit'] });
      if (process.exitCode) failed++;
    }
    console.log(failed ? `\naudit failed at ${failed} angle(s)` : '\naudit passed at every angle');
  }
  if (argv.includes('--page')) {
    const out = path.join(FILM, 'tools/shots');
    fs.mkdirSync(out, { recursive: true });
    for (const [name, turn] of [['claude', 0], ['pi', -72], ['opencode', -144], ['mid', -36]]) {
      const f = build({ turn });
      const svg = k.figureSvg({ width: W, height: H, label: 'A microscope on a bench console', body: [f.back, f.turret, f.front] });
      fs.writeFileSync(path.join(out, `figure-${name}.html`), k.pageHtml({ title: 'Swap', theme: 'dark', body: `<style>${FIG_CSS} .iso-card,.iso{max-width:none} body{margin:0} .iso-svg{width:${W}px}</style>${svg}`, width: W }));
    }
    console.log(`wrote ${out}/figure-*.html`);
  }
}
