import test from 'node:test';
import assert from 'node:assert/strict';
import { cropCuts, frameInk, fillOf, judgeFill, FILL, SHORTS } from './portrait-fill.mjs';

const blank = (w, h) => ({ w, h, px: new Uint8Array(w * h).fill(255) });
const paint = (img, x0, y0, x1, y1, v = 20) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) img.px[y * img.w + x] = v; };
// a line of text as a reader's eye meets it: glyph strokes 3 px wide every 6 px, a word gap every 8 glyphs
const textLine = (img, x0, x1, y0, y1) => { for (let x = x0, k = 0; x < x1; x += 6, k++) if (k % 8 !== 7) paint(img, x, y0, x + 3, y1); };

// a captured page: two columns of text lines with a wide gutter, and a hairline box around the right one
const page = () => {
  const img = blank(800, 400);
  for (let y = 40; y < 360; y += 40) { textLine(img, 40, 360, y, y + 22); textLine(img, 440, 760, y, y + 22); }
  paint(img, 420, 20, 421, 380); paint(img, 779, 20, 780, 380);
  return img;
};
const region = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });

test('a crop whose side runs through a line of text fails, naming that edge', () => {
  const cuts = cropCuts(page(), region(200, 30, 780, 370));
  assert.deepEqual(cuts.map(c => c.edge), ['left']);
});

test('a crop whose sides fall in the gutter and in the gaps between lines passes', () => {
  assert.deepEqual(cropCuts(page(), region(400, 30, 790, 370)), []);
});

test('a crop that cuts a line across its height fails at the top or bottom edge', () => {
  assert.deepEqual(cropCuts(page(), region(20, 51, 790, 370)).map(c => c.edge), ['top']);
  assert.deepEqual(cropCuts(page(), region(20, 30, 790, 131)).map(c => c.edge), ['bottom']);
});

test('a crop edge lying on a hairline border is not a cut through text', () => {
  assert.deepEqual(cropCuts(page(), region(420, 30, 790, 370)), []);
});

test('an edge at the image border, or one the box does not crop, is not judged', () => {
  assert.deepEqual(cropCuts(page(), region(0, 0, 800, 400)), []);
  assert.deepEqual(cropCuts(page(), region(200, 30, 780, 370), { left: false, right: true, top: true, bottom: true }), []);
});

test('a dark page is read against its own background, so its light text is ink too', () => {
  const img = page();
  for (let i = 0; i < img.px.length; i++) img.px[i] = 255 - img.px[i];
  assert.deepEqual(cropCuts(img, region(200, 30, 780, 370)).map(c => c.edge), ['left']);
});

const frame = () => blank(1080, 1920);

test('a frame with its content in the top half only is short of the fill', () => {
  const f = frame();
  paint(f, 100, 220, 900, 900);
  assert.ok(fillOf(frameInk(f)) < FILL.min);
});

test('a frame whose content spans most of the height from the top of the safe area is full', () => {
  const f = frame();
  paint(f, 100, 220, 900, 260); paint(f, 100, 1200, 900, 1300);
  assert.ok(fillOf(frameInk(f)) >= FILL.min);
});

test('a caption under the picture does not count as content', () => {
  const f = frame();
  paint(f, 100, 220, 900, 900);
  paint(f, 200, 1420, 880, 1520);
  assert.ok(fillOf(frameInk(f)) >= FILL.min, 'unmasked, the caption stretches the content');
  assert.ok(fillOf(frameInk(f, [{ x0: 190, y0: 1410, x1: 890, y1: 1530 }])) < FILL.min, 'masked, it does not');
});

test('a dark stage is judged by what differs from it, not by how dark it is', () => {
  const f = frame();
  f.px.fill(11);
  paint(f, 100, 220, 900, 900, 240);
  assert.ok(fillOf(frameInk(f)) < FILL.min, 'the dark background itself is not content');
  assert.equal(frameInk(f).zone, 0, 'nor is it ink under the Shorts UI');
  paint(f, 100, 1200, 900, 1300, 240);
  assert.ok(fillOf(frameInk(f)) >= FILL.min);
});

const sample = (t, f, travel = false) => ({ t, travel, ink: frameInk(f) });

test('a film fails when more than a fifth of its frames are short, and travels are not judged', () => {
  const full = frame(); paint(full, 100, 220, 900, 1300);
  const half = frame(); paint(half, 100, 220, 900, 700);
  const ten = (f, travel) => Array.from({ length: 10 }, (_, i) => sample(i, f, travel));
  assert.equal(judgeFill([...ten(full), ...ten(half).slice(0, 2)]).ok, true);
  assert.equal(judgeFill([...ten(full), ...ten(half).slice(0, 4)]).ok, false);
  assert.equal(judgeFill([...ten(full), ...ten(half, true)]).ok, true);
});

test('ink in the Shorts UI zones fails the film once it stays two samples', () => {
  const low = frame(); paint(low, 100, 220, 900, 1300); paint(low, 300, SHORTS.bottom + 40, 700, SHORTS.bottom + 120);
  const side = frame(); paint(side, 100, 220, 900, 1300); paint(side, SHORTS.right + 20, 1000, 1060, 1100);
  const ok = frame(); paint(ok, 100, 220, 900, 1300);
  assert.equal(judgeFill([sample(0, ok), sample(0.5, low), sample(1, ok)]).ok, true, 'one sample is an entrance in flight');
  assert.equal(judgeFill([sample(0, low), sample(0.5, low)]).ok, false);
  assert.equal(judgeFill([sample(0, side), sample(0.5, side)]).ok, false);
});
