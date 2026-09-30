import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fingerprint, makeId, tagOf } from './ledger.mjs';
import { clampScenes, writeFilm, openScene, endScene, cuesOf, words, esc, OPEN, END } from './film.mjs';
import { parseArgs } from './paths.mjs';
import { loadKinds } from './kinds.mjs';
import { assetStem } from './publish.mjs';

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
    title: 'Demo <film>', duration: 8, label: 'DEMO',
    scenes: [openScene({ kicker: 'k', meta: 'm' }), { id: 's01-x', start: OPEN, dur: 8 - OPEN - END, body: '<p>x</p>', inner: '' },
      endScene(8, { kicker: 'k', big: 'b', sub: 's' })],
  });
  const index = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  // Rule: the root is built only from sub-compositions — every scene, plus the backdrop and the wipe layer.
  assert.equal((index.match(/data-composition-src=/g) || []).length, film.scenes.length + 2);
  assert.ok(index.includes('Demo &lt;film&gt;'), 'the title is escaped');
  // Rule: asset paths are project-root-relative, so the assets must be inside the project.
  for (const f of ['fonts/inter.woff2', 'fonts/mono.woff2', 'audio/mix.wav', 'compositions/bg.html', 'compositions/fx.html',
    'hyperframes.json', 'meta.json']) {
    assert.ok(fs.existsSync(path.join(dir, f)), `${f} is in the project`);
  }
  for (const f of fs.readdirSync(path.join(dir, 'compositions'))) {
    const html = fs.readFileSync(path.join(dir, 'compositions', f), 'utf8');
    assert.ok(!html.includes('../'), `${f}: no path climbs above the project root`);
    // The runtime clones only a sub-composition's <template>: style and script outside it are dropped.
    assert.match(html, /<template>[\s\S]*<style>[\s\S]*<script>[\s\S]*<\/template>/, `${f} carries its style and script inside <template>`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test('every cut is heard, and a scene can ask for more', () => {
  // A cut with no sound under it reads as a glitch; the engine owns that cue so no kind can forget it.
  const cues = cuesOf([
    { id: 'a', start: 0, dur: 2, cues: [{ at: 1, kind: 'hit' }] },
    { id: 'b', start: 2, dur: 3, cues: [{ at: 0.5, kind: 'tick' }] },
    { id: 'c', start: 5, dur: 3 },
  ], 8);
  assert.deepEqual(cues.map(c => [c.at, c.kind]), [[1, 'hit'], [2, 'cut'], [2.5, 'tick'], [5, 'cut']]);
});

test('the bookends frame the film exactly', () => {
  // The first content scene starts where the opening ends, the closing card ends on the last frame.
  assert.equal(openScene({ kicker: 'k' }).dur, OPEN);
  const end = endScene(20, { kicker: 'k', big: 'b' });
  assert.equal(end.start + end.dur, 20);
});

test('text from an API cannot break out of the markup', () => {
  assert.equal(esc('<b>&'), '&lt;b&gt;&amp;');
  assert.ok(!words('<script>x</script>').includes('<script>'), 'word masks escape too');
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

test('a downloaded film is named after what it is about', () => {
  // The Release asset is often all someone keeps; "release.mp4" says nothing once it leaves GitHub.
  const row = (id, label) => ({ id, label, hash: id.split('-').pop() });
  assert.equal(assetStem('release', row('001-20260930-v1.6.0-8209ec52de', 'v1.6.0')), 'anyrouter-release-v1.6.0');
  assert.equal(assetStem('intro', row('001-20260930-v3-22d9cb1e63', 'v4')), 'anyrouter-intro-v4');
  assert.equal(assetStem('model-drop', row('004-20260930-models+pricing-24f646933f', 'models+pricing')),
    'anyrouter-model-drop-2026-09-30');
  assert.equal(assetStem('changelog', row('001-20260930-2026-09-30-7fb8483027', '2026-09-30')), 'anyrouter-changelog-2026-09-30');
});
