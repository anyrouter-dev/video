import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kind from './kind.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

test('collect is deterministic: an unedited film keeps the same identity, so it is never re-released', async () => {
  const a = await kind.collect({ dir });
  const b = await kind.collect({ dir });
  assert.deepEqual(a.parts, b.parts);
  assert.ok(a.parts.some(p => p.startsWith('index.html:')), 'index.html is part of the identity');
  assert.ok(a.parts.some(p => p.startsWith('audio/score.wav:')), 'the score is part of the identity');
});

test('the label is the version in meta.json, the single place the version lives', async () => {
  const { version } = JSON.parse(read('meta.json'));
  const data = await kind.collect({ dir });
  assert.equal(data.label, `v${version}`);
});

test('the headline states the film length read from index.html, not a number that can drift', async () => {
  const seconds = /data-duration="([\d.]+)"/.exec(read('index.html'))[1];
  const data = await kind.collect({ dir });
  assert.match(kind.headline(data), new RegExp(`\\b${seconds} seconds`));
});

test('a scratch file does not change the identity of the film', async () => {
  const before = await kind.collect({ dir });
  const scratch = path.join(dir, 'renders', '.test-scratch');
  fs.mkdirSync(path.dirname(scratch), { recursive: true });
  fs.writeFileSync(scratch, 'x');
  try {
    assert.deepEqual((await kind.collect({ dir })).parts, before.parts);
  } finally {
    fs.rmSync(scratch);
  }
});
