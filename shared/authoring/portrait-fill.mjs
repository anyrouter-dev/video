// The portrait gate the stage audit cannot see: a real screen cropped through a line of its text,
// and a frame that leaves the phone's height empty or draws where YouTube Shorts puts its UI.
//
//   node shared/authoring/portrait-fill.mjs <project-dir | film.mp4> [--step=0.5] [--json]
//     [--captions=SELECTOR] [--caption-band=TOP,BOTTOM]
//
//   crop  (project) every <img> a box crops, sampled at each step while it is shown and not in
//         flight: each cropped edge, read in the source image's own pixels, must fall in
//         whitespace. An edge with ink close on both sides of it for CROP.run px runs through text.
//   fill  (project or mp4) each sampled frame's ink, captions left out: outside a camera travel,
//         at most FILL.maxShort of the frames may have their content span less than FILL.min of
//         the height from FILL.top to FILL.bottom, and no ink may sit in a Shorts zone (SHORTS)
//         for two samples in a row.
//
// A project gives the captions' boxes (--captions, matched elements are masked) and the camera's
// travels (a stage-sized element marked data-in-flight="1"). An mp4 knows neither: the caption
// band (--caption-band) is masked across the frame, and every frame is judged.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openFilm, within } from './stage-audit.mjs';
import { PORTRAIT, PORTRAIT_CAPTION_BAND } from './portrait.mjs';

// YouTube Shorts draws its title, buttons and progress over the bottom ~380 px and a strip ~120 px
// wide down the right side below the middle (1080x1920).
export const SHORTS = { bottom: 1540, right: 960, rightFrom: 900 };
// The content block spans at least `min` of the height from `top` to `bottom`, outside travels,
// in all but `maxShort` of the frames.
export const FILL = { top: 200, bottom: 1540, min: 0.7, maxShort: 0.2 };
// What counts as ink in a rendered frame: a pixel `contrast` away from the frame's commonest value,
// so a light page's background dots (#DCDCDC) are not ink, and a dark stage reads the same as a
// light one; in at least `row` px of a row. Or a hairline (a card's #E7E7E7 edge on white), `line`
// away from it in one run at least `run` px long, which the dots, apart on their grid, never make.
const INK = { contrast: 56, row: 4, zone: 24, line: 19, run: 24 };
// A crop edge runs through text when, for `run` px along it (gaps up to `bridge` px between
// strokes bridged), there is ink within `reach` px on both sides, ignoring the `rule` px either
// side of the edge where a hairline border may sit. A side edge reaches past a word gap, so a cut
// between two words of a line counts; a top or bottom edge reaches only into a glyph, so the gap
// between two lines does not. Ink is a pixel `contrast` away from the strip's commonest value, so
// a dark page reads the same.
export const CROP = { reach: { side: 10, end: 5 }, rule: 2, run: 8, bridge: 6, contrast: 64 };

/** A gray image's value at (x, y), or null off the image. */
const at = (img, x, y) => (x < 0 || y < 0 || x >= img.w || y >= img.h ? null : img.px[y * img.w + x]);

/**
 * Whether one edge of a crop runs through ink: { cuts, run, at } where `run` is the longest stretch
 * of crossings along the edge, in source px. `edge` is left|right|top|bottom, `pos` its line in
 * the image's own px, `from`..`to` its visible extent along it.
 */
export function edgeCut(img, { edge, pos, from, to }, c = CROP) {
  const across = edge === 'left' || edge === 'right', reach = across ? c.reach.side : c.reach.end;
  const e = Math.round(pos), a = Math.max(0, Math.floor(from)), b = Math.min(across ? img.h : img.w, Math.ceil(to));
  const get = (along, off) => (across ? at(img, e + off, along) : at(img, along, e + off));
  // the strip's background is its commonest value
  const hist = new Uint32Array(256);
  for (let s = a; s < b; s++) for (let o = -reach; o <= reach; o++) { const v = get(s, o); if (v != null) hist[v]++; }
  const bg = hist.indexOf(Math.max(...hist));
  const ink = (s, o) => { const v = get(s, o); return v != null && Math.abs(v - bg) > c.contrast; };
  const side = (s, sign) => { for (let o = c.rule + 1; o <= reach; o++) if (ink(s, sign * o)) return true; return false; };
  let start = null, last = null, best = 0, where = null;
  for (let s = a; s < b; s++) {
    if (!(side(s, -1) && side(s, 1))) continue;
    if (start == null || s - last > c.bridge + 1) start = s;
    last = s;
    if (s - start + 1 > best) { best = s - start + 1; where = start; }
  }
  return { cuts: best >= c.run, run: best, at: where };
}

