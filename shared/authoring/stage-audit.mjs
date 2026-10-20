// Seeks a film through its timeline and fails when what it draws does not fit its stage.
// `hyperframes check` passes a portrait copy that still draws at 1920x1080: a layer cut off at
// y=1080 is not an error to it, and text off the stage is only a note. This catches both.
//
//   node shared/authoring/stage-audit.mjs <project-dir> [--safe=x0,y0,x1,y1] [--step=0.5]
//     [--floor=32] [--shots=DIR] [--json]
//
//   layers  a canvas, svg, img or video that spans the stage one way is a full-bleed layer,
//           and must span it the other way too
//   safe    with --safe, readable text stays inside that box. Frame chrome and captions sit
//           outside it on purpose: they carry data-outside-safe-area and only have to stay
//           on the stage.
//   fit     every line of text is whole where it is set: not cut by a box that clips it, not
//           running past the card around it, no row ending inside a word, an id or a name, no
//           line marked data-one-row on two rows,
//           and never drawn under --floor px (see fitOf)
//
// --shots writes a screenshot to DIR at each second a problem starts, its boxes outlined.
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
// Text drawn smaller than this does not read on a phone (type-audit.mjs holds the same floor).
const FLOOR = 32;

const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer().listen(0, '127.0.0.1', () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  }).on('error', reject);
});

export async function startPreview(dir) {
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
async function seekAndMeasure(t, frame, safe, tol, floor) {
  const player = window.__player, hf = window.__hf;
  // Under load the runtime can put a scene back where it last stood after this seek (a late
  // media load re-syncs it), and its text would be measured a sample late. So the seek is
  // made again until each timeline reads the time its host says it should.
  const late = () => Object.entries(window.__timelines ?? {}).some(([id, tl]) => {
    const start = Number(document.querySelector(`[data-composition-id="${id}"][data-start]`)?.getAttribute('data-start') ?? 0);
    return typeof tl?.time === 'function' && Math.abs(tl.time() - Math.min(Math.max(t - start, 0), tl.duration())) > 0.02;
  });
  for (let attempt = 0; attempt < 10; attempt++) {
    if (typeof player?.renderSeek === 'function') player.renderSeek(t);
    else if (typeof hf?.seek === 'function') hf.seek(t);
    else for (const tl of Object.values(window.__timelines ?? {})) { tl.pause(); tl.seek(t); }
    window.gsap?.ticker?.tick();
    if (typeof window.__hfWaitForSeekCompletion === 'function') await window.__hfWaitForSeekCompletion();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (!late()) break;
    await new Promise(r => setTimeout(r, 50));
  }

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
  const what = el => el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40);
  const live = [];
  for (const el of holders) {
    const r = el.getBoundingClientRect();
    if (!shown(el, r)) continue;
    live.push(el);
    const free = el.closest('[data-outside-safe-area]');
    const [x0, y0, x1, y1] = free || !safe ? [0, 0, frame.w, frame.h] : safe;
    const out = [x0 - r.left, y0 - r.top, r.right - x1, r.bottom - y1];
    if (Math.max(...out) > tol) {
      found.push({ key: keyOf(el), kind: 'text', comp: compOf(el), what: what(el), box: box(r),
        why: `${free || !safe ? 'off the stage' : 'outside the safe area'} ${[x0, y0, x1, y1].join(',')}` });
    }
  }
  return [...found, ...window.__fitOf(live, frame, floor, { keyOf, compOf, what, box })];
}

/**
 * Runs in the page: whether each shown line of text is whole where it is set. Four ways it is not:
 *
 *   clip   its glyphs run past a box that clips them (overflow, a mask) while partly in view
 *   spill  its glyphs run past the card or pill drawn around them
 *   break  a row ends inside a word or a token of code, or between two words of a name
 *   wrap   a line marked data-one-row (a line of code) takes more than one row
 *   small  it is drawn under `floor` px, transforms included
 *
 * The marks a layout uses on purpose (data-layout-allow-overflow) do not excuse it here: a
 * word rising out of its mask is caught for a sample and let go, a line cut for good is not.
 */
