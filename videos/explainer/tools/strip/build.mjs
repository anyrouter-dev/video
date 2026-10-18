// AnyRouter as a power strip: two inlets on the left end take the app's and
// Claude Code's plugs, four outlets on top each carry a provider badge and a
// status LED. Static isometric art for the explainer; GSAP animates the ids.
//
//   node tools/strip/build.mjs           writes assets/strip/strip.svg + anchors.json
//   node tools/strip/build.mjs --audit   also proves the geometry (kit/audit.mjs)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as G from "./kit/lathe.mjs";
import * as A from "./kit/audit.mjs";
import { tubePieces, tubeSvg } from "./kit/tube.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = join(ROOT, "assets", "strip");

const W = 1500;
const H = 760;
const AZIMUTH = 128;

const INK = "#0A0A0A";
const ORANGE = "#BB4D00";
const GREEN = "#007E55";

// World units, z up. The strip runs along x; the inlet end (x = 0) faces the viewer's left.
const BODY = { x: 0, y: 0, w: 560, d: 150, r: 16 };
const FOOT_H = 8;
const BODY_Z = FOOT_H;
const BODY_TOP = 50;
const DECK = k.insetPlan(BODY, 8);
const DECK_H = 1.2;
const TOP = BODY_TOP + DECK_H;
const LANE_Y = BODY.d / 2;
const FRONT = BODY.y + BODY.d;

const INLET_Z = 28;
const INLETS = { claude: 40, app: 110 };
const BEZEL_T = 4;
const PLUG = { len: 30, half: 15, halfZ: 12 };
const PLUG_OUT = 50;
const CABLE_R = 4.4;
const BOOT = [[0, 11], [3, 11], [3, 9], [6, 9], [6, 8.4], [9, 8.4], [9, 7.8], [12, 7.8], [12, 7.2], [15, 7.2], [15, 6.6], [18, 6.6], [18, 6], [21, 6], [21, 5.4], [25, 5.4]];
const BOOT_LEN = 25;

const OUTLETS = [175, 280, 385, 490];
const SOCKET = { y: 14, d: 54, w: 60, h: 3, r: 19, deep: 5 };
const SOCKET_Y = SOCKET.y + SOCKET.d / 2;
const SOCKET_TOP = TOP + SOCKET.h;
const BADGE = { y: 90, size: 34, h: 0.8 };
const LED_Y = 107;
const PROVIDERS = ["anthropic", "openai", "google", "deepseek"];

const TAG_FONT = 24;

const P = k.fitProjection(
  [
    ...k.boxCorners(BODY, 0, TOP + 12),
    [-PLUG_OUT - 70, INLETS.claude, INLET_Z + 20],
    [-PLUG_OUT - 70, INLETS.app, INLET_Z - 20],
    [-420, INLETS.claude, 0],
    [-210, INLETS.app, -50],
  ],
  W,
  H,
  { pad: 36, azimuth: AZIMUTH },
);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const f2 = (v) => Math.round(v * 100) / 100;
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
function planeMatrix(o, ex, ey) {
  const p0 = at(o);
  const px = at(G.add3(o, ex));
  const py = at(G.add3(o, ey));
  const v = (x) => x.toFixed(4);
  return `matrix(${v(px[0] - p0[0])} ${v(px[1] - p0[1])} ${v(py[0] - p0[0])} ${v(py[1] - p0[1])} ${p0[0].toFixed(2)} ${p0[1].toFixed(2)})`;
}
// A rounded rectangle centred on the origin, as 2D points, for outlines drawn in any plane.
function roundRect(w, h, r, steps = 4) {
  const plan = k.ringOf({ x: -w / 2, y: -h / 2, w, d: h, r }, steps);
  return plan;
}
const onFaceX = (x, cy, cz, pts) => pts.map(([u, v]) => [x, cy + u, cz + v]);
const onFaceY = (y, cx, cz, pts) => pts.map(([u, v]) => [cx + u, y, cz + v]);
const onTopZ = (z, cx, cy, pts) => pts.map(([u, v]) => [cx + u, cy + v, z]);

