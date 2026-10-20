import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { judgeIds, shownIds } from '../explainer/tools/model-ids.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const FRAMES = path.join(HERE, 'compositions/frames');
const { billing } = JSON.parse(fs.readFileSync(path.join(HERE, 'model-billing.json'), 'utf8'));
const frames = fs.readdirSync(FRAMES).filter(f => f.endsWith('.html'))
  .map(f => ({ name: f.replace(/\.html$/, ''), ids: shownIds(fs.readFileSync(path.join(FRAMES, f), 'utf8')) }));

test('the film says one key reaches these models, so every id it shows runs on AnyRouter\'s own routes', () => {
  const bad = frames.flatMap(f => judgeIds(f.ids, billing).filter(j => j.status !== 'runnable').map(j => `${f.name}: ${j.id} (${j.status})`));
  assert.deepEqual(bad, []);
});

test('the frames that name models still show some, so the check above is not vacuous', () => {
  for (const name of ['05-switch', '06-fallback']) {
    assert.ok(frames.find(f => f.name === name).ids.length > 0, `${name} shows no model id`);
  }
});
