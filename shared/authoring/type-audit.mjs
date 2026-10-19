// Measures the size text actually renders at across a film's timeline, transforms and SVG
// viewBox scaling included, and fails when any readable text settles below a floor. Run from
// the film's folder: node ../../shared/authoring/type-audit.mjs [--floor=32] [--step=0.5] [--json]
//
// The CLI bundles its compiler and can't lend it, so the page comes from `hyperframes preview`,
// whose /api/projects/<id>/preview route serves the same inlined composition `check` audits.
// Studio rewrites the project's HTML when it opens it (stamps data-hf-id, reformats), so it
// opens a throwaway copy of the film, never the film itself.
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const FLOOR = Number(args.floor ?? 32);
const STEP = Number(args.step ?? 0.5);
const MIN_VISIBLE_S = 0.8;

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CLI = path.join(HERE, '../../node_modules/hyperframes/bin/hyperframes.mjs');
const filmDir = fs.realpathSync('.');
if (!fs.existsSync('index.html')) throw new Error('run from a film folder (no index.html here)');
// The stage size comes from the film, so a portrait rendition (1080x1920) is measured in
// its portrait layout: `@media (orientation: portrait)` follows the viewport.
const root = /<[^>]*data-composition-id[^>]*>/.exec(fs.readFileSync('index.html', 'utf8'))?.[0] ?? '';
const FRAME = { w: Number(/data-width="(\d+)"/.exec(root)?.[1]), h: Number(/data-height="(\d+)"/.exec(root)?.[1]) };
if (!FRAME.w || !FRAME.h) throw new Error('index.html: the root composition has no data-width/data-height');

const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer().listen(0, '127.0.0.1', () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  }).on('error', reject);
});

