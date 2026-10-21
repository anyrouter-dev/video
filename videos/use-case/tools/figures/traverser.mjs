// Fig. 1, the transfer table. One entry track with a key switch, a bridge that slides on rails
// across the bed to line its track up with one of six exits, and a request car that rides
// across. The bridge stopping at an exit is a model id choosing a route; the car coming back
// from a dark lamp and going out again is failover.
//
//   node traverser.mjs --audit [--portrait]     audit the geometry (exits non-zero on a fault)
//   node traverser.mjs --page [--portrait]      write the check page to ../../.figures/
import path from "node:path";
import { k, G, A, shop, layout, figureMarkup, checkPage, write } from "./shop.mjs";

export const EXITS = [-75, -45, -15, 15, 45, 75];
export const ENTRY_Y = 0;
const PLINTH_H = 12;
const SLEEPER_H = 1.4;
const RAIL_H = 2.8;
export const TRACK_Z = PLINTH_H + SLEEPER_H + RAIL_H;
const GAUGE = 6.5;
const DECK = { x: -238, y: -106, w: 476, d: 212, r: 10 };
const DECK_H = 10;
const FOOT_H = 5;
const ENTRY = { x: -228, y: -13, w: 120, d: 26, r: 2 };
const BRIDGE = { x: -106, y: -17, w: 104, d: 34, r: 2.5 };
const BRIDGE_Z = 8.2;
const TRAV_RAILS = [-95, -13];
const WHEEL_R = 2.6;
const WHEEL_YS = [-11, 11];
const SCREW_X = -55;
const SCREW_Z = 3.2;
const SCREW_R = 1.8;
const SCREW_Y = [-90, 92];
const EXIT_X = [0, 184];
const STAND = { x: -216, y: -46, w: 30, d: 18, r: 2 };
const STAND_H = 34;
export const LOCK = [-201, STAND.y + STAND.d, 21];
export const CAR_HOME = -200;
export const CAR_STOP = EXIT_X[1] - 3.2 - 12;
export const LAMP_ENTRY = [-118, -24];

export const VIEWS = {
  landscape: { width: 640, height: 330, azimuth: 56, elevation: 36, pad: 8 },
  portrait: { width: 600, height: 520, azimuth: 36, elevation: 34, pad: 18 },
};

export function projection(view) {
  const v = VIEWS[view];
  const pts = [...k.boxCorners(DECK, -DECK_H - FOOT_H, 0), [STAND.x, STAND.y, 40], [LAMP_ENTRY[0], LAMP_ENTRY[1], 52], [CAR_STOP, 75, 40], [CAR_HOME, 0, 40]];
  return k.fitProjection(pts, v.width, v.height, { pad: v.pad, azimuth: v.azimuth, elevation: v.elevation });
}

const sleepersAlong = (x0, x1, step) => {
  const out = [];
  for (let x = x0; x <= x1 + 1e-6; x += step) out.push(x);
  return out;
};

/** The key's bar, turned by `turn` (0 upright, 1 a quarter turn), as kit paths. */
export function keyPaths(P, turn) {
  const F = G.frameAlong([LOCK[0], LOCK[1], LOCK[2]], [0, 1, 0]);
  const a = (turn * Math.PI) / 2;
  const c = Math.cos(a), s = Math.sin(a);
  const rect = [[-1, -4.6], [1, -4.6], [1, 4.6], [-1, 4.6]].map(([u, v]) => [u * c - v * s, u * s + v * c]);
  const bar = G.prismOf(F, rect, 3.2, 10.4, P);
  const neck = G.disc(2.6, 3.2, 1.6, F, P);
  return { bar, neck };
}

/** Where the moving rows sit: the bridge at y = `yc`, the car's centre at x = `carX`. */
export const REST = { yc: ENTRY_Y, carX: CAR_HOME };
export const carY = (pose) => (pose.carX + 12 <= ENTRY.x + ENTRY.w ? ENTRY_Y : pose.yc);

