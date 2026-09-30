import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPlan, numbersIn, factNumbers } from './plan.mjs';

// A small model-drop: the shape the facts actually take.
const facts = {
  totals: { listed: 197, free: 30 },
  added: [
    { id: 'xiaomi/mimo-v2.6-pro', inPrice: 0.48, outPrice: 0.96, context: 1050000 },
    { id: 'mistralai/mistral-small', inPrice: 0.155, outPrice: 0.31, context: 131072 },
    { id: 'baai/bge-m3', inPrice: 0.01, outPrice: 0, context: 128000 },
  ],
  generatedAt: '2026-09-27T13:04:16.094Z',
};
const ids = facts.added.map(m => m.id);
const check = raw => checkPlan(raw, { ids, facts });

test('a good plan passes through untouched', () => {
  const raw = {
    seconds: 14, limit: 2, picks: ['baai/bge-m3', 'xiaomi/mimo-v2.6-pro'],
    lines: { 'baai/bge-m3': 'Embeddings at $0.01 per 1M tokens' },
    headline: 'MiMo V2.6 Pro lands with a 1M window', kicker: 'New on AnyRouter',
    share: 'Three models joined the catalog of 197.', rationale: 'The Pro model is the news.',
  };
  assert.deepEqual(check(raw), { plan: raw, problems: [] });
});

test('a bad plan degrades to the defaults instead of failing the build', () => {
  // The nightly run must still ship a film when the agent writes nonsense.
  const { plan, problems } = check({ seconds: 'long', limit: -1, picks: 'all', headline: 42 });
  assert.deepEqual(plan, {});
  assert.equal(problems.length, 4, 'every removal is reported, never silent');
  assert.deepEqual(check('not json').plan, {});
  assert.deepEqual(check(null), { plan: {}, problems: [] }, 'no plan is not a problem');
});

test('limit 0 survives: it is the agent declining the release', () => {
  // A falsy-check here would turn "do not film this" into "film everything".
  assert.equal(check({ limit: 0 }).plan.limit, 0);
  assert.equal(check({ limit: 1.5 }).plan.limit, undefined);
});

test('seconds outside what a film can hold are dropped', () => {
  assert.equal(check({ seconds: 7 }).plan.seconds, undefined);
  assert.equal(check({ seconds: 61 }).plan.seconds, undefined);
  assert.equal(check({ seconds: 60 }).plan.seconds, 60);
});

test('unknown keys are dropped, so a typo cannot smuggle a setting in', () => {
  const { plan, problems } = check({ headlines: 'x', layout: 'hero' });
  assert.deepEqual(plan, {});
  assert.match(problems.join('\n'), /headlines/);
});

test('picks may only name items the facts contain, once, in the order given', () => {
  // An invented model id would put a model on screen that never shipped.
  const { plan, problems } = check({ picks: ['xiaomi/mimo-v2.6-pro', 'openai/gpt-7', 'baai/bge-m3', 'xiaomi/mimo-v2.6-pro'] });
  assert.deepEqual(plan.picks, ['xiaomi/mimo-v2.6-pro', 'baai/bge-m3']);
  assert.equal(problems.length, 2);
});

test('a kind with no items accepts no picks and no lines', () => {
  const { plan } = checkPlan({ picks: ['a'], lines: { a: 'x' }, headline: 'One key' }, { facts: {} });
  assert.deepEqual(plan, { headline: 'One key' });
});

test('lines must belong to a known item', () => {
  const { plan } = check({ lines: { 'baai/bge-m3': 'Multilingual embeddings', 'x/y': 'Made up' } });
  assert.deepEqual(plan.lines, { 'baai/bge-m3': 'Multilingual embeddings' });
});

test('copy that states a number the facts do not contain is dropped', () => {
  // The whole point of the gate: an invented price is a wrong caption on a public film.
  assert.equal(check({ headline: 'Now $0.30 per 1M' }).plan.headline, undefined);
  assert.equal(check({ headline: '198 models on one key' }).plan.headline, undefined);
  assert.equal(check({ lines: { 'baai/bge-m3': 'A 64K window' } }).plan.lines, undefined);
  assert.equal(check({ share: 'Up to 2M tokens of context.' }).plan.share, undefined);
});

test('numbers match the facts the way the film prints them', () => {
  // The film writes 131072 as "131K" and 0.155 as "$0.16"; copy may do the same.
  for (const ok of ['131K context', '128K context', '1M context', '1.05M context', '$0.16 in', '$0.48 in',
    '197 models', '1,050,000 tokens', 'MiMo V2.6 Pro']) {
    assert.equal(check({ headline: ok }).plan.headline, ok, ok);
  }
  // A bare integer is a count and must be exact: 0.96 does not vouch for "1 model".
  assert.deepEqual(numbersIn('5 models').map(n => n.value), [5], 'a suffix must touch the digits');
});

test('a count of a list is a fact', () => {
  // "3 new models" is true of a list of three even though no field says 3.
  assert.equal(check({ headline: '3 new models' }).plan.headline, '3 new models');
  assert.equal(check({ headline: '4 new models' }).plan.headline, undefined);
});

test('a timestamp does not vouch for small numbers', () => {
  // generatedAt 13:04:16 must not make "16 new models" look true.
  assert.ok(!factNumbers({ at: '2026-09-27T13:04:16.094Z' }).includes(16));
  assert.equal(check({ headline: '16 new models' }).plan.headline, undefined);
});

test('hype, exclamation marks and emoji are dropped', () => {
  // The API has no "best" field: a superlative is always an invention.
  for (const bad of ['The best model yet', 'Blazing fast inference', 'Unleash MiMo', 'New models!', 'New models 🚀', 'Cutting-edge models']) {
    assert.equal(check({ headline: bad }).plan.headline, undefined, bad);
  }
});

test('copy longer than its slot is dropped, not truncated', () => {
  // A cut sentence can say something the whole one did not.
  assert.equal(check({ kicker: 'x'.repeat(33) }).plan.kicker, undefined);
  assert.equal(check({ headline: 'x'.repeat(91) }).plan.headline, undefined);
  assert.equal(check({ share: 'x'.repeat(401) }).plan.share, undefined);
  assert.equal(check({ lines: { 'baai/bge-m3': 'x'.repeat(121) } }).plan.lines, undefined);
});
