import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kind, { fmtCtx, fmtPrice, layoutOf, listCapacity, dropPct, dropFacts, chooseModels, markOf, makersOf, isAlias, followsOf } from './kind.mjs';
import { buildRelease, diffCatalog, fingerprintParts, PROVIDER_CLAIM } from './catalog.mjs';
import { OPEN, END, BEAT, chars } from '../../lib/film.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const json = f => JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', f), 'utf8'));
const release = () => buildRelease(json('catalog.json'), null, json('baseline.json')).release;
const content = film => film.scenes.slice(1, -1);
const typed = id => id.split('').map(c => `<span class="c">${c}</span>`).join('');
const rowsOf = s => (s.body.match(/class="lr r\d/g) || []).length;
/** A drop of `n` distinct models cut from the fixture's, for counts the fixture does not have. */
const dropOf = (rel, n) => ({
  ...rel,
  added: Array.from({ length: n }, (_, i) => ({ ...rel.added[i % rel.added.length], id: `o/m${i}`, name: `Model ${i}` })),
});

// ── the facts ──────────────────────────────────────────────────────────────

test('the diff reports what shipped: new models, price moves and retirements', () => {
  const rel = release();
  assert.equal(rel.added.length, 7);
  assert.ok(rel.added.every(m => !m.id.startsWith('anyrouter/')), 'first-party virtual ids are not a drop');
  assert.deepEqual(rel.removed, ['inclusionai/ling-2.6-1t']);
  assert.equal(rel.kind, 'models+pricing');
});

test('a wider context window is not reported as a price change', () => {
  // Conflating the two would put a "price rise" film out for a free model.
  const byId = Object.fromEntries(release().changed.map(c => [c.id, c.kind]));
  assert.equal(byId['minimax/m2'], 'context');
  assert.equal(byId['openai/gpt-oss-120b'], 'price-cut');
  assert.equal(byId['qwen/qwen3.5-plus'], 'price-cut');
});

test('a first run films the newest few, not the whole catalog', () => {
  const listed = [1, 2, 3, 4, 5, 6, 7].map(n => ({ id: `o/m${n}`, created: n, inPrice: 1, outPrice: 1 }));
  const d = diffCatalog(listed, null, { first: 3 });
  assert.equal(d.mode, 'first-run');
  assert.deepEqual(d.added.map(m => m.id), ['o/m7', 'o/m6', 'o/m5']);
});

test('the provider count is the site claim, never computed from the API', () => {
  const rel = release();
  assert.equal(rel.totals.providers, PROVIDER_CLAIM);
  // …and it is the number the end card prints.
  assert.ok(kind.film(rel, {}).scenes.at(-1).body.includes(`<b>${PROVIDER_CLAIM}+</b> providers`));
});

test('the same release always has the same identity', () => {
  assert.deepEqual(fingerprintParts(release()), fingerprintParts(release()));
});

test('context is shown in K below one million', () => {
  // Dividing by 1e6 unconditionally made a 32k window read as "0.0M".
  assert.equal(fmtCtx(32000), '32K');
  assert.equal(fmtCtx(1050000), '1.1M');
  assert.equal(fmtCtx(1000000), '1M');
  assert.equal(fmtCtx(null), '—');
});

test('a price keeps the digits that make it different from zero', () => {
  // $0.074 printed as "$0.07" is fine; printed as "$0.0" or "$0" it would claim free.
  assert.equal(fmtPrice(0), '$0');
  assert.equal(fmtPrice(0.074), '$0.074');
  assert.equal(fmtPrice(0.01), '$0.01');
  assert.equal(fmtPrice(2), '$2.00');
});

// ── the story: count picks the layout, the plan picks the models ───────────

test('the model count picks the layout', () => {
  assert.deepEqual([1, 2, 4, 5, 37].map(layoutOf), ['hero', 'cards', 'cards', 'list', 'list']);
  const rel = release();
  assert.equal(kind.film(rel, { flags: { limit: '1' } }).layout, 'hero');
  assert.equal(kind.film(rel, { flags: { limit: '3' } }).layout, 'cards');
  assert.equal(kind.film(rel, {}).layout, 'list');
});

test('the plan picks which models and in what order, lead first', () => {
  const rel = release();
  const picks = ['baai/bge-m3', 'sakana/fugu-max', 'upstage/solar-decide'];
  const film = kind.film(rel, { plan: { picks } });
  // Picks alone are the selection: three picks is a three-card film, in pick order.
  assert.equal(film.layout, 'cards');
  assert.deepEqual(content(film).map(s => s.body.match(/class="idcode">(.*?)<\/div>/)[1].replace(/<[^>]+>/g, '')), picks);
  // With a limit, picks lead and the rest of the drop follows in its own order.
  const { models } = chooseModels(rel, { picks: ['baai/bge-m3'], limit: 5 });
  assert.deepEqual(models.map(m => m.id), ['baai/bge-m3', ...rel.added.filter(m => m.id !== 'baai/bge-m3').slice(0, 4).map(m => m.id)]);
  // A --limit flag beats the plan's.
  assert.equal(chooseModels(rel, { limit: 5 }, { limit: '2' }).models.length, 2);
});

test('the lead gets the spotlight in a list, and the default lead is the newest', () => {
  const rel = release();
  const byDefault = content(kind.film(rel, {}))[0];
  assert.equal(byDefault.id, 's01-lead');
  assert.ok(byDefault.body.includes('newest in this drop'), 'the default lead says why it leads');
  const newest = [...rel.added].sort((a, b) => b.created - a.created)[0];
  assert.ok(byDefault.body.includes(typed(newest.id)), 'the spotlight is on the newest model');
  const picked = content(kind.film(rel, { plan: { picks: ['baai/bge-m3'], limit: 7 } }))[0];
  assert.ok(picked.body.includes('BGE-M3') && !picked.body.includes('newest in this drop'),
    'a planned lead is not called the newest');
});

test('the plan\'s line is shown with its model; the catalog text is the fallback', () => {
  const rel = release();
  const m = rel.added[0];
  const withLine = kind.film(rel, { flags: { limit: '1' }, plan: { lines: { [m.id]: 'A plain true line' } } });
  assert.match(withLine.scenes.map(s => s.body).join(''), /A<\/span><\/span> <span class="w"><span>plain/);
  const without = kind.film(rel, { flags: { limit: '1' } });
  assert.ok(without.scenes.map(s => s.body).join('').includes('<span>OpenAI\'s</span>'), 'the excerpt is the lede');
});

test('the catalog\'s own description is held to the plan\'s bar before it becomes a lede', () => {
  const rel = release();
  const say = excerpt => kind.film({ ...rel, added: [{ ...rel.added[0], excerpt }] }, {}).scenes.map(s => s.body).join('');
  assert.ok(say('A model for long documents.').includes('<span>documents.</span>'));
  assert.ok(!say('The best model for long documents.').includes('documents.'), 'a vendor superlative is not a fact');
  assert.ok(!say('Scores 93 on a benchmark.').includes('benchmark.'), 'a number the facts do not carry is not shown');
});

test('the bookends use the plan\'s kicker and headline, else facts', () => {
  const rel = release();
  const planned = kind.film(rel, { plan: { kicker: 'Seven in', headline: 'A drop <worth> a look' } });
  assert.ok(planned.scenes[0].body.includes('>S</span>'), 'the opening types the plan\'s kicker');
  const end = planned.scenes.at(-1).body;
  assert.ok(end.includes('Seven in') && end.includes('A drop &lt;worth&gt; a look'), 'the headline is escaped');
  const plain = kind.film(rel, {}).scenes.at(-1).body;
  assert.ok(plain.includes('7 new models on one key'));
  assert.ok(plain.includes(`<b>${rel.totals.listed}</b> models`) && plain.includes(`<b>${rel.totals.free}</b> free`));
});

test('a hero film is about its one model, and counts the rest of the drop honestly', () => {
  const rel = release();
  const film = kind.film(rel, { flags: { limit: '1' } });
  const m = rel.added[0];
  assert.ok(film.scenes.at(-1).body.includes(`${m.name} is live`), 'the end card names the model, not the drop');
  assert.ok(film.scenes.map(s => s.body).join('').includes('+6 more models in this drop'));
  // A drop of exactly one has nothing more to count.
  const solo = kind.film({ ...rel, added: [m] }, {});
  assert.ok(!solo.scenes.map(s => s.body).join('').includes('more in this drop'));
});

// ── time: back-to-back, on the grid, readable ──────────────────────────────

const variants = [
  ['hero', r => r, { limit: '1' }], ['cards', r => r, { limit: '3' }], ['list', r => r, {}],
  ['list of 37', r => dropOf(r, 37), {}], ['list of 37 at 45s', r => dropOf(r, 37), { seconds: '45' }],
  ['list at 8s', r => r, { seconds: '8' }], ['cards at 8s', r => r, { limit: '4', seconds: '8' }],
];
for (const [name, shape, flags] of variants) {
  test(`a ${name} film fills its length exactly, on the beat, never overlapping`, () => {
    const film = kind.film(shape(release()), { flags });
    const scenes = [...film.scenes].sort((a, b) => a.start - b.start);
    assert.equal(new Set(scenes.map(s => s.id)).size, scenes.length, 'scene ids are unique');
    scenes.forEach((s, i) => {
      const end = i + 1 < scenes.length ? scenes[i + 1].start : film.duration;
      assert.ok(Math.abs(s.start + s.dur - end) < 0.01, `${s.id} ends where the next begins`);
      assert.ok(s.dur >= 1, `${s.id} is long enough to see`);
      if (s.start < film.duration - END) assert.equal(s.start % BEAT, 0, `${s.id} starts on the beat`);
    });
    assert.equal(scenes[0].dur, OPEN);
  });
}

test('every ledger page holds for two seconds after its last row prints, and each row ticks', () => {
  for (const seconds of ['12', '20', '30', '45', '60']) {
    const film = kind.film(dropOf(release(), 37), { flags: { seconds } });
    for (const page of content(film).filter(s => s.id.includes('ledger'))) {
      const ticks = page.cues.filter(c => c.kind === 'tick');
      assert.ok(ticks.length >= rowsOf(page), `${seconds}s ${page.id}: a tick for every row`);
      const lastRow = Math.max(...ticks.slice(0, rowsOf(page)).map(c => c.at));
      assert.ok(page.dur - lastRow >= 2 - 1e-9, `${seconds}s ${page.id}: holds ${page.dur - lastRow}s after the last row`);
    }
  }
});

test('a list film shows no more models than can be read, and says how many it left out', () => {
  const film = kind.film(dropOf(release(), 60), { flags: {} });
  const rows = content(film).map(rowsOf).reduce((a, b) => a + b, 0);
  const shown = rows + 1;                                    // + the lead's spotlight
  assert.equal(shown, listCapacity(20));
  assert.ok(content(film).some(s => s.body.includes(`+${60 - shown} more models in this drop`)));
  // The end card still states the true count, not the number that fit.
  assert.ok(film.scenes.at(-1).body.includes('60 new models'));
  // A longer film shows more.
  assert.ok(listCapacity(40) > listCapacity(20));
});

test('the film length comes from --seconds, then the plan, then 20', () => {
  const rel = release();
  assert.equal(kind.film(rel, {}).duration, 20);
  assert.equal(kind.film(rel, { plan: { seconds: 30 } }).duration, 30);
  assert.equal(kind.film(rel, { plan: { seconds: 30 }, flags: { seconds: '12' } }).duration, 12);
});

// ── honesty: every figure from the data, every word escaped ────────────────

test('every number on screen comes from the catalog', () => {
  const rel = release();
  const m = rel.added[0];
  const hero = kind.film(rel, { flags: { limit: '1' } }).scenes.map(s => s.body).join('');
  assert.ok(hero.includes(typed(m.id)), 'the id is typed from the data');
  assert.ok(hero.includes(`>${fmtPrice(m.inPrice)}<`) && hero.includes(`>${fmtPrice(m.outPrice)}<`));
  assert.ok(hero.includes(`>${fmtCtx(m.context)}<`));
  assert.ok(hero.includes(`<b>${rel.totals.listed}</b>`));
});

test('the free pill appears only on free models', () => {
  const rel = release();
  const paid = kind.film(rel, { flags: { limit: '1' } }).scenes.map(s => s.body).join('');
  assert.ok(!paid.includes('FREE'));
  const free = { ...rel.added[0], id: 'o/free', inPrice: 0, outPrice: 0, free: true };
  const freeFilm = kind.film({ ...rel, added: [free] }, {}).scenes.map(s => s.body).join('');
  assert.ok(freeFilm.includes('$0 · FREE'));
});

test('text from the catalog is escaped before it reaches the page', () => {
  const rel = release();
  const evil = { ...rel.added[0], id: 'o/<img src=x>', name: 'Bad <script>alert(1)</script> & co', provider: '<i>p</i>' };
  for (const r of [{ ...rel, added: [evil] }, dropOf({ ...rel, added: [evil] }, 3), dropOf({ ...rel, added: [evil] }, 9)]) {
    const film = kind.film(r, {});
    const html = film.scenes.map(s => s.body).join('');
    assert.ok(!/<script>|<img src=x>|<i>p<\/i>/.test(html), 'no markup from the data survives');
  }
});

test('the drop in numbers derives each fact from the data and labels it exactly', () => {
  const rel = release();
  const facts = Object.fromEntries(dropFacts(rel.added).map(f => [f.key, f]));
  const maxCtx = Math.max(...rel.added.map(m => m.context || 0));
  assert.equal(facts.context.value, fmtCtx(maxCtx));
  assert.equal(facts.context.label, 'largest context · new models');
  assert.equal(facts.price, undefined, 'the drop in numbers quotes no price');
  assert.equal(facts.orgs.value, String(new Set(rel.added.map(m => m.id.split('/')[0])).size));
  assert.equal(facts.free, undefined, 'no "free" fact when nothing in the drop is free');
  // Ties are said, not hidden: two models share the largest window here.
  assert.match(facts.context.what, /\+1 tied$/);
  for (const f of dropFacts(rel.added)) assert.doesNotMatch(`${f.label} ${f.what}`, /\b(best|fastest|top|leading)\b/i);
});

test('a film of five or more shows no prices anywhere — only what identifies each model', () => {
  // The user's call: a 37-model film is about which models, not what they cost.
  const rel = release();
  const m0 = rel.added[0];
  const plan = { lines: { [m0.id]: 'Costs $2 in per 1M tokens.', [rel.added[3].id]: 'A plain true line' } };
  for (const r of [rel, dropOf(rel, 37)]) {
    for (const seconds of ['12', '20', '45']) {
      const film = kind.film(r, { flags: { seconds }, plan });
      for (const s of content(film)) assert.doesNotMatch(s.body, /\$/, `${seconds}s ${s.id} has a dollar sign`);
      // The end card's facts too (its install line's "$" prompt is a shell prompt, not a price).
      assert.doesNotMatch(film.scenes.at(-1).body.replace(/<span class="p">\$<\/span>/, ''), /\$/);
    }
  }
  // …while the ledger still carries the identity: mark, name, id, context, and FREE as a status.
  const free = { ...rel.added[1], id: 'o/free', name: 'Free One', inPrice: 0, outPrice: 0, free: true };
  const film = kind.film({ ...rel, added: [rel.added[0], free, ...rel.added.slice(2)] }, { plan });
  const ledger = content(film).filter(s => s.id.includes('ledger')).map(s => s.body).join('');
  assert.ok(ledger.includes('>Free One<') && ledger.includes('>o/free<') && ledger.includes('>FREE<'));
  assert.ok(ledger.includes('>A plain true line<'), 'the plan\'s line is shown in its row');
  assert.ok(ledger.includes(`>${fmtCtx(rel.added[2].context)}<`));
});

test('a hero and 2-4 cards keep their prices', () => {
  const rel = release();
  for (const limit of ['1', '3']) {
    const body = content(kind.film(rel, { flags: { limit } })).map(s => s.body).join('');
    assert.ok(body.includes(`>${fmtPrice(rel.added[0].inPrice)}<`), `limit ${limit} shows the price`);
  }
});

test('every model is shown with its maker\'s real mark, or an honest monogram — never a borrowed logo', () => {
  const m = { id: 'x/y', provider: '', logo: null };
  // The catalog missed these; the shared resolver finds them.
  assert.equal(markOf({ ...m, id: 'mistralai/mistral-small', provider: 'Mistral AI' }), 'mistral-color.svg');
  assert.equal(markOf({ ...m, id: 'stepfun-ai/step-5-preview', provider: 'stepfun-ai' }), 'stepfun-color.svg');
  // No vendored mark: a monogram of the provider's initials, not a dot and not someone else's logo.
  assert.equal(markOf({ ...m, id: 'baai/bge-m3', provider: 'baai' }), null);
  const rel = release();
  const bge = rel.added.find(x => x.id === 'baai/bge-m3');
  const html = kind.film({ ...rel, added: [bge] }, {}).scenes.map(s => s.body).join('');
  assert.ok(html.includes('class="mono-mark">B<'), 'baai gets its monogram');
  assert.ok(!html.includes('ldot'));
});

test('a many-maker drop gets a wall of its makers, counted from the data', () => {
  const rel = release();
  const film = kind.film(rel, {});
  const wall = content(film).find(s => s.id.endsWith('-makers'));
  assert.ok(wall, 'the list film has a makers scene');
  const orgs = new Set(rel.added.map(m => m.id.split('/')[0]));
  assert.equal((wall.body.match(/class="box maker"/g) || []).length, orgs.size);
  assert.ok(wall.body.includes(`<i>${String(orgs.size).padStart(2, '0')}</i>model makers in this drop`));
  // Counts per maker add up to the drop.
  assert.equal(makersOf(rel.added).reduce((a, k) => a + k.count, 0), rel.added.length);
  // The end card stamps the drop's real marks (no monograms, at most 12).
  const end = film.scenes.at(-1).body;
  const marks = [...new Set(rel.added.map(markOf).filter(Boolean))];
  for (const f of marks.slice(0, 12)) assert.ok(end.includes(f), `end card has ${f}`);
  // A one-maker drop has no wall to show.
  assert.ok(!content(kind.film(dropOf(rel, 9), {})).some(s => s.id.endsWith('-makers')));
});

// ── aliases: a -latest name is not a new model ─────────────────────────────

/** A drop shaped like the real 2026-09-30 one: 5 models and 18 -latest aliases. */
const aliasDrop = () => {
  const rel = release();
  const models = rel.added.slice(0, 5);
  const aliases = Array.from({ length: 18 }, (_, i) => ({
    ...rel.added[i % rel.added.length], id: `org${i % 6}/fam${i}-latest`, name: `fam${i} (latest)`,
    excerpt: `Alias for the newest live fam${i} model; currently org${i % 6}/fam${i}-v2.`, free: false,
  }));
  return { ...rel, added: [...aliases.slice(0, 9), ...models, ...aliases.slice(9)] };
};

test('an alias is recognised from the catalog\'s own words, and by its -latest id', () => {
  assert.ok(isAlias({ id: 'anthropic/claude-sonnet-latest', excerpt: 'Alias for the newest live claude-sonnet model; currently anthropic/claude-sonnet-5-5.' }));
  assert.ok(isAlias({ id: 'x/y-latest', excerpt: null }));
  assert.ok(isAlias({ id: 'x/y', excerpt: 'Alias for the newest live y model; currently x/y-2.' }));
  assert.ok(!isAlias({ id: 'openai/gpt-6.1-sol', excerpt: 'OpenAI\'s GPT-6.1 Sol delivers…' }));
  assert.equal(followsOf({ excerpt: 'Alias for the newest live gemini-pro model; currently google/gemini-3.1-pro.' }), 'google/gemini-3.1-pro');
});

test('a drop of 5 models and 18 aliases says "5 new models", never "23"', () => {
  const rel = aliasDrop();
  for (const flags of [{}, { seconds: '40' }, { seconds: '60' }]) {
    const film = kind.film(rel, { flags });
    // Visible text only: the brand mark's SVG path data is full of digits.
    const all = film.scenes.map(s => s.body).join('').replace(/<svg[\s\S]*?<\/svg>/g, '');
    assert.doesNotMatch(all, /\b23\b/, `${JSON.stringify(flags)}: nothing counts 23`);
    assert.ok(film.scenes[0].body.includes(chars('5 new models · 18 -latest aliases')), 'the opening counts them apart');
    assert.ok(film.scenes.at(-1).body.includes('5 new models on one key'));
    const [lead] = content(film);
    assert.ok(!isAlias({ id: lead.body.match(/class="idcode">(.*?)<\/div>/)[1].replace(/<[^>]+>/g, '') }), 'the default lead is a model');
    assert.ok(lead.body.includes('OF 05'), 'the lead is one of 5 models');
    const sum = content(film).find(s => s.id.endsWith('-numbers'));
    if (sum) {
      assert.ok(sum.body.includes('<div class="num big hl">5</div>') && sum.body.includes('+ 18 -latest aliases'));
      assert.ok(sum.inner.includes('count(".big", 5,'));
    }
    const wall = content(film).find(s => s.id.endsWith('-makers'));
    if (wall) {
      assert.ok(wall.body.includes('5 new models · 18 -latest aliases'));
      const withModels = new Set(rel.added.filter(m => !isAlias(m)).map(m => m.id.split('/')[0])).size;
      assert.ok(wall.body.includes(`with new models`) && wall.body.includes(`· ${withModels} with new models`));
    }
  }
  assert.match(kind.headline(rel), /^5 new models: .*, plus 18 -latest aliases$/);
  // The facts are about models only: the aliases' windows and categories are not counted.
  for (const f of dropFacts(rel.added)) assert.match(f.label, /new models$/);
  assert.equal(dropFacts(rel.added).find(f => f.key === 'context').value,
    fmtCtx(Math.max(...rel.added.filter(m => !isAlias(m)).map(m => m.context || 0))));
});

test('alias rows carry an ALIAS tag, their own A-numbers and what they follow', () => {
  const rel = aliasDrop();
  const film = kind.film(rel, { flags: { seconds: '60' } });
  const ledger = content(film).filter(s => s.id.includes('ledger')).map(s => s.body).join('');
  assert.equal((ledger.match(/>ALIAS</g) || []).length, 18);
  assert.ok(ledger.includes('<span class="rk">A01</span>') && ledger.includes('<span class="rk">A18</span>'));
  assert.ok(!ledger.includes('<span class="rk">06</span>'), 'model ranks stop at the models');
  assert.ok(ledger.includes('follows org0/fam0-v2'));
  // A plan's line still wins, and the mark is still there.
  const planned = kind.film(rel, { flags: { seconds: '60' }, plan: { lines: { 'org0/fam0-latest': 'A plain true line' } } });
  assert.ok(content(planned).some(s => s.body.includes('>A plain true line<')));
  // Leftovers are counted by kind.
  const short = content(kind.film(rel, {})).map(s => s.body).join('');
  assert.match(short, /\+\d+ more -latest aliases in this drop/);
  // The plan sees which ids are aliases.
  const items = kind.items(rel);
  assert.equal(items.filter(i => /ALIAS/.test(i.label)).length, 18);
  assert.match(items.find(i => i.id === 'org0/fam0-latest').label, /ALIAS → org0\/fam0-v2 \(not a new model\)/);
});

test('the plan sees every model in the drop as a pickable item', () => {
  const rel = release();
  const items = kind.items(rel);
  assert.deepEqual(items.map(i => i.id), rel.added.map(m => m.id));
  assert.equal(items[0].label, 'GPT-6.1 Sol · OpenAI · $2.00/$10.00 · 1.1M');
  // A price cut is quotable as the percentage the film's own headline uses.
  const cutId = 'openai/gpt-oss-120b';
  const withCut = kind.items({ ...rel, added: [{ ...rel.added[0], id: cutId }] });
  assert.match(withCut[0].detail, /price down 37%/);
  // A price move with nothing added still has its model to pick.
  assert.equal(kind.items({ ...rel, added: [] }).length, 1);
});

// ── copy for the Release ───────────────────────────────────────────────────

test('the headline leads with what shipped', () => {
  const rel = release();
  assert.match(kind.headline(rel), /^7 new models: /);
  assert.equal(kind.headline({ ...rel, added: [rel.added[0]] }), `${rel.added[0].id} is live on AnyRouter`);
  assert.equal(kind.headline({ ...rel, added: [] }), 'Price drop: gpt-oss-120b down 37%');
  assert.equal(kind.headline(rel, { headline: 'from the plan' }), 'from the plan');
});

test('a price drop is measured on the price, not the context window', () => {
  assert.equal(dropPct('0.4/1.6@256000', '0.2/1.6@256000'), 50);
  assert.equal(dropPct('0/0@204800', '0/0@200000'), null);
});
