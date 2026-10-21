// Fig. 4, the changeover drive. A flywheel on a vertical spindle is the agent's tool loop and
// must keep turning. A gearbox under it takes a horizontal input line; on that line a changeover
// unit (the plugin) is lowered down two guide pillars onto its mount, over the plain sleeve that
// otherwise couples the line straight through. Past the unit a drive dog faces a sled of three
// motors (the top tool-calling models) on two rails. When the motor in line stops, the sled
// slides the next live motor's hub into line and the wheel never stops.
//
//   node flywheel.mjs --audit [--portrait] [--pose=spin=37,sled=1,plug=0.5]
//   node flywheel.mjs --page [--portrait] [--pose=...]
import path from "node:path";
import { k, G, A, shop, layout, figureMarkup, checkPage, write } from "./shop.mjs";

const BENCH = { x: -148, y: -92, w: 270, d: 184, r: 8 };
const BENCH_H = 10;
export const AXIS_Z = 25;
// the flywheel on its gearbox
const WX = -100, WY = 0;
const GEARBOX = { x: -123, y: -23, w: 46, d: 46, r: 3 };
const GEAR_TOP = 40;
const RZ = [54, 62];
const R_IN = 34, R_OUT = 42, R_PEG = 38;
const HUB = { r: 10, z0: 52, z1: 66 };
const SPOKES = 6;
const SPOKE_Z = 58;
const SPOKE_S = [9.5, 34.5];
const SPOKE_POLY = [[-2, -1.2], [-1.2, -2], [1.2, -2], [2, -1.2], [2, 1.2], [1.2, 2], [-1.2, 2], [-2, 1.2]];
const CAP = { r: 6.5, z0: 66, z1: 68.4 };
// the input line along x at y = 0
const LINE = { boss: [-77, -74], l1: [-74, -60], pb1: [-60, -52], l2: [-52, -36], r1: [4, 12], pb2: [12, 20], r2: [20, 33.2], dog: [33.2, 39.2] };
const SHAFT_R = 3;
// the changeover unit and its mount
const UNIT = { x: -36, y: -13, w: 40, d: 26, r: 1.6 };
const MOUNT_TOP = 12;
const UNIT_TOP = 50;
export const LIFT = 40;
const PILLARS = [-31, -1];
const PILLAR_Y = -18, PILLAR_R = 2.4, PILLAR_TOP = 98;
const BUSH = [43, 50], BUSH_R = 5;
const KEY_AT = [-26, UNIT.y + UNIT.d, 36];
const LAMP_AT = [-8, UNIT.y + UNIT.d, 36];
// the motor sled
export const XH = 40;
export const PITCH = 32;
const RAILS_X = [56, 94];
const RAIL_Y = [-80, 80];
const SLED_TOP = 10;
const CAN = [13, 43], CAN_R = 11;
const BELL = [43, 52];
const bellR = (s) => CAN_R * Math.sqrt(Math.max(0, 1 - ((s - BELL[0]) / 10) ** 2));
const bellSlope = (s) => { const t = (s - BELL[0]) / 10; return (-CAN_R * t) / (10 * Math.sqrt(Math.max(1e-6, 1 - t * t))); };
const BELL_PROFILE = Array.from({ length: 13 }, (_, i) => { const s = BELL[0] + ((BELL[1] - BELL[0]) * i) / 12; return [s, bellR(s), 1]; });

export const VIEWS = {
  landscape: { width: 640, height: 330, azimuth: 44, elevation: 34, pad: 14 },
  portrait: { width: 600, height: 520, azimuth: 40, elevation: 38, pad: 22 },
};

export function projection(view) {
  const v = VIEWS[view];
  const pts = [...k.boxCorners(BENCH, -BENCH_H - 5, 0)];
  for (let a = 0; a < 360; a += 30) pts.push([WX + R_OUT * Math.cos((a * Math.PI) / 180), WY + R_OUT * Math.sin((a * Math.PI) / 180), RZ[1] + 6]);
  pts.push([UNIT.x, UNIT.y, UNIT_TOP + LIFT + 11], [UNIT.x + UNIT.w, UNIT.y + UNIT.d, UNIT_TOP + LIFT + 11], ...PILLARS.map((x) => [x, PILLAR_Y, PILLAR_TOP]));
  pts.push([XH, 2 * PITCH + 12, 46], [XH + 52, -2 * PITCH - 12, 46], [XH + 52, 2 * PITCH + 12, 46]);
  return k.fitProjection(pts, v.width, v.height, { pad: v.pad, azimuth: v.azimuth, elevation: v.elevation });
}

const rad = (d) => (d * Math.PI) / 180;
const motorY = (i, sled) => (sled - i) * PITCH;

/**
 * The parts of the flywheel that turn, at `spin` degrees: spokes on the far side of the hub,
 * spokes on the near side, and what rides on the rim top (ticks, the hub bolts, the marker peg).
 * Far spokes end on the back rim's inner wall, which faces the viewer, so they paint after the
 * rim; near spokes end on the front rim's inner wall, which faces away, so the rim is painted
 * again over them, clipped to its front half. Everything on top is above both.
 */
