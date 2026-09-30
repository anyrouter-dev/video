import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseEntries, latestBatch } from './entries.mjs';
import kind, { firstSentence } from './kind.mjs';

const text = fs.readFileSync(new URL('./fixtures/llms.txt', import.meta.url), 'utf8');
const entries = parseEntries(text);
const data = async flags => kind.collect({ flags: { from: new URL('./fixtures/llms.txt', import.meta.url).pathname, ...flags } });
const SCORE = { 'audio/score.wav': 20, 'audio/score-30s.wav': 30 };

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

for (const date of [undefined, '2026-09-22', '2026-09-15', '2026-09-24']) {
  test(`film ${date ?? 'newest'}: scenes are back-to-back and end exactly at duration`, async () => {
    const f = kind.film(await data({ date }), {});
    const s = f.scenes;
    assert.equal(s[0].start, 0);
    for (let i = 1; i < s.length; i++) assert.equal(+(s[i - 1].start + s[i - 1].dur).toFixed(3), s[i].start, `${s[i - 1].id} overlaps or gaps ${s[i].id}`);
    assert.equal(+(s.at(-1).start + s.at(-1).dur).toFixed(3), f.duration);
    assert.equal(new Set(s.map(x => x.id)).size, s.length);
    assert.ok(f.duration <= SCORE[f.music], `${f.duration}s exceeds ${f.music}`);
  });
}

test('a capped day says how many entries were left out in the CTA', async () => {
  const d = await data({});
  const f = kind.film(d, { flags: { limit: '2' } });
  assert.equal(f.scenes.length, 4);
  assert.match(f.scenes.at(-1).body, new RegExp(`\\+${d.total - 2} more`));
});

test('a disabled entry is marked Disabled and styled quiet, an added one is not', async () => {
  const off = kind.film(await data({ date: '2026-09-23' }), {}).scenes[1].body;
  assert.match(off, /class="card off"/);
  assert.match(off, />Disabled</);
  const on = kind.film(await data({ date: '2026-09-22' }), {}).scenes[1].body;
  assert.doesNotMatch(on, /off|Disabled/);
});

test('facts are escaped so a "<" in a changelog cannot break the composition', () => {
  const d = { date: '2026-01-01', total: 1, entries: [{ slug: '2026-01-01', date: '2026-01-01', title: 'a <b> & c', summary: 'x.', type: 'added', link: '' }] };
  const body = kind.film(d, {}).scenes[1].body;
  assert.match(body, /a &lt;b&gt; &amp; c/);
});

test('only the first sentence shows, and version numbers do not end it', () => {
  assert.equal(firstSentence('Opus 5.5 joins. Second one.'), 'Opus 5.5 joins.');
  assert.ok(firstSentence('word '.repeat(100), 50).endsWith('…'));
});

test('headline is the title for one entry and a count otherwise', async () => {
  assert.equal(kind.headline({ entries: [{ title: 'Grok 4.7' }] }), 'Grok 4.7');
  assert.equal(kind.headline({ entries: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] }), '3 changelog updates: A, B +1 more');
  assert.match(kind.notes(await data({}))[0], /^- \*\*.+\*\* — .+\(\[link\]\(https:/);
});