/**
 * Each edge of `region` (source px, { x0, y0, x1, y1 }) that a crop makes, judged by edgeCut.
 * `cropped` names the sides the box actually cuts; an edge at the image's own border cuts nothing.
 */
export function cropCuts(img, region, cropped = { left: true, right: true, top: true, bottom: true }) {
  const { x0, y0, x1, y1 } = region, out = [];
  const edges = [
    ['left', x0, y0, y1, x0 > 0.5], ['right', x1, y0, y1, x1 < img.w - 0.5],
    ['top', y0, x0, x1, y0 > 0.5], ['bottom', y1, x0, x1, y1 < img.h - 0.5],
  ];
  for (const [edge, pos, from, to, inside] of edges) {
    if (!cropped[edge] || !inside) continue;
    const r = edgeCut(img, { edge, pos, from, to });
    if (r.cuts) out.push({ edge, pos: Math.round(pos), run: r.run, at: r.at });
  }
  return out;
}

/**
 * One frame's ink, captions masked: { top, bottom, zone } where top/bottom bound the rows with ink
 * (null when the frame is blank) and `zone` counts ink pixels in the Shorts zones.
 */
export function frameInk(img, masks = []) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < img.px.length; i++) hist[img.px[i]]++;
  const bg = hist.indexOf(Math.max(...hist));
  let top = null, bottom = null, zone = 0;
  for (let y = 0; y < img.h; y++) {
    const off = masks.filter(m => y >= m.y0 && y < m.y1);
    const row = y * img.w, low = y > SHORTS.bottom, side = y > SHORTS.rightFrom;
    let n = 0, hair = 0;
    for (let x = 0, run = 0; x <= img.w; x++) {
      const v = x < img.w && !(off.length && off.some(m => x >= m.x0 && x < m.x1)) ? img.px[row + x] : bg;
      if (Math.abs(v - bg) >= INK.line) { run++; continue; }
      if (run >= INK.run) { hair += run; if (low || (side && x > SHORTS.right)) zone += run; }
      run = 0;
    }
    for (let x = 0; x < img.w; x++) {
      if (Math.abs(img.px[row + x] - bg) < INK.contrast) continue;
      if (off.length && off.some(m => x >= m.x0 && x < m.x1)) continue;
      n++;
      if (low || (side && x > SHORTS.right)) zone++;
    }
    if (n >= INK.row || hair) { top ??= y; bottom = y; }
  }
  return { top, bottom, zone };
}

/** How much of FILL's height a frame's ink spans, 0..1. */
export const fillOf = ({ top, bottom }) => (top == null ? 0 : Math.max(0, Math.min(bottom, FILL.bottom) - Math.max(top, FILL.top)) / (FILL.bottom - FILL.top));

/**
 * The verdict over a film's samples ({ t, travel, ink }): the share of judged frames short of
 * FILL.min, and every run of two or more samples with ink in a Shorts zone.
 */
export function judgeFill(samples) {
  const judged = samples.filter(s => !s.travel);
  const short = judged.filter(s => fillOf(s.ink) < FILL.min);
  // spans [from, to] of two or more samples running with ink in a zone
  const zones = [];
  for (let i = 1; i < judged.length; i++) {
    if (!(judged[i].ink.zone >= INK.zone && judged[i - 1].ink.zone >= INK.zone)) continue;
    if (zones.at(-1)?.[1] === judged[i - 1].t) zones.at(-1)[1] = judged[i].t;
    else zones.push([judged[i - 1].t, judged[i].t]);
  }
  const fills = judged.map(s => fillOf(s.ink)).sort((a, b) => a - b);
  return {
    judged: judged.length,
    shortShare: judged.length ? short.length / judged.length : 0,
    short: short.map(s => s.t),
    median: fills.length ? fills[fills.length >> 1] : 0,
    zones,
    ok: (judged.length ? short.length / judged.length : 0) <= FILL.maxShort && !zones.length,
  };
}

// How a crop is planned on a captured page: ink is `contrast` off the page's commonest value, low
// enough that a table's hairline rules join its columns into one, and a column of the page is in use
// where `used` rows of it have ink, so one rule across the page (under a nav bar) joins nothing; a
// gutter between columns is at least `gutter` px of blank columns, and the crop's side sits at most
// `margin` px into it; a gap a top or bottom edge may sit in is `gap` rows with under `row` ink px
// across the column, and the column is
// read in the rows from `above` px over the focus to `below` px under it.
export const PLAN = { contrast: 24, used: 3, gutter: 24, margin: 40, gap: 12, row: 5, above: 700, below: 1300 };

