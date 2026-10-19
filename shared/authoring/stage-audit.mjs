// Seeks a film through its timeline and fails when what it draws does not fit its stage.
// `hyperframes check` passes a portrait copy that still draws at 1920x1080: a layer cut off at
// y=1080 is not an error to it, and text off the stage is only a note. This catches both.
//
//   node shared/authoring/stage-audit.mjs <project-dir> [--safe=x0,y0,x1,y1] [--step=0.5] [--json]
//
//   layers  a canvas, svg, img or video that spans the stage one way is a full-bleed layer,
//           and must span it the other way too
//   safe    with --safe, readable text stays inside that box. Frame chrome and captions sit
//           outside it on purpose: they carry data-outside-safe-area and only have to stay
//           on the stage.
//
// The page comes from `hyperframes preview`, as in type-audit.mjs, on a throwaway copy.
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CLI = path.join(HERE, '../../node_modules/hyperframes/bin/hyperframes.mjs');
// The camera leans a scene by a few percent, so text set on the safe edge moves past it a little.
const TOLERANCE = 24;
// One sample out of place is an entrance in flight; two in a row is where the text sits.
const PERSIST = 2;

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
  for (let i = 0; i < 240; i++) {
    const res = await fetch(`${base}/api/projects`).catch(() => null);
    if (res?.ok) {
      const { projects } = await res.json();
      const project = projects.find(p => fs.realpathSync(p.dir) === dir);
      if (!project) break;
      return { child, url: `${base}/api/projects/${encodeURIComponent(project.id)}/preview` };
    }
    await new Promise(r => setTimeout(r, 250));
  }
  child.kill();
  throw new Error(`preview server did not serve ${dir}`);
}

// Runs in the page: seek, then measure every visible layer and line of text.
async function seekAndMeasure(t, frame, safe, tol) {
  const player = window.__player, hf = window.__hf;
  if (typeof player?.renderSeek === 'function') player.renderSeek(t);
  else if (typeof hf?.seek === 'function') hf.seek(t);
  else for (const tl of Object.values(window.__timelines ?? {})) { tl.pause(); tl.seek(t); }
  window.gsap?.ticker?.tick();
  if (typeof window.__hfWaitForSeekCompletion === 'function') await window.__hfWaitForSeekCompletion();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const ids = (window.__stageAuditIds ??= { map: new WeakMap(), next: 0 });
  const keyOf = el => { if (!ids.map.has(el)) ids.map.set(el, ids.next++); return ids.map.get(el); };
  const compOf = el => el.closest('[data-composition-id]')?.getAttribute('data-composition-id') ?? '(none)';
  const nameOf = el => el.tagName.toLowerCase() + (el.classList[0] ? `.${el.classList[0]}` : '');
  const shown = (el, r) => {
    if (r.width <= 0 || r.height <= 0) return false;
    let opacity = 1;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      opacity *= Number.parseFloat(cs.opacity || '1');
    }
    return opacity > 0.5;
  };
  const box = r => [r.left, r.top, r.right, r.bottom].map(Math.round);
  const found = [];

  for (const el of document.querySelectorAll('canvas, svg, img, video')) {
    if (el.ownerSVGElement) continue;
    const r = el.getBoundingClientRect();
    if (!shown(el, r)) continue;
    const spans = r.width >= frame.w - 2 || r.height >= frame.h - 2;
    const covers = r.left <= 1 && r.top <= 1 && r.right >= frame.w - 1 && r.bottom >= frame.h - 1;
    if (spans && !covers) {
      found.push({ key: keyOf(el), kind: 'layer', comp: compOf(el), what: nameOf(el), box: box(r),
        why: `a full-bleed layer that does not cover the ${frame.w}x${frame.h} stage` });
    }
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const holders = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const p = n.parentElement;
    if (p && n.nodeValue.trim() && !p.closest('script,style,template,noscript,title')) holders.add(p);
  }
  for (const el of holders) {
    const r = el.getBoundingClientRect();
    if (!shown(el, r)) continue;
    const free = el.closest('[data-outside-safe-area]');
    const [x0, y0, x1, y1] = free || !safe ? [0, 0, frame.w, frame.h] : safe;
    const out = [x0 - r.left, y0 - r.top, r.right - x1, r.bottom - y1];
    if (Math.max(...out) > tol) {
      found.push({ key: keyOf(el), kind: 'text', comp: compOf(el), what: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), box: box(r),
        why: `${free || !safe ? 'off the stage' : 'outside the safe area'} ${[x0, y0, x1, y1].join(',')}` });
    }
  }
  return found;
}