const R = A.recorder(P);
const record = R.solid;
let parts = 0;
const count = (n = 1) => (parts += n);

// ---------------------------------------------------------------- static body
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BODY, 0, BODY_TOP, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BODY, 17))) {
    out.push(S(k.cylinder(x, y, 10, 0, 2, P, 32), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 8, 2, FOOT_H - 2, P, 32), { tone: "mid" }));
    record(A.cylinder(x, y, 10, 0, 2, { name: "stand.foot", ground: true }));
    record(A.cylinder(x, y, 8, 2, FOOT_H - 2, { name: "stand.foot.pad", ground: true }));
    count(2);
  }
  const seam = k.sideSeam(BODY, 22, P, 10);
  out.push(S(k.slabOf(BODY, BODY_Z, BODY_TOP - BODY_Z, P, 10, 1.6), { tone: "hi", crease: "lo", inner: Ln(seam, { tone: "lo" }) }));
  record(A.slab(BODY, BODY_Z, BODY_TOP - BODY_Z, { name: "body.shell" }, 10));
  count(2);
  return out.join("");
}

function frontFace() {
  const out = [];
  const y = FRONT;
  // Ruler strip along the bottom of the long face, ticks hanging from its top edge.
  const ruler = { x: 140, y, w: 400, d: 0.8, r: 0.3 };
  out.push(S(k.slabOf(ruler, 10, 8, P, 2), { tone: "lo", crease: "none" }));
  record(A.slab(ruler, 10, 8, { name: "body.ruler" }, 2));
  const ticks = k.sideTicks(ruler.x + 4, ruler.x + ruler.w - 4, 4, 5, y + 0.8, 18, [2.2, 3.8], P);
  out.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  out.push(Dots([at([ruler.x + 2, y + 0.8, 14]), at([ruler.x + ruler.w - 2, y + 0.8, 14])], { size: 0.6 }));
  count(2);

  // Vent slots: closed outlines in the face plane.
  const vents = [];
  for (let i = 0; i < 14; i++) vents.push(path3(onFaceY(y, 186 + i * 17, 34, roundRect(4.2, 14, 2.1)), true));
  out.push(`<path class="ar-hole" d="${vents.join("")}"/>`, Ln(vents.join(""), { tone: "mid" }));
  count();

  // Monogram badge plate, engraved.
  const badge = { x: 34, y, w: 70, d: 1.4, r: 0.5 };
  out.push(S(k.slabOf(badge, 16, 28, P, 2, 0.4), { tone: "mid" }));
  record(A.slab(badge, 16, 28, { name: "body.badge" }, 2));
  const face = y + badge.d;
  out.push(Ln(path3(onFaceY(face, badge.x + badge.w / 2, 30, roundRect(badge.w - 5, 23, 2.5)), true), { tone: "faint" }));
  const logo = readFileSync(join(ROOT, "assets", "anyrouter-logo-black.svg"), "utf8");
  const logoPaths = [...logo.matchAll(/<path d="([^"]+)"\/>/g)].map((m) => m[1]);
  const mark = 17 / 801.34;
  const mx = badge.x + 14;
  out.push(
    `<g class="ar-engrave" transform="${planeMatrix([mx, face, 30 + 8.5], [1, 0, 0], [0, 0, -1])} scale(${mark}) translate(-203.66 -206.57)"><g transform="translate(0,1254) scale(0.1,-0.1)">${logoPaths.map((d) => `<path d="${d}"/>`).join("")}</g></g>`,
  );
  // Rule lines standing for the engraved maker's text, beside the mark.
  [[34, 30], [30, 26], [22, 22]].forEach(([len, z], i) => out.push(Ln(k.segment([mx + 22, face, z + 4], [mx + 22 + len * (i ? 0.7 : 1), face, z + 4], P), { tone: "mid", free: true })));
  out.push(Dots([at([badge.x + 3.5, face, 39.5]), at([badge.x + badge.w - 3.5, face, 39.5]), at([badge.x + 3.5, face, 20.5]), at([badge.x + badge.w - 3.5, face, 20.5])], { size: 0.7, tone: "mid" }));
  count(3);

  // Rating plate on the right of the long face.
  const plate = { x: 470, y, w: 64, d: 1, r: 0.4 };
  out.push(S(k.slabOf(plate, 24, 20, P, 2, 0.3), { tone: "mid" }));
  record(A.slab(plate, 24, 20, { name: "body.rating" }, 2));
  const pf = y + plate.d;
  out.push(Ln(path3(onFaceY(pf, plate.x + plate.w / 2, 34, roundRect(plate.w - 4, 16, 1.5)), true), { tone: "faint" }));
  [[40, 39], [30, 35], [46, 31]].forEach(([len, z]) => out.push(Ln(k.segment([plate.x + 8, pf, z], [plate.x + 8 + len, pf, z], P), { tone: "lo", free: true })));
  out.push(Dots([at([plate.x + 3, pf, 34]), at([plate.x + plate.w - 3, pf, 34])], { size: 0.6, tone: "mid" }));
  count(2);
  return out.join("");
}

