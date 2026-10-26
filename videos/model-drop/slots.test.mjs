import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kind, { fmtCtx } from './kind.mjs';
import { buildRelease } from './catalog.mjs';
import { pick, templateOf, VO_PAD, VO_LEAD } from '../../lib/scenes.mjs';
import { voiceProblem, firstPassing } from '../../lib/voice.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RELEASES = path.join(HERE, '../../releases/model-drop');
const record = id => JSON.parse(fs.readFileSync(path.join(RELEASES, fs.readdirSync(RELEASES).find(d => d.startsWith(`${id}-`)), 'data.json'), 'utf8'));
const fixture = () => buildRelease(...['catalog.json', null, 'baseline.json'].map(f => f && JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', f), 'utf8')))).release;
const recorded = fs.readdirSync(RELEASES).filter(d => fs.existsSync(path.join(RELEASES, d, 'data.json'))).sort();
const { slots: SLOTS, templates: TEMPLATES } = kind;

/** Every shape a drop comes in: one model, three, six (a list), a price cut alone, a context change alone. */
const SHAPES = {
  'one model (018)': [record('018'), {}],
  'three models (017)': [record('017'), {}],
  'six models': [fixture(), { limit: '6' }],
  'a price cut alone (013)': [record('013'), {}],
  'a context change alone (009)': [record('009'), {}],
};
const seeds = Array.from({ length: 150 }, (_, i) => `seed-${i}`);
const picksFor = (rel, flags, seed, previous) =>
  pick({ seed, slots: SLOTS, templates: TEMPLATES, rel, ctx: kind.context(rel, { flags }), previous });

// ── the picker ─────────────────────────────────────────────────────────────

test('a release\'s seed always picks the same scenes, and another seed picks others', () => {
  const rel = record('018');
  const a = picksFor(rel, {}, '018-20261025-models-pricing-7c617b51ae');
  assert.deepEqual(picksFor(rel, {}, '018-20261025-models-pricing-7c617b51ae'), a);
  const b = picksFor(rel, {}, 'another-seed');
  assert.ok(SLOTS.some(s => a[s] !== b[s]), `two seeds differ in at least one slot: ${JSON.stringify([a, b])}`);
});

test('every slot is filled, with a template that fits, for every shape of drop', () => {
  for (const [name, [rel, flags]] of Object.entries(SHAPES)) {
    const ctx = kind.context(rel, { flags });
    for (const seed of seeds) {
      const picks = picksFor(rel, flags, seed);
      for (const slot of SLOTS) {
        assert.ok(picks[slot], `${name} ${seed}: ${slot} is filled`);
        assert.ok(templateOf(TEMPLATES, slot, picks[slot]).fits(rel, ctx), `${name} ${seed}: ${slot}:${picks[slot]} fits`);
      }
    }
  }
});

test('a template is picked only when the facts can carry it', () => {
  const ever = (rel, flags, slot) => new Set(seeds.map(seed => picksFor(rel, flags, seed)[slot]));
  // No change on the lead, nothing to put before and after.
  assert.ok(!ever(record('018'), {}, 'compare').has('beforeafter'));
  assert.ok(ever(record('013'), {}, 'compare').has('beforeafter'), 'a price cut does get it');
  // A paid model is never stamped free; a list shows no prices, so neither.
  assert.ok(!ever(record('011'), {}, 'compare').has('free-stamp'));
  assert.ok(!ever(fixture(), { limit: '6' }, 'compare').has('free-stamp'));
  // Only the classic news tells a story of four or more.
  assert.deepEqual([...ever(fixture(), { limit: '4' }, 'news')], ['classic']);
  // There is no anyr command and no OpenAI SDK call for a rerank model.
  const rerank = { ...record('018'), added: [{ ...record('018').added[0], category: 'rerank' }] };
  assert.deepEqual([...ever(rerank, {}, 'howto')], ['curl']);
});

test('a decision model is shown the decisions call, never chat, which rejects it', () => {
  // The catalog says category "text" for a decision model; its capabilities say systemone.
  const [m] = buildRelease({ data: [{ id: 'up/decide', name: 'Decide', category: 'text', capabilities: ['systemone'], pricing: {} }] }, null, null).release.added;
  assert.equal(m.api, 'decision');
  // Releases recorded before that was kept: 005's lead says it is a decision model.
  for (const rel of [{ ...record('018'), added: [{ ...record('018').added[0], api: 'decision' }] }, record('005')]) {
    const ctx = kind.context(rel, {});
    const fits = TEMPLATES.filter(t => t.slot === 'howto' && t.fits(rel, ctx)).map(t => t.id);
    assert.deepEqual(fits, ['anyr', 'curl'], 'the OpenAI SDK has no decisions call');
    const how = id => kind.film(rel, { picks: { ...kind.film(rel, {}).picks, howto: id } }).scenes.find(s => s.slot === 'howto').body;
    assert.match(how('anyr'), /anyr decision --model/);
    assert.match(how('curl'), /\/api\/v1\/decisions/);
    for (const id of fits) assert.doesNotMatch(how(id), /chat/, `${id} sends a decision model to chat`);
  }
});

test('no slot repeats the previous release\'s template when another one fits', () => {
  for (const [name, [rel, flags]] of Object.entries(SHAPES)) {
    const ctx = kind.context(rel, { flags });
    for (const seed of seeds) {
      const previous = picksFor(rel, flags, `${seed}-before`);
      const picks = picksFor(rel, flags, seed, previous);
      for (const slot of SLOTS) {
        const alternatives = TEMPLATES.filter(t => t.slot === slot && t.fits(rel, ctx)).length;
        if (alternatives > 1) assert.notEqual(picks[slot], previous[slot], `${name} ${seed}: ${slot} repeats ${previous[slot]}`);
      }
    }
  }
});

// ── every template, every shape ────────────────────────────────────────────

/** A film for each template of each slot that fits this drop, the other slots classic. */
function* everyTemplate(rel, flags = {}) {
  const ctx = kind.context(rel, { flags });
  for (const t of TEMPLATES.filter(x => x.fits(rel, ctx))) yield [t, kind.film(rel, { flags, picks: { ...kind.film(rel, { flags }).picks, [t.slot]: t.id } })];
}

test('every template states the axis that moved: a context change is never shown as the old prices', () => {
  // 009 moved only its context window; the spec sheet used to print "was $X in · $Y out" for it.
  const context = record('009');
  const c = context.changed[0];
  for (const [t, film] of everyTemplate(context)) {
    if (t.slot !== 'compare') continue;
    const body = film.scenes.filter(s => s.slot === 'compare').map(s => s.body).join('');
    assert.doesNotMatch(body, /was \$/, `${t.id} does not call a context change a price`);
    if (/was /.test(body)) assert.match(body, new RegExp(`was ${fmtCtx(+c.from.split('@')[1])} context`), t.id);
  }
  // A cut that also shrank the window moved three axes: each is shown, old and new.
  const both = { ...record('018'), added: [], spotlight: { ...record('018').added[0], id: 'x-ai/grok-4.1-fast-reasoning', name: 'Grok 4.1 Fast Reasoning', context: 131072 } };
  const spec = kind.film(both, { picks: { ...kind.film(both, {}).picks, compare: 'specsheet' } }).scenes.find(s => s.slot === 'compare').body;
  assert.ok(spec.includes('was $0.20 in · $0.50 out · 1M context'), 'the spec sheet names every axis that moved');
  const ba = kind.film(both, { picks: { ...kind.film(both, {}).picks, compare: 'beforeafter' } }).scenes.find(s => s.slot === 'compare').body;
  for (const v of ['$0.20', '$0.50', '1M', '131K']) assert.ok(ba.includes(`>${v}<`), `before and after shows ${v}`);
});

test('no template lets catalog markup through', () => {
  const rel = record('017');
  const evil = { ...rel.added[0], id: 'o/<img src=x>', name: 'Bad <script>alert(1)</script> & co', provider: '<i>p</i>', category: '<b>c</b>' };
  for (const r of [{ ...rel, added: [evil] }, { ...rel, added: [evil, ...rel.added.slice(1)] }]) {
    for (const [t, film] of everyTemplate(r)) {
      const html = film.scenes.map(s => s.body).join('');
      assert.doesNotMatch(html, /<script>|<img src=x>|<i>p<\/i>|<b>c<\/b>/, `${t.slot}:${t.id}`);
    }
  }
});

test('in a film of five or more no template shows a price', () => {
  for (const [t, film] of everyTemplate(fixture(), { limit: '6' })) {
    for (const s of film.scenes) assert.doesNotMatch(s.body, /\$\s?\d/, `${t.slot}:${t.id} ${s.id}`);
  }
});

// ── the voice-over ─────────────────────────────────────────────────────────

test('every template\'s own line passes the voice gate, for every recorded release', () => {
  for (const id of recorded) {
    const rel = JSON.parse(fs.readFileSync(path.join(RELEASES, id, 'data.json'), 'utf8'));
    const ctx = kind.context(rel, {});
    const facts = kind.facts(rel, ctx);
    const names = Object.values(facts.names);
    for (const t of TEMPLATES.filter(x => x.fits(rel, ctx))) {
      const [{ text }] = firstPassing([{ slot: t.slot, text: t.line(facts, ctx) }], facts, { names });
      assert.equal(voiceProblem(text, facts, { names }), null, `${id} ${t.slot}:${t.id}: "${text}"`);
    }
  }
});

test('the voice may quote only the whitelisted facts', () => {
  const rel = record('018');
  const facts = kind.facts(rel, kind.context(rel, {}));
  // The site's provider claim, never a count of upstreams or the pool.
  assert.equal(facts.totals.providers, 17);
  assert.match(voiceProblem(`${rel.totals.providerBackends} providers on AnyRouter.`, facts), /not in the facts/);
  assert.match(voiceProblem(`${rel.pool.keys} keys in the pool.`, facts), /not in the facts/);
  assert.doesNotMatch(JSON.stringify(facts), /per_upstream|providerBackends|modelIdOrgs|pool/);
});

test('a voiced film runs each slot for its line plus a breath, and is exactly their sum', () => {
  const rel = fixture();
  const seconds = { hook: 3.2, news: 9.7, compare: 6.1, howto: 4.4, cta: 5.05 };
  const voice = SLOTS.map(slot => ({ slot, text: `${slot} line`, wav: `/tmp/${slot}.wav`, seconds: seconds[slot] }));
  for (const flags of [{}, { limit: '1' }, { limit: '3' }]) {
    const film = kind.film(rel, { flags, voice });
    const bySlot = SLOTS.map(slot => film.scenes.filter(s => s.slot === slot));
    const durs = bySlot.map(ss => ss.reduce((a, s) => a + s.dur, 0));
    assert.ok(Math.abs(film.duration - durs.reduce((a, b) => a + b, 0)) < 1e-6, `${JSON.stringify(flags)}: duration is the sum`);
    SLOTS.forEach((slot, i) => {
      assert.ok(durs[i] >= seconds[slot] + VO_PAD - 1e-6, `${slot} holds its line`);
      const line = film.voice.find(v => v.text === `${slot} line`);
      assert.equal(line.at, +(bySlot[i][0].start + VO_LEAD).toFixed(3), `${slot}'s line starts as its slot does`);
    });
  }
});

test('the release links to its model\'s page when one model leads it', () => {
  assert.equal(kind.link(record('018')), 'https://anyrouter.dev/model/nvidia/nemotron-3.5-bolt-e4b');
  assert.equal(kind.link(record('013')), 'https://anyrouter.dev/model/deepseek/deepseek-v4-flash');
  assert.equal(kind.link(record('017')), 'https://anyrouter.dev/models');
});