/**
 * The rows back to front for a pose. Planes of constant x separate the entry, the bridge and the
 * exits, and the viewer looks from +x, so those always draw in that order; planes of constant y
 * separate the exits from each other. The car draws after whatever it stands on, and before the
 * buffer block of its exit, which is nearer than the car on any ray they share.
 */
export function rowOrder(pose) {
  const rows = ["base", "stand", "entry"];
  const front = pose.carX + 12, back = pose.carX - 12;
  const onEntry = front <= ENTRY.x + ENTRY.w;
  const onExit = front > EXIT_X[0];
  const exitAt = EXITS.findIndex((y) => Math.abs(y - pose.yc) < 0.5);
  if (onEntry) rows.push("car");
  rows.push("bridge");
  if (!onEntry && !onExit) rows.push("car");
  EXITS.forEach((_, i) => {
    rows.push(`exit${i}`);
    if (onExit && i === exitAt) rows.push("car");
    rows.push(`exit${i}.end`);
  });
  if (onExit && exitAt < 0) throw new Error(`car at ${pose.carX} past the bridge with the bridge between exits (${pose.yc})`);
  void back;
  return rows;
}

export function build(view = "landscape", pose = REST) {
  const P = projection(view);
  const W = VIEWS[view].width, H = VIEWS[view].height;
  const B = shop(P);
  const { at, S, Ln, Dots, box, cyl, disc, prism } = B;
  const screw = { owner: "drive" };

  // the deck on its feet
  const feet = [...k.corners(DECK, 22), [0, DECK.y + 22], [0, DECK.y + DECK.d - 22]];
  for (const [x, y] of feet) {
    cyl("base", "stand.flange", x, y, 7, -DECK_H - FOOT_H, 1.6, { tone: "lo" }, { meta: { ground: true } });
    cyl("base", "stand.foot", x, y, 5.4, -DECK_H - FOOT_H + 1.6, FOOT_H - 1.6, { tone: "mid" }, { meta: { ground: true } });
  }
  const screws = k.corners(DECK, 10);
  const strip = { x: 6, y: DECK.y + DECK.d - 12, w: 156, d: 7, r: 1 };
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  const label = { x: 172, y: DECK.y + DECK.d - 14, w: 44, d: 10, r: 1.2 };
  box("base", "stand.deck", DECK, -DECK_H, DECK_H, { tone: "mid" }, {
    steps: 8, bevel: 1.6, meta: { ground: true },
    extra: Ln(k.planOutline(k.insetPlan(DECK, 5), 0, P), { tone: "lo" })
      + Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" })
      + Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }),
  });
  box("base", "stand.ruler", strip, 0, 0.6, { tone: "lo", crease: "none" }, {
    meta: { ground: true },
    extra: Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }) + Dots([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }),
  });
  box("base", "stand.label", label, 0, 0.8, { tone: "mid" }, {
    meta: { ground: true },
    extra: Ln(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" })
      + [0, 1, 2].map((i) => Ln(k.lineOnTop([label.x + 5, label.y + 2.6 + i * 2.4], [label.x + 5 + [30, 22, 26][i], label.y + 2.6 + i * 2.4], 0.8, P), { tone: "lo", free: true })).join("")
      + Dots([at([label.x + 2.4, label.y + label.d / 2, 0.8]), at([label.x + label.w - 2.4, label.y + label.d / 2, 0.8])], { size: 0.45 }),
  });

  // the traverser bed: two cross rails with end stops, the lead screw in its bearings, the motor
  for (const x of TRAV_RAILS) {
    box("base", "bed.rail", { x: x - 1.5, y: -98, w: 3, d: 196, r: 0.5 }, 0, 3, { tone: "mid" }, {
      extra: Dots([-92, -40, 40, 92].map((y) => at([x, y, 3])), { size: 0.4 }),
    });
    for (const y of [-101, 98]) box("base", "bed.stop", { x: x - 3.5, y, w: 7, d: 3, r: 0.8 }, 0, 6, { tone: "mid" }, { extra: Dots([at([x, y + 1.5, 6])], { size: 0.45 }) });
  }
  const SF = G.frameAlong([SCREW_X, SCREW_Y[0], SCREW_Z], [0, 1, 0]);
  disc("base", "bed.screw", SF, 0, SCREW_Y[1] - SCREW_Y[0], SCREW_R, { tone: "hi", crease: "none" }, { meta: screw });
  for (const [y0, y1] of [[SCREW_Y[0] - 6, SCREW_Y[0]], [SCREW_Y[1], SCREW_Y[1] + 5]]) {
    box("base", "bed.bearing", { x: SCREW_X - 5, y: y0, w: 10, d: y1 - y0, r: 1 }, 0, 6.2, { tone: "mid" }, {
      meta: screw, extra: Dots([at([SCREW_X - 3, (y0 + y1) / 2, 6.2]), at([SCREW_X + 3, (y0 + y1) / 2, 6.2])], { size: 0.45 }),
    });
  }
  const MOTOR = { x: SCREW_X - 9, y: DECK.y + 1, w: 18, d: 6, r: 1.6 };
  box("base", "bed.motor", MOTOR, 0, 12, { tone: "mid" }, {
    bevel: 0.6, extra: Ln(k.sideSeam(MOTOR, 4, P, 3), { tone: "faint" }) + Dots([at([MOTOR.x + 3, MOTOR.y + 4, 12]), at([MOTOR.x + MOTOR.w - 3, MOTOR.y + 4, 12])], { size: 0.45 }),
  });
  disc("base", "bed.coupling", G.frameAlong([SCREW_X, MOTOR.y + MOTOR.d, SCREW_Z + 0.6], [0, 1, 0]), 0, SCREW_Y[0] - 6 - MOTOR.y - MOTOR.d, 2.6, { tone: "mid" }, { meta: screw });

  // the key switch stand behind the entry track
  box("stand", "stand.post", STAND, 0, STAND_H, { tone: "mid" }, {
    bevel: 0.8, extra: Ln(k.sideSeam(STAND, 6, P, 3), { tone: "faint" }),
  });
  const cap = k.insetPlan(STAND, -1);
  box("stand", "stand.cap", cap, STAND_H, 3, { tone: "mid" }, {
    extra: Dots([at([cap.x + 3, cap.y + 3, STAND_H + 3]), at([cap.x + cap.w - 3, cap.y + 3, STAND_H + 3]), at([cap.x + 3, cap.y + cap.d - 3, STAND_H + 3])], { size: 0.45 }),
  });
  const LF = G.frameAlong(LOCK, [0, 1, 0]);
  disc("stand", "lock.bezel", LF, 0, 1.6, 5.2, { tone: "mid" });
  disc("stand", "lock.plug", LF, 1.6, 2.6, 3.8, { tone: "hi", crease: "lo" });
  const KEY = keyPaths(P, 0);
  B.put("stand", "lock.key", [LOCK[0], LOCK[1] + 6, LOCK[2]], `<g data-part="key">${S(KEY.neck, { tone: "hi" })}${S(KEY.bar, { tone: "hi", lit: true })}</g>`, [
    B.R.solid(A.disc(LF, 2.6, 3.2, 1.6, { name: "lock.key.neck" })),
    B.R.solid(A.prism(LF, [[-1, -4.6], [1, -4.6], [1, 4.6], [-1, 4.6]], 3.2, 10.4, { name: "lock.key.bar" })),
  ]);
  cyl("stand", "lamp.key.body", STAND.x + 8, STAND.y + 7, 2.8, STAND_H + 3, 2.4, { tone: "mid" });
  B.put("stand", "lamp.key.lens", [STAND.x + 8, STAND.y + 7, STAND_H + 5.9], S(k.cylinder(STAND.x + 8, STAND.y + 7, 1.9, STAND_H + 5.4, 1, P, 20), { tone: "hi" })
    + `<path class="lf-lamp" data-lamp="key" opacity="0" d="${k.cylinder(STAND.x + 8, STAND.y + 7, 1.9, STAND_H + 5.4, 1, P, 20).top}"/>`,
    [B.R.solid(A.cylinder(STAND.x + 8, STAND.y + 7, 1.9, STAND_H + 5.4, 1, { name: "lamp.key.lens" }))]);

  // a track: plinth, sleepers, two rails
  function track(row, name, x0, x1, y, { plinth = true, sleeper = 22 } = {}) {
    if (plinth) {
      const plan = { x: x0, y: y - 13, w: x1 - x0, d: 26, r: 2 };
      box(row, `${name}.plinth`, plan, 0, PLINTH_H, { tone: "mid" }, {
        steps: 4, bevel: 0.6, extra: Ln(k.sideSeam(plan, 3, P, 4), { tone: "faint" }),
      });
    }
    for (const x of sleepersAlong(x0 + 4, x1 - 6, 9)) box(row, `${name}.sleeper`, { x, y: y - sleeper / 2, w: 4, d: sleeper, r: 0.6 }, plinth ? PLINTH_H : BRIDGE_Z + 3.8, SLEEPER_H, { tone: "lo" }, { steps: 2, bevel: 0 });
    const z = (plinth ? PLINTH_H : BRIDGE_Z + 3.8) + SLEEPER_H;
    for (const g of [-GAUGE, GAUGE]) box(row, `${name}.rail`, { x: x0, y: y + g - 1.1, w: x1 - x0, d: 2.2, r: 0.4 }, z, RAIL_H, { tone: "mid", crease: "lo" }, { steps: 2, bevel: 0 });
  }

  // entry track with its signal
  track("entry", "entry", ENTRY.x, ENTRY.x + ENTRY.w, ENTRY_Y);
  cyl("entry", "entry.signal.flange", LAMP_ENTRY[0], LAMP_ENTRY[1], 3.6, 0, 1.4, { tone: "lo" });
  cyl("entry", "entry.signal.post", LAMP_ENTRY[0], LAMP_ENTRY[1], 1.5, 1.4, 38.6, { tone: "mid", crease: "none" }, { inner: Ln([12, 26].map((z) => k.sideArc(LAMP_ENTRY[0], LAMP_ENTRY[1], 1.5, z, P, 12)).join(""), { tone: "faint" }) });
  const head = { x: LAMP_ENTRY[0] - 3.5, y: LAMP_ENTRY[1] - 3.5, w: 7, d: 7, r: 1 };
  box("entry", "entry.signal.head", head, 40, 11, { tone: "mid" }, { bevel: 0.5 });
  const lensF = G.frameAlong([LAMP_ENTRY[0], head.y + head.d, 47], [0, 1, 0]);
  disc("entry", "entry.signal.hood", lensF, 0, 1.2, 2.8, { tone: "lo" });
  const lens = G.disc(1.2, 1.6, 2, lensF, P);
  B.put("entry", "entry.signal.lens", [LAMP_ENTRY[0], head.y + head.d + 1.4, 47], S(lens, { tone: "hi" }) + `<path class="lf-lamp" data-lamp="entry" opacity="0" d="${lens.fill}"/>`, [B.R.solid(A.disc(lensF, 1.2, 1.6, 2, { name: "entry.signal.lens" }))]);

  // the bridge, built at y = pose.yc; the live code slides the whole row from there
  const yc = pose.yc;
  for (const x of TRAV_RAILS) for (const y of WHEEL_YS) {
    disc("bridge", "bridge.wheel", G.frameAlong([x - 1, yc + y, 3 + WHEEL_R], [1, 0, 0]), 0, 2, WHEEL_R, { tone: "mid" });
  }
  const DECKB = { ...BRIDGE, y: yc + BRIDGE.y };
  box("bridge", "bridge.deck", DECKB, BRIDGE_Z, 3.8, { tone: "mid" }, {
    steps: 4, bevel: 0.8,
    extra: Dots([-98, -80, -62, -44, -26, -10].map((x) => at([x, DECKB.y + DECKB.d - 1.6, BRIDGE_Z + 3.8])), { size: 0.4, tone: "lo" }),
  });
  track("bridge", "bridge.track", BRIDGE.x, BRIDGE.x + BRIDGE.w, yc, { plinth: false, sleeper: 18 });
  const CAB = { x: -34, y: DECKB.y + 0.4, w: 18, d: 7, r: 1.2 };
  box("bridge", "bridge.cab", CAB, BRIDGE_Z + 3.8, 10, { tone: "mid" }, { bevel: 0.5, extra: Ln(k.sideSeam(CAB, BRIDGE_Z + 3.8 + 6, P, 3), { tone: "faint" }) });
  cyl("bridge", "bridge.lamp.body", CAB.x + CAB.w / 2, CAB.y + CAB.d / 2, 2.2, BRIDGE_Z + 13.8, 1.8, { tone: "mid" });
  const bl = k.cylinder(CAB.x + CAB.w / 2, CAB.y + CAB.d / 2, 1.5, BRIDGE_Z + 15.6, 0.8, P, 18);
  B.put("bridge", "bridge.lamp.lens", [CAB.x + CAB.w / 2, CAB.y + CAB.d / 2, BRIDGE_Z + 16], S(bl, { tone: "hi" }) + `<path class="lf-lamp" data-lamp="bridge" opacity="0" d="${bl.top}"/>`, [B.R.solid(A.cylinder(CAB.x + CAB.w / 2, CAB.y + CAB.d / 2, 1.5, BRIDGE_Z + 15.6, 0.8, { name: "bridge.lamp.lens" }))]);

  // six exits, each a track ending at a buffer block with a lamp on top
  EXITS.forEach((y, i) => {
    const row = `exit${i}`;
    track(row, `${row}`, EXIT_X[0], EXIT_X[1], y);
    const end = `${row}.end`;
    const block = { x: EXIT_X[1] + 1, y: y - 11, w: 10, d: 22, r: 1.5 };
    box(end, `${row}.block`, block, 0, 22, { tone: "mid" }, {
      bevel: 0.6, extra: Ln(k.sideSeam(block, 8, P, 3), { tone: "faint" }) + Dots([at([block.x + 5, block.y + 3, 22]), at([block.x + 5, block.y + block.d - 3, 22])], { size: 0.45 }),
    });
    for (const g of [-GAUGE, GAUGE]) {
      const F = G.frameAlong([EXIT_X[1] + 1, y + g, TRACK_Z + 4], [-1, 0, 0]);
      disc(end, `${row}.buffer.stem`, F, 0, 3, 1.1, { tone: "mid" });
      disc(end, `${row}.buffer.head`, F, 3, 4.2, 2.6, { tone: "hi", crease: "lo" });
    }
    cyl(end, `${row}.lamp.body`, block.x + 5, y, 3, 22, 2.4, { tone: "mid" });
    const lensTop = k.cylinder(block.x + 5, y, 2.1, 24.4, 1, P, 22);
    B.put(end, `${row}.lamp.lens`, [block.x + 5, y, 24.9], S(lensTop, { tone: "hi" }) + `<path class="lf-lamp" data-lamp="exit${i}" opacity="0" d="${lensTop.top}"/>` + `<path class="lf-ink" data-lamp="fault-exit${i}" opacity="0" d="${lensTop.top}"/>`, [B.R.solid(A.cylinder(block.x + 5, y, 2.1, 24.4, 1, { name: `${row}.lamp.lens` }))]);
  });

  // the request car, built at its home on the entry track; the live code moves the row
  const cx = pose.carX, cy = carY(pose);
  for (const x of [cx - 7, cx + 7]) for (const g of [-GAUGE, GAUGE]) {
    disc("car", "car.wheel", G.frameAlong([x, cy + g - 0.7, TRACK_Z + 2.2], [0, 1, 0]), 0, 1.4, 2.2, { tone: "mid" });
  }
  const CHASSIS = { x: cx - 12, y: cy - 8, w: 24, d: 16, r: 1.6 };
  box("car", "car.chassis", CHASSIS, TRACK_Z + 4.4, 3, { tone: "mid" }, {
    bevel: 0.5, extra: Dots([-9, -3, 3, 9].map((x) => at([cx + x, CHASSIS.y + CHASSIS.d - 1.4, TRACK_Z + 7.4])), { size: 0.4, tone: "lo" }),
  });
  const cz = TRACK_Z + 7.4;
  cyl("car", "car.capsule", cx, cy, 6, cz, 12, { tone: "hi", crease: "lo", lit: true }, {
    steps: 40, inner: Ln([3, 9].map((z) => k.sideArc(cx, cy, 6, cz + z, P, 28)).join(""), { tone: "faint" }),
  });
  cyl("car", "car.cap", cx, cy, 4.2, cz + 12, 1.6, { tone: "mid" }, { steps: 32, extra: Ln(k.ring(cx, cy, 2.2, cz + 13.6, P, 20), { tone: "lo" }) });

  const rows = layout(B.R, P, rowOrder(pose));
  return { P, W, H, B, rows };
}