function inletBezels() {
  const out = [];
  // Draw the far inlet first.
  for (const [name, yc] of Object.entries(INLETS)) {
    const bezel = { x: -BEZEL_T, y: yc - 19, w: BEZEL_T, d: 38, r: 2 };
    out.push(S(k.slabOf(bezel, INLET_Z - 15, 30, P, 3, 0.5), { tone: "mid" }));
    record(A.slab(bezel, INLET_Z - 15, 30, { name: `inlet.${name}.bezel` }, 3));
    const x = -BEZEL_T;
    out.push(`<path class="ar-hole" d="${path3(onFaceX(x, yc, INLET_Z, roundRect(24, 18, 3)), true)}"/>`);
    out.push(Ln(path3(onFaceX(x, yc, INLET_Z, roundRect(24, 18, 3)), true), { tone: "hi" }));
    const pins = [[-7, 2], [7, 2], [0, -4.5]].map(([u, v]) => path3(onFaceX(x, yc + u, INLET_Z + v, roundRect(2.4, 5, 1.1)), true)).join("");
    out.push(`<path class="ar-pin" d="${pins}"/>`, Ln(pins, { tone: "mid" }));
    out.push(Dots([at([x, yc - 15.5, INLET_Z]), at([x, yc + 15.5, INLET_Z])], { size: 0.8, tone: "hi" }));
    count(3);
  }
  return out.join("");
}

// ---------------------------------------------------------------- deck
function deck() {
  const out = [];
  out.push(S(k.slabOf(DECK, BODY_TOP, DECK_H, P, 8, 0.6), { tone: "mid" }));
  record(A.slab(DECK, BODY_TOP, DECK_H, { name: "deck.cover" }, 8));
  count();
  const screws = k.corners(DECK, 7);
  out.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.6, TOP, P, 18)).join(""), { tone: "lo" }));
  out.push(Dots(screws.map(([x, y]) => at([x, y, TOP])), { size: 0.7, tone: "hi" }));
  count(4);
  // The bus lane: a shallow channel down the centreline the packets ride in.
  const lane = { x: 18, y: LANE_Y - 4, w: OUTLETS[3] - 18, d: 8, r: 4 };
  out.push(`<path class="ar-lane" d="${k.planOutline(lane, TOP, P, 6)}"/>`, Ln(k.planOutline(lane, TOP, P, 6), { tone: "lo" }));
  // Taps from the lane to each socket: short closed channels.
  for (const cx of OUTLETS) {
    const tap = { x: cx - 2.5, y: SOCKET.y + SOCKET.d, w: 5, d: LANE_Y - 4 - SOCKET.y - SOCKET.d, r: 1 };
    if (tap.d > 0.5) out.push(`<path class="ar-lane" d="${k.planOutline(tap, TOP, P, 3)}"/>`, Ln(k.planOutline(tap, TOP, P, 3), { tone: "lo" }));
  }
  count();
  // Label plate in the control zone, rule lines standing for the rating text.
  const label = { x: 26, y: 92, w: 78, d: 32, r: 2 };
  out.push(S(k.slabOf(label, TOP, 0.8, P, 3), { tone: "lo", crease: "none" }));
  record(A.slab(label, TOP, 0.8, { name: "deck.label" }, 3));
  out.push(Ln(k.planOutline(k.insetPlan(label, 2), TOP + 0.8, P, 3), { tone: "faint" }));
  [[52, 101], [40, 108], [58, 115]].forEach(([len, yy]) => out.push(Ln(k.lineOnTop([label.x + 9, yy], [label.x + 9 + len, yy], TOP + 0.8, P), { tone: "mid", free: true })));
  out.push(Dots([at([label.x + 4.5, label.y + 4.5, TOP + 0.8]), at([label.x + label.w - 4.5, label.y + label.d - 4.5, TOP + 0.8])], { size: 0.6 }));
  count(2);
  return out.join("");
}