export function wheelParts(P, spin) {
  const V = G.viewOf(P);
  const t = k.towardViewer(P);
  const far = [], near = [], spokes = [];
  for (let j = 0; j < SPOKES; j++) {
    const th = rad(spin + (j * 360) / SPOKES + 30);
    const d = [Math.cos(th), Math.sin(th), 0];
    const F = G.frameOf([WX, WY, SPOKE_Z], d, [-Math.sin(th), Math.cos(th), 0], [0, 0, 1]);
    const mid = G.add3(F.o, G.mul3(d, (SPOKE_S[0] + SPOKE_S[1]) / 2));
    const entry = { depth: G.dot3(mid, V), svg: k.solidSvg(G.prismOf(F, SPOKE_POLY, SPOKE_S[0], SPOKE_S[1], P), { tone: "mid" }) };
    spokes.push(F);
    (d[0] * t[0] + d[1] * t[1] > 0 ? near : far).push(entry);
  }
  const bySvg = (list) => list.sort((a, b) => a.depth - b.depth).map((e) => e.svg).join("");
  const th = rad(spin);
  const ticks = k.radialTicks(WX, WY, R_OUT - 0.15, 72, 6, RZ[1], [1.6, 3.2], P, th + Math.PI / 2);
  const px = WX + R_PEG * Math.cos(th), py = WY + R_PEG * Math.sin(th);
  const bolts = [0, 1, 2, 3].map((q) => k.iso([WX + 4.2 * Math.cos(th + (q * Math.PI) / 2 + Math.PI / 4), WY + 4.2 * Math.sin(th + (q * Math.PI) / 2 + Math.PI / 4), CAP.z1], P));
  const top = k.lineSvg(ticks.minor, { tone: "lo" }) + k.lineSvg(ticks.major, { tone: "mid" })
    + k.dotsSvg(bolts, { size: 0.5 })
    + k.solidSvg(k.cylinder(px, py, 2.6, RZ[1], 1.2, P, 20), { tone: "mid" })
    + k.solidSvg(k.cylinder(px, py, 1.7, RZ[1] + 1.2, 4.6, P, 18), { tone: "hi", crease: "lo" })
    + k.lineSvg(k.ring(px, py, 0.8, RZ[1] + 5.8, P, 12), { tone: "lo" });
  return { far: bySvg(far), near: bySvg(near), top, spokes, peg: [px, py] };
}

/** The screen region of the rim's front half (the half facing the viewer), a little grown. */
function rimClip(P) {
  const t = k.towardViewer(P);
  const f = Math.atan2(t[1], t[0]);
  const at = (r, a, z) => k.iso([WX + r * Math.cos(a), WY + r * Math.sin(a), z], P);
  const pts = [];
  for (let i = 0; i <= 48; i++) { const p = at(R_IN, f - Math.PI / 2 + (Math.PI * i) / 48, RZ[1]); pts.push([p[0], p[1] - 0.9]); }
  const e1 = at(R_OUT, f + Math.PI / 2, RZ[1]);
  pts.push([e1[0] + (e1[0] > pts[0][0] ? 0.9 : -0.9), e1[1] - 0.9]);
  for (let i = 0; i <= 48; i++) { const p = at(R_OUT + 0.6, f + Math.PI / 2 - (Math.PI * i) / 48, RZ[0]); pts.push([p[0], p[1] + 0.9]); }
  const e0 = at(R_OUT, f - Math.PI / 2, RZ[1]);
  pts.push([e0[0] + (e0[0] > e1[0] ? 0.9 : -0.9), e0[1] - 0.9]);
  return k.pathOf(pts, true);
}

/** The key's bar on the unit face, turned by `turn` (0 upright, 1 a quarter turn), the unit up by `lift`. */
export function keyPaths(P, turn, lift) {
  const F = G.frameAlong([KEY_AT[0], KEY_AT[1], KEY_AT[2] + lift], [0, 1, 0]);
  const a = (turn * Math.PI) / 2;
  const c = Math.cos(a), s = Math.sin(a);
  const rect = [[-1, -4.6], [1, -4.6], [1, 4.6], [-1, 4.6]].map(([u, v]) => [u * c - v * s, u * s + v * c]);
  return { bar: G.prismOf(F, rect, 3.2, 10.4, P), neck: G.disc(2.6, 3.2, 1.6, F, P), F, rect };
}

/**
 * A guide pillar in two pieces round its bushing, which rides the unit up by `lift`: below the
 * bushing (from the mount) and above it (to the chamfered top). `drop` shifts the drawing down,
 * for a piece drawn inside the unit's row, which the live code moves up by the lift.
 */