/**
 * Where to crop a captured page so its edges fall in whitespace: { x0, x1, gaps, text } in the
 * image's own px. x0..x1 is the column that holds `focus` (a box, the line the step is about), or
 * the inkiest column without one, its sides in the gutters around it; with `whole`, the full width.
 * `gaps` are the rows a top or bottom edge may sit on (the middle of each blank band across the
 * column, and the image's own top and bottom), only in the rows around the focus where neither side
 * has text close on both sides of it: past them another column may reach across a side. `text` is
 * the median height of a line of text in the column.
 */
export function planCrop(img, { focus = null, whole = false } = {}, p = PLAN) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < img.px.length; i += 7) hist[img.px[i]]++;
  const bg = hist.indexOf(Math.max(...hist));
  const ink = (x, y) => Math.abs(img.px[y * img.w + x] - bg) > p.contrast;
  const fy = focus ? focus.y0 : 0, ya = Math.max(0, fy - p.above), yb = Math.min(img.h, fy + p.below);
  const used = new Uint8Array(img.w);
  for (let x = 0; x < img.w; x++) for (let y = ya, n = 0; y < yb; y++) if (ink(x, y) && ++n >= p.used) { used[x] = 1; break; }
  // columns of ink, split where a gutter runs the whole band
  const segs = [];
  for (let x = 0, blank = Infinity; x < img.w; x++) {
    if (!used[x]) { blank++; continue; }
    if (!segs.length || blank >= p.gutter) segs.push({ a: x, b: x + 1, ink: 0 });
    const s = segs.at(-1);
    s.b = x + 1; s.ink++;
    blank = 0;
  }
  if (!segs.length) return { x0: 0, x1: img.w, gaps: [0, img.h], text: 0 };
  // the columns the focus reaches into, joined; without one, the inkiest
  const hit = focus ? segs.map((s, i) => (s.b + p.gutter > focus.x0 && s.a - p.gutter < focus.x1 ? i : -1)).filter(i => i >= 0) : [];
  const [k, last] = hit.length ? [hit[0], hit.at(-1)] : Array(2).fill(segs.indexOf(segs.reduce((m, s) => (s.ink > m.ink ? s : m))));
  const s = { a: segs[k].a, b: segs[last].b }, prev = segs[k - 1], next = segs[last + 1];
  const x0 = whole ? 0 : Math.max(0, s.a - Math.min(p.margin, prev ? Math.floor((s.a - prev.b) / 2) : p.margin));
  const x1 = whole ? img.w : Math.min(img.w, s.b + Math.min(p.margin, next ? Math.floor((next.a - s.b) / 2) : p.margin));
  // rows: blank across the column, or a line of text; a hairline rule down the column is neither
  const gaps = [0], runs = [];
  let start = 0, blankRun = 0;
  for (let y = 0; y <= img.h; y++) {
    let n = 0;
    if (y < img.h) for (let x = x0; x < x1 && n < p.row; x++) if (ink(x, y)) n++;
    if (n < p.row) {
      if (blankRun === 0 && y > start) runs.push(y - start);
      blankRun++;
      continue;
    }
    if (blankRun >= p.gap && y - blankRun > 0) gaps.push(y - Math.ceil(blankRun / 2));
    if (blankRun) start = y;
    blankRun = 0;
  }
  if (blankRun >= p.gap) gaps.push(img.h - Math.ceil(blankRun / 2));
  gaps.push(img.h);
  // a side is clear in a row with no ink within CROP's reach on both sides of it
  const near = (e, y, sign) => { for (let o = CROP.rule + 1; o <= CROP.reach.side; o++) { const x = e + sign * o; if (x >= 0 && x < img.w && ink(x, y)) return true; } return false; };
  const clear = y => [x0, x1].every(e => e <= 0 || e >= img.w || !(near(e, y, -1) && near(e, y, 1)));
  let lo = Math.min(ya, fy), hi = Math.max(yb, fy);
  while (lo > 0 && clear(lo - 1)) lo--;
  while (hi < img.h && clear(hi)) hi++;
  const inBand = whole ? gaps : gaps.filter(y => y >= lo && y <= hi);
  const lines = runs.filter(h => h >= 10 && h <= 90).sort((a, b) => a - b);
  return { x0, x1, gaps: [...new Set(inBand)], text: lines.length ? lines[lines.length >> 1] : 0 };
}

/**
 * The rows of a planned crop to show in `H` px of the image's height: { y0, y1 }, each on a gap.
 * As much as fits, holding `focus` whole and in its upper part where it can.
 */