function fitOf(live, frame, floor, { keyOf, compOf, what, box }) {
  const found = [];
  const report = (el, kind, why, r = el.getBoundingClientRect()) => found.push({ key: `${keyOf(el)}:${kind}`, kind, comp: compOf(el), what: what(el), box: box(r), why });
  const glyphs = el => [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim()).flatMap(n => {
    const range = document.createRange();
    range.selectNodeContents(n);
    return [...range.getClientRects()].filter(q => q.width > 0 && q.height > 0);
  });
  const scaleOf = el => {
    let s = 1;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.transform !== 'none') { const m = new DOMMatrixReadOnly(cs.transform); s *= Math.min(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d)); }
      if (cs.scale !== 'none') s *= Math.min(...cs.scale.split(' ').map(Number.parseFloat));
    }
    return s;
  };
  const stage = r => r.width >= frame.w - 2 && r.height >= frame.h - 2;
  const clips = cs => cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || (cs.maskImage && cs.maskImage !== 'none');
  const drawn = cs => ['Top', 'Right', 'Bottom', 'Left'].some(s => Number.parseFloat(cs[`border${s}Width`]) > 0)
    || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);

  for (const el of live) {
    const rects = glyphs(el);
    if (!rects.length) continue;
    const px = Number.parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
    if (px < floor) report(el, 'small', `drawn at ${px.toFixed(1)}px, under the ${floor}px floor`);
    // a glyph box is taller than the row it sits in, so up and down a fifth of the size is let through
    const slackY = 0.22 * px, slackX = 2;
    for (let a = el; a && !a.hasAttribute('data-composition-id'); a = a.parentElement) {
      const cs = getComputedStyle(a), b = a.getBoundingClientRect();
      if (stage(b)) continue;
      const cut = clips(cs), card = a !== el && drawn(cs);
      if (!cut && !card) continue;
      const past = q => q.left < b.left - slackX || q.right > b.right + slackX || q.top < b.top - slackY || q.bottom > b.bottom + slackY;
      const inView = q => q.right > b.left && q.left < b.right && q.bottom > b.top && q.top < b.bottom;
      const bad = rects.find(q => past(q) && (!cut || inView(q)));
      if (bad) {
        report(el, cut ? 'clip' : 'spill', `${cut ? 'cut by' : 'runs past'} ${a.tagName.toLowerCase()}${a.classList[0] ? `.${a.classList[0]}` : ''} [${box(b).join(',')}]`, bad);
        break;
      }
    }
  }

  // A line marked data-one-row (a line of code) that takes a second row has wrapped.
  for (const line of document.querySelectorAll('[data-one-row]')) {
    const holders = [...line.querySelectorAll('*'), line].filter(e => live.includes(e));
    const rects = holders.flatMap(glyphs);
    if (!rects.length) continue;
    const tops = rects.map(q => q.top), tall = Math.min(...rects.map(q => q.height));
    if (Math.max(...tops) - Math.min(...tops) > tall * 0.5) report(line, 'wrap', 'a line of code that wraps onto a second row');
  }

  // Rows: the characters of each block that wraps them, in order, with where each sits. A row
  // ends at a space or not at all: code cut inside a token reads as two tokens.
  const MODEL_ID = /(?<![\w/.:~-])[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9.:[\]-]*/gi;
  const blockOf = el => { let b = el; while (b.parentElement && getComputedStyle(b).display === 'inline') b = b.parentElement; return b; };
  const blocks = new Set(live.map(blockOf));
  for (const b of blocks) {
    const chars = [];
    const walk = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (blockOf(n.parentElement) !== b) continue;
      const range = document.createRange();
      for (let i = 0; i < n.nodeValue.length; i++) {
        const ch = n.nodeValue[i];
        range.setStart(n, i); range.setEnd(n, i + 1);
        const q = range.getClientRects()[0];
        chars.push({ ch, q: /\s/.test(ch) || !q ? null : q, el: n.parentElement });
      }
    }
    const text = chars.map(c => c.ch).join('');
    if (!text.trim() || !live.some(el => blockOf(el) === b)) continue;
    const mono = /mono/i.test(getComputedStyle(b).fontFamily.split(',')[0]);
    const ids = new Set();
    for (const m of text.matchAll(MODEL_ID)) for (let i = m.index + 1; i < m.index + m[0].length; i++) ids.add(i);
    // a word that is part of a name, as titleSet in videos/use-case/scenes.mjs reads one
    const words = text.split(/\s+/).filter(Boolean);
    const named = (w, k) => (k > 0 ? /^[A-Z0-9]/ : /^[A-Z0-9].*[A-Z]/).test(w);
    let prev = -1;
    for (let i = 0; i < chars.length; i++) {
      if (!chars[i].q) continue;
      if (prev >= 0 && chars[i].q.top >= chars[prev].q.bottom - 0.3 * chars[prev].q.height) {
        const gap = text.slice(prev + 1, i), before = text[prev], after = text[i];
        const k = text.slice(0, i).trim().split(/\s+/).length;
        let why = null;
        if (/\s/.test(gap)) {
          if (!mono && named(words[k - 1] ?? '', k - 1) && named(words[k] ?? '', k) && !/[,.:;!?]$/.test(words[k - 1] ?? '')) why = `a name split across rows: "${words[k - 1]} | ${words[k]}"`;
        } else why = `${ids.has(i) ? 'an id' : mono ? 'a token' : 'a word'} broken across rows at "${before}|${after}"`;
        if (why && [chars[prev], chars[i]].every(c => live.includes(c.el) || shownChar(c.el))) report(b, 'break', why);
      }
      prev = i;
    }
  }
  return found;

  function shownChar(el) {
    let o = 1;
    for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; o *= Number.parseFloat(cs.opacity || '1'); }
    return o > 0.5;
  }
}

