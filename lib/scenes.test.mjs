import test from 'node:test';
import assert from 'node:assert/strict';
import { pick, classicPicks, timeSlots, VO_PAD } from './scenes.mjs';
import { BEAT } from './film.mjs';

const t = (slot, id, extra = {}) => ({ id, slot, fits: () => true, minDur: 2, scene: () => ({}), line: () => id, ...extra });
const TEMPLATES = [
  t('a', 'a1'), t('a', 'a2'), t('a', 'a3'),
  t('b', 'b1'), t('b', 'b2', { fits: (rel) => rel.wide }),
  t('c', 'c1', { minDur: 3 }),
];
const SLOTS = ['a', 'b', 'c'];
const seeds = Array.from({ length: 200 }, (_, i) => `release-${i}`);

test('the same seed always picks the same templates', () => {
  const once = pick({ seed: 'release-7', slots: SLOTS, templates: TEMPLATES, rel: { wide: true }, ctx: {} });
  for (let i = 0; i < 5; i++) assert.deepEqual(pick({ seed: 'release-7', slots: SLOTS, templates: TEMPLATES, rel: { wide: true }, ctx: {} }), once);
  // …and every template of a slot gets picked by some seed: the draw is not stuck on one.
  const seen = new Set(seeds.map(seed => pick({ seed, slots: SLOTS, templates: TEMPLATES, rel: { wide: true }, ctx: {} }).a));
  assert.deepEqual([...seen].sort(), ['a1', 'a2', 'a3']);
});

test('a template that does not fit the facts is never picked', () => {
  for (const seed of seeds) assert.equal(pick({ seed, slots: SLOTS, templates: TEMPLATES, rel: { wide: false }, ctx: {} }).b, 'b1');
});

test('a slot never repeats the previous release\'s template when another one fits', () => {
  const previous = { a: 'a2', b: 'b1', c: 'c1' };
  for (const seed of seeds) {
    const picks = pick({ seed, slots: SLOTS, templates: TEMPLATES, rel: { wide: true }, ctx: {}, previous });
    assert.notEqual(picks.a, 'a2', seed);
    assert.equal(picks.b, 'b2', `${seed}: b1 was used last time and b2 fits`);
    // The only template that fits is used again: a slot is never left empty.
    assert.equal(picks.c, 'c1');
  }
  // b2 does not fit, so b1 runs again even though the previous release used it.
  assert.equal(pick({ seed: 'x', slots: SLOTS, templates: TEMPLATES, rel: { wide: false }, ctx: {}, previous }).b, 'b1');
});

test('a slot that no template fits is an error, never a silent gap', () => {
  const templates = [t('a', 'a1', { fits: () => false })];
  assert.throws(() => pick({ seed: 's', slots: ['a'], templates, rel: {}, ctx: {} }), /no template fits the a slot/);
  assert.throws(() => classicPicks({ slots: ['a'], templates, rel: {}, ctx: {} }), /no template fits the a slot/);
});

test('the classic picks are the first template that fits each slot', () => {
  assert.deepEqual(classicPicks({ slots: SLOTS, templates: TEMPLATES, rel: { wide: true }, ctx: {} }), { a: 'a1', b: 'b1', c: 'c1' });
});

test('a slot runs for its line plus a breath, rounded up to the beat, and the film is their sum', () => {
  const picks = { a: 'a1', b: 'b1', c: 'c1' };
  const voice = [{ slot: 'a', seconds: 4.13 }, { slot: 'c', seconds: 1.1 }];
  const { slots, duration } = timeSlots({ slots: SLOTS, picks, templates: TEMPLATES, ctx: {}, voice });
  const dur = Object.fromEntries(slots.map(s => [s.slot, s.dur]));
  assert.equal(dur.a, 5, 'a 4.13s line + the pad is 4.73s, so 5s on the beat');
  assert.equal(dur.b, 2, 'no line: the template minimum');
  assert.equal(dur.c, 3, 'a short line never cuts a slot below its minimum');
  for (const s of slots) {
    const line = voice.find(v => v.slot === s.slot);
    if (line) assert.ok(s.dur >= line.seconds + VO_PAD, `${s.slot} outlasts its line`);
    assert.equal(s.start % BEAT, 0, `${s.slot} starts on the beat`);
  }
  assert.equal(duration, slots.reduce((a, s) => a + s.dur, 0));
  assert.deepEqual(slots.map(s => s.start), [0, 5, 7]);
});

test('a film asked to run longer shares the time out to its stretch slots, in whole beats', () => {
  const picks = { a: 'a1', b: 'b1', c: 'c1' };
  const { slots, duration } = timeSlots({ slots: SLOTS, picks, templates: TEMPLATES, ctx: {}, seconds: 12.25, stretch: ['a', 'b'] });
  assert.equal(duration, 12.25);
  const dur = Object.fromEntries(slots.map(s => [s.slot, s.dur]));
  assert.deepEqual(dur, { a: 4.5, b: 4.5, c: 3.25 }, '5s of beats shared by a and b, the quarter-beat to the last slot');
  assert.ok(slots.slice(0, -1).every(s => s.start % BEAT === 0), 'every cut before the last stays on the grid');
  // Asked for less than the slots need, the film runs as long as they need.
  assert.equal(timeSlots({ slots: SLOTS, picks, templates: TEMPLATES, ctx: {}, seconds: 3 }).duration, 7);
});