async function startPreview(dir) {
  const port = await freePort();
  const child = spawn(process.execPath, [CLI, 'preview', '--no-open', '--foreground', '--force-new', `--port=${port}`, dir], { stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) {
    const res = await fetch(`${base}/api/projects`).catch(() => null);
    if (res?.ok) {
      const { projects } = await res.json();
      const project = projects.find(p => fs.realpathSync(p.dir) === dir);
      if (!project) throw new Error(`preview server does not list ${dir}`);
      return { child, url: `${base}/api/projects/${encodeURIComponent(project.id)}/preview` };
    }
    await new Promise(r => setTimeout(r, 250));
  }
  child.kill();
  throw new Error('preview server did not start');
}

// Runs in the page. Mirrors the CLI's seekCompositionTimeline cascade, then measures.
async function seekAndMeasure(t, frame) {
  const player = window.__player, hf = window.__hf;
  if (typeof player?.renderSeek === 'function') player.renderSeek(t);
  else if (typeof hf?.seek === 'function') hf.seek(t);
  else if (typeof player?.seek === 'function') player.seek(t);
  else for (const tl of Object.values(window.__timelines ?? {})) { tl.pause(); tl.seek(t); }
  window.gsap?.ticker?.tick();
  if (typeof window.__hfWaitForSeekCompletion === 'function') await window.__hfWaitForSeekCompletion();
  await new Promise(r => { let done = false; const fin = () => { if (!done) { done = true; r(); } }; setTimeout(fin, 100); requestAnimationFrame(() => requestAnimationFrame(fin)); });

  const ids = (window.__typeAuditIds ??= { map: new WeakMap(), next: 0 });
  const keyOf = el => {
    if (!ids.map.has(el)) ids.map.set(el, ids.next++);
    return ids.map.get(el);
  };
  // Shortest chain unique within the element's composition, the scope the report groups by.
  const selectorOf = el => {
    const scope = el.closest('[data-composition-id]') ?? document;
    const parts = [];
    for (let e = el; e && e !== scope; e = e.parentElement) {
      if (e.id && e.id !== 'root') { parts.unshift(`#${CSS.escape(e.id)}`); break; }
      let s = e.tagName.toLowerCase();
      if (e.classList[0]) s += `.${CSS.escape(e.classList[0])}`;
      const sibs = e.parentElement ? [...e.parentElement.children].filter(c => c.tagName === e.tagName) : [];
      if (sibs.length > 1) s += `:nth-of-type(${sibs.indexOf(e) + 1})`;
      parts.unshift(s);
      if (scope.querySelectorAll(parts.join(' > ')).length === 1) break;
    }
    return parts.join(' > ');
  };
  const visible = (el, rect) => {
    if (rect.width <= 0 || rect.height <= 0) return false;
    if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= frame.w || rect.top >= frame.h) return false;
    let opacity = 1;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none') return false;
      opacity *= Number.parseFloat(cs.opacity || '1');
    }
    const vis = getComputedStyle(el).visibility;
    return opacity > 0.5 && vis !== 'hidden' && vis !== 'collapse';
  };
  // Layout box vs rendered box gives the accumulated scale of every ancestor transform and,
  // for SVG, the viewBox. min() of the two axes keeps a squashed axis from reading as full size.
  // HTML text changes size only through transforms, so its scale is the product of the
  // transform and scale of it and every ancestor, read exactly. Dividing the rendered box by
  // offsetWidth would not do: offsetWidth is rounded to a whole pixel, so text drawn at
  // exactly 36px measured 35.92px. SVG text also scales with its viewBox; its box and getBBox
  // are both fractional.
  const scaleOf = (el, rect) => {
    if (el instanceof SVGGraphicsElement) {
      const { width: w, height: h } = el.getBBox();
      return w && h ? Math.min(rect.width / w, rect.height / h) : null;
    }
    if (!el.offsetWidth || !el.offsetHeight) return null;
    let sx = 1, sy = 1;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.transform !== 'none') {
        const m = new DOMMatrixReadOnly(cs.transform);
        sx *= Math.hypot(m.a, m.b);
        sy *= Math.hypot(m.c, m.d);
      }
      if (cs.scale !== 'none') {
        const [x, y = x] = cs.scale.split(' ').map(Number.parseFloat);
        sx *= x;
        sy *= y;
      }
      const zoom = Number.parseFloat(cs.zoom) || 1;
      sx *= zoom;
      sy *= zoom;
    }
    return Math.min(sx, sy);
  };
  const ownText = el => [...el.childNodes].filter(c => c.nodeType === 3).map(c => c.nodeValue).join(' ').replace(/\s+/g, ' ').trim();
  // Report a line, not its pieces: split-text effects (typewriters, karaoke captions) wrap each
  // letter or word in a sibling of one class, and log lines are runs of styled inline spans.
  // Flex parents blockify split spans, so that test is the sibling pattern, not display.
  // Runtime state classes (is-active) follow the first, so only the first class is compared.
  const oneWord = el => !/\s/.test(el.textContent.trim());
  const splitParent = u => {
    const p = u.parentElement;
    if (!p || p.hasAttribute('data-composition-id') || ownText(p)) return null;
    const kids = [...p.children];
    if (kids.length < 2) return null;
    const size = getComputedStyle(u).fontSize;
    const sameSize = k => getComputedStyle(k).fontSize === size;
    const letter = k => k.tagName === u.tagName && k.classList[0] === u.classList[0] && oneWord(k);
    const letters = kids.every(letter) && (u.classList[0] || kids.every(k => k.textContent.trim().length <= 1));
    const run = k => !k.children.length && getComputedStyle(k).display === 'inline';
    return kids.every(sameSize) && (letters || kids.every(run)) ? p : null;
  };
  const splitLabel = unit => {
    const parts = [...unit.querySelectorAll('*')].filter(e => !e.children.length).map(e => e.textContent.trim());
    return (parts.some(s => s.length > 1) ? parts.join(' ') : unit.textContent).replace(/\s+/g, ' ').trim();
  };
  const compOf = el => el.closest('[data-composition-id]')?.getAttribute('data-composition-id') ?? '(none)';

  const holders = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const p = n.parentElement;
    if (p && n.nodeValue.trim() && !p.closest('script,style,template,noscript,title')) holders.add(p);
  }
  const text = [];
  for (const el of holders) {
    const rect = el.getBoundingClientRect();
    if (!visible(el, rect)) continue;
    const scale = scaleOf(el, rect);
    if (scale == null) continue;
    let unit = el;
    for (let p; (p = splitParent(unit)); ) unit = p;
    const label = unit === el ? ownText(el) : splitLabel(unit);
    text.push({ key: keyOf(unit), comp: compOf(unit), selector: selectorOf(unit), text: label, px: Number.parseFloat(getComputedStyle(el).fontSize) * scale });
  }
  const images = [];
  for (const img of document.querySelectorAll('img')) {
    const src = img.getAttribute('src') ?? '';
    if (!/(^|\/)assets\/.*\.(png|jpe?g|webp)$/i.test(src) || !img.naturalWidth) continue;
    const rect = img.getBoundingClientRect();
    if (!visible(img, rect)) continue;
    images.push({ key: keyOf(img), comp: compOf(img), selector: selectorOf(img), src, naturalWidth: img.naturalWidth, scale: Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight) });
  }
  return { text, images };
}

