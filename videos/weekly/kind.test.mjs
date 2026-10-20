import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kind, { storyOf, voicedOf, cuesOf } from './kind.mjs';
import { weekOf, scriptOf, spanWords, titleLines } from './week.mjs';
import { HIT_GAP } from '../../shared/authoring/mixdown.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const MODELS = path.join(DIR, 'fixtures/models.json');
const LLMS = path.join(DIR, 'fixtures/llms.txt');
const doc = JSON.parse(fs.readFileSync(MODELS, 'utf8'));
const llms = fs.readFileSync(LLMS, 'utf8');
const w = weekOf(doc, llms, '2026-W42');

test('the week holds the models created inside it, BYOK told apart from free', () => {
  assert.equal(w.models.length, 7);
  assert.deepEqual(w.models.filter(m => m.billing === 'free').map(m => m.id).sort(),
    ['nvidia/nemotron-3.5-super-vl-120b-a12b', 'scira/amos-1-large', 'scira/amos-1-small']);
  assert.equal(w.models.filter(m => m.billing === 'byok').length, 4);
  // an alias names a family's newest model; it is not an added model
  assert.ok(!w.models.some(m => m.id.endsWith('-latest')));
});

test('a BYOK model is never counted or named as free', () => {
  const said = scriptOf(w).map(l => l.text).join(' ');
  assert.match(said, /Three are free and four run on your own provider key/);
  assert.doesNotMatch(said, /DeepSeek V4\.1 Flash 1017[^.]*free/);
});

test('a retirement in the changelog is never read as a launch', () => {
  const retired = w.entries.filter(e => e.type === 'retired').map(e => e.title);
  assert.deepEqual(retired, ['GLM-5.3-Flash disabled', 'Amos 1 Medium disabled']);
  // a removed route leaves the model listed: it is a change, not a retirement
  assert.deepEqual(w.entries.filter(e => e.type === 'changed').map(e => e.title), ['Novita routes for DeepSeek V4 Flash removed']);
  assert.match(scriptOf(w).find(l => l.beat === 'changelog').text, /five added, two retired and one changed/);
});

test('a week across two months is said with both', () => {
  assert.equal(spanWords({ from: '2026-09-28', to: '2026-10-04' }), 'September 28 to October 4, 2026');
  assert.equal(spanWords(w), 'October 12 to 18, 2026');
});

test('a title breaks only after a comma or before "and", so no name is split', () => {
  const lines = titleLines('Trinity Large Thinking, BGE Base EN v1.5, DeepSeek V4.1 Flash 1017 and 21 more added', 40);
  assert.ok(lines.length > 1);
  lines.slice(1).forEach((l, k) => assert.ok(lines[k].endsWith(',') || l.startsWith('and '), `${lines[k]} | ${l}`));
});

test('a week with no models still makes a film that says so', () => {
  const empty = weekOf(doc, llms, '2025-W01');
  assert.equal(empty.models.length, 0);
  assert.match(scriptOf(empty).map(l => l.text).join(' '), /No model in the catalog was created this week/);
});

test('one release per week, whatever its facts', async () => {
  const d = await kind.collect({ flags: { week: '2026-W42', from: MODELS, 'llms-from': LLMS } });
  assert.deepEqual(d.parts, ['week:2026-W42']);
  assert.equal(d.label, '2026-W42');
});

test('the film\'s sections sit back to back, and no two big hits land together', () => {
  const s = storyOf(w, voicedOf(w));
  s.beats.forEach((b, k) => { if (k) assert.equal(b.at, +(s.beats[k - 1].at + s.beats[k - 1].dur).toFixed(1)); });
  assert.ok(s.duration >= 20 && s.duration <= 60);
  const big = cuesOf(s, w).filter(c => c.big);
  big.forEach((c, k) => { if (k) assert.ok(c.at - big[k - 1].at >= HIT_GAP); });
});