export function figure(view = "landscape", pose = REST) {
  const { P, W, H, B, rows } = build(view, pose);
  const svg = figureMarkup({
    width: W, height: H, rows,
    label: "A transfer table: one entry track with a key switch, a bridge that slides across the bed to line up with one of six exit tracks, and a request car that rides across to a buffer with a lamp.",
    rowAttrs: (name) => (name === "base" ? "" : ` data-key="0"`),
  });
  return { P, W, H, svg, B };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const view = process.argv.includes("--portrait") ? "portrait" : "landscape";
  const poseArg = process.argv.find((a) => a.startsWith("--pose="))?.slice(7);
  const pose = poseArg ? Object.fromEntries(poseArg.split(",").map((kv) => kv.split("=")).map(([key, v]) => [key, Number(v)])) : REST;
  const { B, P, svg } = figure(view, pose);
  if (process.argv.includes("--page")) {
    const out = path.join(path.dirname(new URL(import.meta.url).pathname), `../../.figures/traverser-${view}${poseArg ? "-" + poseArg.replace(/[=,]/g, "") : ""}.html`);
    write(out, checkPage({ title: "Transfer table", fig: "Fig. 1", svg, readout: `${B.R.items.length} parts` }));
    console.log("wrote", out, B.R.items.length, "items");
  }
  A.auditOrExit(B.R, P, { crowd: [] });
}