export function fitRows(gaps, focus, H) {
  const stops = [...gaps].sort((a, b) => a - b);
  const better = (a, b) => { const i = a.findIndex((v, k) => v !== b[k]); return i >= 0 && a[i] > b[i]; };
  let best = null;
  for (const y0 of stops) {
    if (focus && y0 > focus.y0) break;
    const y1 = stops.filter(y => y > y0 && y - y0 <= H).at(-1);
    if (y1 == null) continue;
    // holding the focus first, then the most shown, then the focus a quarter of the way down
    const score = [!focus || y1 >= focus.y1 ? 1 : 0, y1 - y0, focus ? -Math.abs(focus.y0 - y0 - 0.25 * (y1 - y0)) : -y0];
    if (!best || better(score, best.score)) best = { y0, y1, score };
  }
  return best ? { y0: best.y0, y1: best.y1 } : { y0: stops[0], y1: stops.find(y => y > stops[0]) };
}

/**
 * An image file as gray pixels, scaled to `w` x `h` when given. ffmpeg reads a file, never stdin (a
 * screenshot piped in left it waiting for good), and a call that stalls throws after a minute.
 */
export function grayOf(file, { w, h } = {}) {
  const size = w && h ? null : JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', file], { encoding: 'utf8', timeout: 60000 })).streams[0];
  const W = w ?? size.width, H = h ?? size.height;
  const buf = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-vf', `scale=${W}:${H}:flags=area`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1'], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: W * H * 2, timeout: 60000 });
  return { w: W, h: H, px: buf };
}

// Runs in the page: the captions' boxes, whether the camera is travelling, and each shown image a
// box crops, with the part of it in view in the image's own px.
function measure(captions) {
  const W = innerWidth, H = innerHeight;
  const shown = el => {
    let o = 1;
    for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; o *= parseFloat(cs.opacity || '1'); }
    return o > 0.5;
  };
  const travel = [...document.querySelectorAll('[data-in-flight="1"]')].some(e => e.offsetWidth >= W - 2 && e.offsetHeight >= H - 2 && shown(e));
  const caps = [...document.querySelectorAll(captions)].filter(shown).map(e => e.getBoundingClientRect()).filter(r => r.width && r.height)
    .map(r => ({ x0: Math.floor(r.left) - 2, y0: Math.floor(r.top) - 2, x1: Math.ceil(r.right) + 2, y1: Math.ceil(r.bottom) + 2 }));
  const crops = [];
  for (const img of document.querySelectorAll('img')) {
    if (!img.naturalWidth || !shown(img) || img.closest('[data-in-flight="1"]')) continue;
    const R = img.getBoundingClientRect();
    if (R.width < 2 || R.height < 2) continue;
    let l = R.left, t = R.top, r = R.right, b = R.bottom;
    for (let e = img.parentElement; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const c = e.getBoundingClientRect();
      l = Math.max(l, c.left); t = Math.max(t, c.top); r = Math.min(r, c.right); b = Math.min(b, c.bottom);
    }
    if (r - l < 2 || b - t < 2) continue;
    const sx = img.naturalWidth / R.width, sy = img.naturalHeight / R.height;
    crops.push({
      src: decodeURIComponent(new URL(img.src).pathname), shown: R.width / img.naturalWidth,
      region: { x0: (l - R.left) * sx, y0: (t - R.top) * sy, x1: (r - R.left) * sx, y1: (b - R.top) * sy },
      cropped: { left: l > R.left + 1, right: r < R.right - 1, top: t > R.top + 1, bottom: b < R.bottom - 1 },
    });
  }
  return { travel, caps, crops };
}

/** Samples a built portrait project: { crops: [...], samples: [...] }. */
export async function sampleProject(dir, { step = 0.5, captions = '[data-caption], .cap > span' } = {}) {
  const { page, frame, duration, copy, close } = await openFilm(dir);
  const images = new Map();
  const imageOf = src => {
    // the preview serves the project's files under its own prefix; the file is the path's tail
    if (!images.has(src)) {
      const parts = src.split('/'), k = parts.findIndex((_, i) => fs.existsSync(path.join(copy, ...parts.slice(i))) && parts.slice(i).length);
      images.set(src, k < 0 ? null : grayOf(path.join(copy, ...parts.slice(k))));
    }
    return images.get(src);
  };
  const crops = [], samples = [];
  try {
    for (let t = 0; t < duration; t = +(t + step).toFixed(3)) {
      const m = await within(page.evaluate(t => window.__seekTo(t), t).then(() => page.evaluate(measure, captions)), 120000, `${dir} at ${t}s`);
      for (const c of m.crops) {
        const img = imageOf(c.src);
        if (!img) continue;
        for (const cut of cropCuts(img, c.region, c.cropped)) crops.push({ t, image: path.basename(c.src), shown: +c.shown.toFixed(3), ...cut });
      }
      const shot = path.join(path.dirname(copy), 'frame.png');
      await within(page.screenshot({ type: 'png', path: shot }), 120000, `${dir} screenshot at ${t}s`);
      samples.push({ t, travel: m.travel, ink: frameInk(grayOf(shot, { w: frame.w, h: frame.h }), m.caps) });
    }
  } finally {
    await close();
  }
  return { frame, duration, crops, samples };
}

