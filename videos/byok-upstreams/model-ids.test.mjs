import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { judgeIds, shownIds } from '../explainer/tools/model-ids.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const FRAMES = path.join(HERE, 'compositions/frames');
const { billing } = JSON.parse(fs.readFileSync(path.join(HERE, 'model-billing.json'), 'utf8'));
const read = f => fs.readFileSync(path.join(FRAMES, f), 'utf8');
const rollValues = (html, id) => {
  const slot = new RegExp(`id="f03-${id}"[^>]*>((?:<span[^>]*>[^<]*</span>)+)</span>`).exec(html)[1];
  return [...slot.matchAll(/<span[^>]*>([^<]*)<\/span>/g)].map(m => m[1]);
};

test('every id on screen is a real catalog id', () => {
  const unknown = fs.readdirSync(FRAMES).filter(f => f.endsWith('.html'))
    .flatMap(f => judgeIds(shownIds(read(f)), billing).filter(j => j.status === 'unknown').map(j => `${f}: ${j.id}`));
  assert.deepEqual(unknown, []);
});

test('a BYOK-only id is shown only as running on your own key: each model in the roll has its own "your key" comment', () => {
  const html = read('03-one-key.html');
  const models = rollValues(html, 'model'), comments = rollValues(html, 'cm');
  assert.ok(models.length >= 2, 'the roll shows models');
  assert.equal(comments.length, models.length);
  judgeIds(models.map(m => m.replaceAll('"', '')), billing).forEach((j, i) => {
    if (j.status === 'byok') assert.match(comments[i], /runs on your \w+ key/, `${j.id} has no "your key" comment`);
  });
});
