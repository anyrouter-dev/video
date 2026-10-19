// Captures real anyrouter.dev screens for the films. Rerun it to refresh the set:
//   PW_DIR=<dir with node_modules/playwright-core> CHROME=<chromium binary> node capture.mjs [shots|scroll]
// Every text node is redacted in the DOM before a pixel is taken; nothing is blurred.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(join(process.env.PW_DIR, 'x.js'))('playwright-core');
const OUT = dirname(fileURLToPath(import.meta.url));
const SITE = 'https://anyrouter.dev';
const SCALE = 2;
const VIEWPORTS = { landscape: { width: 1920, height: 1080 }, portrait: { width: 1080, height: 1920 } };

const SHOTS = [
  { name: 'home', path: '/', settle: 9000, shows: 'The anyrouter.dev home hero with the live cURL example and the top of the model table.' },
  { name: 'models', path: '/models', shows: 'The top of the /models catalog.' },
  { name: 'models-free', path: '/models?free=true', shows: 'The /models catalog with the free filter on.' },
  { name: 'model-claude-opus-5-5', path: '/model/anthropic/claude-opus-5-5', shows: 'The public detail page for anthropic/claude-opus-5-5.' },
  { name: 'model-gpt-5-5', path: '/model/openai/gpt-5.5', shows: 'The public detail page for openai/gpt-5.5.' },
  { name: 'model-gemini-3-1-pro', path: '/model/google/gemini-3.1-pro', shows: 'The public detail page for google/gemini-3.1-pro.' },
  { name: 'model-deepseek-v4-pro', path: '/model/deepseek/deepseek-v4-pro', shows: 'The public detail page for deepseek/deepseek-v4-pro.' },
  { name: 'use-cases', path: '/use-cases', shows: 'The /use-cases index.' },
];

// Runs in the page. Returns what it replaced so the manifest can say so.
function redact() {
  const rules = [
    [/\b(sk-[a-z]{0,4}-?)[A-Za-z0-9_-]{8,}/g, 'sk-ar-••••••••', 'API key'],
    [/\bnvapi-[A-Za-z0-9_-]{8,}/g, 'nvapi-••••••••', 'API key'],
    [/\bBearer\s+(?!\$)[A-Za-z0-9._-]{12,}/g, 'Bearer sk-ar-••••••••', 'bearer token'],
    [/\b([A-Za-z0-9._%+-]{1,3})[A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '$1@••••', 'email address'],
    [/\b(user|org|acct|key)_[A-Za-z0-9]{12,}\b/g, '$1_••••••••', 'account id'],
  ];
  const hits = new Set();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode()); ) {
    let t = n.nodeValue;
    for (const [re, to, what] of rules) if (re.test(t)) { hits.add(what); t = t.replace(re, to); }
    if (t !== n.nodeValue) n.nodeValue = t;
  }
  for (const el of document.querySelectorAll('input,textarea')) {
    for (const [re, to, what] of rules) if (re.test(el.value)) { hits.add(what); el.value = el.value.replace(re, to); }
  }
  return [...hits];
}

function dismiss() {
  const words = /^(accept|accept all|got it|dismiss|close|ok|no thanks)$/i;
  for (const b of document.querySelectorAll('[role=dialog] button, [class*=cookie] button, [class*=toast] button'))
    if (words.test(b.innerText.trim()) || b.getAttribute('aria-label') === 'Close') b.click();
  for (const el of document.querySelectorAll('nextjs-portal, [data-nextjs-toast], [data-sonner-toaster]')) el.remove();
}

async function open(browser, viewport, scale) {
  const state = process.env.AUTH_STATE && existsSync(process.env.AUTH_STATE) ? process.env.AUTH_STATE : undefined;
  return browser.newContext({ viewport, deviceScaleFactor: scale, colorScheme: 'light', storageState: state });
}

async function settle(page, url, ms = 4000) {
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
  await page.evaluate(dismiss);
}

const manifest = existsSync(join(OUT, 'manifest.json')) ? JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')) : [];
function record(entry) {
  const i = manifest.findIndex(e => e.file === entry.file);
  if (i >= 0) manifest[i] = entry; else manifest.push(entry);
  manifest.sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

async function shots(browser, list = SHOTS) {
  mkdirSync(join(OUT, 'screens'), { recursive: true });
  for (const [orientation, viewport] of Object.entries(VIEWPORTS)) {
    const ctx = await open(browser, viewport, SCALE);
    const page = await ctx.newPage();
    for (const s of list) {
      await settle(page, SITE + s.path, s.settle);
      if (s.before) await s.before(page);
      const replaced = await page.evaluate(redact);
      const file = `screens/${s.name}-${orientation}.png`;
      await page.screenshot({ path: join(OUT, file) });
      record({ file, kind: 'screen', url: SITE + s.path, viewport: `${viewport.width}x${viewport.height}`, scale: SCALE,
        shows: s.shows, redacted: replaced.length ? replaced.join(', ') : 'none found', capturedAt: new Date().toISOString() });
      console.log('shot', file, replaced);
    }
    await ctx.close();
  }
}

// Frame-by-frame, so the scroll is eased and exactly 60 fps no matter how slow a screenshot is.
async function scroll(browser) {
  const fps = 60, seconds = 9, viewport = VIEWPORTS.landscape;
  const frames = join(OUT, '.frames');
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const ctx = await open(browser, viewport, 1);
  const page = await ctx.newPage();
  await settle(page, SITE + '/models');
  const max = await page.evaluate(() => document.scrollingElement.scrollHeight - innerHeight);
  const distance = Math.min(max, viewport.height * 3.5);
  for (let y = 0; y <= distance; y += 400) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(150); }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1000);
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  const replaced = await page.evaluate(redact);
  const total = fps * seconds;
  const ease = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
  for (let f = 0; f < total; f++) {
    const t = Math.min(1, Math.max(0, (f / (total - 1) - 0.08) / 0.84));
    await page.evaluate(v => scrollTo(0, v), Math.round(ease(t) * distance));
    await page.screenshot({ path: join(frames, `${String(f).padStart(4, '0')}.png`) });
  }
  await ctx.close();
  mkdirSync(join(OUT, 'scrolls'), { recursive: true });
  const file = 'scrolls/models-scroll.mp4';
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(fps), '-i', join(frames, '%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(OUT, file)]);
  rmSync(frames, { recursive: true, force: true });
  record({ file, kind: 'scroll', url: SITE + '/models', viewport: `${viewport.width}x${viewport.height}`, scale: 1,
    shows: `An eased ${seconds}s scroll at ${fps} fps from the top of /models through about three and a half screens of the catalog.`,
    redacted: replaced.length ? replaced.join(', ') : 'none found', capturedAt: new Date().toISOString() });
  console.log('scroll', file);
}

const browser = await chromium.launch({ executablePath: process.env.CHROME });
const only = process.argv[2];
if (!only || only === 'shots') await shots(browser);
if (!only || only === 'scroll') await scroll(browser);
await browser.close();
