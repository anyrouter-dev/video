import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CATALOG, judgeIds, shownIds } from './tools/model-ids.mjs';

const FRAMES = path.join(path.dirname(new URL(import.meta.url).pathname), 'compositions/frames');
const { billing, free } = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const frames = fs.readdirSync(FRAMES).filter(f => f.endsWith('.html'))
  .map(f => ({ name: f.replace(/\.html$/, ''), ids: shownIds(fs.readFileSync(path.join(FRAMES, f), 'utf8')) }));
// Frame 2's voice says "more than 270 models behind one API", so its list may show any catalog id.
const CATALOG_FRAMES = new Set(['02-one-api']);

test('the saved catalog keeps the billing field the rule reads', () => {
  assert.equal(billing['x-ai/grok-4.7'], 'byok');
  assert.notEqual(billing['deepseek/deepseek-v4-flash'], 'byok');
});

test('a frame that shows a model as working on one AnyRouter key shows only ids AnyRouter routes itself', () => {
  const bad = frames.filter(f => !CATALOG_FRAMES.has(f.name))
    .flatMap(f => judgeIds(f.ids, billing).filter(j => j.status !== 'runnable').map(j => `${f.name}: ${j.id} (${j.status})`));
  assert.deepEqual(bad, []);
});

test('the frames that roll ids still show some, so the check above is not vacuous', () => {
  for (const name of ['04-call-by-name', '06-auto', '07-failover', '09-claude-code']) {
    assert.ok(frames.find(f => f.name === name).ids.length > 0, `${name} shows no model id`);
  }
});

test('the frame 2 list shows real catalog ids, the ones AnyRouter routes itself first', () => {
  const judged = judgeIds(frames.find(f => f.name === '02-one-api').ids, billing);
  assert.deepEqual(judged.filter(j => j.status === 'unknown'), []);
  const firstByok = judged.findIndex(j => j.status === 'byok');
  assert.ok(firstByok > 0, 'the list starts with ids AnyRouter routes');
  assert.deepEqual(judged.slice(firstByok).filter(j => j.status === 'runnable'), []);
});

test('the free list shows only free models: AnyRouter routes them and they cost $0', () => {
  const shown = frames.find(f => f.name === '08-free').ids;
  assert.ok(shown.length > 0);
  assert.deepEqual(shown.filter(id => !free.includes(id)), []);
});

test('putting a byok id back in a code roll is caught', () => {
  const html = '<span class="k-roll"><span>"moonshotai/kimi-k3"</span><span>"x-ai/grok-4.7"</span></span><span class="k-url">anyrouter.dev/api/v1</span>';
  assert.deepEqual(shownIds(html), ['moonshotai/kimi-k3', 'x-ai/grok-4.7']);
  assert.deepEqual(judgeIds(shownIds(html), billing).map(j => j.status), ['runnable', 'byok']);
});

test('an id split across spans still reads as one id, and URLs and paths are not ids', () => {
  assert.deepEqual(shownIds('<li><span class="f02-org">nvidia/</span>nemotron-3-super-120b-a12b</li>'), ['nvidia/nemotron-3-super-120b-a12b']);
  assert.deepEqual(shownIds('<span>anyrouter.dev<span>/model/openai/gpt-5.5</span></span> ~/my-project'), []);
});
