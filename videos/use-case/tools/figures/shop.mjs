// The bench every launch-film figure is built on: a recorder for the audit, drawing helpers that
// record the true shape of what they draw, and the writers for the film fragment and the
// standalone check page (audit, lines.mjs, close-ups).
import fs from "node:fs";
import path from "node:path";
import * as k from "../anatomy/iso-kit.mjs";
import * as G from "../anatomy/lathe.mjs";
import * as A from "../anatomy/audit.mjs";

export { k, G, A };

const KIT = path.join(path.dirname(new URL(import.meta.url).pathname), "../anatomy");
const strip = (file) => fs.readFileSync(path.join(KIT, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const exportsOf = (file) => [...fs.readFileSync(path.join(KIT, file), "utf8").matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);

/** The kit as `k` and its round-part module as `G`, for a frame's live code (a classic script). */
export const kitSource = () => (
  `const k = (() => {\n${strip("iso-kit.mjs")}\nreturn { ${exportsOf("iso-kit.mjs").join(", ")} };\n})();\n`
  + `const G = (() => {\nconst { cameraOf, iso, pathOf } = k;\n${strip("lathe.mjs")}\nreturn { ${exportsOf("lathe.mjs").join(", ")} };\n})();\n`
).replace(/<\/(script|style)/gi, "<\\/$1");

/** Film tokens over the anatomy light theme: white paper, a heavier line for video, no halo. */
export const FILM_CSS = `
.iso.lf-fig{--anatomy-paper:#ffffff;--anatomy-card:#ffffff;--anatomy-face:#ffffff;--anatomy-top:#ffffff;--anatomy-lit-top:#ffffff;--anatomy-weight:1.5px;--lf-accent:#BB4D00}
.iso.lf-fig .iso-halo{display:none}
.iso.lf-fig .lf-lamp{fill:var(--lf-accent);stroke:none}
.iso.lf-fig .lf-ink{fill:var(--anatomy-hi);stroke:none}
`;

export function shop(P) {
  const R = A.recorder(P);
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dots = (points, style) => k.dotsSvg(points, style);

  function put(row, name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) {
    return R.put({ name: R.nameFor(name), at: ref, bias, svg, shapes, piece: "fig", row, ...rest });
  }
  function box(row, name, plan, z, h, style = {}, { steps = 3, bevel = 0.4, inner = "", extra = "", bias = 0, meta = {} } = {}) {
    const shape = R.solid(A.slab(plan, z, h, { name, ...meta }, steps));
    put(row, name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias });
    return shape;
  }
  function cyl(row, name, cx, cy, r, z, h, style = {}, { steps = 28, bevel = 0, inner = "", extra = "", bias = 0, meta = {} } = {}) {
    const shape = R.solid(A.cylinder(cx, cy, r, z, h, { name, ...meta }));
    put(row, name, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias });
    return shape;
  }
  /** A disc on any axis: F from G.frameAlong(origin, axis), from s0 to s1 along it. */
  function disc(row, name, F, s0, s1, r, style = {}, { inner = "", extra = "", bias = 0, meta = {} } = {}) {
    const shape = R.solid(A.disc(F, s0, s1, r, { name, ...meta }));
    const mid = G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2));
    put(row, name, mid, S(G.disc(s0, s1, r, F, P), { tone: "mid", ...style, inner }) + extra, [shape], { bias });
    return shape;
  }
  function prism(row, name, F, poly, s0, s1, style = {}, { inner = "", extra = "", bias = 0, meta = {} } = {}) {
    const shape = R.solid(A.prism(F, poly, s0, s1, { name, ...meta }));
    const cu = poly.reduce((a, p) => a + p[0], 0) / poly.length;
    const cv = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    const mid = G.add3(G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.mul3(F.u, cu)), G.mul3(F.v, cv));
    put(row, name, mid, S(G.prismOf(F, poly, s0, s1, P), { tone: "mid", ...style, inner }) + extra, [shape], { bias });
    return shape;
  }
  return { R, P, at, S, Ln, Dots, put, box, cyl, disc, prism };
}

/**
 * Settles the painter's keys from the recorded geometry, then lays the items out in rows. A row
 * is a group the live code can move and re-order as a whole; inside a row the settled keys hold.
 * `order` lists the rows back to front for the pose that was built. Each item's key becomes its
 * index in the final order, so the audit's depth check judges the order that is drawn.
 */
export function layout(R, P, order) {
  A.settle(R, P);
  const rows = new Map();
  for (const item of R.items) {
    if (!rows.has(item.row)) rows.set(item.row, []);
    rows.get(item.row).push(item);
  }
  const missing = [...rows.keys()].filter((name) => !order.includes(name));
  if (missing.length) throw new Error(`rows with no place in the order: ${missing.join(", ")}`);
  const names = order.filter((name) => rows.has(name));
  let index = 0;
  const out = [];
  for (const name of names) {
    const items = rows.get(name).sort((a, b) => a.key - b.key);
    for (const item of items) item.key = index++;
    out.push({ name, items });
  }
  return out;
}

/** The figure's SVG: one <g data-row> per row, each item's markup in order. */
export function figureMarkup({ width, height, label, rows, rowAttrs = () => "", extra = "", className = "" }) {
  const body = rows.map(({ name, items }) => `<g data-row="${name}"${rowAttrs(name)}>${items.map((i) => i.svg).join("")}</g>`).join("") + extra;
  return k.figureSvg({ width, height, label, body, className });
}

/** A standalone light-theme page around the figure, for lines.mjs, capture.mjs and close-ups. */
export function checkPage({ title, fig, svg, readout = "", script = "" }) {
  const body = k.plateHtml({ fig, title, hint: "film figure", readout, keys: [], caption: title, body: `<div class="iso-stage lf-fig iso" data-theme="light">${svg}</div>` });
  const html = k.pageHtml({ title, theme: "light", body, script, width: 1100 });
  return html.replace("</style>", `${FILM_CSS}.iso-plate{--anatomy-card:#ffffff}</style>`);
}

export function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}
