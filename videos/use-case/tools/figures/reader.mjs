// Fig. 4, the cartridge reader. A bench carries a straight rack of six cartridges, the catalog's
// models, and ONE reader head on a shuttle that rides two rails along the rack. The head dips its
// probe onto the contacts of whichever cartridge the id names; switching models moves the same
// head to another cartridge, never a new head. A lock bar on a post at slot 0 can pin the shuttle
// to the first cartridge, the way a one-vendor provider is pinned to one vendor.
//
//   node reader.mjs --audit [--portrait] [--pose=slot=2,dip=1,lock=1,lit=2]
//   node reader.mjs --page [--portrait] [--pose=...]
import path from "node:path";
import { k, G, A, shop, layout, figureMarkup, checkPage, write } from "./shop.mjs";

export const SLOTS = 6;
export const PITCH = 40;
const SLOT_X0 = -100;
const BENCH = { x: -140, y: -78, w: 280, d: 150, r: 8 };
const RAILS_Y = [-48, -26];
const RAIL_X = [-117.5, 117.5];
const RACK_Y = 26;
const SOCKET_H = 8;
const CART_H = 32;
export const Z_CONTACT = SOCKET_H + CART_H + 1;
const DECK_Z = 8;
const COL_TOP = 94;
const HEAD_Z = [68, 92];
const GLAND_Z = 60;
const ROD_R = 1.4;
const ROD_TO = 4;
const PAD = [4, 5.6, 2.6];
export const STROKE = GLAND_Z - PAD[1] - Z_CONTACT;
export const LOCK_AT = [-79.5, -62];
const BAR = { back: 2.5, reach: 44, half: 2.5, z: [8, 11] };

export const slotX = (slot) => SLOT_X0 + PITCH * slot;

export const VIEWS = {
  landscape: { width: 640, height: 330, azimuth: 58, elevation: 30, pad: 34 },
  portrait: { width: 600, height: 520, azimuth: 30, elevation: 34, pad: 74 },
};

export function projection(view) {
  const v = VIEWS[view];
  const pts = [...k.boxCorners(BENCH, -15, 0)];
  for (const cx of [slotX(0), slotX(SLOTS - 1)]) pts.push([cx, RACK_Y, 98], [cx - 12, 37, HEAD_Z[0]], [cx, -46, COL_TOP + 2]);
  return k.fitProjection(pts, v.width, v.height, { pad: v.pad, azimuth: v.azimuth, elevation: v.elevation });
}

/** A closed rounded slot (a stadium) in the vertical face plane y = `y`, from x0 to x1 around z. */
export function faceSlot(x0, x1, z, h, y, P) {
  const r = h / 2, pts = [];
  for (let q = 0; q <= 8; q++) {
    const a = -Math.PI / 2 + (q / 8) * Math.PI;
    pts.push([x1 - r + r * Math.cos(a), z + r * Math.sin(a)]);
  }
  for (let q = 0; q <= 8; q++) {
    const a = Math.PI / 2 + (q / 8) * Math.PI;
    pts.push([x0 + r + r * Math.cos(a), z + r * Math.sin(a)]);
  }
  return k.pathOf(pts.map(([x, zz]) => k.iso([x, y, zz], P)), true);
}

