import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The ledger and the renders go to a scratch dir; set before anything reads paths.mjs.
process.env.VIDEO_STATE = fs.mkdtempSync(path.join(os.tmpdir(), 'video-state-'));
const { run, regen } = await import('./cli.mjs');
const ledger = await import('./ledger.mjs');
const { BUILD, ROOT } = await import('./paths.mjs');
const { collectAuthored } = await import('./authored.mjs');

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/dual');

/** A film kind over the two-second fixture, which has a landscape and a portrait layout. */
const kind = {
  id: 'dual', title: 'Dual', renditions: ['landscape', 'portrait'],
  dir: FIXTURE, work: path.join(BUILD, 'dual'), project: FIXTURE,
  collect: () => collectAuthored(FIXTURE, ['index.html']),
  headline: () => 'One key, every model', notes: () => ['A two-second card.'],
};

/** The renderer at its boundary: each "film" is the stage size its project declares. */
function renderer() {
  const rendered = [];
  return {
    rendered,
    check: () => '',
    render(dir, out) {
      const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
      const width = +/data-width="(\d+)"/.exec(html)[1];
      const height = +/data-height="(\d+)"/.exec(html)[1];
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, `${width}x${height}`);
      rendered.push(`${width}x${height}`);
      return { seconds: 2, frames: 60, width, height };
    },
    cover: (dir, at, out) => { fs.writeFileSync(out, 'png'); return out; },
  };
}

const sizeOf = film => fs.readFileSync(path.join(ROOT, film.artifact), 'utf8');
const emptyLedger = () => fs.rmSync(path.join(process.env.VIDEO_STATE, 'releases'), { recursive: true, force: true });

/** A release that went out as landscape only, with that film already on YouTube. */
async function landscapeOnly() {
  const data = await kind.collect();
  const hash = ledger.fingerprint(data.parts);
  emptyLedger();
  return ledger.snapshot('dual', {
    id: ledger.makeId(1, data.label, hash, new Date('2026-10-01T00:00:00Z')), hash, kind: 'dual', label: data.label,
    title: 'One key, every model', seconds: 2, renderedAt: '2026-10-01T00:00:00.000Z', commit: 'abc1234',
    renditions: { landscape: { artifact: 'renders/gone.mp4', cover: 'renders/gone.png', youtube: 'https://youtu.be/landscape' } },
    source: null, published: { github: 'https://github.com/anyrouter-dev/video/releases/tag/dual-001' },
  }, { data, plan: {} });
}

test('regen adds the missing portrait to a released film, under the same id, ready for youtube.yml', async () => {
  const before = await landscapeOnly();
  const hf = renderer();
  await regen(kind, before, {}, { hf });

  const after = ledger.find('dual', before.id);
  assert.equal(after.hash, before.hash);
  assert.equal(after.createdAt, before.createdAt);
  assert.equal(ledger.list('dual').length, 1, 'no second row');
  assert.deepEqual(Object.keys(after.renditions), ['landscape', 'portrait']);
  assert.equal(sizeOf(after.renditions.portrait), '1080x1920');
  assert.equal(sizeOf(after.renditions.landscape), '1920x1080');
  assert.equal(after.renditions.landscape.youtube, 'https://youtu.be/landscape', 'the landscape upload is kept');
  assert.equal(after.renditions.portrait.youtube, undefined, 'the new portrait is not uploaded yet');

  // Again: the same row, and the upload is still not duplicated or dropped.
  await regen(kind, after, {}, { hf });
  const again = ledger.find('dual', before.id);
  assert.deepEqual({ ...again, renderedAt: null, renditions: null }, { ...after, renderedAt: null, renditions: null });
  assert.deepEqual(again.renditions, after.renditions);
});

test('run renders a new release in every rendition, then never again', async () => {
  emptyLedger();
  const hf = renderer();
  const first = await run(kind, {}, { hf });
  assert.equal(first.state, 'rendered');
  assert.deepEqual(hf.rendered, ['1920x1080', '1080x1920']);

  const second = await run(kind, {}, { hf });
  assert.equal(second.state, 'skipped');
  assert.deepEqual(hf.rendered, ['1920x1080', '1080x1920'], 'nothing rendered the second time');
});

test('run completes a released film that lacks a rendition, keeping its id and uploads', async () => {
  const before = await landscapeOnly();
  const hf = renderer();
  const result = await run(kind, {}, { hf });
  assert.deepEqual(result, { state: 'rendered', id: before.id });
  const after = ledger.find('dual', before.id);
  assert.deepEqual(Object.keys(after.renditions), ['landscape', 'portrait']);
  assert.equal(after.renditions.landscape.youtube, 'https://youtu.be/landscape');
});

test('--rendition renders that one film and records nothing', async () => {
  emptyLedger();
  const hf = renderer();
  const result = await run(kind, { rendition: 'portrait' }, { hf });
  assert.equal(result.state, 'dev');
  assert.deepEqual(hf.rendered, ['1080x1920']);
  assert.deepEqual(ledger.list('dual'), []);
  await assert.rejects(run(kind, { rendition: 'portrait', publish: true }, { hf }), /dev run/);
});
