import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kind, { factsOf, storyOf, voicedOf, eventsOf, SOUNDS, FEATURED } from './kind.mjs';
import { scriptOf } from './script.mjs';
import { body, codeOf, nameLines, CODE_COLS } from './scene.mjs';
import { cueSheet, HIT_GAP } from '../../shared/authoring/mixdown.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(DIR, 'fixtures/models.json');
const doc = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const byId = id => doc.data.find(m => m.id === id);
const NOW = Date.parse('2026-10-21T23:59:59Z');
const facts = id => factsOf(byId(id), { now: NOW });

test('a BYOK film never calls its model free, in what it says or what it shows', () => {
  for (const id of ['inclusionai/ling-3.1-flash', 'deepseek/deepseek-v4.1-flash']) {
    const f = facts(id);
    assert.equal(f.billing, 'byok');
    const said = scriptOf(f).map(l => l.text).join(' ');
    assert.doesNotMatch(said, /\bfree\b/i, said);
    assert.match(said, /your own provider key/);
    const shown = body(f, { captions: [] }).replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(shown, /\bfree\b/i);
    assert.match(shown, /Bring your own key/);
  }
});

test('a free film says so with its price and no daily cap', () => {
  const said = scriptOf(facts('minimax/minimax-m3.1-flash')).map(l => l.text).join(' ');
  assert.match(said, /free to call, with no daily cap/);
  assert.doesNotMatch(said, /unlimited/i);
});

test('"new" is said only inside the launch window: deepseek-v4-flash dates from July', () => {
  const old = facts('deepseek/deepseek-v4-flash');
  assert.equal(old.isNew, false);
  assert.doesNotMatch(scriptOf(old)[0].text, /\bnew\b/);
  assert.match(body(old, { captions: [] }), /class="kicker">ON ANYROUTER</);
  assert.equal(facts('minimax/minimax-m3.1-flash').isNew, true);
});

test('a reply reaches the screen only from a real capture of a free model', () => {
  assert.ok(facts('minimax/minimax-m3.1-flash').capture);
  assert.equal(facts('nvidia/nemotron-3.5-super-vl-120b-a12b').capture, null);
  assert.ok(!scriptOf(facts('nvidia/nemotron-3.5-super-vl-120b-a12b')).some(l => l.beat === 'reply'));
  // a capture listed for a BYOK model would claim it answers on AnyRouter's own routes
  const fake = { ...byId('inclusionai/ling-3.1-flash'), id: 'minimax/minimax-m3.1-flash' };
  assert.throws(() => factsOf(fake, { now: NOW }), /bills it as byok/);
});

test('kimi-k3 is not featured: no capture proves it answers', () => {
  assert.ok(!FEATURED.includes('moonshotai/kimi-k3'));
});

test('every line of the request and the command sits on one row of the card', () => {
  for (const id of FEATURED) {
    const { request, term } = codeOf(id);
    for (const l of [...request.map(r => r.text), ...term]) assert.ok(l.length <= CODE_COLS, `${id}: "${l}"`);
  }
  assert.throws(() => codeOf(`acme/${'x'.repeat(40)}`), /too long/);
});

test('a name breaks at spaces, then after hyphens, never inside a word', () => {
  assert.deepEqual(nameLines('Nemotron 3.5 Super VL 120B A12B', 13), ['Nemotron 3.5', 'Super VL 120B', 'A12B']);
  assert.deepEqual(nameLines('DeepSeek-V4-Flash', 13), ['DeepSeek-V4-', 'Flash']);
});

test('each film runs 20 to 35 seconds, its beats back to back', () => {
  for (const id of FEATURED) {
    const f = facts(id);
    const s = storyOf(f, voicedOf(f));
    const beats = Object.values(s.beats);
    beats.forEach((b, k) => { if (k) assert.equal(b.at, +(beats[k - 1].at + beats[k - 1].dur).toFixed(1)); });
    assert.ok(s.duration >= 20 && s.duration <= 35, `${id}: ${s.duration}s`);
    // nothing is said past the end of the film
    for (const l of s.said) assert.ok(l.at + l.end < s.duration, `${id}: a line runs past the end`);
  }
});

test('no two big hits land within 0.3 s of each other', () => {
  for (const id of FEATURED) {
    const f = facts(id);
    const cues = cueSheet(eventsOf(storyOf(f, voicedOf(f))), SOUNDS).filter(c => c.big);
    cues.forEach((c, k) => { if (k) assert.ok(c.at - cues[k - 1].at >= HIT_GAP); });
  }
  assert.throws(() => cueSheet([{ event: 'stamp', at: 1 }, { event: 'close', at: 1.1 }], SOUNDS), /two big hits/);
});

test('the fixture collects one release per model, each its own identity', async () => {
  const data = await kind.collect({ flags: { from: FIXTURE, now: '2026-10-21' } });
  const parts = kind.split(data).map(d => d.parts[0]);
  assert.equal(new Set(parts).size, FEATURED.length);
});