/** A closed rectangle in the vertical face plane y = `y`. */
export function faceRect(x0, x1, z0, z1, y, P) {
  return k.pathOf([[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => k.iso([x, y, z], P)), true);
}

/** Cartridge i in its socket: the body with a recessed label and a grip notch, and its contact plate. */
export function cartPlans(i) {
  const sx = SLOT_X0 + PITCH * i;
  return {
    sx,
    body: { x: sx - 13, y: RACK_Y - 6, w: 26, d: 12, r: 1.2 },
    plate: { x: sx - 9, y: RACK_Y - 3, w: 18, d: 6, r: 0.8 },
  };
}

export function cartSvg(P, i, lit) {
  const { sx, body, plate } = cartPlans(i);
  const z0 = SOCKET_H, z1 = SOCKET_H + CART_H;
  const front = body.y + body.d;
  const label = faceRect(sx - 9, sx + 9, z0 + 6, z0 + 23, front, P);
  const recess = faceRect(sx - 8.2, sx + 8.2, z0 + 6.8, z0 + 22.2, front, P);
  const notch = faceSlot(sx - 6, sx + 6, z0 + 27.4, 2.6, front, P);
  const inner = k.lineSvg(label + notch, { tone: lit ? "mid" : "lo" }) + k.lineSvg(recess, { tone: "faint" });
  const bodyPaths = k.slabOf(body, z0, CART_H, P, 3, 1.2);
  const platePaths = k.slabOf(plate, z1, 1, P, 2, 0.3);
  const contacts = [];
  for (let q = 0; q < 6; q++) contacts.push(k.iso([sx - 7.5 + q * 3, RACK_Y, z1 + 1], P));
  return k.solidSvg(bodyPaths, { tone: lit ? "hi" : "mid", lit, crease: lit ? "lo" : "faint", inner })
    + k.solidSvg(platePaths, { tone: lit ? "hi" : "mid", crease: lit ? "lo" : "faint" })
    + k.dotsSvg(contacts, { size: 0.5, tone: lit ? "hi" : "mid" });
}

/** The lock bar's floor polygon, swung by `lock` (0 across the rails against the shuttle, 1 along them, clear). */
export function lockPoly(lock) {
  const a = (Math.PI / 2) * (1 - Math.max(0, Math.min(1, lock)));
  const d = [Math.cos(a), Math.sin(a)], n = [-Math.sin(a), Math.cos(a)];
  return [[-BAR.back, -BAR.half], [BAR.reach, -BAR.half], [BAR.reach, BAR.half], [-BAR.back, BAR.half]].map(([u, v]) => [LOCK_AT[0] + d[0] * u + n[0] * v, LOCK_AT[1] + d[1] * u + n[1] * v]);
}

export function lockSvg(P, lock) {
  const UPF = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const poly = lockPoly(lock);
  const bar = G.prismOf(UPF, poly, BAR.z[0], BAR.z[1], P);
  const a = (Math.PI / 2) * (1 - Math.max(0, Math.min(1, lock)));
  const end = [LOCK_AT[0] + Math.cos(a) * (BAR.reach - 3.5), LOCK_AT[1] + Math.sin(a) * (BAR.reach - 3.5), BAR.z[1]];
  return k.solidSvg(bar, { tone: "mid" }) + k.dotsSvg([k.iso(end, P)], { size: 0.5 });
}

/** The probe's screen offset when dipped by `dip` (0 up, 1 seated on the contacts). */
export const probeShift = (P, dip) => k.axisVector(P, [0, 0, -STROKE * dip]);

/** The probe: one rod out of the gland, clipped at the gland face, with its pad, moved by `dip`. */
export function probeSvg(P, cx, dip) {
  const F = G.frameAlong([cx, RACK_Y, GLAND_Z], [0, 0, -1]);
  const ROD = G.rodOut(F, 0, ROD_TO, ROD_R, P, { stroke: STROKE });
  const [dx, dy] = probeShift(P, dip);
  const fine = (v) => Math.round(v * 100) / 100;
  const hold = dx || dy ? ` transform="translate(${fine(-dx)} ${fine(-dy)})"` : "";
  return {
    attrs: dx || dy ? ` transform="translate(${fine(dx)} ${fine(dy)})"` : "",
    body: `<clipPath id="reader-probe-clip"><path data-hold${hold} d="${ROD.clip}"/></clipPath>`
      + `<g clip-path="url(#reader-probe-clip)">${k.solidSvg(ROD.paths, { tone: "hi", crease: "none" })}</g>`
      + k.solidSvg(G.disc(PAD[0], PAD[1], PAD[2], F, P), { tone: "hi", crease: "lo" }),
  };
}

export const REST = { slot: 0, dip: 1, lock: 0, lit: 0, "lamp:head": 1 };

/**
 * The rows back to front. The camera looks from +x, +y and above. The rails, the carriage, its
 * column and the lock sit behind the rack (a plane of constant y separates them), and the arm,
 * head and probe sit above every cartridge top (a plane of constant z), so the head always draws
 * after the rack. The +x end stops are always nearer than the carriage. The lock bar, engaged or
 * mid-swing, lies at x beyond the carriage's +x face at slot 0 (nearer); withdrawn, it lies behind
 * the rails (farther), where the shuttle may pass in front of it.
 */
export function rowOrder(pose) {
  const lock = pose.lock ?? 0, slot = pose.slot ?? 0;
  const clear = lock >= 0.999;
  if (!clear && slot > 0.05) throw new Error(`shuttle at slot ${slot} with the lock bar in (${lock})`);
  return ["base", ...(clear ? ["lock"] : []), "carriage", ...(clear ? [] : ["lock"]), "stops", "rack", "head"];
}

export function build(view = "landscape", pose = REST) {
  const st = { ...REST, ...pose };
  const P = projection(view);
  const W = VIEWS[view].width, H = VIEWS[view].height;
  const B = shop(P);
  const { at, S, Ln, Dots, box, cyl, prism } = B;
  const ground = { ground: true };

  // the bench on its feet: groove, corner screws, the ruler strip with a major tick at each slot, the label plate
  for (const [x, y] of k.corners(BENCH, 22)) {
    cyl("base", "bench.flange", x, y, 7, -15, 1.6, { tone: "lo" }, { meta: ground });
    cyl("base", "bench.foot", x, y, 5.4, -13.4, 3.4, { tone: "mid" }, { meta: ground });
  }
  const screws = k.corners(BENCH, 10);
  box("base", "bench.plate", BENCH, -10, 10, { tone: "mid" }, {
    steps: 8, bevel: 1.6, meta: ground,
    extra: Ln(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" })
      + Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" })
      + Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }),
  });
  const strip = { x: -106, y: RACK_Y + 15, w: 212, d: 7, r: 1 };
  const minor = [], major = [];
  for (let x = -100; x <= 100 + 1e-9; x += 5) {
    const big = Math.abs(((x - SLOT_X0) % PITCH)) < 1e-6;
    (big ? major : minor).push(k.lineOnTop([x, strip.y + 0.8], [x, strip.y + 0.8 + (big ? 3.8 : 2)], 0.6, P));
  }
  box("base", "bench.ruler", strip, 0, 0.6, { tone: "lo", crease: "none" }, {
    meta: ground,
    extra: Ln(minor.join(""), { tone: "lo" }) + Ln(major.join(""), { tone: "mid" })
      + Dots([at([strip.x + 2.5, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2.5, strip.y + 3.5, 0.6])], { size: 0.45 }),
  });
  const label = { x: 80, y: RACK_Y + 27, w: 44, d: 11, r: 1.2 };
  box("base", "bench.label", label, 0, 0.8, { tone: "mid" }, {
    meta: ground,
    extra: Ln(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" })
      + [0, 1, 2].map((q) => Ln(k.lineOnTop([label.x + 5, label.y + 3 + q * 2.5], [label.x + 5 + [30, 22, 26][q], label.y + 3 + q * 2.5], 0.8, P), { tone: "lo", free: true })).join("")
      + Dots([at([label.x + 2.4, label.y + label.d / 2, 0.8]), at([label.x + label.w - 2.4, label.y + label.d / 2, 0.8])], { size: 0.45 }),
  });

  // two rails with screws, and their end stops; the -x stops are always behind the carriage
  for (const y of RAILS_Y) {
    box("base", "rail", { x: RAIL_X[0], y: y - 2, w: RAIL_X[1] - RAIL_X[0], d: 4, r: 0.8 }, 0, 4, { tone: "mid", crease: "lo" }, {
      steps: 2, extra: Dots([-104, -64, -24, 16, 56, 96].map((x) => at([x + 4, y, 4])), { size: 0.4 }),
    });
    for (const [x0, row] of [[RAIL_X[0] - 6, "base"], [RAIL_X[1], "stops"]]) {
      box(row, "rail.stop", { x: x0, y: y - 4, w: 6, d: 8, r: 1 }, 0, 9, { tone: "mid" }, { bevel: 0.5, extra: Dots([at([x0 + 3, y, 9])], { size: 0.45 }) });
    }
  }

  // the lock at slot 0: a collar and post behind the rails, the swinging bar, a thumb screw on the pivot
  const [lx, ly] = LOCK_AT;
  cyl("lock", "lock.collar", lx, ly, 3.6, 0, 2, { tone: "lo" });
  cyl("lock", "lock.post", lx, ly, 2, 2, BAR.z[0] - 2, { tone: "mid", crease: "none" });
  const UPF = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  B.put("lock", "lock.bar", [lx, ly, (BAR.z[0] + BAR.z[1]) / 2], `<g data-part="lockbar">${lockSvg(P, st.lock)}</g>`, [B.R.solid(A.prism(UPF, lockPoly(st.lock), BAR.z[0], BAR.z[1], { name: "lock.bar" }))]);
  cyl("lock", "lock.screw", lx, ly, 2.8, BAR.z[1], 4, { tone: "mid" }, {
    extra: Ln(k.knurl(lx, ly, 2.8, BAR.z[1], BAR.z[1] + 4, 18, P), { tone: "lo" }) + Ln(k.ring(lx, ly, 1.2, BAR.z[1] + 4, P, 14), { tone: "lo" }),
  });

  // the shuttle carriage, built at its slot: bushings on the rails, a deck with rivets, a knurled handle, the column
  const cx = slotX(st.slot);
  for (const dx of [-15, 5]) for (const y of RAILS_Y) {
    box("carriage", "shuttle.bushing", { x: cx + dx, y: y - 4, w: 10, d: 8, r: 1 }, 4, DECK_Z - 4, { tone: "mid" }, { bevel: 0.4 });
  }
  const DECK = { x: cx - 16, y: -53, w: 32, d: 32, r: 2 };
  const top = DECK_Z + 4;
  box("carriage", "shuttle.deck", DECK, DECK_Z, 4, { tone: "mid" }, {
    bevel: 0.6,
    extra: Dots([-12, -6, 0, 6, 12].map((x) => at([cx + x, DECK.y + DECK.d - 1.6, top])), { size: 0.4, tone: "lo" })
      + Dots([-10, 10].flatMap((x) => RAILS_Y.map((y) => at([cx + x, y, top]))).filter((_, q) => q !== 3), { size: 0.5 }),
  });
  const KNOB = [cx + 10, -27];
  cyl("carriage", "shuttle.handle.neck", KNOB[0], KNOB[1], 1.6, top, 1.4, { tone: "mid" });
  cyl("carriage", "shuttle.handle", KNOB[0], KNOB[1], 3.2, top + 1.4, 5, { tone: "mid" }, {
    extra: Ln(k.knurl(KNOB[0], KNOB[1], 3.2, top + 1.4, top + 6.4, 22, P), { tone: "lo" }) + Ln(k.ring(KNOB[0], KNOB[1], 1.4, top + 6.4, P, 14), { tone: "lo" }),
  });
  const COL = { x: cx - 8, y: -46, w: 16, d: 12, r: 1.5 };
  box("carriage", "shuttle.column", COL, top, COL_TOP - top, { tone: "mid" }, {
    bevel: 0.6, inner: Ln(k.sideSeam(COL, 30, P, 3) + k.sideSeam(COL, 58, P, 3), { tone: "faint" }),
  });
  const CAP = k.insetPlan(COL, -1);
  box("carriage", "shuttle.cap", CAP, COL_TOP, 2.4, { tone: "mid" }, {
    bevel: 0.4, extra: Dots([at([cx - 5, CAP.y + CAP.d / 2, COL_TOP + 2.4]), at([cx + 5, CAP.y + CAP.d / 2, COL_TOP + 2.4])], { size: 0.45 }),
  });

  // the arm and the reader head, above every cartridge top
  const XF = G.frameOf([cx - 1.5, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  prism("head", "shuttle.gusset", XF, [[COL.y + COL.d, 82], [COL.y + COL.d + 18, 82], [COL.y + COL.d, 64]], 0, 3, { tone: "mid" });
  const HEAD = { x: cx - 12, y: RACK_Y - 11, w: 24, d: 22, r: 2 };
  const ARM = { x: cx - 6, y: COL.y + COL.d, w: 12, d: HEAD.y - COL.y - COL.d, r: 1 };
  box("head", "shuttle.arm", ARM, 82, 8, { tone: "mid" }, {
    bevel: 0.4, extra: Dots([0.2, 0.4, 0.6, 0.8].map((t) => at([cx, ARM.y + ARM.d * t, 90])), { size: 0.4, tone: "lo" }),
  });
  const front = HEAD.y + HEAD.d;
  const vents = [72, 76, 80].map((z) => faceSlot(cx - 9, cx + 3, z, 2.2, front, P)).join("");
  box("head", "head.housing", HEAD, HEAD_Z[0], HEAD_Z[1] - HEAD_Z[0], { tone: "mid" }, {
    steps: 4, bevel: 0.8,
    inner: Ln(k.sideSeam(HEAD, 86, P, 4), { tone: "faint" }) + Ln(vents, { tone: "lo" }),
    extra: Dots([at([cx + 8, front, 76]), at([cx + 8, front, 80])], { size: 0.45 }),
  });
  const side = HEAD.x + HEAD.w;
  const SF = G.frameOf([side, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  prism("head", "head.cover", SF, [[HEAD.y + 4, 71], [HEAD.y + 18, 71], [HEAD.y + 18, 83], [HEAD.y + 4, 83]], 0, 0.8, { tone: "mid" }, {
    extra: Dots([[5.6, 72.6], [16.4, 72.6], [5.6, 81.4], [16.4, 81.4]].map(([y, z]) => at([side + 0.8, HEAD.y + y, z])), { size: 0.45 }),
  });
  const LID = k.insetPlan(HEAD, 2.5);
  box("head", "head.lid", LID, HEAD_Z[1], 2, { tone: "mid" }, {
    bevel: 0.4, extra: Ln(k.planOutline(k.insetPlan(LID, 2), HEAD_Z[1] + 2, P, 4), { tone: "lo" }) + Dots(k.corners(LID, 3.4).filter((_, q) => q !== 3).map(([x, y]) => at([x, y, HEAD_Z[1] + 2])), { size: 0.45 }),
  });
  const LAMP = [cx + 4, RACK_Y + 4], lz = HEAD_Z[1] + 2;
  cyl("head", "head.lamp.body", LAMP[0], LAMP[1], 3.4, lz, 2, { tone: "mid" });
  const lens = k.cylinder(LAMP[0], LAMP[1], 2.3, lz + 2, 1, P, 22);
  B.put("head", "head.lamp.lens", [LAMP[0], LAMP[1], lz + 2.5], S(lens, { tone: "hi" }) + `<path class="lf-lamp" data-lamp="head" opacity="0" d="${lens.top}"/>`, [B.R.solid(A.cylinder(LAMP[0], LAMP[1], 2.3, lz + 2, 1, { name: "head.lamp.lens" }))]);
  cyl("head", "head.gland", cx, RACK_Y, 4.6, GLAND_Z, HEAD_Z[0] - GLAND_Z, { tone: "mid" }, { inner: Ln(k.sideArc(cx, RACK_Y, 4.6, GLAND_Z + 2, P, 20) + k.sideArc(cx, RACK_Y, 4.6, GLAND_Z + 5, P, 20), { tone: "faint" }) });
  const F = G.frameAlong([cx, RACK_Y, GLAND_Z], [0, 0, -1]);
  const off = STROKE * st.dip;
  const probe = probeSvg(P, cx, st.dip);
  B.put("head", "head.probe", [cx, RACK_Y, GLAND_Z - ROD_TO - off], `<g data-part="probe"${probe.attrs}>${probe.body}</g>`, [
    B.R.solid(A.slide(F, 0, ROD_TO + off, ROD_R, { name: "head.probe.rod" })),
    B.R.solid(A.disc(F, PAD[0] + off, PAD[1] + off, PAD[2], { name: "head.probe.pad" })),
  ]);

  // the rack: six sockets, each holding a cartridge; the one being read is lit
  const lit = Math.round(st.lit);
  for (let i = 0; i < SLOTS; i++) {
    const { sx, body, plate } = cartPlans(i);
    const socket = { x: sx - 17, y: RACK_Y - 12, w: 34, d: 24, r: 2 };
    box("rack", "rack.socket", socket, 0, SOCKET_H, { tone: "mid" }, {
      bevel: 0.6,
      extra: Ln(k.planOutline(k.insetPlan(body, -1.4), SOCKET_H, P, 3), { tone: "lo" })
        + Dots(k.corners(socket, 3).map(([x, y]) => at([x, y, SOCKET_H])), { size: 0.45 }),
    });
    B.put("rack", `rack.cart${i}`, [sx, RACK_Y, SOCKET_H + CART_H / 2], `<g data-cart="${i}">${cartSvg(P, i, lit === i)}</g>`, [
      B.R.solid(A.slab(body, SOCKET_H, CART_H, { name: `rack.cart${i}.body` }, 3)),
      B.R.solid(A.slab(plate, SOCKET_H + CART_H, 1, { name: `rack.cart${i}.plate` }, 2)),
    ]);
  }

  const rows = layout(B.R, P, rowOrder(st));
  return { P, W, H, B, rows, st };
}

export function figure(view = "landscape", pose = REST) {
  const { P, W, H, B, rows, st } = build(view, pose);
  const svg = figureMarkup({
    width: W, height: H, rows,
    label: "A cartridge reader: a bench with a rack of six cartridges and one reader head on a shuttle that rides two rails along the rack, dipping its probe onto the contacts of the cartridge it reads; a lock bar at the first slot can pin the shuttle there.",
    rowAttrs: (name) => (name === "carriage" || name === "head" ? ` data-slot="${st.slot}"` : ""),
  });
  return { P, W, H, svg, B };
}

export function liveSource() {
  return `const READER = (() => {
  const SLOTS = ${SLOTS}, PITCH = ${PITCH}, SLOT_X0 = ${SLOT_X0}, RACK_Y = ${RACK_Y}, SOCKET_H = ${SOCKET_H}, CART_H = ${CART_H};
  const STROKE = ${STROKE}, LOCK_AT = ${JSON.stringify(LOCK_AT)}, BAR = ${JSON.stringify(BAR)};
  const REST = ${JSON.stringify(REST)};
  ${faceSlot.toString()}
  ${faceRect.toString()}
  ${cartPlans.toString()}
  ${cartSvg.toString()}
  ${lockPoly.toString()}
  ${lockSvg.toString()}
  const probeShift = ${probeShift.toString()};
  ${rowOrder.toString()}
  let seq = 0;
  function mount(svg, P) {
    const rows = {};
    svg.querySelectorAll("[data-row]").forEach((g) => { rows[g.dataset.row] = g; });
    const parent = rows.base.parentNode;
    const built = Number(rows.head.dataset.slot);
    const probe = svg.querySelector('[data-part="probe"]');
    const clip = probe.querySelector("clipPath");
    clip.id = "reader-probe-clip-" + ++seq;
    probe.querySelector("[clip-path]").setAttribute("clip-path", "url(#" + clip.id + ")");
    const lockbar = svg.querySelector('[data-part="lockbar"]');
    const carts = [...svg.querySelectorAll("[data-cart]")];
    const lamps = [...svg.querySelectorAll("[data-lamp]")];
    let last = "", order = "";
    return {
      pose(input) {
        const s = { ...REST, ...input };
        const lit = Math.round(s.lit);
        const sig = [s.slot.toFixed(4), s.dip.toFixed(4), s.lock.toFixed(4), lit].join();
        if (sig !== last) {
          const prev = last ? last.split(",") : [];
          last = sig;
          const move = k.translateAlong(P, [(s.slot - built) * PITCH, 0, 0]);
          rows.carriage.setAttribute("transform", move);
          rows.head.setAttribute("transform", move);
          const [dx, dy] = probeShift(P, s.dip);
          const fine = (v) => Math.round(v * 100) / 100;
          if (dx || dy) probe.setAttribute("transform", "translate(" + fine(dx) + " " + fine(dy) + ")"); else probe.removeAttribute("transform");
          k.holdStill(probe, [fine(dx), fine(dy)]);
          if (prev[2] !== sig.split(",")[2]) lockbar.innerHTML = lockSvg(P, s.lock);
          if (prev[3] !== String(lit)) carts.forEach((g) => { g.innerHTML = cartSvg(P, Number(g.dataset.cart), Number(g.dataset.cart) === lit); });
          const next = rowOrder(s).join();
          if (next !== order) { for (const name of next.split(",")) parent.appendChild(rows[name]); order = next; }
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
  const poseArg = process.argv.find((a) => a.startsWith("--pose="))?.slice(7);
  const pose = { ...REST, ...(poseArg ? Object.fromEntries(poseArg.split(",").map((kv) => kv.split("=")).map(([key, v]) => [key, Number(v)])) : {}) };
  const { B, P, svg } = figure(view, pose);
  if (process.argv.includes("--page")) {
    const out = path.join(path.dirname(new URL(import.meta.url).pathname), `../../.figures/reader-${view}${poseArg ? "-" + poseArg.replace(/[=,:]/g, "") : ""}.html`);
    write(out, checkPage({ title: "Cartridge reader", fig: "Fig. 4", svg, readout: `${B.R.items.length} parts` }));
    console.log("wrote", out, B.R.items.length, "items", B.R.solids.length, "solids");
  }
  A.auditOrExit(B.R, P, { crowd: [] });
}