function controls() {
  const out = [];
  // Rocker switch: bezel, then the rocker pressed down on its right ("on") side.
  const bezel = { x: 30, y: 20, w: 46, d: 32, r: 4 };
  out.push(S(k.slabOf(bezel, TOP, 4, P, 4, 0.6), { tone: "mid" }));
  record(A.slab(bezel, TOP, 4, { name: "deck.switch.bezel" }, 4));
  const inner = k.insetPlan(bezel, 4);
  out.push(`<path class="ar-hole" d="${k.planOutline(inner, TOP + 4, P, 3)}"/>`, Ln(k.planOutline(inner, TOP + 4, P, 3), { tone: "lo" }));
  const z0 = TOP + 4;
  const F = G.frameOf([0, inner.y + 1, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const poly = [[inner.x + 1, z0], [inner.x + inner.w - 1, z0], [inner.x + inner.w - 1, z0 + 2.6], [inner.x + 1, z0 + 7.4]];
  const rocker = G.prismOf(F, poly, 0, inner.d - 2, P);
  const mark = k.segment([inner.x + 6, inner.y + inner.d / 2 - 4, z0 + 6.1], [inner.x + 6, inner.y + inner.d / 2 + 4, z0 + 6.1], P);
  // The printed "I" on the rocker stops on its face by design.
  out.push(`<g id="switch-rocker">${S(rocker, { tone: "hi", inner: Ln(mark, { tone: "mid", free: true }) })}</g>`);
  record(A.prism(F, poly, 0, inner.d - 2, { name: "deck.switch.rocker" }));
  count(2);

  // Power light: bezel collar and an orange lens.
  const [px, py] = [96, 36];
  out.push(S(k.cylinder(px, py, 8, TOP, 2.4, P, 40, 0.4), { tone: "mid" }));
  record(A.cylinder(px, py, 8, TOP, 2.4, { name: "deck.power.bezel" }));
  const lens = k.cylinder(px, py, 5, TOP + 2.4, 1.6, P, 40);
  out.push(`<path id="power-light" d="${lens.fill}" fill="${ORANGE}"/>`);
  out.push(`<path class="ar-glint" d="${k.ring(px - 1.4, py - 1.4, 1.3, TOP + 4, P, 12)}"/>`);
  out.push(Ln(lens.outline, { tone: "hi" }));
  record(A.cylinder(px, py, 5, TOP + 2.4, 1.6, { name: "deck.power.lens" }));
  count(2);
  return out.join("");
}

const PROVIDER_SVG = Object.fromEntries(
  PROVIDERS.map((name) => {
    const text = readFileSync(join(ROOT, "assets", `provider-${name}.svg`), "utf8");
    return [name, [...text.matchAll(/<path\b[^>]*\/?>(?:<\/path>)?/g)].map((m) => m[0].replace(/<\/path>/, "").replace(/\s*\/?>$/, "/>")).join("")];
  }),
);

function outlet(cx, index) {
  const out = [];
  const plan = { x: cx - SOCKET.w / 2, y: SOCKET.y, w: SOCKET.w, d: SOCKET.d, r: 6 };
  out.push(S(k.slabOf(plan, TOP, SOCKET.h, P, 6, 0.6), { tone: "hi", crease: "lo" }));
  record(A.slab(plan, TOP, SOCKET.h, { name: `outlet.${index}.plate` }, 6));
  // Socket recess: far wall shows above the floor ellipse, all clipped to the rim.
  const rim = k.ring(cx, SOCKET_Y, SOCKET.r, SOCKET_TOP, P, 72);
  const floorZ = SOCKET_TOP - SOCKET.deep;
  const clip = `ar-strip-socket-${index}`;
  const slots = [-7.5, 7.5].map((u) => ({ x: cx + u - 1.7, y: SOCKET_Y - 7, w: 3.4, d: 12, r: 1.2 }));
  const shutters = slots.map((s) => k.insetPlan(s, 0.8));
  const ground = k.ring(cx, SOCKET_Y + 10, 2.6, floorZ, P, 20);
  out.push(
    `<clipPath id="${clip}"><path d="${rim}"/></clipPath>`,
    `<g clip-path="url(#${clip})"><path class="ar-wall" d="${rim}"/><path class="ar-floor" d="${k.ring(cx, SOCKET_Y, SOCKET.r, floorZ, P, 72)}"/>`,
    ...slots.map((s) => `<path class="ar-hole" d="${k.planOutline(s, floorZ, P, 3)}"/>`),
    ...shutters.map((s) => `<path class="ar-shutter" d="${k.planOutline(s, floorZ, P, 3)}"/>`),
    `<path class="ar-hole" d="${ground}"/>`,
    Ln(slots.map((s) => k.planOutline(s, floorZ, P, 3)).join("") + ground, { tone: "mid" }),
    `</g>`,
    Ln(rim, { tone: "hi" }),
    Ln(k.ring(cx, SOCKET_Y, SOCKET.r + 3, SOCKET_TOP, P, 72), { tone: "faint" }),
  );
  const screws = [[plan.x + 5, plan.y + 5], [plan.x + plan.w - 5, plan.y + plan.d - 5]];
  out.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2, SOCKET_TOP, P, 14)).join(""), { tone: "lo" }), Dots(screws.map(([x, y]) => at([x, y, SOCKET_TOP])), { size: 0.6, tone: "hi" }));
  count(5);

  // Provider badge lying flat in front of the socket.
  const b = { x: cx - SOCKET.w / 2 + 2, y: BADGE.y, w: BADGE.size, d: BADGE.size, r: 4 };
  out.push(S(k.slabOf(b, TOP, BADGE.h, P, 4, 0.3), { tone: "mid" }));
  record(A.slab(b, TOP, BADGE.h, { name: `outlet.${index}.badge` }, 4));
  const markSize = 24;
  const scale = markSize / 24;
  const origin = [b.x + (b.w - markSize) / 2, b.y + (b.d - markSize) / 2, TOP + BADGE.h];
  out.push(`<g class="ar-mark" transform="${planeMatrix(origin, [1, 0, 0], [0, 1, 0])} scale(${scale})">${PROVIDER_SVG[PROVIDERS[index]]}</g>`);
  count(2);

  // Status LED window.
  const lx = cx + 16;
  out.push(S(k.cylinder(lx, LED_Y, 7, TOP, 2, P, 36, 0.4), { tone: "mid" }));
  record(A.cylinder(lx, LED_Y, 7, TOP, 2, { name: `outlet.${index}.led.bezel` }));
  const lens = k.cylinder(lx, LED_Y, 4.2, TOP + 2, 1.4, P, 36);
  out.push(`<path id="led-${index + 1}" d="${lens.fill}" fill="${GREEN}"/>`);
  out.push(`<path class="ar-glint" d="${k.ring(lx - 1.2, LED_Y - 1.2, 1, TOP + 3.4, P, 12)}"/>`);
  out.push(Ln(lens.outline, { tone: "hi" }));
  record(A.cylinder(lx, LED_Y, 4.2, TOP + 2, 1.4, { name: `outlet.${index}.led.lens` }));
  count(2);
  return `<g id="outlet-${index + 1}">${out.join("")}</g>`;
}

