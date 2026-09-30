import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kind, { fmtCtx, layoutOf, listCapacity, dropPct } from './kind.mjs';
import { buildRelease, diffCatalog, fingerprintParts, PROVIDER_CLAIM } from './catalog.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const json = f => JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', f), 'utf8'));
const release = () => buildRelease(json('catalog.json'), null, json('baseline.json')).release;

test('the diff reports what shipped: new models, price moves and retirements', () => {
  const rel = release();
  assert.equal(rel.added.length, 7);
  assert.ok(rel.added.every(m => !m.id.startsWith('anyrouter/')), 'first-party virtual ids are not a drop');
  assert.deepEqual(rel.removed, ['inclusionai/ling-2.6-1t']);
  assert.equal(rel.kind, 'models+pricing');
});

test('a wider context window is not reported as a price change', () => {
  // Conflating the two would put a "price rise" film out for a free model.
  const byId = Object.fromEntries(release().changed.map(c => [c.id, c.kind]));
  assert.equal(byId['minimax/m2'], 'context');
  assert.equal(byId['openai/gpt-oss-120b'], 'price-cut');
  assert.equal(byId['qwen/qwen3.5-plus'], 'price-cut');
});

test('a first run films the newest few, not the whole catalog', () => {
  const listed = [1, 2, 3, 4, 5, 6, 7].map(n => ({ id: `o/m${n}`, created: n, inPrice: 1, outPrice: 1 }));
  const d = diffCatalog(listed, null, { first: 3 });
  assert.equal(d.mode, 'first-run');
  assert.deepEqual(d.added.map(m => m.id), ['o/m7', 'o/m6', 'o/m5']);
});

test('the provider count is the site claim, never computed from the API', () => {
  assert.equal(release().totals.providers, PROVIDER_CLAIM);
});

test('the same release always has the same identity', () => {
  assert.deepEqual(fingerprintParts(release()), fingerprintParts(release()));
});

test('context is shown in K below one million', () => {
  // Dividing by 1e6 unconditionally made a 32k window read as "0.0M".
  assert.equal(fmtCtx(32000), '32K');
  assert.equal(fmtCtx(1050000), '1.1M');
  assert.equal(fmtCtx(1000000), '1M');
  assert.equal(fmtCtx(null), '—');
});

test('the model count picks the layout', () => {
  assert.deepEqual([1, 2, 4, 5, 37].map(layoutOf), ['hero', 'cards', 'cards', 'list', 'list']);
});

for (const [limit, layout] of [[1, 'hero'], [3, 'cards'], [0, 'list']]) {
  test(`a ${layout} film fills its length exactly and never overlaps`, () => {
    const film = kind.film(release(), { flags: limit ? { limit: String(limit) } : {} });
    assert.equal(film.layout, layout);
    const scenes = [...film.scenes].sort((a, b) => a.start - b.start);
    assert.equal(new Set(scenes.map(s => s.id)).size, scenes.length, 'scene ids are unique');
    scenes.forEach((s, i) => {
      const end = i + 1 < scenes.length ? scenes[i + 1].start : film.duration;
      assert.ok(Math.abs(s.start + s.dur - end) < 0.01, `${s.id} ends where the next begins`);
    });
  });
}

test('a list film shows no more models than can be read', () => {
  const rel = release();
  const many = { ...rel, added: Array.from({ length: 60 }, (_, i) => ({ ...rel.added[0], id: `o/m${i}` })) };
  const film = kind.film(many, { flags: {} });
  const rows = film.scenes.map(s => (s.body.match(/class="mrow"/g) || []).length).reduce((a, b) => a + b, 0);
  assert.equal(rows, listCapacity(20));
  // The end card still states the true count, not the number that fit.
  assert.ok(film.scenes.at(-1).body.includes('60 new models'));
});

test('every number on screen comes from the catalog', () => {
  const rel = release();
  const hero = kind.film(rel, { flags: { limit: '1' } }).scenes[1].body;
  const m = rel.added[0];
  assert.ok(hero.includes(m.id) && hero.includes(`>${rel.totals.listed}<`));
  assert.ok(hero.includes(m.free ? '$0' : `$${m.inPrice.toFixed(2)}`));
});

test('the headline leads with what shipped', () => {
  const rel = release();
  assert.match(kind.headline(rel), /^7 new models: /);
  assert.equal(kind.headline({ ...rel, added: [rel.added[0]] }), `${rel.added[0].id} is live on AnyRouter`);
  assert.equal(kind.headline({ ...rel, added: [] }), 'Price drop: gpt-oss-120b down 37%');
  assert.equal(kind.headline(rel, { headline: 'from the plan' }), 'from the plan');
});

test('a price drop is measured on the price, not the context window', () => {
  assert.equal(dropPct('0.4/1.6@256000', '0.2/1.6@256000'), 50);
  assert.equal(dropPct('0/0@204800', '0/0@200000'), null);
});
