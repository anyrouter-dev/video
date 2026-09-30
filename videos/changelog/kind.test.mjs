import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseEntries, latestBatch } from './entries.mjs';
import kind, { firstSentence, clip, logTiming, spotTiming, entryMarks } from './kind.mjs';
import { OPEN, END, BEAT } from '../../lib/film.mjs';

const text = fs.readFileSync(new URL('./fixtures/llms.txt', import.meta.url), 'utf8');
const entries = parseEntries(text);
const data = async flags => kind.collect({ flags: { from: new URL('./fixtures/llms.txt', import.meta.url).pathname, ...flags } });
const spots = f => f.scenes.filter(s => s.id.includes('-spot-'));
const log = f => f.scenes.find(s => s.id === 's01-log');
const typed = html => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
const onGrid = t => Math.abs(t / BEAT - Math.round(t / BEAT)) < 1e-9;
const day = (n, retiredAt = []) => ({
  date: '2026-10-01', total: n,
  entries: Array.from({ length: n }, (_, i) => ({
    slug: `2026-10-01-e${i}${retiredAt.includes(i) ? '-disabled' : ''}`, date: '2026-10-01',
    title: `Entry ${i}`, summary: `Entry ${i} summary. More.`, link: '', type: retiredAt.includes(i) ? 'disabled' : 'added',
  })),
});

// ── facts ────────────────────────────────────────────────────────────────
test('the index link has no slug, so counting it would film a non-entry', () => {
  assert.ok(entries.length > 0);
  assert.ok(entries.every(e => /^\d{4}-\d{2}-\d{2}/.test(e.slug)));
  assert.ok(!entries.some(e => e.title === 'Model releases'));
});

test('slug, date, title, summary, link and type are parsed from the link shape', () => {
  const e = entries.find(x => x.slug === '2026-09-30-latest-aliases');
  assert.equal(e.date, '2026-09-30');
  assert.equal(e.title, 'Latest aliases: name a model family, always get a live model');
  assert.match(e.summary, /^Send google\/gemini-flash-latest/);
  assert.equal(e.link, 'https://anyrouter.dev/blog/releases/2026-09-30-latest-aliases');
  assert.equal(e.type, 'added');
});

test('titles with brackets and summaries with "): " parse on the link, not on punctuation', () => {
  const [e] = parseEntries('## Model releases\n\n- [A [b] c: d](https://anyrouter.dev/blog/releases/2026-01-02): Fix (see x): done.\n');
  assert.equal(e.title, 'A [b] c: d');
  assert.equal(e.summary, 'Fix (see x): done.');
});

test('-disabled and -upstream retirements are typed disabled so they never read as launches', () => {
  assert.equal(entries.find(e => e.slug === '2026-09-30-disabled').type, 'disabled');
  assert.equal(entries.find(e => e.slug === '2026-09-15-upstream').type, 'disabled');
});

test('the section stops at the next heading so other lists are not filmed', () => {
  const t = '## Model releases\n- [A](https://anyrouter.dev/blog/releases/2026-01-02): a.\n## Other\n- [B](https://anyrouter.dev/blog/releases/2026-01-03): b.\n';
  assert.deepEqual(parseEntries(t).map(e => e.title), ['A']);
});

test('latestBatch returns only the newest day, so one film covers one day', () => {
  const b = latestBatch(entries);
  assert.ok(b.length > 1);
  assert.equal(new Set(b.map(e => e.date)).size, 1);
  assert.equal(b[0].date, entries[0].date);
  assert.deepEqual(latestBatch(entries, '2026-09-22').map(e => e.slug), ['2026-09-22']);
});

test('collect throws when the section is missing rather than filming nothing silently', async () => {
  const f = new URL('./fixtures/none.txt', import.meta.url);
  fs.writeFileSync(f, '# x\n');
  try { await assert.rejects(kind.collect({ flags: { from: f.pathname } }), /Model releases/); }
  finally { fs.unlinkSync(f); }
});

test('parts are one slug per entry so a day is re-filmed only when an entry is added', async () => {
  const d = await data({});
  assert.deepEqual(d.parts, d.entries.map(e => e.slug));
  assert.equal(d.label, d.date);
  assert.equal((await data({ date: '2001-01-01' })).notable, false);
});

test('items are one per entry of the day, keyed by slug, labelled with type and title', async () => {
  const d = await data({});
  const it = kind.items(d);
  assert.deepEqual(it.map(i => i.id), d.entries.map(e => e.slug));
  assert.equal(it.find(i => i.id === '2026-09-30-disabled').label, 'disabled — 3 models disabled');
});