const started = Date.now();
// Named after the film so the report and the Studio project id read the same.
const copy = path.join(fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'type-audit-'))), path.basename(filmDir));
fs.cpSync(filmDir, copy, { recursive: true, dereference: true, filter: src => !/\/(renders|snapshots)$/.test(src) });
let report, preview, browser;
try {
  preview = await startPreview(copy);
  browser = await puppeteer.launch({
    headless: true,
    executablePath: execFileSync(process.execPath, [CLI, 'browser', 'path'], { encoding: 'utf8' }).trim(),
    args: ['--no-sandbox', '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: FRAME.w, height: FRAME.h, deviceScaleFactor: 1 });
  await page.goto(preview.url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof window.__hf?.seek === 'function' || typeof window.__player?.renderSeek === 'function', { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  const duration = await page.evaluate(() => window.__hf?.duration || Number(document.querySelector('[data-composition-id][data-duration]')?.getAttribute('data-duration')) || 0);
  if (!(duration > 0)) throw new Error('could not read the film duration');

  const text = new Map(), images = new Map();
  for (let i = 0; i * STEP < duration; i++) {
    const t = +(i * STEP).toFixed(3);
    const sample = await page.evaluate(seekAndMeasure, t, FRAME);
    // A split line is as readable as its smallest visible letter at this instant.
    const now = new Map();
    for (const m of sample.text) if (!(now.get(m.key)?.px <= m.px)) now.set(m.key, m);
    for (const m of now.values()) {
      const e = text.get(m.key) ?? { comp: m.comp, selector: m.selector, text: m.text, samples: 0, px: 0, at: t };
      e.samples++;
      if (m.px > e.px + 0.01) Object.assign(e, { px: m.px, at: t, text: m.text || e.text });
      text.set(m.key, e);
    }
    for (const m of sample.images) {
      const e = images.get(m.key) ?? { comp: m.comp, selector: m.selector, src: m.src, naturalWidth: m.naturalWidth, scale: 0, at: t };
      if (m.scale > e.scale) Object.assign(e, { scale: m.scale, at: t });
      images.set(m.key, e);
    }
  }

  const judged = [...text.values()].filter(e => e.samples * STEP >= MIN_VISIBLE_S);
  const row = e => ({ comp: e.comp, px: Math.round(e.px), selector: e.selector, text: e.text.slice(0, 40), at: e.at });
  report = {
    film: path.basename(filmDir), floor: FLOOR, step: STEP, duration, samples: Math.ceil(duration / STEP),
    offenders: judged.filter(e => e.px < FLOOR).sort((a, b) => a.comp.localeCompare(b.comp) || a.px - b.px).map(row),
    passing: judged.filter(e => e.px >= FLOOR).sort((a, b) => a.comp.localeCompare(b.comp) || a.px - b.px).map(row),
    flashed: text.size - judged.length,
    screenshots: [...images.values()].sort((a, b) => a.comp.localeCompare(b.comp) || a.scale - b.scale)
      .map(e => ({ comp: e.comp, scale: +e.scale.toFixed(3), naturalWidth: e.naturalWidth, src: e.src, selector: e.selector, at: e.at })),
    runtime_s: 0,
  };
} finally {
  await browser?.close();
  preview?.child.kill();
  fs.rmSync(path.dirname(copy), { recursive: true, force: true });
}
report.runtime_s = +((Date.now() - started) / 1000).toFixed(1);

const groupBy = rows => Map.groupBy(rows, r => r.comp);
const printRows = rows => {
  for (const [comp, list] of groupBy(rows)) {
    console.log(`  ${comp}`);
    for (const r of list) console.log(`    ${String(r.px).padStart(4)}px  ${r.at.toFixed(1).padStart(6)}s  ${JSON.stringify(r.text).padEnd(44)} ${r.selector}`);
  }
};
if (args.json) console.log(JSON.stringify(report, null, 1));
else {
  console.log(`${report.film}: ${report.duration.toFixed(1)}s, ${report.samples} samples every ${STEP}s, floor ${FLOOR}px`);
  console.log(`\nBelow floor (${report.offenders.length}):`);
  printRows(report.offenders);
  console.log(`\nAt or above floor (${report.passing.length}):`);
  printRows(report.passing);
  console.log(`\nScreenshots, max rendered width / natural width (${report.screenshots.length}):`);
  for (const [comp, list] of groupBy(report.screenshots)) {
    console.log(`  ${comp}`);
    for (const s of list) console.log(`    ${s.scale.toFixed(2).padStart(6)}x  natural ${String(s.naturalWidth).padStart(5)}px  ${s.at.toFixed(1).padStart(6)}s  ${s.src}  ${s.selector}`);
  }
  console.log(`\n${report.offenders.length} below ${FLOOR}px, ${report.passing.length} at or above, ${report.flashed} visible under ${MIN_VISIBLE_S}s (not judged). ${report.runtime_s}s.`);
}
process.exitCode = report.offenders.length ? 1 : 0;
