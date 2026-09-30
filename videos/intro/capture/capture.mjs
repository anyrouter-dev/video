// Capture real anyrouter.dev UI in light mode for the intro film.
// usage: node capture/capture.mjs
import { chromium } from '/Users/duet/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'assets', 'shots');

const PAGES = [
  { name: 'home', url: 'https://anyrouter.dev/' },
  { name: 'models', url: 'https://anyrouter.dev/models' },
  { name: 'pool', url: 'https://anyrouter.dev/byok/pool' },
  { name: 'donate', url: 'https://anyrouter.dev/donate' },
  { name: 'pricing', url: 'https://anyrouter.dev/pricing' },
  { name: 'playground', url: 'https://anyrouter.dev/playground' },
  { name: 'free', url: 'https://anyrouter.dev/models?free=1' },
];

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
});
const page = await ctx.newPage();

for (const p of PAGES) {
  try {
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) {
    console.error('nav', p.name, e.message);
  }
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, `${p.name}-fold.png`) });
  await page.screenshot({ path: path.join(OUT, `${p.name}-full.png`), fullPage: true });
  console.log('ok', p.name, page.url());
}
await browser.close();
