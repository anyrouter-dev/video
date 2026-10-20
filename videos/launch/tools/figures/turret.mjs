// Fig. 3, the turret head. A drive housing on a bed carries a hexagonal turret on a horizontal
// spindle; six tool stations, one per agent `anyr` launches. Indexing turns the head one station
// while the drive, its coupling and its lamp stay where they are: the agent changes, the key and
// the model do not. An index pin in the housing face locks each station.
//
//   node turret.mjs --audit [--portrait] [--rot=deg]
//   node turret.mjs --page [--portrait]
import path from "node:path";
import { k, G, A, shop, layout, figureMarkup, checkPage, write } from "./shop.mjs";

export const STATIONS = ["claude", "codex", "grok", "opencode", "pi", "pool"];
const BED = { x: -132, y: -56, w: 214, d: 112, r: 8 };
const HOUSING = { x: -122, y: -38, w: 74, d: 76, r: 4 };
const AXIS_Z = 72;
const HEX_X = [-30, 12];
const HEX_R = 28;
const APOTHEM = HEX_R * Math.cos(Math.PI / 6);
const PIN_R = 19;

/** Each station's tool, a turned profile outward from the face: collet, then the cutter. */
const COLLET = [[0, 7], [4.5, 7], [4.5, 5.2], [8, 5.2], [8, 4]];
const TOOLS = {
  claude: [[8, 3.2], [26, 3.2], [27, 2.6, 1], [29, 1.2, 1], [30, 0]],
  codex: [[8, 3], [14, 3], [14, 3.8], [27, 3.8], [29.5, 2.4]],
  grok: [[8, 4.2], [29, 4.2], [29, 0]],
  opencode: [[8, 2.6], [12, 2.6], [12, 3.4], [27, 3.4], [29.5, 2.2], [29.5, 0]],
  pi: [[8, 2.4], [26, 2.4], [26, 3.8], [30, 3.8], [30, 0]],
  pool: [[8, 2.2], [24, 2.2], [24.6, 2.8, 1], [26.4, 3.2, 1], [28.2, 2.8, 1], [29, 1.6, 1], [29.3, 0]],
};
export const TOOL_PROFILES = Object.fromEntries(STATIONS.map((s) => [s, [...COLLET, ...TOOLS[s]]]));

export const VIEWS = {
  landscape: { width: 640, height: 330, azimuth: 52, elevation: 26, pad: 12 },
  portrait: { width: 600, height: 520, azimuth: 40, elevation: 26, pad: 18 },
};

export function projection(view) {
  const v = VIEWS[view];
  const reach = APOTHEM + 31;
  const pts = [...k.boxCorners(BED, -16, 0), [0, 0, AXIS_Z + reach], [0, reach, AXIS_Z], [0, -reach, AXIS_Z], [HOUSING.x, 0, 112]];
  return k.fitProjection(pts, v.width, v.height, { pad: v.pad, azimuth: v.azimuth, elevation: v.elevation });
}

const rad = (d) => (d * Math.PI) / 180;

/**
 * The turning head at angle `rot` (degrees): the hex, its six tools and the end cap, each with a
 * depth for painting. Station j points along angle 90 + 60·j + rot in the y–z plane, so at rot 0
 * station 0 points straight up, the working position. `st.lit` is the station in use.
 */
