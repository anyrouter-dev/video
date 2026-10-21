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
import { openFilm } from './stage-audit.mjs';
import { PORTRAIT, PORTRAIT_CAPTION_BAND } from './portrait.mjs';

// YouTube Shorts draws its title, buttons and progress over the bottom ~380 px and a strip ~120 px
// wide down the right side below the middle (1080x1920).
export const SHORTS = { bottom: 1540, right: 960, rightFrom: 900 };
// The content block spans at least `min` of the height from `top` to `bottom`, outside travels,
// in all but `maxShort` of the frames.
export const FILL = { top: 200, bottom: 1540, min: 0.7, maxShort: 0.2 };
// What counts as ink in a rendered frame: a pixel `contrast` away from the frame's commonest value,
// so a light page's background dots (#DCDCDC) and hairlines (#E7E7E7) are not ink, and a dark stage
// reads the same as a light one; in at least `row` px of a row.
const INK = { contrast: 56, row: 4, zone: 24 };
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
    let n = 0;
    for (let x = 0; x < img.w; x++) {
      if (Math.abs(img.px[row + x] - bg) < INK.contrast) continue;
      if (off.length && off.some(m => x >= m.x0 && x < m.x1)) continue;
      n++;
      if (low || (side && x > SHORTS.right)) zone++;
    }
    if (n >= INK.row) { top ??= y; bottom = y; }
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
  const zones = [];
  for (let i = 1; i < judged.length; i++) {
    if (judged[i].ink.zone >= INK.zone && judged[i - 1].ink.zone >= INK.zone) zones.push(judged[i - 1].t);
  }
  const fills = judged.map(s => fillOf(s.ink)).sort((a, b) => a - b);
  return {
    judged: judged.length,
    shortShare: judged.length ? short.length / judged.length : 0,
    short: short.map(s => s.t),
    median: fills.length ? fills[fills.length >> 1] : 0,
    zones: [...new Set(zones)],
    ok: (judged.length ? short.length / judged.length : 0) <= FILL.maxShort && !zones.length,
  };
}

/** An image file as gray pixels, scaled to `w` x `h` when given. */
export function grayOf(file, { w, h, input = null } = {}) {
  const size = w && h ? null : JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', file], { encoding: 'utf8' })).streams[0];
  const W = w ?? size.width, H = h ?? size.height;
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', input ? 'pipe:0' : file, '-vf', `scale=${W}:${H}:flags=area`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1'], { input: input ?? undefined, maxBuffer: W * H * 2 });
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
      await page.evaluate(t => window.__seekTo(t), t);
      const m = await page.evaluate(measure, captions);
      for (const c of m.crops) {
        const img = imageOf(c.src);
        if (!img) continue;
        for (const cut of cropCuts(img, c.region, c.cropped)) crops.push({ t, image: path.basename(c.src), shown: +c.shown.toFixed(3), ...cut });
      }
      const shot = await page.screenshot({ type: 'png' });
      samples.push({ t, travel: m.travel, ink: frameInk(grayOf(null, { w: frame.w, h: frame.h, input: shot }), m.caps) });
    }
  } finally {
    await close();
  }
  return { frame, duration, crops, samples };
}

/** Samples a rendered portrait mp4, scaled to 1080x1920, the caption band masked across. */
export function sampleVideo(file, { step = 0.5, band = [PORTRAIT_CAPTION_BAND.top, PORTRAIT_CAPTION_BAND.top + PORTRAIT_CAPTION_BAND.height] } = {}) {
  const { width: w, height: h } = PORTRAIT, size = w * h;
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `fps=${1 / step},scale=${w}:${h}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1'], { maxBuffer: 2 ** 31 });
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
    ...fill.zones.map(t => `zone  ${t.toFixed(1).padStart(5)}s  ink in the Shorts UI (y > ${SHORTS.bottom}, or x > ${SHORTS.right} below y ${SHORTS.rightFrom})`),
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