// ---------------------------------------------------------------- plugs, cables, tags
const TAG = {
  app: { text: "your app", string: -104, drop: 9 },
  claude: { text: "Claude Code", string: -206, drop: 9, lift: 34 },
};
// Font size in world units so the rendered text is TAG_FONT viewBox units.
const faceScale = Math.hypot(...G.sub3(at([1, 0, 0]), at([0, 0, 0])).slice(0, 2));
const TAG_FS = TAG_FONT / faceScale;
const TAG_H = TAG_FS * 1.9;

function plug(name, yc) {
  const piece = name;
  const items = [];
  const put = (n, ref, svg, shapes = [], extra = {}) => items.push(R.put({ name: `${name}.${n}`, at: ref, svg, shapes, piece, ...extra }));
  const x0 = -BEZEL_T;
  const x1 = x0 - PLUG.len;

  const body = { x: x1, y: yc - PLUG.half, w: PLUG.len, d: PLUG.half * 2, r: 4 };
  const z0 = INLET_Z - PLUG.halfZ;
  const ribs = [6, 11, 16, 21].map((dx) => k.segment([x1 + dx, yc + PLUG.half, z0], [x1 + dx, yc + PLUG.half, z0 + PLUG.halfZ * 2], P)).join("");
  const grip = k.lineOnTop([x1, yc], [x0, yc], z0 + PLUG.halfZ * 2, P);
  put("body", [x1 + PLUG.len / 2, yc, INLET_Z], S(k.slabOf(body, z0, PLUG.halfZ * 2, P, 4, 0.8), { tone: "hi", crease: "lo", inner: Ln(ribs, { tone: "lo" }) + Ln(grip, { tone: "faint" }) }), [record(A.slab(body, z0, PLUG.halfZ * 2, { name: `${name}.body` }, 4))]);
  count();

  const F = G.frameAlong([x1, yc, INLET_Z], [-1, 0, 0]);
  put("boot", G.pointOf(F, BOOT_LEN / 2, 0, 0), S(G.solidOf(BOOT, F, P), { tone: "mid" }), [record(A.solid(F, BOOT, { name: `${name}.boot` }))]);
  count();

  // Cable: straight out of the boot, then a long easy droop off the left of the frame.
  const start = [x1 - BOOT_LEN, yc, INLET_Z];
  const tag = TAG[name];
  // The Claude Code cable climbs a little first, so its tag hangs clear above the app cable.
  const lift = tag.lift ?? 0;
  const legs = lift ? [start, [x1 - BOOT_LEN - 40, yc, INLET_Z], [x1 - BOOT_LEN - 110, yc, INLET_Z + lift], [-430, yc, INLET_Z + lift]] : [start, [-430, yc, INLET_Z]];
  const route = G.fillet([...legs, [-640, yc, INLET_Z - 30], [-1000, yc, INLET_Z - 36]], 60, 14, { P, tube: CABLE_R });
  const total = G.pathLength(route);
  // Find the band's arc length (where the route passes x = tag.string).
  let bandAt = 0;
  for (let s = 0; s < total; s += 0.25) if (G.pointAlong(route, s)[0] <= tag.string) { bandAt = s; break; }
  const BAND = 1.8;
  const gaps = [[bandAt - BAND, bandAt + BAND]];
  R.route(`${name}.cable`, route, CABLE_R, { gaps, ends: [true, false], piece });
  tubePieces(route, CABLE_R, P, { maxLength: 40, gaps }).forEach((pc, i) =>
    put(`cable:${i}`, pc.mid, tubeSvg(pc, { tone: "hi" }), [A.tube(pc.points, pc.radii, { name: `${name}.cable`, owner: `${name}.cable` })], { route: `${name}.cable`, chunk: i }),
  );
  count();

  // The tag's loop: a band clamped round the cable, a cord down to the tag.
  const bandPoint = G.pointAlong(route, bandAt);
  const FB = G.frameAlong(bandPoint, G.tangentAlong(route, bandAt));
  put("band", bandPoint, S(G.ringBand(-BAND, BAND, CABLE_R, CABLE_R + 1.6, FB, P), { tone: "mid" }), [record(A.ring(FB, -BAND, BAND, CABLE_R, CABLE_R + 1.6, { name: `${name}.band`, owner: `${name}.cable` }))]);
  const cordTop = [bandPoint[0], yc, bandPoint[2] - CABLE_R - 1.6];
  const tagTop = cordTop[2] - tag.drop;
  const cord = [cordTop, [cordTop[0], yc, tagTop]];
  R.route(`${name}.cord`, cord, 0.9, { piece });
  tubePieces(cord, 0.9, P, { maxLength: 40 }).forEach((pc, i) => put(`cord:${i}`, pc.mid, tubeSvg(pc, { tone: "hi" }), [A.tube(pc.points, pc.radii, { name: `${name}.cord`, owner: `${name}.cord` })], { route: `${name}.cord`, chunk: i }));
  count(2);

  // The tag: a thin card hanging in the x-z plane, text on its front face.
  const textW = tag.text.length * TAG_FS * 0.56;
  const tw = textW + TAG_FS * 1.6 + 10;
  const tx1 = cordTop[0] + 8;
  const card = { x: tx1 - tw, y: yc - 0.8, w: tw, d: 1.6, r: 0.6 };
  const tz0 = tagTop - TAG_H;
  const face = yc + 0.8;
  const eyelet = path3(onFaceY(face, cordTop[0], tagTop - 4, k.circleRing(0, 0, 2.2, 16)), true);
  const textSvg = `<text class="ar-tag-text" transform="${planeMatrix([card.x + TAG_FS * 0.8, face, tagTop - TAG_H / 2], [1, 0, 0], [0, 0, -1])}" font-size="${f2(TAG_FS)}" dominant-baseline="central">${tag.text}</text>`;
  const cardSvg = S(k.slabOf(card, tz0, TAG_H, P, 2, 0.3), { tone: "hi", inner: Ln(path3(onFaceY(face, card.x + tw / 2, tz0 + TAG_H / 2, roundRect(tw - 5, TAG_H - 5, 2.5)), true), { tone: "faint" }) });
  put("tag", [card.x + tw / 2, yc, tz0 + TAG_H / 2], `<g id="tag-${name}" class="ar-tag">${cardSvg}<path class="ar-hole" d="${eyelet}"/>${Ln(eyelet, { tone: "mid" })}${textSvg}</g>`, [record(A.slab(card, tz0, TAG_H, { name: `${name}.tag` }, 2))]);
  count(2);
  return { items, route };
}