// ── the film's shape ─────────────────────────────────────────────────────
for (const date of [undefined, '2026-09-22', '2026-09-23', '2026-09-15', '2026-09-24']) {
  test(`film ${date ?? 'newest'}: open, log, spotlights, end — back-to-back on the beat grid`, async () => {
    const f = kind.film(await data({ date }), {});
    const s = f.scenes;
    assert.equal(s[0].id, 's00-open');
    assert.equal(s[1].id, 's01-log');
    assert.equal(s.at(-1).id, 's99-end');
    assert.equal(s[0].start, 0);
    for (let i = 1; i < s.length; i++) assert.equal(+(s[i - 1].start + s[i - 1].dur).toFixed(3), s[i].start, `${s[i - 1].id} overlaps or gaps ${s[i].id}`);
    assert.equal(+(s.at(-1).start + s.at(-1).dur).toFixed(3), f.duration);
    for (const x of s) assert.ok(onGrid(x.start), `${x.id} starts off the beat at ${x.start}`);
    assert.equal(new Set(s.map(x => x.id)).size, s.length);
    assert.ok(f.duration <= 30, `a default film is at most 30s, got ${f.duration}`);
    assert.deepEqual([f.tone, f.palette, f.label], ['teal', 'changelog', 'CHANGELOG']);
  });
}

test('the log gives every line time to be read: 2s after the last one prints', () => {
  for (const n of [1, 2, 5, 8, 12]) {
    const t = logTiming(n);
    const last = 0.6 + (t.rows - 1) * t.step + 0.6;
    assert.ok(t.dur >= last + 2 - 1e-9, `${n} lines: ${t.dur}s < ${last + 2}s`);
    assert.ok(onGrid(t.dur));
  }
});

test('a spotlight holds at least 1.5s after its lede lands, and longer for more words', () => {
  const short = spotTiming('A', 'One two.');
  const long = spotTiming('A', 'word '.repeat(40));
  assert.ok(short.need >= short.landed + 1.5);
  assert.ok(long.need > short.need);
  assert.ok(onGrid(short.need) && onGrid(long.need));
});

test('the log lists the whole day even when the plan spotlights one entry', async () => {
  const d = await data({});
  const f = kind.film(d, { plan: { picks: ['2026-09-30-liquid-d1'] } });
  const body = log(f).body;
  for (const e of d.entries) assert.ok(typed(body).includes(`/blog/releases/${e.slug}`), `log misses ${e.slug}`);
  assert.equal(spots(f).length, 1);
});