export function headParts(P, rot, st) {
  const V = G.viewOf(P);
  const X = G.frameOf([HEX_X[0], 0, AXIS_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const hexPoly = [];
  for (let j = 0; j < 6; j++) {
    const a = rad(90 + 60 * j + rot + 30);
    hexPoly.push([HEX_R * Math.cos(a), HEX_R * Math.sin(a)]);
  }
  const out = [];
  const hex = G.prismOf(X, hexPoly, 0, HEX_X[1] - HEX_X[0], P);
  const mid = [(HEX_X[0] + HEX_X[1]) / 2, 0, AXIS_Z];
  const faceLines = [];
  for (let j = 0; j < 6; j++) {
    const a = rad(90 + 60 * j + rot);
    const n = [0, Math.cos(a), Math.sin(a)];
    if (G.dot3(n, V) <= 0.02) continue;
    const c = G.add3(mid, G.mul3(n, APOTHEM));
    const t = [0, -Math.sin(a), Math.cos(a)];
    const ring = [];
    for (let q = 0; q <= 32; q++) {
      const ph = (q / 32) * Math.PI * 2;
      ring.push(k.iso(G.add3(c, G.add3(G.mul3([1, 0, 0], 9 * Math.cos(ph)), G.mul3(t, 9 * Math.sin(ph)))), P));
    }
    faceLines.push(k.pathOf(ring, true));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      faceLines.push(k.pathOf([k.iso(G.add3(c, G.add3(G.mul3([1, 0, 0], 15 * sx), G.mul3(t, 11 * sy))), P), k.iso(G.add3(c, G.add3(G.mul3([1, 0, 0], 15 * sx + 0.01), G.mul3(t, 11 * sy))), P)]));
    }
  }
  out.push({ kind: "hex", d: G.dot3(mid, V), svg: k.solidSvg(hex, { tone: "mid", crease: "lo", inner: k.lineSvg(faceLines.join(""), { tone: "lo" }) }), poly: hexPoly });
  STATIONS.forEach((name, j) => {
    const a = rad(90 + 60 * j + rot);
    const n = [0, Math.cos(a), Math.sin(a)];
    const F = G.frameAlong(G.add3(mid, G.mul3(n, APOTHEM)), n);
    const lit = st.lit === j;
    const paths = G.solidOf(TOOL_PROFILES[name], F, P);
    const tip = G.add3(mid, G.mul3(n, APOTHEM + 15));
    out.push({ kind: "tool", j, name, F, d: G.dot3(tip, V) + (G.dot3(n, V) > 0 ? 40 : -40), svg: k.solidSvg(paths, { tone: lit ? "hi" : "mid", lit, crease: lit ? "lo" : "faint" }) });
  });
  const cap = G.frameAlong([HEX_X[1], 0, AXIS_Z], [1, 0, 0]);
  const capPaths = G.solidOf([[0, 15], [3, 15], [3, 9], [6, 9], [6, 0]], cap, P);
  const bolts = [];
  for (let q = 0; q < 6; q++) {
    const ph = rad(q * 60 + rot);
    bolts.push(k.iso([HEX_X[1] + 3, 12 * Math.cos(ph), AXIS_Z + 12 * Math.sin(ph)], P));
  }
  out.push({ kind: "cap", d: 1e6, svg: k.solidSvg(capPaths, { tone: "mid", crease: "lo" }) + k.dotsSvg(bolts, { size: 0.55 }) });
  return out.sort((p, q) => p.d - q.d);
}

/** The index pin, retracted into the housing face by `pull` (0 engaged, 1 out of the head). */
export function pinPaths(P, pull) {
  const F = G.frameAlong([HOUSING.x + HOUSING.w, 0, AXIS_Z - PIN_R], [1, 0, 0]);
  const reach = HEX_X[0] - (HOUSING.x + HOUSING.w) - 3;
  return G.solidOf([[0, 2.6], [reach * (1 - pull) + 4, 2.6], [reach * (1 - pull) + 5, 1.8]].map(([s, r]) => [s + 3, r]), F, P);
}

export const REST = { rot: 0, lit: 0, pull: 0 };

export function build(view = "landscape", pose = REST) {
  const P = projection(view);
  const W = VIEWS[view].width, H = VIEWS[view].height;
  const B = shop(P);
  const { at, S, Ln, Dots, box, cyl, disc } = B;

  for (const [x, y] of k.corners(BED, 18)) {
    cyl("base", "stand.flange", x, y, 6.4, -16, 1.6, { tone: "lo" }, { meta: { ground: true } });
    cyl("base", "stand.foot", x, y, 5, -14.4, 4.4, { tone: "mid" }, { meta: { ground: true } });
  }
  const slots = [-30, 0, 30].map((y) => ({ x: BED.x + 8, y: y - 2, w: BED.w - 16, d: 4, r: 1.6 }));
  const screws = k.corners(BED, 8);
  box("base", "stand.bed", BED, -10, 10, { tone: "mid" }, {
    steps: 8, bevel: 1.4, meta: { ground: true },
    extra: Ln(slots.map((s) => k.planOutline(s, 0, P, 3)).join(""), { tone: "lo" }) + Ln(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }) + Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }),
  });
  const strip = { x: -40, y: BED.y + BED.d - 11, w: 112, d: 6, r: 1 };
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [1.8, 3.4], P);
  box("base", "stand.ruler", strip, 0, 0.6, { tone: "lo", crease: "none" }, { meta: { ground: true }, extra: Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }) });

  // the drive housing: a cast box with a lid seam, ribs, a name plate and the drive lamp
  box("drive", "drive.housing", HOUSING, 0, 92, { tone: "mid" }, {
    bevel: 1.2, steps: 6,
    extra: Ln(k.sideSeam(HOUSING, 16, P, 6) + k.sideSeam(HOUSING, 80, P, 6), { tone: "faint" }) + Dots(k.corners(HOUSING, 5).map(([x, y]) => at([x, y, 92])), { size: 0.5 }),
  });
  const lid = k.insetPlan(HOUSING, 6);
  box("drive", "drive.lid", lid, 92, 4, { tone: "mid" }, { bevel: 0.6, extra: Ln(k.planOutline(k.insetPlan(lid, 3), 96, P, 4), { tone: "lo" }) });
  cyl("drive", "drive.lamp.body", lid.x + lid.w - 12, lid.y + 12, 4.6, 96, 3, { tone: "mid" });
  const lamp = k.cylinder(lid.x + lid.w - 12, lid.y + 12, 3.2, 99, 1.2, P, 24);
  B.put("drive", "drive.lamp.lens", [lid.x + lid.w - 12, lid.y + 12, 99.6], S(lamp, { tone: "hi" }) + `<path class="lf-lamp" data-lamp="drive" opacity="0" d="${lamp.top}"/>`, [B.R.solid(A.cylinder(lid.x + lid.w - 12, lid.y + 12, 3.2, 99, 1.2, { name: "drive.lamp.lens" }))]);
  // cooling slots on the front face: closed outlines in the face plane
  const vents = [0, 1, 2, 3].map((i) => {
    const x0 = HOUSING.x + 60, z0 = 22 + i * 7;
    return k.pathOf([[x0, z0], [x0 + 10, z0], [x0 + 10, z0 + 2.6], [x0, z0 + 2.6]].map(([x, z]) => k.iso([x, HOUSING.y + HOUSING.d, z], P)), true);
  }).join("");
  B.put("drive", "drive.vents", [HOUSING.x + 65, HOUSING.y + HOUSING.d, 32], Ln(vents, { tone: "lo" }), [B.R.solid(A.box([HOUSING.x + 60, HOUSING.y + HOUSING.d - 0.2, 22], [HOUSING.x + 70, HOUSING.y + HOUSING.d, 46.6], { name: "drive.vents" }))]);
  const plateF = G.frameOf([HOUSING.x + 18, HOUSING.y + HOUSING.d, 36], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  B.prism("drive", "drive.plate", plateF, [[0, 0], [36, 0], [36, 16], [0, 16]], 0, 0.8, { tone: "mid" }, {
    extra: Ln([4, 8, 12].map((z, i) => k.pathOf([k.iso([HOUSING.x + 22, HOUSING.y + HOUSING.d + 0.8, 36 + z], P), k.iso([HOUSING.x + 22 + [24, 18, 22][i], HOUSING.y + HOUSING.d + 0.8, 36 + z], P)])).join(""), { tone: "lo", free: true }),
  });
  // the spindle nose and the coupling that carries the key and the model: it never turns away
  const SF = G.frameAlong([HOUSING.x + HOUSING.w, 0, AXIS_Z], [1, 0, 0]);
  disc("drive", "drive.flange", SF, 0, 3, 17, { tone: "mid" }, { extra: Dots([0, 60, 120, 180, 240, 300].map((q) => at([HOUSING.x + HOUSING.w + 3, 14.5 * Math.cos(rad(q + 30)), AXIS_Z + 14.5 * Math.sin(rad(q + 30))])), { size: 0.5 }) });
  const gap = HEX_X[0] - (HOUSING.x + HOUSING.w);
  disc("drive", "drive.coupling", SF, 3, gap, 12, { tone: "hi", lit: true, crease: "lo" }, { extra: `<path class="lf-lamp" data-lamp="drive" opacity="0" d="${G.disc(3, gap, 12, SF, P).fill}"/>` });
  const pin = pinPaths(P, pose.pull);
  B.put("pin", "drive.pin", [HOUSING.x + HOUSING.w + 6, 0, AXIS_Z - PIN_R], `<g data-part="pin">${S(pin, { tone: "hi" })}</g>`, [B.R.solid(A.solid(G.frameAlong([HOUSING.x + HOUSING.w, 0, AXIS_Z - PIN_R], [1, 0, 0]), [[3, 2.6], [gap + 4, 2.6], [gap + 5, 1.8]], { name: "drive.pin", owner: "pin" }))]);

  const parts = headParts(P, pose.rot, pose);
  const X = G.frameOf([HEX_X[0], 0, AXIS_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const shapes = [B.R.solid(A.prism(X, parts.find((p) => p.kind === "hex").poly, 0, HEX_X[1] - HEX_X[0], { name: "head.hex", owner: "pin" }))];
  for (const p of parts.filter((q) => q.kind === "tool")) shapes.push(B.R.solid(A.solid(p.F, TOOL_PROFILES[p.name], { name: `head.tool.${p.name}` })));
  shapes.push(B.R.solid(A.solid(G.frameAlong([HEX_X[1], 0, AXIS_Z], [1, 0, 0]), [[0, 15], [3, 15], [3, 9], [6, 9], [6, 0]], { name: "head.cap" })));
  B.put("head", "head", [0, 0, AXIS_Z], `<g data-part="head">${parts.map((p) => p.svg).join("")}</g>`, shapes);

  const rows = layout(B.R, P, ["base", "drive", "pin", "head"]);
  return { P, W, H, B, rows };
}

export function figure(view = "landscape", pose = REST) {
  const { P, W, H, B, rows } = build(view, pose);
  const svg = figureMarkup({
    width: W, height: H, rows,
    label: "A turret head: a drive housing on a bed with a hexagonal turret on a horizontal spindle, six tool stations, an index pin, and a drive coupling that stays put while the head turns.",
  });
  return { P, W, H, svg, B };
}

export function liveSource() {
  return `const TURRET = (() => {
  const STATIONS = ${JSON.stringify(STATIONS)}, TOOL_PROFILES = ${JSON.stringify(TOOL_PROFILES)};
  const HOUSING = ${JSON.stringify(HOUSING)}, AXIS_Z = ${AXIS_Z}, HEX_X = ${JSON.stringify(HEX_X)}, HEX_R = ${HEX_R}, APOTHEM = ${APOTHEM}, PIN_R = ${PIN_R};
  const rad = ${rad.toString()};
  ${headParts.toString()}
  ${pinPaths.toString()}
  function mount(svg, P) {
    const head = svg.querySelector('[data-part="head"]');
    const pin = svg.querySelector('[data-part="pin"]');
    const lamps = [...svg.querySelectorAll("[data-lamp]")];
    let last = "";
    return {
      pose(s) {
        const lit = Math.round(s.lit ?? 0);
        const sig = [s.rot.toFixed(3), lit, (s.pull ?? 0).toFixed(3)].join();
        if (sig !== last) {
          last = sig;
          head.innerHTML = headParts(P, s.rot, { lit }).map((p) => p.svg).join("");
          pin.innerHTML = k.solidSvg(pinPaths(P, s.pull ?? 0), { tone: "hi" });
        }
        for (const lamp of lamps) lamp.setAttribute("opacity", (s["lamp:" + lamp.dataset.lamp] ?? 0).toFixed(3));
      },
    };
  }
  return { mount };
})();`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const view = process.argv.includes("--portrait") ? "portrait" : "landscape";
  const rot = Number(process.argv.find((a) => a.startsWith("--rot="))?.slice(6) ?? 0);
  const { B, P, svg } = figure(view, { ...REST, rot });
  if (process.argv.includes("--page")) {
    const out = path.join(path.dirname(new URL(import.meta.url).pathname), `../../.figures/turret-${view}-${rot}.html`);
    write(out, checkPage({ title: "Turret head", fig: "Fig. 3", svg, readout: `${B.R.items.length} items` }));
    console.log("wrote", out);
  }
  A.auditOrExit(B.R, P, { crowd: [] });
}
