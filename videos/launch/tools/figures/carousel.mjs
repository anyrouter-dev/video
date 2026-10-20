// Fig. 2, the key carousel. A round table on a geared base carries twelve key slots; members'
// donated keys stand in them. Each request turns the table to the key that has rested longest
// and the service head dips onto it; a token drops into that key's cup. A key can drop into an
// empty slot (donated) or lift out (taken back).
//
//   node carousel.mjs --audit [--portrait] [--angle=deg]
//   node carousel.mjs --page [--portrait]
import path from "node:path";
import { k, G, A, shop, layout, figureMarkup, checkPage, write } from "./shop.mjs";

export const SLOTS = 12;
const BASE_R = 108;
const COL_R = 30;
const GEAR_R = 86;
const PLATE_R = 92;
const TABLE_Z = 24;
const GEAR_H = 3.4;
const PLATE_H = 3.6;
export const TOP_Z = TABLE_Z + GEAR_H + PLATE_H;
const SLOT_R = 74;
const SLOT_H = 4.6;
const KEY_H = 22;
const CUP_R = 3.6;
const CUP_AT = PLATE_R - CUP_R - 0.6;
export const SERVE = 30;
const POST = { a: 64, r: 100 };
const ARM_Z = 70;

export const VIEWS = {
  landscape: { width: 640, height: 330, azimuth: 45, elevation: 34, pad: 10 },
  portrait: { width: 600, height: 520, azimuth: 45, elevation: 36, pad: 18 },
};

export function projection(view) {
  const v = VIEWS[view];
  const pts = [];
  for (let a = 0; a < 360; a += 15) {
    const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
    pts.push([BASE_R * c, BASE_R * s, -15], [BASE_R * c, BASE_R * s, 0], [SLOT_R * c, SLOT_R * s, TOP_Z + SLOT_H + KEY_H + 4]);
  }
  pts.push([0, 0, ARM_Z + 6]);
  return k.fitProjection(pts, v.width, v.height, { pad: v.pad, azimuth: v.azimuth, elevation: v.elevation });
}

const rad = (d) => (d * Math.PI) / 180;
const polar = (r, a, z = 0) => [r * Math.cos(rad(a)), r * Math.sin(rad(a)), z];
/** A floor polygon in world xy as the (u, v) coordinates of an upward frame at the origin. */
const UP = G.frameAlong([0, 0, 0], [0, 0, 1]);
const toUV = (pts) => pts.map(([x, y]) => [-y, x]);
/** A rectangle `along` × `across` centred at radius r, angle a, its long side tangential. */
function tangentRect(r, a, along, across) {
  const c = Math.cos(rad(a)), s = Math.sin(rad(a));
  const t = [-s, c], n = [c, s];
  const o = [r * c, r * s];
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [o[0] + t[0] * (along / 2) * i + n[0] * (across / 2) * j, o[1] + t[1] * (along / 2) * i + n[1] * (across / 2) * j]);
}

/**
 * Everything that rides the table, at table angle `turn` (degrees): slot blocks, keys, cups,
 * tokens and the table's own tick ring. Shared by the build (and its audit) and the live code,
 * which redraws these each frame. `st.key[i]` is a key's presence (0 none, 1 seated) and lift,
 * `st.lit` the slot whose key is served, `st.token[i]` a token's drop (0 above, 1 in its cup).
 */
