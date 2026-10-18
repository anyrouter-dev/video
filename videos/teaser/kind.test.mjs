import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kind from './kind.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

test('collect is deterministic: an unedited film keeps the same identity', async () => {
  const a = await kind.collect({ dir });
  const b = await kind.collect({ dir });
  assert.deepEqual(a.parts, b.parts);
  assert.ok(a.parts.some(p => p.startsWith('compositions/s14-end.html:')), 'the scenes are part of the identity');
  assert.ok(a.parts.some(p => p.startsWith('audio/score.wav:')), 'the score is part of the identity');
});

test('the generator sources are not part of the identity, only what the render reads', async () => {
  const { parts } = await kind.collect({ dir });
  assert.equal(parts.some(p => p.startsWith('release/')), false);
});

test('the headline states the length read from index.html', async () => {
  const seconds = /data-duration="([\d.]+)"/.exec(read('index.html'))[1];
  assert.equal(kind.headline(await kind.collect({ dir })), `AnyRouter in ${seconds} seconds`);
});

test('the committed index.html is the light theme the driver renders', () => {
  assert.match(read('index.html'), /background:#FFFFFF/);
});