export async function auditStage(dir, { safe = null, step = 0.5 } = {}) {
  const film = fs.realpathSync(dir);
  const root = /<[^>]*data-composition-id[^>]*>/.exec(fs.readFileSync(path.join(film, 'index.html'), 'utf8'))?.[0] ?? '';
  const frame = { w: Number(/data-width="(\d+)"/.exec(root)?.[1]), h: Number(/data-height="(\d+)"/.exec(root)?.[1]) };
  if (!frame.w || !frame.h) throw new Error(`${dir}/index.html: the root composition has no data-width/data-height`);

  const copy = path.join(fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'stage-audit-'))), path.basename(film));
  fs.cpSync(film, copy, { recursive: true, dereference: true, filter: src => !/\/(renders|snapshots)$/.test(src) });
  let preview, browser;
  const runs = new Map();
  try {
    preview = await startPreview(copy);
    browser = await puppeteer.launch({
      headless: true,
      executablePath: execFileSync(process.execPath, [CLI, 'browser', 'path'], { encoding: 'utf8' }).trim(),
      args: ['--no-sandbox', '--hide-scrollbars', '--mute-audio'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: frame.w, height: frame.h, deviceScaleFactor: 1 });
    await page.goto(preview.url, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.__hf?.seek === 'function' || typeof window.__player?.renderSeek === 'function', { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    const duration = await page.evaluate(() => window.__hf?.duration
      || Number(document.querySelector('[data-composition-id][data-duration]')?.getAttribute('data-duration')) || 0);
    if (!(duration > 0)) throw new Error('could not read the film duration');

    let prev = new Set();
    for (let t = 0; t < duration; t = +(t + step).toFixed(3)) {
      const now = await page.evaluate(seekAndMeasure, t, frame, safe, TOLERANCE);
      const seen = new Set();
      for (const f of now) {
        seen.add(f.key);
        const run = runs.get(f.key);
        if (run && prev.has(f.key)) run.streak++;
        if (!run) runs.set(f.key, { ...f, at: t, streak: 1, worst: 1 });
        else if (!prev.has(f.key)) Object.assign(run, { ...f, at: t, streak: 1 });
        const r = runs.get(f.key);
        r.worst = Math.max(r.worst, r.streak);
      }
      prev = seen;
    }
  } finally {
    await browser?.close();
    preview?.child.kill();
    fs.rmSync(path.dirname(copy), { recursive: true, force: true });
  }
  return { frame, safe, problems: [...runs.values()].filter(r => r.kind === 'layer' || r.worst >= PERSIST)
    .map(({ kind, comp, what, box, why, at }) => ({ kind, comp, what, box, why, at }))
    .sort((a, b) => a.comp.localeCompare(b.comp) || a.at - b.at) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.slice(2).split('=');
    return [k, v ?? true];
  }));
  const dir = process.argv.slice(2).find(a => !a.startsWith('--'));
  if (!dir) { console.error('usage: stage-audit.mjs <project-dir> [--safe=x0,y0,x1,y1] [--step=0.5] [--json]'); process.exit(2); }
  const safe = args.safe ? args.safe.split(',').map(Number) : null;
  const report = await auditStage(dir, { safe, step: Number(args.step ?? 0.5) });
  if (args.json) console.log(JSON.stringify(report, null, 1));
  else {
    console.log(`stage ${report.frame.w}x${report.frame.h}${safe ? `, safe area ${safe.join(',')}` : ''}: ${report.problems.length} problem(s)`);
    // A split line reports each letter; a few per composition say where to look.
    for (const [comp, list] of Map.groupBy(report.problems, p => p.comp)) {
      console.log(`  ${comp}`);
      for (const p of list.slice(0, 4)) console.log(`    ${p.at.toFixed(1).padStart(5)}s  ${p.kind.padEnd(5)} [${p.box.join(',')}] ${JSON.stringify(p.what)}  ${p.why}`);
      if (list.length > 4) console.log(`    … ${list.length - 4} more`);
    }
  }
  process.exit(report.problems.length ? 1 : 0);
}