/** The live code a frame runs: `TRAVERSER.mount(svg, P).pose(state)` moves and re-orders rows. */
export function liveSource() {
  return `const TRAVERSER = (() => {
  const EXITS = ${JSON.stringify(EXITS)}, ENTRY_Y = ${ENTRY_Y}, CAR_HOME = ${CAR_HOME};
  const ENTRY = ${JSON.stringify(ENTRY)}, EXIT_X = ${JSON.stringify(EXIT_X)}, LOCK = ${JSON.stringify(LOCK)};
  const carY = ${carY.toString()};
  ${rowOrder.toString()}
  ${keyPaths.toString()}
  function mount(svg, P) {
    const rows = {};
    svg.querySelectorAll("[data-row]").forEach((g) => { rows[g.dataset.row] = g; });
    const parent = rows.base.parentNode;
    const keyG = svg.querySelector('[data-part="key"]');
    const lamps = [...svg.querySelectorAll("[data-lamp]")];
    let order = "", turn = 0;
    return {
      pose(s) {
        rows.bridge.setAttribute("transform", k.translateAlong(P, [0, s.yc - ENTRY_Y, 0]));
        rows.car.setAttribute("transform", k.translateAlong(P, [s.carX - CAR_HOME, carY(s) - ENTRY_Y, 0]));
        const next = rowOrder(s);
        if (next.join() !== order) { for (const name of next) parent.appendChild(rows[name]); order = next.join(); }
        if (s.key !== turn) {
          const kp = keyPaths(P, s.key);
          keyG.innerHTML = k.solidSvg(kp.neck, { tone: "hi" }) + k.solidSvg(kp.bar, { tone: "hi", lit: true });
          turn = s.key;
        }
        for (const lamp of lamps) lamp.setAttribute("opacity", (s["lamp:" + lamp.dataset.lamp] ?? 0).toFixed(3));
      },
    };
  }
  return { mount };
})();`;
}
