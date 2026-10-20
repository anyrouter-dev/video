import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kind from './kind.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const frames = () => fs.readdirSync(path.join(dir, 'compositions/frames')).map(f => [f, read(`compositions/frames/${f}`)]);

test('collect is deterministic: an unedited film keeps the same identity', async () => {
  const a = await kind.collect({ dir });
  const b = await kind.collect({ dir });
  assert.deepEqual(a.parts, b.parts);
  assert.ok(a.parts.some(p => p.startsWith('assets/voice/01.wav:')), 'the narration is part of the identity');
  assert.ok(a.parts.some(p => p.startsWith('assets/lf-kit.js:')), 'the figures are part of the identity');
  assert.ok(a.parts.some(p => p.startsWith('compositions/frames/13-close.html:')), 'the scenes are part of the identity');
});

test('the tools, truth snapshots and planning files are not part of the identity', async () => {
  const { parts } = await kind.collect({ dir });
  assert.equal(parts.some(p => /^(tools|truth|STORYBOARD|SCRIPT|CONCEPT|audio\/)/.test(p)), false);
});

test('the cover is taken from the settled end card', () => {
  const seconds = parseFloat(/data-duration="([\d.]+)"/.exec(read('index.html'))[1]);
  const at = kind.coverAt({ duration: seconds });
  assert.ok(at > seconds - 2.5 && at < seconds - 0.6, `cover at ${at}s of ${seconds}s`);
});

test('every model id the film names runs on AnyRouter credits, so no viewer key is implied', () => {
  const facts = JSON.parse(read('facts.json'));
  const models = JSON.parse(read('truth/models-all.json')).data;
  const shown = new Set(facts.routeModels);
  for (const f of ['assets/lf-kit.js', ...frames().map(([f]) => `compositions/frames/${f}`)]) {
    for (const m of read(f).matchAll(/\b([a-z0-9-]+\/[a-z0-9][a-z0-9.-]*-[a-z0-9.-]+)\b/g)) {
      if (models.some(x => x.id === m[1])) shown.add(m[1]);
    }
  }
  assert.ok(shown.size >= 2, 'the film names the models it routes');
  for (const id of shown) {
    const m = models.find(x => x.id === id);
    assert.ok(m, `${id} is in /api/v1/models?all=1`);
    assert.notEqual(m.pricing?.billing, 'byok', `${id} would need the viewer's own provider key`);
  }
});

test('no API key or balance is on screen', () => {
  for (const [f, html] of frames()) {
    assert.doesNotMatch(html, /\b(sk-(ar|or|ant)-|nvapi-|ak_)[A-Za-z0-9]/, `${f} shows a key`);
    assert.doesNotMatch(html, /balance|\$\d+\.\d{2}/i, `${f} shows a balance`);
  }
});

test('the voice stays inside its character budget', () => {
  const meta = JSON.parse(read('audio_meta.json'));
  const spoken = meta.voices.reduce((n, v) => n + v.say.length, 0);
  assert.ok(spoken <= 1300, `${spoken} characters voiced, the budget is 1,300`);
});

test('the music is CC0 and recorded in the license file', () => {
  const meta = JSON.parse(read('audio_meta.json'));
  assert.equal(meta.bgm.license, 'cc0');
  assert.match(read('audio/LICENSES.md'), /CC0 1\.0/);
});