// ---------------------------------------------------------------- assemble
const back = [base(), frontFace(), inletBezels()].join("");
const top = [deck(), controls(), ...OUTLETS.map(outlet)].join("");
const plugClaude = plug("claude", INLETS.claude);
const plugApp = plug("app", INLETS.app);

A.settle(R, P);
// The two plugs are separate animated groups: emit each group whole, back plug first,
// and hand the audit that emitted order so it proves it.
const groupOrder = [plugClaude.items, plugApp.items].map((items) => [...items].sort((a, b) => a.key - b.key));
groupOrder.flat().forEach((item, index) => (item.key = index));
R.items.sort((a, b) => a.key - b.key);

const plugOut = f2s(k.axisVector(P, [-PLUG_OUT, 0, 0]));
function f2s(v) {
  return v.map(f2);
}
const plugGroup = (id, items) => `<g id="${id}">${items.map((item) => item.svg).join("")}</g>`;

// Packet paths: along the lane centreline, then up the tap to the socket face centre.
function packetPath(index) {
  const cx = OUTLETS[index];
  const pts = [[DECK.x + 4, LANE_Y, TOP], [cx - 6, LANE_Y, TOP], [cx, LANE_Y - 6, TOP], [cx, SOCKET.y + SOCKET.d, TOP], [cx, SOCKET.y + SOCKET.d - 2, SOCKET_TOP], [cx, SOCKET_Y, SOCKET_TOP]];
  return pts.map(at);
}
const pathD = (pts) => "M" + pts.map(([x, y]) => `${f2(x)} ${f2(y)}`).join("L");

