// Bakes assets/strip/strip.svg into assets/strip/strip-baked.svg: every element's computed
// paint (fill, stroke, widths, opacities, font) is written onto it as attributes, and the
// <style> block, classes and CSS variables are dropped. The figure's look lives in a
// stylesheet keyed on classes and custom properties; inlined into a composition that
// stylesheet doesn't apply and every face renders black, so the baked file carries its
// paint with it. Run from the project root after tools/strip/build.mjs.
//
// Needs the repo's puppeteer-core and the Chrome HyperFrames downloads.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('../../package.json'));
const puppeteer = require('puppeteer-core');

const CHROME_ROOT = path.join(os.homedir(), '.cache/hyperframes/chrome/chrome-headless-shell');
const chrome = fs.readdirSync(CHROME_ROOT)
  .map(v => path.join(CHROME_ROOT, v, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'))
  .find(p => fs.existsSync(p));
if (!chrome) throw new Error(`no chrome-headless-shell under ${CHROME_ROOT}; run: npx hyperframes browser ensure`);

const SRC = 'assets/strip/strip.svg';
const OUT = 'assets/strip/strip-baked.svg';
const PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap',
  'stroke-linejoin', 'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight', 'letter-spacing',
  'vector-effect'];

const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage();
await page.setContent(`<!doctype html><body style="margin:0">${fs.readFileSync(SRC, 'utf8')}</body>`);

const baked = await page.evaluate(props => {
  const svg = document.querySelector('svg');
  const paint = new Map();
  for (const el of svg.querySelectorAll('*')) {
    if (el.tagName === 'style' || el.closest('defs > style')) continue;
    const cs = getComputedStyle(el);
    paint.set(el, { values: props.map(p => [p, cs.getPropertyValue(p)]), filter: cs.filter });
  }
  // Read everything before writing anything: removing a class changes what its descendants compute.
  for (const [el, { values, filter }] of paint) {
    for (const [p, v] of values) if (v && v !== 'normal') el.setAttribute(p, v);
    el.removeAttribute('class');
    el.removeAttribute('style');
    if (filter && filter !== 'none') el.setAttribute('style', `filter:${filter}`);
  }
  svg.querySelectorAll('style').forEach(s => s.remove());
  // The composition sizes the figure through this class; nothing paints through it any more.
  svg.setAttribute('class', 'ar-strip');
  svg.removeAttribute('data-theme');
  svg.setAttribute('overflow', 'hidden');
  return svg.outerHTML;
}, PROPS);

await browser.close();
fs.writeFileSync(OUT, baked);
console.log(`${OUT}: ${(baked.length / 1024).toFixed(0)} KB, no <style>: ${!baked.includes('<style')}`);

// Inline the baked figure into Frame 3, replacing whatever version of the figure is there.
const FRAME = 'compositions/frames/03-power-strip.html';
const html = fs.readFileSync(FRAME, 'utf8');
const start = html.search(/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" class="(iso-svg iso )?ar-strip"/);
const overlay = html.indexOf('<svg id="03-power-strip-overlay"');
const end = html.lastIndexOf('</svg>', overlay) + '</svg>'.length;
if (start < 0 || overlay < 0 || end <= start) throw new Error(`${FRAME}: could not find the inlined figure`);
fs.writeFileSync(FRAME, html.slice(0, start) + baked + html.slice(end));
console.log(`${FRAME}: figure replaced`);
