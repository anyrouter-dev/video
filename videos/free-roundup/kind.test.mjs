import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kind, { roundupOf, scriptOf, pagesOf, storyOf, voicedOf, cuesOf, MAX_SECONDS, DAYS } from './kind.mjs';
import { gridsOf, GRID, flipsOf } from './board.mjs';
import { HIT_GAP } from '../../shared/authoring/mixdown.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(DIR, 'fixtures/models.json');
const doc = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const NOW = Date.parse('2026-10-21T23:59:59Z');
const at = day => Date.parse(`${day}T00:00:00Z`) / 1000;
const m = (id, day, pricing, extra = {}) => ({ id, created: at(day), pricing, capabilities: ['chat'], display_name: id.split('/')[1], ...extra });

test('a BYOK model at $0 never reaches the board: it needs the caller\'s own key', () => {
  const d = roundupOf({ data: [
    m('acme/free-one', '2026-10-10', { input_per_1m: 0, output_per_1m: 0 }),
    m('acme/byok-zero', '2026-10-10', { input_per_1m: 0, output_per_1m: 0, billing: 'byok' }),
  ] }, { now: NOW });
  assert.deepEqual(d.entries.map(e => e.id), ['acme/free-one']);
});

test('a free model created before the window is not on the board', () => {
  const d = roundupOf({ data: [
    m('acme/recent', '2026-09-22', { input_per_1m: 0, output_per_1m: 0 }),
    m('acme/older', '2026-09-20', { input_per_1m: 0, output_per_1m: 0 }),
    m('acme/latest-alias-latest', '2026-10-01', { input_per_1m: 0, output_per_1m: 0 }),
  ] }, { now: NOW });
  assert.deepEqual(d.entries.map(e => e.id), ['acme/recent']);
});

test('the fixture board lists every free model of the 30 days, newest first, chat and decision told apart', () => {
  const d = roundupOf(doc, { now: NOW });
  assert.equal(d.entries.length, 18);
  assert.equal(d.entries[0].id, 'minimax/minimax-m3.1-flash');
  assert.ok(d.entries.every((e, k) => !k || e.day <= d.entries[k - 1].day));
  assert.equal(d.entries.filter(e => e.type === 'decision').length, 13);
  assert.ok(!d.entries.some(e => e.id === 'nex-agi/nex-n2.5-mini'), 'a BYOK model at $0 is on the board');
});

test('the script says the count the board shows, and never "unlimited"', () => {
  const d = roundupOf(doc, { now: NOW });
  const said = scriptOf(d).map(l => l.text).join(' ');
  assert.match(said, /eighteen free models created in the last thirty days/);
  assert.match(said, /no daily cap/);
  assert.doesNotMatch(said, /unlimited/i);
});

test('every page fits its board in both shapes, and the film stays under a minute', () => {
  const d = roundupOf(doc, { now: NOW });
  const pages = pagesOf(d);
  const grids = gridsOf([...pages.list, pages.pick, pages.close], pages.cols);
  for (const g of grids) for (const o of ['landscape', 'portrait']) {
    assert.equal(g[o].length, GRID[o].rows);
    for (const r of g[o]) assert.equal(r.length, pages.cols[o]);
  }
  const s = storyOf(d, voicedOf(d), pages);
  assert.ok(s.duration <= MAX_SECONDS, `${s.duration}s`);
  s.beats.forEach((b, k) => { if (k) assert.equal(b.at, +(s.beats[k - 1].at + s.beats[k - 1].dur).toFixed(1)); });
  // each cell settles before the next page flips
  for (const o of ['landscape', 'portrait']) {
    const flips = flipsOf(grids, s.flipAt, o);
    for (const f of flips) {
      const next = s.flipAt.find(t => t > f.at + 1e-9);
      if (next) assert.ok(f.at + 0.16 <= next, `a cell is still flipping at ${next}s when the next page starts`);
    }
  }
  const big = cuesOf(s).filter(c => c.big);
  big.forEach((c, k) => { if (k) assert.ok(c.at - big[k - 1].at >= HIT_GAP); });
});

test('a long list is cut with a row that says how many more there are', () => {
  const data = Array.from({ length: 30 }, (_, k) => m(`acme/model-${k}`, '2026-10-10', { input_per_1m: 0, output_per_1m: 0 }));
  const pages = pagesOf(roundupOf({ data }, { now: NOW }));
  assert.match(pages.list.at(-1).landscape.at(-1), /\+ 7 MORE ON ANYROUTER\.DEV\/MODELS/);
});

test('one release per day and list', async () => {
  const d = await kind.collect({ flags: { from: FIXTURE, now: '2026-10-21' } });
  assert.equal(d.label, '2026-10-21');
  assert.equal(d.days, DAYS);
  assert.equal(d.parts.length, 1);
});