const CSS = k.ISO_CSS.split("\n")
  .filter((line) => !/@keyframes|animation|iso-plate|iso-legend|iso-keys|iso-key|iso-swatch|iso-figure|@media/.test(line))
  .join("\n");
const EXTRA = `
.ar-strip{overflow:hidden;--anatomy-paper:#ffffff;--anatomy-card:#ffffff;--anatomy-face:#ffffff;--anatomy-top:#ffffff;--anatomy-hi:${INK};--anatomy-dot:${INK};--anatomy-weight:1px}
.ar-hole{fill:#c8c8c5;stroke:none}
.ar-pin{fill:#9a9a9e;stroke:none}
.ar-wall{fill:var(--anatomy-shade-0);stroke:none}
.ar-floor{fill:var(--anatomy-shade-2);stroke:none}
.ar-shutter{fill:var(--anatomy-shade-3);stroke:none}
.ar-lane{fill:var(--anatomy-shade-3);stroke:none}
.ar-glint{fill:#ffffff;opacity:.75;stroke:none}
.ar-mark{fill:${INK}}
.ar-tag .iso-shade{fill:#f6f6f4}
.ar-engrave{fill:${INK}}
.ar-tag-text{fill:${INK};font-family:Geist,ui-sans-serif,system-ui,sans-serif;font-weight:500;letter-spacing:-.01em}
`;