/** Samples a rendered portrait mp4, scaled to 1080x1920, the caption band masked across. */
export function sampleVideo(file, { step = 0.5, band = [PORTRAIT_CAPTION_BAND.top, PORTRAIT_CAPTION_BAND.top + PORTRAIT_CAPTION_BAND.height] } = {}) {
  const { width: w, height: h } = PORTRAIT, size = w * h;
  const raw = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-vf', `fps=${1 / step},scale=${w}:${h}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1'], { maxBuffer: 2 ** 31 });
  const mask = [{ x0: 0, y0: band[0], x1: w, y1: band[1] }], samples = [];
  for (let i = 0; (i + 1) * size <= raw.length; i++) {
    samples.push({ t: +(i * step).toFixed(3), travel: false, ink: frameInk({ w, h, px: raw.subarray(i * size, (i + 1) * size) }, mask) });
  }
  return { frame: { w, h }, crops: [], samples };
}

/** The whole gate over one portrait film: { ok, crops, fill, problems }. */
export async function auditFill(target, opts = {}) {
  const s = target.endsWith('.mp4') ? sampleVideo(target, opts) : await sampleProject(target, opts);
  if (s.frame.w !== PORTRAIT.width || s.frame.h !== PORTRAIT.height) throw new Error(`${target} is ${s.frame.w}x${s.frame.h}, not a ${PORTRAIT.width}x${PORTRAIT.height} portrait`);
  const fill = judgeFill(s.samples);
  // one line per image and edge, at the first second it cuts
  const crops = [...Map.groupBy(s.crops, c => `${c.image} ${c.edge}`).values()].map(list => ({ ...list[0], times: list.map(c => c.t) }));
  const problems = [
    ...crops.map(c => `crop  ${c.t.toFixed(1).padStart(5)}s  ${c.image}: its ${c.edge} edge (x/y ${c.pos} in the image) runs through text for ${c.run} px, at ${c.times.length} sample(s)`),
    ...(fill.shortShare > FILL.maxShort ? [`fill  ${Math.round(fill.shortShare * 100)}% of ${fill.judged} frames span under ${FILL.min * 100}% of y ${FILL.top}-${FILL.bottom} (limit ${FILL.maxShort * 100}%), median ${Math.round(fill.median * 100)}%, at ${fill.short.slice(0, 12).join(', ')}${fill.short.length > 12 ? ' …' : ''}s`] : []),
    ...fill.zones.map(([a, b]) => `zone  ${a.toFixed(1).padStart(5)}s  ink in the Shorts UI (y > ${SHORTS.bottom}, or x > ${SHORTS.right} below y ${SHORTS.rightFrom}) until ${b.toFixed(1)}s`),
  ];
  return { ok: !problems.length, crops, fill, problems, samples: s.samples };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
  const target = process.argv.slice(2).find(a => !a.startsWith('--'));
  if (!target) { console.error('usage: portrait-fill.mjs <project-dir | film.mp4> [--step=0.5] [--json] [--captions=SELECTOR] [--caption-band=TOP,BOTTOM]'); process.exit(2); }
  const opts = { step: Number(args.step ?? 0.5) };
  if (args.captions) opts.captions = args.captions;
  if (args['caption-band']) opts.band = args['caption-band'].split(',').map(Number);
  const r = await auditFill(path.resolve(target), opts);
  if (args.json) console.log(JSON.stringify({ ok: r.ok, crops: r.crops, fill: r.fill, problems: r.problems }, null, 1));
  else {
    console.log(`portrait fill: ${r.problems.length} problem(s); fill median ${Math.round(r.fill.median * 100)}%, ${Math.round(r.fill.shortShare * 100)}% of ${r.fill.judged} frames short`);
    for (const p of r.problems) console.log(`  ${p}`);
  }
  process.exit(r.ok ? 0 : 1);
}