export function tableParts(P, turn, st) {
  const out = [];
  const V = G.viewOf(P);
  const depth = (p) => G.dot3(p, V);
  const ticks = k.radialTicks(0, 0, PLATE_R - 0.15, 72, 6, TOP_Z, [1.4, 2.8], P, rad(-turn), Math.PI * 2);
  out.push({ kind: "ring", d: -1e6, svg: k.lineSvg(ticks.minor, { tone: "lo" }) + k.lineSvg(ticks.major, { tone: "mid" }) + k.lineSvg(k.ring(0, 0, SLOT_R + 9, TOP_Z, P, 96), { tone: "faint" }) + k.lineSvg(k.ring(0, 0, SLOT_R - 9, TOP_Z, P, 96), { tone: "faint" }) });
  for (let i = 0; i < SLOTS; i++) {
    const a = i * (360 / SLOTS) + turn;
    const slot = tangentRect(SLOT_R, a, 15, 9);
    const slotPaths = G.prismOf(UP, toUV(slot), TOP_Z, TOP_Z + SLOT_H, P);
    const centre = polar(SLOT_R, a, TOP_Z + SLOT_H / 2);
    const groove = tangentRect(SLOT_R, a, 11, 3.4);
    out.push({ kind: "slot", i, d: depth(centre), poly: slot, z0: TOP_Z, z1: TOP_Z + SLOT_H,
      svg: k.solidSvg(slotPaths, { tone: "mid" }) + k.lineSvg(k.onTop(groove, TOP_Z + SLOT_H, P, true), { tone: "lo" }) });
    const present = st.key?.[i] ?? 0;
    if (present > 0.001) {
      const lift = st.lift?.[i] ?? 0;
      const z0 = TOP_Z + SLOT_H + lift, z1 = z0 + KEY_H;
      const tag = tangentRect(SLOT_R, a, 10, 2.2);
      const tagPaths = G.prismOf(UP, toUV(tag), z0, z1, P);
      const n = [Math.cos(rad(a)), Math.sin(rad(a)), 0];
      const t = [-Math.sin(rad(a)), Math.cos(rad(a)), 0];
      const facing = G.dot3(n, V) > 0 ? 1 : -1;
      const face = G.add3(polar(SLOT_R, a, z1 - 5), G.mul3(n, 1.1 * facing));
      const hole = [];
      for (let j = 0; j <= 24; j++) {
        const ph = (j / 24) * Math.PI * 2;
        hole.push(k.iso(G.add3(face, G.add3(G.mul3(t, 2 * Math.cos(ph)), [0, 0, 2 * Math.sin(ph)])), P));
      }
      const bitting = [];
      for (let j = 0; j < 4; j++) {
        const zz = z0 + 3 + j * 2.6;
        bitting.push(k.pathOf([G.add3(G.add3(polar(SLOT_R, a, zz), G.mul3(n, 1.1 * facing)), G.mul3(t, -5)), G.add3(G.add3(polar(SLOT_R, a, zz), G.mul3(n, 1.1 * facing)), G.mul3(t, -5 + [2.2, 3.4, 1.6, 2.8][j]))].map((p) => k.iso(p, P))));
      }
      const lit = st.lit === i;
      const marks = k.lineSvg(k.pathOf(hole, true), { tone: lit ? "hi" : "mid" }) + k.lineSvg(bitting.join(""), { tone: "lo", free: "end" });
      out.push({ kind: "key", i, d: depth(polar(SLOT_R, a, (z0 + z1) / 2)) + 0.4, poly: tag, z0, z1, opacity: present,
        svg: `<g${present < 0.999 ? ` opacity="${present.toFixed(3)}"` : ""}>${k.solidSvg(tagPaths, { tone: lit ? "hi" : "mid", lit, crease: lit ? "lo" : "faint", inner: marks })}${lit ? `<path class="lf-lamp" d="${tagPaths.top}"/>` : ""}</g>` });
    }
    const [cx, cy] = polar(CUP_AT, a);
    const cup = k.cylinder(cx, cy, CUP_R, TOP_Z, 3.2, P, 22);
    out.push({ kind: "cup", i, d: depth([cx, cy, TOP_Z + 1.6]) + 0.2, cx, cy,
      svg: k.solidSvg(cup, { tone: "mid" }) + k.lineSvg(k.ring(cx, cy, CUP_R - 0.9, TOP_Z + 3.2, P, 20), { tone: "lo" }) });
    const drop = st.token?.[i];
    if (drop != null && drop > 0) {
      const z = TOP_Z + 3.2 - 1.6 + (1 - Math.min(1, drop)) * 26;
      const coin = k.cylinder(cx, cy, 2.4, z, 0.9, P, 18);
      out.push({ kind: "token", i, d: depth([cx, cy, z]) + 0.3, svg: k.solidSvg(coin, { tone: "hi" }) + `<path class="lf-lamp" d="${coin.top}"/>` });
    }
  }
  return out.sort((a, b) => a.d - b.d);
}

