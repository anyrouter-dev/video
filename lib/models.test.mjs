import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCatalog, isFree, isByok, billingOf, isNew, createdIn, isListing, isDecision, contextLabel, isoWeekOf, weekSpan,
  lastFullWeek, dayOf, dateWords, keyProvidersOf, makerOf, DAY,
} from './models.mjs';

const NOW = Date.UTC(2026, 9, 21, 3);
const at = day => Date.parse(`${day}T00:00:00Z`) / 1000;
const model = (id, pricing, extra = {}) => ({ id, created: at('2026-10-19'), pricing, ...extra });

test('a BYOK model priced at 0 is not free: it runs only on the caller\'s own provider key', () => {
  const byok = model('nex-agi/nex-n2.5-mini', { input_per_1m: 0, output_per_1m: 0, billing: 'byok' });
  assert.equal(isByok(byok), true);
  assert.equal(isFree(byok), false);
  assert.equal(billingOf(byok), 'byok');
});

test('a model is free only when both directions cost $0 on AnyRouter\'s own routes', () => {
  assert.equal(isFree(model('minimax/minimax-m3.1-flash', { prompt: '0', completion: '0', input_per_1m: 0, output_per_1m: 0 })), true);
  // a $0 output with a priced input still costs money
  assert.equal(isFree(model('nace-ai/drex-v2.0', { input_per_1m: 0.06, output_per_1m: 0 })), false);
  assert.equal(billingOf(model('nace-ai/drex-v2.0', { input_per_1m: 0.06, output_per_1m: 0 })), 'credits');
});

test('a price the catalog does not list is not read as $0', () => {
  assert.equal(isFree(model('x/y', {})), false);
});

test('a model older than the window is not new, and neither is one dated after now', () => {
  const m = d => ({ ...model('a/b', {}), created: at(d) });
  assert.equal(isNew(m('2026-10-19'), { now: NOW, days: 30 }), true);
  assert.equal(isNew(m('2026-09-22'), { now: NOW, days: 30 }), true);
  assert.equal(isNew(m('2026-09-20'), { now: NOW, days: 30 }), false);
  // deepseek-v4-flash is listed from July: free, but not new for a 45-day launch window
  assert.equal(isNew(m('2026-07-08'), { now: NOW, days: 45 }), false);
  assert.equal(isNew({ ...m('2026-10-19'), created: NOW / 1000 + DAY }, { now: NOW, days: 30 }), false);
});

test('a -latest alias and an anyrouter/* preset are never counted as added models', () => {
  assert.equal(isListing({ id: 'deepseek/deepseek-flash-latest' }), false);
  assert.equal(isListing({ id: 'anyrouter/free' }), false);
  assert.equal(isListing({ id: 'deepseek/deepseek-v4.1-flash-1017' }), true);
});

test('a decision model is told apart from a chat model by its capabilities', () => {
  assert.equal(isDecision({ capabilities: ['systemone'] }), true);
  assert.equal(isDecision({ capabilities: ['chat', 'reasoning'] }), false);
});

test('context reads in K below 1M, so a 32k window never reads "0.0M"', () => {
  assert.equal(contextLabel(1000000), '1M');
  assert.equal(contextLabel(1050000), '1.05M');
  assert.equal(contextLabel(262144), '262K');
  assert.equal(contextLabel(32000), '32K');
  assert.equal(contextLabel(0), null);
});

test('ISO weeks start on Monday in UTC and name the year of their Thursday', () => {
  assert.equal(isoWeekOf(Date.UTC(2026, 9, 12)), '2026-W42');
  assert.equal(isoWeekOf(Date.UTC(2026, 9, 18, 23, 59)), '2026-W42');
  assert.equal(isoWeekOf(Date.UTC(2026, 9, 19)), '2026-W43');
  assert.equal(isoWeekOf(Date.UTC(2027, 0, 1)), '2026-W53');
  const { from, to } = weekSpan('2026-W42');
  assert.equal(new Date(from).toISOString(), '2026-10-12T00:00:00.000Z');
  assert.equal(new Date(to).toISOString(), '2026-10-19T00:00:00.000Z');
  assert.throws(() => weekSpan('2026-W54'));
});

test('the weekly film is about the last week that has ended, so one run a week sees the whole week', () => {
  assert.equal(lastFullWeek(NOW), '2026-W42');
  assert.equal(lastFullWeek(Date.UTC(2026, 9, 19, 0, 0, 1)), '2026-W42');
});

test('createdIn holds a model to its week, start included and end excluded', () => {
  const span = weekSpan('2026-W42');
  assert.equal(createdIn({ created: at('2026-10-12') }, span), true);
  assert.equal(createdIn({ created: at('2026-10-19') }, span), false);
});

test('dates read as people say them', () => {
  assert.equal(dayOf(at('2026-10-19')), '2026-10-19');
  assert.equal(dateWords('2026-10-02'), 'October 2');
  assert.equal(dateWords('2026-10-02', { short: true }), 'OCT 02');
});

test('a BYOK model lists the providers whose key runs it', () => {
  assert.deepEqual(keyProvidersOf({ providers: ['hermes-agent', 'novita-byok', 'openrouter-byok'] }), ['novita', 'openrouter']);
});

test('makers are named as they name themselves, not as lowercase slugs', () => {
  assert.equal(makerOf({ id: 'minimax/minimax-m3.1-flash', provider: 'minimax' }), 'MiniMax');
  assert.equal(makerOf({ id: 'acme/x', provider: 'Acme Labs' }), 'Acme Labs');
  assert.equal(makerOf({ id: 'acme/x', provider: 'acme' }), 'acme');
});

test('an empty catalog fails at the boundary instead of filming nothing', () => {
  assert.throws(() => parseCatalog({ data: [] }), /empty/);
  assert.throws(() => parseCatalog({ data: [{ id: 'nope', pricing: {}, created: 1 }] }), /not a model id/);
});
