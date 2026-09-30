import { chromium } from '/Users/duet/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const url = process.argv[2] || 'https://anyrouter.dev/', out = process.argv[3] || '/tmp/claude-501/land.png';
const b = await chromium.launch({ channel: 'chrome' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' })).newPage();
await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
const H = await p.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < H; y += 500) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(250); }
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800);
await p.screenshot({ path: out, fullPage: true });
console.log(H);
await b.close();