/** The service head's plunger, lowered by `dip` (0 up, 1 touching the key top). */
export function plungerPaths(P, dip) {
  const [x, y] = polar(SLOT_R, SERVE);
  const top = ARM_Z - 3;
  const lowest = TOP_Z + SLOT_H + KEY_H + 0.2;
  const bottom = top - 6 - dip * (top - 6 - lowest);
  return { x, y, rod: k.cylinder(x, y, 1.2, bottom + 1.4, top - bottom - 1.4, P, 16), pad: k.cylinder(x, y, 2.6, bottom, 1.4, P, 20), bottom };
}

export const REST = { turn: 0, key: [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1], lit: -1, dip: 0 };

export function build(view = "landscape", pose = REST) {
  const P = projection(view);
  const W = VIEWS[view].width, H = VIEWS[view].height;
  const B = shop(P);
  const { at, S, Ln, Dots, box, cyl, disc, prism } = B;

  for (const a of [0, 90, 180, 270]) {
    const [x, y] = polar(BASE_R - 22, a + 45);
    cyl("base", "stand.flange", x, y, 7, -15, 1.6, { tone: "lo" }, { meta: { ground: true } });
    cyl("base", "stand.foot", x, y, 5.4, -13.4, 3.4, { tone: "mid" }, { meta: { ground: true } });
  }
  const bolts = [0, 60, 120, 180, 240, 300].map((a) => polar(BASE_R - 8, a + 15));
  cyl("base", "stand.base", 0, 0, BASE_R, -10, 10, { tone: "mid" }, {
    steps: 120, bevel: 1.4, meta: { ground: true },
    extra: Ln(k.ring(0, 0, BASE_R - 5, 0, P, 120), { tone: "lo" }) + Ln(bolts.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) + Dots(bolts.map((p) => at(p)), { size: 0.5 }),
  });
  const rt = k.radialTicks(0, 0, BASE_R - 5.6, 120, 10, 0, [1.6, 3.2], P, rad(-100), rad(110));
  B.put("base", "stand.scale", [0, 0, 0], Ln(rt.minor, { tone: "lo" }) + Ln(rt.major, { tone: "mid" }), [B.R.solid(A.cylinder(0, 0, BASE_R - 5, -0.2, 0.2, { name: "stand.scale" }))]);
  cyl("base", "column", 0, 0, COL_R, 0, TABLE_Z, { tone: "mid" }, { steps: 72, bevel: 0.6, inner: Ln([7, 16].map((z) => k.sideArc(0, 0, COL_R, z, P, 48)).join(""), { tone: "faint" }) });

  // the drive: a motor box at the back right with a pinion on the gear ring
  const PIN_A = -40;
  const [px, py] = polar(GEAR_R + 6.2, PIN_A);
  const [mx, my] = polar(GEAR_R + 16, PIN_A);
  const MOTOR = { x: mx - 9, y: my - 9, w: 18, d: 18, r: 2 };
  box("base", "drive.motor", MOTOR, 0, TABLE_Z - 2, { tone: "mid" }, {
    bevel: 0.6, extra: Ln(k.sideSeam(MOTOR, 8, P, 3), { tone: "faint" }) + Dots(k.corners(MOTOR, 3).map(([x, y]) => at([x, y, TABLE_Z - 2])), { size: 0.45 }),
  });
  cyl("base", "drive.shaft", px, py, 1.6, TABLE_Z - 2, 2, { tone: "mid" });
  const T0 = teethSvg(P, pose.turn);
  B.put("pinion", "drive.pinion", [px, py, TABLE_Z + 1.7], `<g data-part="pinion">${T0.pinion}</g>`, [B.R.solid(A.cylinder(px, py, 6, TABLE_Z, GEAR_H, { name: "drive.pinion" }))]);

  // the service post and arm at the front
  const [ox, oy] = polar(POST.r, POST.a);
  cyl("post", "post.flange", ox, oy, 6, 0, 2, { tone: "lo" });
  cyl("post", "post.column", ox, oy, 3.6, 2, ARM_Z - 4, { tone: "mid", crease: "none" }, { inner: Ln([20, 46].map((z) => k.sideArc(ox, oy, 3.6, z, P, 16)).join(""), { tone: "faint" }) });
  const [sx, sy] = polar(SLOT_R, SERVE);
  const dir = G.unit3([sx - ox, sy - oy, 0]);
  const len = Math.hypot(sx - ox, sy - oy);
  const AF = G.frameOf([ox, oy, ARM_Z], dir, G.unit3(G.cross3([0, 0, 1], dir)), [0, 0, 1]);
  prism("post", "post.arm", AF, [[-3, -2], [3, -2], [3, 3], [-3, 3]], -3.6, len - 5, { tone: "mid" });
  cyl("post", "post.head", sx, sy, 5, ARM_Z - 3, 9, { tone: "mid" }, { steps: 36, extra: Ln(k.ring(sx, sy, 2.6, ARM_Z + 6, P, 20), { tone: "lo" }) });
  cyl("post", "post.lamp.body", ox, oy, 4.4, ARM_Z + 3, 2.2, { tone: "mid" });
  const lamp = k.cylinder(ox, oy, 3, ARM_Z + 5.2, 1, P, 22);
  B.put("post", "post.lamp.lens", [ox, oy, ARM_Z + 5.7], S(lamp, { tone: "hi" }) + `<path class="lf-lamp" data-lamp="serve" opacity="0" d="${lamp.top}"/>`, [B.R.solid(A.cylinder(ox, oy, 3, ARM_Z + 5.2, 1, { name: "post.lamp.lens" }))]);
  const pl = plungerPaths(P, pose.dip);
  B.put("plunger", "post.plunger", [sx, sy, pl.bottom + 3], `<g data-part="plunger">${S(pl.rod, { tone: "hi", crease: "none" })}${S(pl.pad, { tone: "hi" })}</g>`, [
    B.R.solid(A.cylinder(sx, sy, 1.2, pl.bottom + 1.4, ARM_Z - 3 - pl.bottom - 1.4, { name: "post.plunger.rod" })),
    B.R.solid(A.cylinder(sx, sy, 2.6, pl.bottom, 1.4, { name: "post.plunger.pad" })),
  ]);

  // the table: gear ring and plate; what rides on it is drawn by tableParts
  B.put("gear", "table.gear", [0, 0, TABLE_Z + GEAR_H / 2], S(k.cylinder(0, 0, GEAR_R, TABLE_Z, GEAR_H, P, 120), { tone: "lo", inner: `<g data-part="teeth">${T0.gear}</g>` }), [B.R.solid(A.cylinder(0, 0, GEAR_R, TABLE_Z, GEAR_H, { name: "table.gear" }))]);
  cyl("plate", "table.plate", 0, 0, PLATE_R, TABLE_Z + GEAR_H, PLATE_H, { tone: "mid" }, { steps: 120, bevel: 1.0 });
  cyl("plate", "table.hub", 0, 0, 14, TOP_Z, 3, { tone: "mid" }, { steps: 48, extra: Ln(k.ring(0, 0, 8, TOP_Z + 3, P, 32), { tone: "lo" }) + Dots([0, 72, 144, 216, 288].map((a) => at(polar(11, a, TOP_Z + 3))), { size: 0.45 }) });
  const parts = tableParts(P, pose.turn, pose);
  const svg = parts.map((p) => p.svg).join("");
  const shapes = parts.flatMap((p) => {
    if (p.kind === "slot" || p.kind === "key") return [B.R.solid(A.prism(UP, toUV(p.poly), p.z0, p.z1, { name: `table.${p.kind}${p.i}` }))];
    if (p.kind === "cup") return [B.R.solid(A.cylinder(p.cx, p.cy, CUP_R, TOP_Z, 3.2, { name: `table.cup${p.i}` }))];
    return [];
  });
  B.put("table", "table.parts", [0, 0, TOP_Z + 10], `<g data-part="table">${svg}</g>`, shapes);

  const rows = layout(B.R, P, ["base", "pinion", "gear", "plate", "table", "plunger", "post"]);
  return { P, W, H, B, rows };
}

