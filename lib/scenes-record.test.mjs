import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The ledger and the renders go to a scratch dir; set before anything reads paths.mjs.
// No key: these runs never call the LLM. --no-voice: they never need Kokoro.
process.env.VIDEO_STATE = fs.mkdtempSync(path.join(os.tmpdir(), 'video-state-'));
delete process.env.ANYROUTER_API_KEY;
const { run, regen } = await import('./cli.mjs');
const ledger = await import('./ledger.mjs');
const { loadKind } = await import('./kinds.mjs');
const { ROOT } = await import('./paths.mjs');

const kind = await loadKind('model-drop');
const FIXTURE = { from: path.join(ROOT, 'videos/model-drop/fixtures/catalog.json'), baseline: path.join(ROOT, 'videos/model-drop/fixtures/baseline.json') };

const renderer = () => ({
  check: () => '',
  render(dir, out) {
    const seconds = +/data-duration="([\d.]+)"/.exec(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'))[1];
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, 'mp4');
    return { seconds, frames: Math.round(seconds * 30), width: 1920, height: 1080 };
  },
  cover: (dir, at, out) => { fs.writeFileSync(out, 'png'); return out; },
});

test('a release freezes its scene picks and its script, and a regen films exactly those', async () => {
  fs.rmSync(path.join(process.env.VIDEO_STATE, 'releases'), { recursive: true, force: true });
  const [made] = await run(kind, { ...FIXTURE, 'no-voice': true }, { hf: renderer() });
  assert.equal(made.state, 'rendered');
  const row = ledger.find('model-drop', made.id);
  const { voice } = ledger.load('model-drop', made.id);
  assert.equal(voice.seed, made.id, 'the seed is the release id');
  assert.deepEqual(row.scenes, voice.picks, 'the ledger row carries the picks for the next release');
  assert.deepEqual(voice.script.map(l => l.slot), kind.slots);
  assert.ok(voice.script.every(l => l.source === 'facts'), 'no key, no LLM');

  // A frozen record wins over a new draw, even after the ledger grows.
  const frozen = { ...voice, picks: { ...voice.picks, cta: voice.picks.cta === 'one-key' ? 'model-page' : 'one-key' },
    script: voice.script.map(l => (l.slot === 'cta' ? { ...l, text: 'A frozen line.' } : l)) };
  fs.writeFileSync(path.join(ledger.recordDir('model-drop', made.id), 'voice.json'), JSON.stringify(frozen));
  await regen(kind, row, { 'no-voice': true }, { hf: renderer() });
  const again = ledger.load('model-drop', made.id).voice;
  assert.deepEqual(again.picks, frozen.picks);
  assert.equal(again.script.find(l => l.slot === 'cta').text, 'A frozen line.');

  // --seed draws again, and the script follows the new picks.
  await regen(kind, ledger.find('model-drop', made.id), { 'no-voice': true, seed: 'another' }, { hf: renderer() });
  const reseeded = ledger.load('model-drop', made.id).voice;
  assert.equal(reseeded.seed, 'another');
  assert.notEqual(reseeded.script.find(l => l.slot === 'cta').text, 'A frozen line.');
});

test('the next release reads the picks of the last one that recorded any', () => {
  fs.rmSync(path.join(process.env.VIDEO_STATE, 'releases'), { recursive: true, force: true });
  const row = (n, scenes) => ledger.snapshot('model-drop', { id: `00${n}-x-h${n}`, hash: `h${n}`, title: 't', ...(scenes && { scenes }) }, { data: { parts: [] }, plan: {} });
  row(1, { hook: 'print' });
  row(2, null);
  assert.deepEqual(ledger.previousScenes('model-drop', 'new'), { hook: 'print' }, 'a row with no picks (declined, or before slots) is skipped');
  row(3, { hook: 'count' });
  assert.deepEqual(ledger.previousScenes('model-drop', 'new'), { hook: 'count' });
  assert.deepEqual(ledger.previousScenes('model-drop', 'h3'), { hook: 'print' }, 'a regen of a release looks before it, not at itself');
});
