import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fingerprint, makeId, tagOf } from './ledger.mjs';
import { clampScenes, writeFilm, igniteScene, ctaScene, esc, IGNITE, CTA } from './film.mjs';
import { parseArgs } from './paths.mjs';
import { loadKinds } from './kinds.mjs';

test('a release is identified by its facts, not the order they arrive in', () => {
  // The nightly run skips a release it has already filmed. If ordering changed
  // the hash, the API returning models in a new order would re-render everything.
  assert.equal(fingerprint(['+a', '+b', '~c']), fingerprint(['~c', '+b', '+a']));
  assert.notEqual(fingerprint(['+a']), fingerprint(['+a', '+b']));
});

test('a release id is safe to use as a git tag and a download URL', () => {
  const id = makeId(7, 'models+pricing', 'abc123', new Date('2026-09-30T12:00:00Z'));
  assert.equal(id, '007-20260930-models-pricing-abc123');
  assert.match(tagOf('model-drop', id), /^[a-z0-9.-]+$/);
});

test('no scene may outlive the next one', () => {
  // Two full layouts on screen at once is the bug that shipped twice.
  const scenes = clampScenes([
    { id: 'b', start: 4, dur: 3 },
    { id: 'a', start: 0, dur: 5 },
    { id: 'c', start: 7, dur: 9 },
  ], 10);
  assert.deepEqual(scenes.map(s => [s.id, s.start, s.dur]), [['a', 0, 4], ['b', 4, 3], ['c', 7, 3]]);
  assert.ok(scenes[0].warn && scenes[2].warn, 'a clamp is reported, never silent');
  assert.equal(scenes[1].warn, undefined, 'back-to-back scenes are not a clamp');
});

test('a written film is a complete project the renderer can open', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'film-'));
  const film = writeFilm(dir, 'demo', {
    title: 'Demo <film>', duration: 6,
    scenes: [igniteScene(), { id: 's01-x', start: IGNITE, dur: 6 - IGNITE - CTA, body: '<p>x</p>', inner: '' },
      ctaScene(6, { kicker: 'k', big: 'b', sub: 's' })],
  });
  const index = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  // Rule: the root is built only from sub-compositions, one host per scene.
  assert.equal((index.match(/data-composition-src=/g) || []).length, film.scenes.length);
  assert.ok(index.includes('Demo &lt;film&gt;'), 'the title is escaped');
  // Rule: asset paths are project-root-relative, so the assets must be inside the project.
  for (const f of ['fonts/inter.woff2', 'fonts/mono.woff2', 'audio/score.wav', 'hyperframes.json', 'meta.json']) {
    assert.ok(fs.existsSync(path.join(dir, f)), `${f} is copied into the project`);
  }
  const scene = fs.readFileSync(path.join(dir, 'compositions/s01-x.html'), 'utf8');
  assert.ok(!scene.includes('../'), 'no path climbs above the project root');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('text from an API cannot break out of the markup', () => {
  assert.equal(esc('<b>&'), '&lt;b&gt;&amp;');
});

test('flags parse the same way for every kind', () => {
  assert.deepEqual(parseArgs(['model-drop', '--limit=1', '--force']), {
    flags: { limit: '1', force: true }, rest: ['model-drop'],
  });
});

test('every kind honours the contract the engine relies on', async () => {
  for (const k of await loadKinds()) {
    assert.equal(typeof k.collect, 'function', `${k.id}.collect`);
    assert.equal(typeof k.headline, 'function', `${k.id}.headline`);
    assert.equal(typeof k.notes, 'function', `${k.id}.notes`);
    assert.equal(typeof k.title, 'string', `${k.id}.title`);
    // An authored kind must bring its own project; a generated one must not.
    assert.equal(fs.existsSync(path.join(k.dir, 'index.html')), !k.film, `${k.id} is either generated or authored`);
  }
});