/** Gear teeth and pinion at a table angle: ribs on the visible half, phased by the turn. */
export function teethSvg(P, turn) {
  const V = G.viewOf(P);
  const ribs = (cx, cy, r, z0, z1, count, phase) => {
    const out = [];
    for (let i = 0; i < count; i++) {
      const a = rad(i * (360 / count) + phase);
      const n = [Math.cos(a), Math.sin(a), 0];
      if (G.dot3(n, V) <= 0.05) continue;
      out.push(k.pathOf([k.iso([cx + r * n[0], cy + r * n[1], z0], P), k.iso([cx + r * n[0], cy + r * n[1], z1], P)]));
    }
    return out.join("");
  };
  const [px, py] = polar(GEAR_R + 6.2, -40);
  const pin = k.cylinder(px, py, 6, TABLE_Z, GEAR_H, P, 36);
  return {
    gear: k.lineSvg(ribs(0, 0, GEAR_R, TABLE_Z, TABLE_Z + GEAR_H, 120, turn), { tone: "faint" }),
    pinion: k.solidSvg(pin, { tone: "mid", inner: k.lineSvg(ribs(px, py, 6, TABLE_Z, TABLE_Z + GEAR_H, 16, -turn * (GEAR_R / 6)), { tone: "lo" }) }),
  };
}