export function pillarPaths(P, j, part, lift, drop = 0) {
  const F = G.frameAlong([PILLARS[j], PILLAR_Y, -drop], [0, 0, 1]);
  if (part === "below") return { paths: G.disc(MOUNT_TOP, BUSH[0] + lift, PILLAR_R, F, P), F, profile: [[MOUNT_TOP, PILLAR_R], [BUSH[0] + lift, PILLAR_R]] };
  const profile = [[BUSH[1] + lift, PILLAR_R], [PILLAR_TOP - 1, PILLAR_R], [PILLAR_TOP, PILLAR_R - 0.8]];
  return { paths: G.solidOf(profile, F, P), F, profile };
}
const pillarSvg = (paths) => k.solidSvg(paths, { tone: "mid", crease: "faint" });

export const REST = { spin: 0, sled: 0, plug: 1, key: 1, lit: 0, "lamp:m0": 0, "lamp:m1": 0, "lamp:m2": 0, "lamp:plug": 0 };

export function build(view = "landscape", given = REST) {
  const pose = { ...REST, ...given };
  const P = projection(view);
  const W = VIEWS[view].width, H = VIEWS[view].height;
  const B = shop(P);
  const { at, S, Ln, Dots, box, cyl, disc, prism } = B;
  const L = (1 - pose.plug) * LIFT;
  const lit = Math.round(pose.lit);

  // the bench on its feet, with a label plate and the sled's index ruler
  for (const [x, y] of k.corners(BENCH, 20)) {
    cyl("base", "stand.flange", x, y, 7, -BENCH_H - 5, 1.6, { tone: "lo" }, { meta: { ground: true } });
    cyl("base", "stand.foot", x, y, 5.4, -BENCH_H - 3.4, 3.4, { tone: "mid" }, { meta: { ground: true } });
  }
  const screws = k.corners(BENCH, 10);
  box("base", "stand.bench", BENCH, -BENCH_H, BENCH_H, { tone: "mid" }, {
    steps: 8, bevel: 1.6, meta: { ground: true },
    extra: Ln(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" })
      + Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" })
      + Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 })
      + Ln([48, 60].map((y) => k.planOutline({ x: -136, y: y - 2, w: 176, d: 4, r: 1.6 }, 0, P, 3)).join(""), { tone: "lo" }),
  });
  const label = { x: -124, y: 70, w: 44, d: 12, r: 1.2 };
  box("base", "stand.label", label, 0, 0.8, { tone: "mid" }, {
    meta: { ground: true },
    extra: Ln(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" })
      + [0, 1, 2].map((i) => Ln(k.lineOnTop([label.x + 5, label.y + 3 + i * 2.8], [label.x + 5 + [30, 21, 26][i], label.y + 3 + i * 2.8], 0.8, P), { tone: "lo", free: true })).join("")
      + Dots([at([label.x + 2.4, label.y + label.d / 2, 0.8]), at([label.x + label.w - 2.4, label.y + label.d / 2, 0.8])], { size: 0.45 }),
  });
  const ruler = { x: 108, y: -40, w: 7, d: 80, r: 1 };
  const ticks = k.topTicks(-36, 36, 4, 4, ruler.x + 0.8, 0.6, [1.8, 3.4], P, "y");
  box("base", "stand.ruler", ruler, 0, 0.6, { tone: "lo", crease: "none" }, {
    meta: { ground: true },
    extra: Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }) + Dots([at([ruler.x + 3.5, ruler.y + 2, 0.6]), at([ruler.x + 3.5, ruler.y + ruler.d - 2, 0.6])], { size: 0.45 }),
  });

  // the gearbox, its bearing housing and spindle
  box("base", "gear.box", GEARBOX, 0, GEAR_TOP, { tone: "mid" }, {
    bevel: 1, steps: 6, inner: Ln(k.sideSeam(GEARBOX, 6, P, 6) + k.sideSeam(GEARBOX, 34, P, 6), { tone: "faint" }),
    extra: Dots(k.corners(GEARBOX, 4).map(([x, y]) => at([x, y, GEAR_TOP])), { size: 0.5 }),
  });
  const glassF = G.frameAlong([-110, GEARBOX.y + GEARBOX.d, 14], [0, 1, 0]);
  disc("base", "gear.glass", glassF, 0, 1.6, 4.2, { tone: "mid" }, { extra: Ln(G.circleOf(glassF, 1.6, 2.6, P), { tone: "lo" }) });
  const bossF = G.frameAlong([LINE.boss[0], 0, AXIS_Z], [1, 0, 0]);
  disc("base", "gear.boss", bossF, 0, LINE.boss[1] - LINE.boss[0], 6.5, { tone: "mid" }, { extra: Dots(G.dotsOf(bossF, 3, 5, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.45 }) });
  cyl("base", "gear.flange", WX, WY, 17, GEAR_TOP, 2, { tone: "mid" }, {
    steps: 64, extra: Dots([0, 1, 2, 3, 4, 5].map((q) => at([WX + 14.5 * Math.cos(rad(q * 60 + 15)), WY + 14.5 * Math.sin(rad(q * 60 + 15)), GEAR_TOP + 2])), { size: 0.5 }),
  });
  cyl("base", "gear.housing", WX, WY, 12, GEAR_TOP + 2, 8, { tone: "mid" }, { steps: 48, inner: Ln(k.sideArc(WX, WY, 12, GEAR_TOP + 6, P, 32), { tone: "faint" }) });
  cyl("base", "gear.spindle", WX, WY, 4, GEAR_TOP + 10, HUB.z0 - GEAR_TOP - 10, { tone: "mid", crease: "none" }, { steps: 20 });

  // the flywheel: one item whose turning parts the live code redraws
  const Fz = G.frameAlong([WX, WY, 0], [0, 0, 1]);
  const rim = S(G.ringBand(RZ[0], RZ[1], R_IN, R_OUT, Fz, P, { hole: [RZ[1], R_IN] }), { tone: "mid" }).replace('class="iso-fill"', 'class="iso-fill" fill-rule="evenodd"');
  const hub = S(k.cylinder(WX, WY, HUB.r, HUB.z0, HUB.z1 - HUB.z0, P, 40), { tone: "mid", inner: Ln(k.sideArc(WX, WY, HUB.r, HUB.z0 + 4, P, 28), { tone: "faint" }) })
    + S(k.cylinder(WX, WY, CAP.r, CAP.z0, CAP.z1 - CAP.z0, P, 32), { tone: "mid", inner: Ln(k.knurl(WX, WY, CAP.r, CAP.z0, CAP.z1, 30, P), { tone: "lo" }) });
  const clipId = `flywheel-rim-${view}`;
  const wp = wheelParts(P, pose.spin);
  const wheelSvg = `<g data-part="wheel"><clipPath id="${clipId}"><path d="${rimClip(P)}"/></clipPath>${rim}<g data-wheel="far">${wp.far}</g>${hub}<g data-wheel="near">${wp.near}</g><g clip-path="url(#${clipId})">${rim}</g><g data-wheel="top">${wp.top}</g></g>`;
  const own = { owner: "wheel" };
  B.put("base", "wheel", [WX, WY, 60], wheelSvg, [
    B.R.solid(A.ring(Fz, RZ[0], RZ[1], R_IN, R_OUT, { name: "wheel.rim", ...own })),
    B.R.solid(A.cylinder(WX, WY, HUB.r, HUB.z0, HUB.z1 - HUB.z0, { name: "wheel.hub", ...own })),
    B.R.solid(A.cylinder(WX, WY, CAP.r, CAP.z0, CAP.z1 - CAP.z0, { name: "wheel.cap", ...own })),
    ...wp.spokes.map((F, j) => B.R.solid(A.prism(F, SPOKE_POLY, SPOKE_S[0], SPOKE_S[1], { name: `wheel.spoke${j}`, ...own }))),
    B.R.solid(A.cylinder(wp.peg[0], wp.peg[1], 2.6, RZ[1], 1.2, { name: "wheel.peg.collar", ...own })),
    B.R.solid(A.cylinder(wp.peg[0], wp.peg[1], 1.7, RZ[1] + 1.2, 4.6, { name: "wheel.peg", ...own })),
  ]);

  // the input line: shaft, pillow block, shaft, then the mount, its pillars and the plain sleeve
  const LF = G.frameAlong([0, 0, AXIS_Z], [1, 0, 0]);
  const shaft = (row, name, [s0, s1]) => disc(row, name, LF, s0, s1, SHAFT_R, { tone: "hi", crease: "none" });
  const pillow = (row, name, [x0, x1]) => {
    const plan = { x: x0, y: -8, w: x1 - x0, d: 16, r: 1.2 };
    box(row, name, plan, 0, 31, { tone: "mid" }, {
      bevel: 0.6, inner: Ln(k.sideSeam(plan, AXIS_Z + 4.5, P, 3), { tone: "faint" }),
      extra: Dots([at([(x0 + x1) / 2, -5, 31]), at([(x0 + x1) / 2, 5, 31])], { size: 0.5 }) + Ln(k.ring((x0 + x1) / 2, 0, 1.3, 31, P, 14), { tone: "lo" }),
    });
  };
  shaft("base", "line.shaft", LINE.l1);
  pillow("base", "line.pillow", LINE.pb1);
  shaft("base", "line.shaft", LINE.l2);
  const MOUNT = { x: UNIT.x - 4, y: -24, w: UNIT.w + 8, d: 41, r: 2 };
  const ms = [[MOUNT.x + 3, MOUNT.y + 3], [MOUNT.x + MOUNT.w - 3, MOUNT.y + 3], [MOUNT.x + 3, MOUNT.y + MOUNT.d - 3], [MOUNT.x + MOUNT.w - 3, MOUNT.y + MOUNT.d - 3]];
  box("base", "line.mount", MOUNT, 0, MOUNT_TOP, { tone: "mid" }, {
    bevel: 0.8, steps: 4, inner: Ln(k.sideSeam(MOUNT, 4, P, 4), { tone: "faint" }),
    extra: Ln(ms.map(([x, y]) => k.ring(x, y, 1.6, MOUNT_TOP, P, 14)).join(""), { tone: "lo" }) + Dots(ms.map(([x, y]) => at([x, y, MOUNT_TOP])), { size: 0.45 }),
  });
  disc("base", "line.sleeve", LF, UNIT.x, UNIT.x + UNIT.w, 5, { tone: "mid" }, {
    inner: Ln(G.arcOf(LF, UNIT.x + 5, 5, P) + G.arcOf(LF, UNIT.x + UNIT.w - 5, 5, P), { tone: "faint" }),
    extra: Dots([at([UNIT.x + 9, 0, AXIS_Z + 5]), at([UNIT.x + UNIT.w - 9, 0, AXIS_Z + 5])], { size: 0.5 }),
    meta: { owner: "unit.body" },
  });
  PILLARS.forEach((x, j) => {
    const pb = pillarPaths(P, j, "below", L);
    B.put("base", "unit.pillar.below", [x, PILLAR_Y, 20], `<g data-pillar="below${j}">${pillarSvg(pb.paths)}</g>`, [B.R.solid(A.solid(pb.F, pb.profile, { name: `unit.pillar.below${j}` }))]);
  });

  // the changeover unit, built where the pose puts it; the live code lifts the whole row
  const U0 = MOUNT_TOP + L, U1 = UNIT_TOP + L;
  const slot = [];
  slot.push([UNIT.x + UNIT.w, -3.4, U0], [UNIT.x + UNIT.w, -3.4, AXIS_Z + L]);
  for (let i = 1; i <= 16; i++) { const a = Math.PI - (Math.PI * i) / 16; slot.push([UNIT.x + UNIT.w, 3.4 * Math.cos(a), AXIS_Z + L + 3.4 * Math.sin(a)]); }
  slot.push([UNIT.x + UNIT.w, 3.4, U0]);
  box("unit", "unit.body", UNIT, U0, UNIT_TOP - MOUNT_TOP, { tone: "mid" }, {
    bevel: 0.8, steps: 4,
    inner: Ln(k.sideSeam(UNIT, U1 - 6, P, 4), { tone: "faint" }) + Ln(k.pathOf(slot.map((p) => at(p))), { tone: "lo" }),
  });
  const LID = k.insetPlan(UNIT, 2);
  const ls = k.corners(LID, 2.6);
  box("unit", "unit.lid", LID, U1, 2.4, { tone: "mid" }, {
    bevel: 0.5, steps: 4,
    extra: Ln(k.planOutline(k.insetPlan(LID, 4), U1 + 2.4, P, 3), { tone: "faint" }) + Dots(ls.map(([x, y]) => at([x, y, U1 + 2.4])), { size: 0.45 }),
  });
  for (const x of [-26, -6]) cyl("unit", "unit.handle.post", x, 0, 1.8, U1 + 2.4, 5.6, { tone: "mid", crease: "none" }, { steps: 16 });
  box("unit", "unit.handle.bar", { x: -28.2, y: -1.8, w: 24.4, d: 3.6, r: 1.4 }, U1 + 8, 2.6, { tone: "mid" }, { steps: 4 });
  PILLARS.forEach((x, j) => {
    const F = G.frameAlong([x, PILLAR_Y, 0], [0, 0, 1]);
    const ring = S(G.ringBand(BUSH[0] + L, BUSH[1] + L, PILLAR_R, BUSH_R, F, P, { hole: [BUSH[1] + L, PILLAR_R] }), { tone: "mid" }).replace('class="iso-fill"', 'class="iso-fill" fill-rule="evenodd"');
    B.put("unit", "unit.bushing", [x, PILLAR_Y, BUSH[0] + L + 3.5], ring, [B.R.solid(A.ring(F, BUSH[0] + L, BUSH[1] + L, PILLAR_R, BUSH_R, { name: `unit.bushing${j}` }))]);
    const pa = pillarPaths(P, j, "above", L);
    B.put("unit", "unit.pillar.above", [x, PILLAR_Y, BUSH[1] + L + 4], `<g data-pillar="above${j}">${pillarSvg(pa.paths)}</g>`, [B.R.solid(A.solid(pa.F, pa.profile, { name: `unit.pillar.above${j}` }))]);
  });
  const KF = G.frameAlong([KEY_AT[0], KEY_AT[1], KEY_AT[2] + L], [0, 1, 0]);
  disc("unit", "unit.key.bezel", KF, 0, 1.6, 5, { tone: "mid" });
  disc("unit", "unit.key.plug", KF, 1.6, 2.6, 3.8, { tone: "hi", crease: "lo" });
  const KEY = keyPaths(P, pose.key, L);
  B.put("unit", "unit.key", [KEY_AT[0], KEY_AT[1] + 6, KEY_AT[2] + L], `<g data-part="key">${S(KEY.neck, { tone: "hi" })}${S(KEY.bar, { tone: "hi", crease: "lo" })}</g>`, [
    B.R.solid(A.disc(KF, 2.6, 3.2, 1.6, { name: "unit.key.neck" })),
    B.R.solid(A.prism(KF, KEY.rect, 3.2, 10.4, { name: "unit.key.bar" })),
  ]);
  const LMF = G.frameAlong([LAMP_AT[0], LAMP_AT[1], LAMP_AT[2] + L], [0, 1, 0]);
  disc("unit", "unit.lamp.body", LMF, 0, 1.8, 4.2, { tone: "mid" });
  const lens = G.disc(1.8, 2.6, 2.8, LMF, P);
  B.put("unit", "unit.lamp.lens", [LAMP_AT[0], LAMP_AT[1] + 2.2, LAMP_AT[2] + L], S(lens, { tone: "hi" }) + `<path class="lf-lamp" data-lamp="plug" opacity="${(pose["lamp:plug"] ?? 0).toFixed(3)}" d="${lens.fill}"/>`, [B.R.solid(A.disc(LMF, 1.8, 2.6, 2.8, { name: "unit.lamp.lens" }))]);
  const PL = { x0: -33, z0: 17 + L, w: 28, h: 9 };
  const plateF = G.frameOf([PL.x0, UNIT.y + UNIT.d, PL.z0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const yf = UNIT.y + UNIT.d + 0.8;
  prism("unit", "unit.plate", plateF, [[0, 0], [PL.w, 0], [PL.w, PL.h], [0, PL.h]], 0, 0.8, { tone: "mid" }, {
    extra: Ln([6.4, 4.4, 2.4].map((z, i) => k.pathOf([at([PL.x0 + 3.5, yf, PL.z0 + z]), at([PL.x0 + 3.5 + [20, 13, 17][i], yf, PL.z0 + z])])).join(""), { tone: "lo", free: true })
      + Dots([at([PL.x0 + 1.6, yf, PL.z0 + PL.h / 2]), at([PL.x0 + PL.w - 1.6, yf, PL.z0 + PL.h / 2])], { size: 0.4 }),
  });

  // past the unit: shaft, pillow block, shaft and the drive dog the motor hub lines up with
  shaft("linefront", "line.shaft", LINE.r1);
  pillow("linefront", "line.pillow", LINE.pb2);
  shaft("linefront", "line.shaft", LINE.r2);
  const dogF = G.frameAlong([LINE.dog[0], 0, AXIS_Z], [1, 0, 0]);
  disc("linefront", "line.dog", dogF, 0, LINE.dog[1] - LINE.dog[0], 8.6, { tone: "mid" }, {
    inner: Ln(G.arcOf(dogF, 2.2, 8.6, P), { tone: "faint" }),
  });

  // the rails, their end stops (the back pair here, the front pair after the sled)
  for (const x of RAILS_X) {
    box("rails", "rail", { x: x - 2, y: RAIL_Y[0], w: 4, d: RAIL_Y[1] - RAIL_Y[0], r: 0.6 }, 0, 3, { tone: "mid", crease: "lo" }, {
      steps: 2, extra: Dots([-76, -38, 0, 38, 76].map((y) => at([x, y, 3])), { size: 0.4 }),
    });
    box("rails", "rail.stop", { x: x - 4, y: RAIL_Y[0] - 4, w: 8, d: 4, r: 0.8 }, 0, 8, { tone: "mid" }, { extra: Dots([at([x, RAIL_Y[0] - 2, 8])], { size: 0.45 }) });
    box("front", "rail.stop", { x: x - 4, y: RAIL_Y[1], w: 8, d: 4, r: 0.8 }, 0, 8, { tone: "mid" }, { extra: Dots([at([x, RAIL_Y[1] + 2, 8])], { size: 0.45 }) });
  }

  // the sled and its three motors, built where the pose puts it; the live code slides the row
  const sl = pose.sled;
  const PLATE = { x: 46, y: (sl - 2) * PITCH - 14, w: 58, d: 2 * PITCH + 28, r: 2 };
  for (const x of RAILS_X) box("sled", "sled.shoe", { x: x - 3.5, y: PLATE.y + 3, w: 7, d: PLATE.d - 6, r: 1 }, 3, 3.4, { tone: "lo" }, { steps: 3 });
  box("sled", "sled.plate", PLATE, 6.4, SLED_TOP - 6.4, { tone: "mid" }, {
    bevel: 0.6, steps: 4,
    extra: Dots(k.corners(PLATE, 3.5).map(([x, y]) => at([x, y, SLED_TOP])), { size: 0.45 }),
  });
  const yp = motorY(1, sl);
  box("sled", "sled.pointer", { x: PLATE.x + PLATE.w, y: yp - 1.2, w: 6, d: 2.4, r: 0.4 }, 1.6, SLED_TOP - 1.6, { tone: "mid" }, { steps: 2 });
  for (let i = 0; i < 3; i++) {
    const y = motorY(i, sl);
    const mo = { owner: `motor${i}` };
    const F = G.frameAlong([XH, y, AXIS_Z], [1, 0, 0]);
    for (const s of [17, 34]) box("sled", `motor${i}.foot`, { x: XH + s, y: y - 9, w: 5, d: 18, r: 0.8 }, SLED_TOP, 6, { tone: "mid" }, { steps: 3, meta: mo });
    disc("sled", `motor${i}.hub`, F, 0, 6, 7, { tone: "mid" }, { meta: mo, inner: Ln(G.arcOf(F, 3, 7, P), { tone: "faint" }) });
    disc("sled", `motor${i}.shaft`, F, 6, 10, 2.4, { tone: "hi", crease: "none" }, { meta: mo });
    disc("sled", `motor${i}.shield`, F, 10, CAN[0], 12.4, { tone: "mid" }, { meta: mo, extra: Dots(G.dotsOf(F, CAN[0], 11.7, 10, P, { fade: [0.04, 0.42] }), { size: 0.45 }) });
    const ribs = G.ribsOf(F, CAN[0], CAN[1], CAN_R, 44, P, { fade: [0.1, 0.55] });
    const can = G.disc(CAN[0], CAN[1], CAN_R, F, P);
    B.put("sled", `motor${i}.can`, G.add3(F.o, G.mul3(F.a, (CAN[0] + CAN[1]) / 2)), `<g data-can="${i}">${S(can, { tone: "mid", lit: lit === i, inner: k.fadedSvg(ribs, { tone: "lo" }) })}</g>`, [B.R.solid(A.disc(F, CAN[0], CAN[1], CAN_R, { name: `motor${i}.can`, ...mo }))]);
    const bell = G.solidOf(BELL_PROFILE, F, P, { smooth: { slope: bellSlope, radius: bellR } });
    B.put("sled", `motor${i}.bell`, G.add3(F.o, G.mul3(F.a, 46)), S(bell, { tone: "mid", crease: "lo" }), [B.R.solid(A.solid(F, BELL_PROFILE, { radius: bellR, name: `motor${i}.bell`, ...mo }))]);
    const TB = { x: XH + 22, y: y - 3.5, w: 12, d: 7, r: 1 };
    box("sled", `motor${i}.box`, TB, 35.6, 7, { tone: "mid" }, {
      steps: 3, bevel: 0.4, meta: mo, inner: Ln(k.sideSeam(TB, 41, P, 3), { tone: "faint" }),
      extra: Dots([at([TB.x + 2, TB.y + 2, 42.6]), at([TB.x + TB.w - 2, TB.y + TB.d - 2, 42.6])], { size: 0.4 }),
    });
    const glandF = G.frameAlong([XH + 31, y + 3.5, 38.8], [0, 1, 0]);
    disc("sled", `motor${i}.gland`, glandF, 0, 2, 1.5, { tone: "mid" }, { meta: mo, extra: Ln(G.circleOf(glandF, 2, 0.7, P), { tone: "lo" }) });
    const lx = XH + 27, lz = 42.6;
    const lensTop = k.cylinder(lx, y, 1.7, lz + 1.4, 0.8, P, 20);
    B.put("sled", `motor${i}.lamp`, [lx, y, lz + 1.4], S(k.cylinder(lx, y, 2.5, lz, 1.4, P, 22), { tone: "mid" }) + S(lensTop, { tone: "hi" })
      + `<path class="lf-lamp" data-lamp="m${i}" opacity="${(pose[`lamp:m${i}`] ?? 0).toFixed(3)}" d="${lensTop.top}"/>`, [
      B.R.solid(A.cylinder(lx, y, 2.5, lz, 1.4, { name: `motor${i}.lamp.body`, ...mo })),
      B.R.solid(A.cylinder(lx, y, 1.7, lz + 1.4, 0.8, { name: `motor${i}.lamp.lens`, ...mo })),
    ]);
  }

  const rows = layout(B.R, P, ROWS);
  return { P, W, H, B, rows };
}

export const ROWS = ["base", "unit", "linefront", "rails", "sled", "front"];

export function figure(view = "landscape", pose = REST) {
  const { P, W, H, B, rows } = build(view, pose);
  const svg = figureMarkup({
    width: W, height: H, rows,
    label: "A changeover drive: a flywheel on a gearbox driven along a shaft line through a changeover unit that lowers down two guide pillars onto its mount, from a sled of three motors on rails that slides the next running motor into line when the one driving stops.",
  });
  return { P, W, H, svg, B, rows };
}

/** The live code a frame runs: `FLYWHEEL.mount(svg, P).pose(state)`. A pure function of the state. */
export function liveSource() {
  return `const FLYWHEEL = (() => {
  const WX = ${WX}, WY = ${WY}, R_IN = ${R_IN}, R_OUT = ${R_OUT}, R_PEG = ${R_PEG}, RZ = ${JSON.stringify(RZ)}, SPOKES = ${SPOKES}, SPOKE_Z = ${SPOKE_Z};
  const SPOKE_S = ${JSON.stringify(SPOKE_S)}, SPOKE_POLY = ${JSON.stringify(SPOKE_POLY)}, CAP = ${JSON.stringify(CAP)};
  const KEY_AT = ${JSON.stringify(KEY_AT)}, PILLARS = ${JSON.stringify(PILLARS)}, PILLAR_Y = ${PILLAR_Y}, PILLAR_R = ${PILLAR_R}, PILLAR_TOP = ${PILLAR_TOP};
  const BUSH = ${JSON.stringify(BUSH)}, MOUNT_TOP = ${MOUNT_TOP}, LIFT = ${LIFT}, PITCH = ${PITCH};
  const REST = ${JSON.stringify(REST)};
  const rad = ${rad.toString()};
  const pillarSvg = ${pillarSvg.toString()};
  ${wheelParts.toString()}
  ${keyPaths.toString()}
  ${pillarPaths.toString()}
  function mount(svg, P) {
    const rows = {};
    svg.querySelectorAll("[data-row]").forEach((g) => { rows[g.dataset.row] = g; });
    const wheel = {};
    svg.querySelectorAll("[data-wheel]").forEach((g) => { wheel[g.dataset.wheel] = g; });
    const keyG = svg.querySelector('[data-part="key"]');
    const pillars = [...svg.querySelectorAll("[data-pillar]")];
    const cans = [...svg.querySelectorAll("[data-can]")].map((g) => [Number(g.dataset.can), g.firstElementChild]);
    const lamps = [...svg.querySelectorAll("[data-lamp]")];
    const last = {};
    const changed = (name, sig) => (last[name] === sig ? false : ((last[name] = sig), true));
    return {
      pose(given) {
        const s = { ...REST, ...given };
        const spin = s.spin.toFixed(3);
        if (changed("spin", spin)) {
          const w = wheelParts(P, s.spin);
          wheel.far.innerHTML = w.far;
          wheel.near.innerHTML = w.near;
          wheel.top.innerHTML = w.top;
        }
        const lift = (1 - Math.min(1, Math.max(0, s.plug))) * LIFT;
        if (changed("plug", lift.toFixed(3))) {
          rows.unit.setAttribute("transform", k.translateAlong(P, [0, 0, lift]));
          for (const g of pillars) {
            const part = g.dataset.pillar.slice(0, -1), j = Number(g.dataset.pillar.slice(-1));
            g.innerHTML = pillarSvg(pillarPaths(P, j, part, lift, part === "above" ? lift : 0).paths);
          }
        }
        if (changed("key", s.key.toFixed(3))) {
          const kp = keyPaths(P, s.key, 0);
          keyG.innerHTML = k.solidSvg(kp.neck, { tone: "hi" }) + k.solidSvg(kp.bar, { tone: "hi", crease: "lo" });
        }
        if (changed("sled", s.sled.toFixed(3))) rows.sled.setAttribute("transform", k.translateAlong(P, [0, s.sled * PITCH, 0]));
        const lit = Math.round(s.lit);
        if (changed("lit", String(lit))) cans.forEach(([i, c]) => (i === lit ? c.setAttribute("data-lit", "") : c.removeAttribute("data-lit")));
        for (const lamp of lamps) lamp.setAttribute("opacity", (s["lamp:" + lamp.dataset.lamp] ?? 0).toFixed(3));
      },
    };
  }
  return { mount };
})();`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const view = process.argv.includes("--portrait") ? "portrait" : "landscape";
  const poseArg = process.argv.find((a) => a.startsWith("--pose="))?.slice(7);
  const pose = { ...REST, ...(poseArg ? Object.fromEntries(poseArg.split(",").map((kv) => kv.split("=")).map(([key, v]) => [key, Number(v)])) : {}) };
  const { B, P, svg } = figure(view, pose);
  if (process.argv.includes("--page")) {
    const tag = poseArg ? "-" + poseArg.replace(/[=,:]/g, "") : "";
    const out = path.join(path.dirname(new URL(import.meta.url).pathname), `../../.figures/flywheel-${view}${tag}.html`);
    write(out, checkPage({ title: "Changeover drive", fig: "Fig. 4", svg, readout: `${B.R.items.length} parts` }));
    console.log("wrote", out, B.R.items.length, "items");
  }
  if (process.argv.includes("--audit")) {
    // The live code keeps the painter's order of the rest build and only moves rows, so judge
    // this pose's geometry in that order: every item takes its rank in the rest build.
    const rank = new Map(build(view, REST).rows.flatMap(({ items }) => items).map((item, index) => [item.name, index]));
    for (const item of B.R.items) {
      if (!rank.has(item.name)) throw new Error(`${item.name} has no place in the rest order`);
      item.key = rank.get(item.name);
    }
  }
  A.auditOrExit(B.R, P, { crowd: [] });
}
