import { chromium } from '/Users/duet/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import path from 'node:path';
const OUT = path.resolve('assets/shots');
const PAGES = ['overview', 'pool', 'models', 'speed', 'benchmark', 'apps', 'tool-calling', 'context-length'];
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'light' });
const page = await ctx.newPage();
const apis = new Set();
page.on('response', (r) => { const u = r.url(); if (u.includes('/api/')) apis.add(u.split('?')[0] + (u.includes('?') ? '?…' : '')); });
for (const p of PAGES) {
  try { await page.goto(`https://anyrouter.dev/data/${p}`, { waitUntil: 'networkidle', timeout: 45000 }); } catch (e) { console.error(p, e.message); }
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, `data-${p}-full.png`), fullPage: true });
  console.log('ok', p, page.url(), await page.evaluate(() => document.body.scrollHeight));
}
console.log([...apis].join('\n'));
await browser.close();