export function figure(view = "landscape", pose = REST) {
  const { P, W, H, B, rows } = build(view, pose);
  const svg = figureMarkup({
    width: W, height: H, rows,
    label: "A key carousel: a round table on a geared base with twelve key slots, a token cup in front of each, and a service arm that dips onto the key at the front.",
  });
  return { P, W, H, svg, B };
}

export function liveSource() {
  return `const CAROUSEL = (() => {
  const SLOTS = ${SLOTS}, BASE_R = ${BASE_R}, GEAR_R = ${GEAR_R}, PLATE_R = ${PLATE_R}, TABLE_Z = ${TABLE_Z}, GEAR_H = ${GEAR_H}, TOP_Z = ${TOP_Z};
  const SLOT_R = ${SLOT_R}, SLOT_H = ${SLOT_H}, KEY_H = ${KEY_H}, CUP_R = ${CUP_R}, CUP_AT = ${CUP_AT}, SERVE = ${SERVE}, ARM_Z = ${ARM_Z};
  const rad = ${rad.toString()};
  const polar = ${polar.toString()};
  const UP = G.frameAlong([0, 0, 0], [0, 0, 1]);
  const toUV = ${toUV.toString()};
  ${tangentRect.toString()}
  ${tableParts.toString()}
  ${plungerPaths.toString()}
  ${teethSvg.toString()}
  function mount(svg, P) {
    const table = svg.querySelector('[data-part="table"]');
    const teeth = svg.querySelector('[data-part="teeth"]');
    const pinion = svg.querySelector('[data-part="pinion"]');
    const plunger = svg.querySelector('[data-part="plunger"]');
    const lamps = [...svg.querySelectorAll("[data-lamp]")];
    let last = "";
    return {
      pose(s) {
        const st = { key: [], lift: [], token: [], lit: Math.round(s.lit ?? -1) };
        for (let i = 0; i < SLOTS; i++) { st.key[i] = s["key" + i] ?? 0; st.lift[i] = s["lift" + i] ?? 0; st.token[i] = s["token" + i] ?? 0; }
        const sig = JSON.stringify([s.turn.toFixed(3), st, (s.dip ?? 0).toFixed(3)]);
        if (sig === last) return;
        last = sig;
        table.innerHTML = tableParts(P, s.turn, st).map((p) => p.svg).join("");
        const t = teethSvg(P, s.turn);
        teeth.innerHTML = t.gear;
        pinion.innerHTML = t.pinion;
        const pl = plungerPaths(P, s.dip ?? 0);
        plunger.innerHTML = k.solidSvg(pl.rod, { tone: "hi", crease: "none" }) + k.solidSvg(pl.pad, { tone: "hi" });
        for (const lamp of lamps) lamp.setAttribute("opacity", (s["lamp:" + lamp.dataset.lamp] ?? 0).toFixed(3));
      },
    };
  }
  return { mount };
})();`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const view = process.argv.includes("--portrait") ? "portrait" : "landscape";
  const angle = Number(process.argv.find((a) => a.startsWith("--angle="))?.slice(8) ?? 0);
  const dip = Number(process.argv.find((a) => a.startsWith("--dip="))?.slice(6) ?? 0);
  const pose = { ...REST, turn: angle, dip, lit: dip ? 0 : -1 };
  const { B, P, svg } = figure(view, pose);
  if (process.argv.includes("--page")) {
    const out = path.join(path.dirname(new URL(import.meta.url).pathname), `../../.figures/carousel-${view}-${angle}.html`);
    write(out, checkPage({ title: "Key carousel", fig: "Fig. 2", svg, readout: `${B.R.items.length} items` }));
    console.log("wrote", out);
  }
  A.auditOrExit(B.R, P, { crowd: [] });
}