test('a day longer than the receipt says how many lines were left off', () => {
  const f = kind.film(day(12), {});
  assert.match(typed(log(f).body), /\+5 more on anyrouter\.dev\/blog\/releases/);
  assert.equal((log(f).body.match(/class="row /g) ?? []).length, 8);
});

// ── the plan ─────────────────────────────────────────────────────────────
test('picks choose the spotlights and their order', async () => {
  const d = await data({});
  const picks = ['2026-09-30-solar-decide', '2026-09-30-disabled'];
  const f = kind.film(d, { plan: { picks } });
  assert.deepEqual(spots(f).map(s => /\/blog\/releases\/(\S+)/.exec(typed(s.body))?.[1]), picks);
});

test('without picks the spotlights follow the day, lead first, capped by limit', async () => {
  const d = await data({});
  const f = kind.film(d, { plan: { limit: 2 } });
  assert.equal(spots(f).length, 2);
  assert.match(spots(f)[0].chapter, /GPT-6\.1 Sol/);
  assert.equal(spots(kind.film(d, { flags: { limit: '1' } })).length, 1);
});

test('a plan line replaces the lede; the default is the summary\'s first sentence', async () => {
  const d = await data({ date: '2026-09-22' });
  const plain = spots(kind.film(d, {}))[0].body;
  assert.match(plain, /<span>successor<\/span>/);
  const f = kind.film(d, { plan: { lines: { '2026-09-22': 'Opus 5.5 joins the catalog.' } } });
  assert.match(spots(f)[0].body, /<span>Opus<\/span><\/span> <span class="w"><span>5\.5<\/span>/);
  assert.doesNotMatch(spots(f)[0].body, /successor/);
});

test('kicker and headline go to the opening slate and the end card', async () => {
  const f = kind.film(await data({}), { plan: { kicker: 'Big day', headline: 'Four in, one out' } });
  assert.match(typed(f.scenes[0].body), /Big day/);
  assert.match(f.scenes.at(-1).body, /Four in, one out/);
  assert.match(f.scenes.at(-1).body, />Big day</);
});

test('an explicit length is honoured exactly; spare time goes to the spotlights, never a gap', async () => {
  const d = await data({ date: '2026-09-22' });
  for (const seconds of [20, 24.3, 45]) {
    const f = kind.film(d, { plan: { seconds } });
    assert.equal(f.duration, seconds);
    assert.equal(+(f.scenes.at(-1).start + END).toFixed(3), seconds);
  }
});

test('time caps the spotlights honestly: a short film drops picks rather than rushing them', async () => {
  const d = await data({});
  const f = kind.film(d, { plan: { seconds: 14 } });
  assert.ok(spots(f).length < 4);
  for (const s of spots(f)) assert.ok(s.dur >= 3);
  assert.match(f.summary, /left out: no time/);
  assert.throws(() => kind.film(day(8), { plan: { seconds: 8 } }), /too short/);
});

// ── honesty ─────────────────────────────────────────────────────────────
test('a retirement is a − with a RETIRED pill and a grey mark, never a + or NEW', async () => {
  const d = await data({ date: '2026-09-23' });
  const f = kind.film(d, {});
  const s = spots(f)[0];
  assert.match(s.body, /pill off">RETIRED</);
  assert.match(s.body, /class="glyph box off"/);
  assert.match(s.body, /class="badge mono">−</);
  assert.doesNotMatch(s.body, /NEW|>\+</);
  assert.match(log(f).body, /class="row r0 off"/);
  assert.match(log(f).body, /class="sg mono">−</);
  assert.match(typed(f.scenes[0].body), /0 new · 1 retired/);
  const on = spots(kind.film(await data({ date: '2026-09-22' }), {}))[0].body;
  assert.match(on, /pill new">NEW</);
  assert.doesNotMatch(on, /RETIRED|glyph box off/);
});

test('each entry shows its provider: one mark large, cited models as a grid, else AnyRouter', async () => {
  const d = await data({});
  const bySlug = slug => d.entries.find(e => e.slug === slug);
  assert.deepEqual(entryMarks(bySlug('2026-09-30')), ['openai-color.svg']);
  assert.deepEqual(entryMarks(bySlug('2026-09-30-latest-aliases')), ['google-color.svg', 'anthropic-color.svg']);
  const f = kind.film(d, { plan: { picks: ['2026-09-30', '2026-09-30-latest-aliases'] } });
  assert.match(spots(f)[0].body, /gg g1"><img class="gm" src="assets\/providers\/openai-color\.svg"/);
  assert.match(spots(f)[1].body, /gg g2">.*google-color.*anthropic-color/s);
  const none = kind.film(day(1), {});
  assert.match(spots(none)[0].body, /anyrouter\.svg/);
  // every log line starts with its mark
  assert.equal((log(f).body.match(/class="lmk"><img/g) ?? []).length, d.entries.length);
});

test('the end card stamps the marks of what arrived, never of what was retired', async () => {
  const f = kind.film(await data({}), {});
  const end = f.scenes.at(-1).body;
  for (const m of ['openai-color', 'google-color', 'anthropic-color', 'liquid', 'upstage']) assert.match(end, new RegExp(`providers/${m}\\.svg`));
  assert.doesNotMatch(end, /inclusionai/);
});

test('new and retired are counted apart wherever a count appears', async () => {
  const f = kind.film(await data({}), {});
  assert.match(log(f).body, /n-add hl">4</);
  assert.match(log(f).body, /n-off">1</);
  assert.match(f.scenes.at(-1).body, /4 new, 1 retired/);
});

test('facts are escaped so a "<" in a changelog cannot break the composition', () => {
  const d = day(1);
  d.entries[0].title = 'a <b> & c';
  const f = kind.film(d, {});
  for (const s of f.scenes) assert.doesNotMatch(s.body, /<b> &/);
  assert.match(spots(f)[0].body, /&lt;b&gt;/);
});

test('sound follows the picture: a tick and a type burst per log line, a hit per spotlight', async () => {
  const f = kind.film(await data({}), {});
  const cues = log(f).cues;
  assert.equal(cues.filter(c => c.kind === 'tick').length, 5);
  assert.ok(cues.filter(c => c.kind === 'type').length >= 5);
  for (const s of spots(f)) assert.ok(s.cues.some(c => c.kind === 'hit'));
});

test('only the first sentence shows, and version numbers do not end it', () => {
  assert.equal(firstSentence('Opus 5.5 joins. Second one.'), 'Opus 5.5 joins.');
  assert.ok(firstSentence('word '.repeat(100), 50).endsWith('…'));
  // A clipped title ends on a whole word, never on a dangling colon, and fits.
  assert.equal(clip('Latest aliases: name a model family', 20), 'Latest aliases…');
  assert.equal(clip('Latest aliases: name a model family', 22), 'Latest aliases: name…');
  assert.equal(clip('short', 20), 'short');
});

test('headline is the title for one entry and a count otherwise', async () => {
  assert.equal(kind.headline({ entries: [{ title: 'Grok 4.7' }] }), 'Grok 4.7');
  assert.equal(kind.headline({ entries: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] }), '3 changelog updates: A, B +1 more');
  assert.equal(kind.headline({ entries: [] }, { headline: 'Planned' }), 'Planned');
  assert.match(kind.notes(await data({}))[0], /^- \*\*.+\*\* — .+\(\[link\]\(https:/);
});