export async function auditStage(dir, { safe = null, step = 0.5, floor = FLOOR, shots = null } = {}) {
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
    // a scene registers its timeline once its fonts are in; sampled before that, it is measured unanimated
    await page.waitForFunction(() => [...document.querySelectorAll('[data-composition-src]')]
      .every(el => window.__timelines?.[el.getAttribute('data-composition-id')]), { timeout: 60000 });
    const duration = await page.evaluate(() => window.__hf?.duration
      || Number(document.querySelector('[data-composition-id][data-duration]')?.getAttribute('data-duration')) || 0);
    if (!(duration > 0)) throw new Error('could not read the film duration');
    await page.evaluate(`window.__fitOf = ${fitOf}`);

    let prev = new Set();
    for (let t = 0; t < duration; t = +(t + step).toFixed(3)) {
      const now = await page.evaluate(seekAndMeasure, t, frame, safe, TOLERANCE, floor);
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
    if (shots) await shoot(page, problemsOf(runs), shots);
  } finally {
    await browser?.close();
    preview?.child.kill();
    fs.rmSync(path.dirname(copy), { recursive: true, force: true });
  }
  return { frame, safe, floor, problems: problemsOf(runs) };
}

const problemsOf = runs => [...runs.values()].filter(r => r.kind === 'layer' || r.worst >= PERSIST)
  .map(({ kind, comp, what, box, why, at }) => ({ kind, comp, what, box, why, at }))
  .sort((a, b) => a.comp.localeCompare(b.comp) || a.at - b.at);

/** A screenshot at each second a problem starts, every box found there outlined. */
async function shoot(page, problems, dir) {
  if (!problems.length) return;
  fs.mkdirSync(dir, { recursive: true });
  for (const [at, list] of Map.groupBy(problems, p => p.at)) {
    await page.evaluate(seekAndMeasure, at, { w: 0, h: 0 }, null, 0, 0);
    await page.evaluate(boxes => {
      for (const [x0, y0, x1, y1] of boxes) {
        const d = document.createElement('div');
        d.className = '__audit-box';
        Object.assign(d.style, { position: 'fixed', left: `${x0 - 4}px`, top: `${y0 - 4}px`, width: `${x1 - x0 + 8}px`, height: `${y1 - y0 + 8}px`, outline: '4px solid #ff0055', zIndex: 2147483647, pointerEvents: 'none' });
        document.body.append(d);
      }
    }, list.map(p => p.box));
    await page.screenshot({ path: path.join(dir, `${at.toFixed(1).padStart(5, '0')}s-${[...new Set(list.map(p => p.kind))].join('+')}.png`) });
    await page.evaluate(() => document.querySelectorAll('.__audit-box').forEach(d => d.remove()));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.slice(2).split('=');
    return [k, v ?? true];
  }));
  const dir = process.argv.slice(2).find(a => !a.startsWith('--'));
  if (!dir) { console.error('usage: stage-audit.mjs <project-dir> [--safe=x0,y0,x1,y1] [--step=0.5] [--floor=32] [--shots=DIR] [--json]'); process.exit(2); }
  const safe = args.safe ? args.safe.split(',').map(Number) : null;
  const report = await auditStage(dir, { safe, step: Number(args.step ?? 0.5), floor: Number(args.floor ?? FLOOR), shots: args.shots ?? null });
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
