import { chromium } from '/Users/duet/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const OUT = process.argv[2];
const b = await chromium.launch({ channel: 'chrome' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, colorScheme: 'light' })).newPage();
await p.goto('https://anyrouter.dev/', { waitUntil: 'networkidle', timeout: 90000 });
const H = await p.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < H; y += 450) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(200); }
await p.waitForTimeout(1500);
const shot = async (sel, name, pad = 0) => {
  const el = await p.$(sel); if (!el) { console.log('missing', sel); return; }
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
  await el.screenshot({ path: `${OUT}/${name}.png` }); console.log('ok', name);
};
await shot('#shared-pool', 'cur-pool');
await shot('#free-credit', 'cur-plans');
const routing = await p.$('#routing .arch-diagram, .arch-diagram');
if (routing) { await routing.scrollIntoViewIfNeeded(); await p.waitForTimeout(900); await routing.screenshot({ path: `${OUT}/cur-routing.png` }); console.log('ok routing'); }
// hero overview with the reel in place
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/cur-hero.png`, clip: { x: 0, y: 0, width: 1440, height: 1500 }, fullPage: true });
await b.close();