const pathApp = packetPath(0);
const pathTwo = packetPath(1);
const svg = k
  .figureSvg({
    width: W,
    height: H,
    label:
      "AnyRouter drawn as a power strip. Two plugs, labelled your app and Claude Code, are plugged into inlets on its left end. Four outlets along its top each carry a provider badge, Anthropic, OpenAI, Google and DeepSeek, with a green status LED beside it. An orange power light sits by the rocker switch.",
    body: [
      back,
      top,
      plugGroup("plug-claude", groupOrder[0]),
      plugGroup("plug-app", groupOrder[1]),
      `<path id="packet-path" d="${pathD(pathApp)}" fill="none" stroke="none"/>`,
      `<path id="packet-path-2" d="${pathD(pathTwo)}" fill="none" stroke="none"/>`,
    ],
  })
  .replace('class="iso-svg"', `class="iso-svg iso ar-strip" data-theme="light"`)
  .replace(/(<svg[^>]*>)/, `$1<style>${CSS}${EXTRA}</style>`);

const front = (x, y, z) => at([x, y, z]);
const inletAt = (yc) => front(-BEZEL_T, yc, INLET_Z);
const anchors = {
  viewBox: [0, 0, W, H],
  plugOut: { app: plugOut, claude: plugOut },
  outlets: OUTLETS.map((cx, i) => {
    const [x, y] = at([cx, SOCKET_Y, SOCKET_TOP]);
    return { id: `outlet-${i + 1}`, provider: PROVIDERS[i], x: f2(x), y: f2(y) };
  }),
  inlet: (() => {
    const [x, y] = front(-BEZEL_T, (INLETS.app + INLETS.claude) / 2, INLET_Z);
    return { x: f2(x), y: f2(y) };
  })(),
  inlets: Object.fromEntries(Object.entries(INLETS).map(([n, yc]) => [n, f2s(inletAt(yc))])),
  labelAnchor: (() => {
    const [x, y] = at([BODY.w / 2, FRONT, 0]);
    return { x: f2(x), y: f2(y + 70) };
  })(),
  packetPaths: { "packet-path": pathApp.map(f2s), "packet-path-2": pathTwo.map(f2s) },
  parts,
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "strip.svg"), svg + "\n");
writeFileSync(join(OUT, "anchors.json"), JSON.stringify(anchors, null, 2) + "\n");
console.log(`wrote assets/strip/strip.svg (${(svg.length / 1024).toFixed(0)} KB) and anchors.json · ${parts} parts · ${R.solids.length} solids · ${R.items.length} sorted items`);

A.auditOrExit(R, P);
