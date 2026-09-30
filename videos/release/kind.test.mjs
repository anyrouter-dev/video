import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFeed, unescapeXml } from './feed.mjs';
import kind, { firstSentence, items, readTime, slots, versionMark } from './kind.mjs';
import { OPEN, END, BEAT } from '../../lib/film.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const xml = fs.readFileSync(path.join(dir, 'fixtures/rss.xml'), 'utf8');
const [rel] = parseFeed(xml);
const film = (plan = {}, flags = {}, over = {}) => kind.film({ ...rel, ...over }, { plan, flags });
const highlights = f => f.scenes.filter(s => /^s\d\d-h\d+$/.test(s.id));
const glance = f => f.scenes.find(s => s.id.endsWith('-glance'));
const shown = html => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const onGrid = t => Math.abs(t / BEAT - Math.round(t / BEAT)) < 1e-6;

// A plan in the shape lib/plan.mjs hands over after checking it.
const PLAN = {
  picks: ['h4', 'h1', 'h3'],
  lines: {
    h4: 'Management keys can read analytics now, and nothing else.',
    h1: 'Ask for a family with -latest. Get its newest live model.',
    h3: 'Swap a BYOK key in place. Its id and routing stay put.',
  },
  headline: 'Name a model family. Always get a live model.',
  kicker: 'AnyRouter 1.6',
};

// ── the feed ──────────────────────────────────────────────────────────────

test('the version comes from the release link, so the film is named by what shipped, not by prose', () => {
  assert.equal(rel.version, '1.6.0');
  assert.equal(rel.date, '2026-09-30');
  assert.match(rel.headline, /^AnyRouter 1\.6: /);
  assert.match(rel.summary, /^Send a -latest id/);
});

test('highlights keep their theme and link, because the kicker and the notes both rely on them', () => {
  assert.equal(rel.highlights.length, 6);
  assert.equal(rel.highlights[0].theme, 'Models');
  assert.equal(rel.highlights[3].theme, 'API and keys');
  assert.match(rel.highlights[2].href, /^https:\/\/anyrouter\.dev\/docs\//);
});

test('a highlight with no theme or link still parses, so one sloppy entry cannot drop the release', () => {
  const bare = `<item><title>AnyRouter 2.0: x</title><link>https://anyrouter.dev/changelog/2.0.0</link>
    <pubDate>Mon, 01 Jan 2029 00:00:00 GMT</pubDate>
    <description>&lt;p&gt;S.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Plain line.&lt;/li&gt;&lt;/ul&gt;</description></item>`;
  const [r] = parseFeed(bare);
  assert.deepEqual(r.highlights, [{ theme: null, line: 'Plain line.', href: null }]);
  // …and still films: the kicker falls back to the version, the source line is left out.
  const f = kind.film(r, { plan: {}, flags: {} });
  const [h] = highlights(f);
  assert.ok(shown(h.body).includes('v2.0.0'));
  assert.ok(!h.body.includes('hl-src'));
});

test('entities are unescaped exactly once, so "&amp;lt;" is shown as "&lt;" and never as "<"', () => {
  assert.equal(unescapeXml('a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos; &#65;&#x42;'), `a & b <c> "d" 'e' AB`);
  assert.equal(unescapeXml('&amp;lt;'), '&lt;');
  const [r] = parseFeed(`<item><title>T &amp; U</title><link>https://x/1.0.0</link><pubDate>Mon, 01 Jan 2029 00:00:00 GMT</pubDate><description>&lt;p&gt;a &amp;amp; b&lt;/p&gt;</description></item>`);
  assert.equal(r.headline, 'T & U');
  assert.equal(r.summary, 'a & b');
});

test('a long highlight is cut to its first sentence so the statement stays one idea', () => {
  const two = rel.highlights[0].line;
  assert.ok(two.split('. ').length > 1);
  assert.equal(firstSentence(two), '-latest aliases such as google/gemini-flash-latest resolve to the newest live model in a family.');
  assert.equal(firstSentence('New: GPT-6.1 Sol and Step 5.'), 'New: GPT-6.1 Sol and Step 5.');
  assert.ok(!film().scenes.some(s => s.body.includes('They are listed')));
});

// ── what an agent may pick ────────────────────────────────────────────────

test('items are every highlight, with ids fixed by feed position so a plan written yesterday still means the same thing', () => {
  const list = items(rel);
  assert.deepEqual(list.map(i => i.id), ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  assert.deepEqual(items(parseFeed(xml)[0]), list);
  assert.equal(list[3].label, 'API and keys: A new read-only read:analytics scope lets a management key read /analytics/* and nothing else.');
  assert.equal(kind.items, items, 'the CLI finds items on the kind');
  // the second sentence is still a fact the plan may lean on
  assert.equal(list[0].detail, rel.highlights[0].line);
  assert.equal(list[3].detail, undefined, 'a one-sentence entry has nothing more to say');
});

// ── the film ──────────────────────────────────────────────────────────────

test('the film is the release look: indigo, the release score, labelled RELEASE', () => {
  const f = film();
  assert.equal(f.tone, 'indigo');
  assert.equal(f.palette, 'release');
  assert.equal(f.label, 'RELEASE');
});

test('scenes run back to back from the opening print to the end card, and every cut sits on the beat', () => {
  for (const f of [film(), film(PLAN), film({}, { seconds: '20' }), film({}, { seconds: '45' })]) {
    const s = f.scenes;
    assert.equal(s[0].id, 's00-open');
    assert.equal(s[0].start, 0);
    assert.equal(s[1].start, OPEN);
    for (let i = 0; i < s.length - 1; i++) {
      assert.ok(Math.abs(s[i].start + s[i].dur - s[i + 1].start) < 1e-6, `${s[i].id} → ${s[i + 1].id}`);
      assert.ok(onGrid(s[i].start), `${s[i].id} starts at ${s[i].start}`);
    }
    assert.equal(s.at(-1).id, 's99-end');
    assert.equal(s.at(-1).dur, END);
    assert.ok(Math.abs(s.at(-1).start + END - f.duration) < 1e-6);
    const ids = s.map(x => x.id);
    assert.equal(new Set(ids).size, ids.length, 'scene ids are file names and DOM ids');
  }
});

test('slots give each scene what it needs and hand out the spare beats, never less', () => {
  const needs = [5.5, 4, 6];
  const d = slots(needs, 20);
  assert.equal(d.reduce((a, b) => a + b, 0), 20);
  d.forEach((x, i) => assert.ok(x >= needs[i]));
  d.slice(0, -1).forEach(x => assert.ok(onGrid(x)));
});

test('every statement can be read: its reading time, and at least 1.5s still after its last word lands', () => {
  for (const f of [film(), film(PLAN), film({}, { seconds: '15' })]) {
    for (const s of highlights(f)) {
      const text = shown(/<div class="hl-say[^"]*">([\s\S]*?)<\/div>/.exec(s.body)[1]);
      const n = text.split(' ').length;
      const lands = 0.45 + 0.05 * (n - 1) + 0.6;
      assert.ok(s.dur >= readTime(text) - 1e-6, `${s.id}: ${s.dur}s for ${n} words`);
      assert.ok(s.dur >= lands + 1.5 - 1e-6, `${s.id}: lands at ${lands}s, cut at ${s.dur}s`);
    }
  }
});

test('highlights that cannot be read in time are dropped from the end, never squeezed', () => {
  const count = f => highlights(f).length;
  assert.ok(count(film()) >= 2 && count(film()) <= 5);
  assert.equal(count(film({}, { limit: '2' })), 2);
  assert.equal(count(film({ limit: 1 })), 1, 'plan.limit caps too');
  assert.equal(count(film({ limit: 4 }, { limit: '1' })), 1, 'the flag wins over the plan');
  assert.ok(count(film({}, { seconds: '12' })) < count(film()));
  assert.ok(count(film({}, { seconds: '60' })) === 5, 'the default cap is 5 even with time to spare');
  // the lead survives whatever else is dropped
  assert.equal(highlights(film(PLAN, { seconds: '18' }))[0].id, 's02-h4');
  assert.equal(highlights(film({}, { seconds: '12' })).length, 0, 'a film too short to read one highlight shows none');
});

test('the plan picks which highlights and in what order, and its lines replace the feed sentence', () => {
  const f = film(PLAN);
  assert.deepEqual(highlights(f).map(s => s.id.split('-')[1]), ['h4', 'h1', 'h3']);
  const [first] = highlights(f);
  assert.ok(shown(first.body).includes(PLAN.lines.h4));
  assert.ok(!shown(first.body).includes('read:analytics'), 'a planned line replaces the feed sentence');
  assert.match(shown(first.body), /01 \/ 03/);
  // an id the plan names but the feed lacks is skipped, not a crash
  assert.deepEqual(highlights(film({ picks: ['h9', 'h2'] })).map(s => s.id.split('-')[1]), ['h2']);
  // without picks, feed order
  assert.equal(highlights(film())[0].id, 's02-h1');
});

test('consecutive highlights never share a composition, so it does not read as a slideshow', () => {
  for (const f of [film({}, { seconds: '60' }), film(PLAN)]) {
    const cls = highlights(f).map(s => s.cls);
    for (let i = 1; i < cls.length; i++) assert.notEqual(cls[i], cls[i - 1]);
    assert.ok(new Set(cls).size >= Math.min(3, cls.length));
  }
});

test('the checklist appears only when every row can be read, and holds 2s after its last tick', () => {
  const g = glance(film(PLAN));
  assert.ok(g, 'three short planned lines leave time for the checklist');
  const rows = [...g.body.matchAll(/class="gl-row"/g)].length;
  assert.equal(rows, 3);
  const lastTick = Math.max(...g.cues.filter(c => c.kind === 'tick').map(c => c.at));
  assert.ok(g.dur >= lastTick + 2 - 1e-6);
  assert.equal(glance(film({}, { seconds: '20' })), undefined, 'no time, no checklist');
  assert.equal(glance(film({ limit: 1 })), undefined, 'one highlight is not a list');
});

test('the version is the hero: the numerals are set from the release name, the date is stamped', () => {
  assert.deepEqual(versionMark('AnyRouter 1.6', '1.6.0'), { pre: 'AnyRouter', num: '1.6' });
  assert.deepEqual(versionMark('Spring update', '2.0.0'), { pre: 'Spring update', num: '2.0.0' });
  const hero = film().scenes[1];
  assert.match(hero.body, /class="rv-ink"[^>]*>1\.6</);
  assert.ok(hero.body.includes('2026-09-30'));
  assert.ok(shown(hero.body).includes('name a model family, always get a live model'));
});

test('sound follows the picture: a hit as the version lands, a rise into each highlight, a tick per checklist row', () => {
  const f = film(PLAN);
  const hero = f.scenes[1];
  const hit = hero.cues.find(c => c.kind === 'hit');
  assert.ok(hit && /rv-ink.*1\.0\)/.test(hero.inner.replace(/\n/g, ' ')), 'the hit is where the ink lands');
  for (const s of highlights(f)) assert.ok(s.cues.some(c => c.kind === 'rise'), s.id);
  assert.equal(glance(f).cues.filter(c => c.kind === 'tick').length, 3);
});

test('a highlight that names providers shows their marks, one stamped tile and one tick each', () => {
  const f = film({}, { seconds: '45' });
  const models = highlights(f).find(s => s.id.endsWith('-h2'));
  const marks = [...models.body.matchAll(/assets\/providers\/([\w.-]+)"/g)].map(m => m[1]);
  assert.deepEqual(marks, ['openai-color.svg', 'stepfun-color.svg', 'deepinfra-color.svg', 'deepseek-color.svg']);
  assert.equal(models.cues.filter(c => c.kind === 'tick').length, 4);
  assert.ok(!models.body.includes('class="res'), 'marks, not the resource card');
});

test('a highlight that names no provider shows the page it links to, as a resource card with the AnyRouter mark', () => {
  const f = film({}, { seconds: '45' });
  const byok = highlights(f).find(s => s.id.endsWith('-h3'));
  assert.ok(byok.body.includes('assets/providers/anyrouter-color.svg'));
  assert.ok(byok.body.includes('<div class="res-h">anyrouter.dev</div>'));
  const flat = byok.body.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  assert.ok(flat.includes('/docs/features/byok-providers/antigravity'));
  // no link of its own: the card points at the release page instead of leaving the space empty
  const [bare] = highlights(film({}, {}, { highlights: [{ theme: 'X', line: 'Plain line.', href: null }] }));
  assert.ok(bare.body.replace(/<[^>]+>/g, '').includes('/changelog/1.6.0'));
});

test('the end card stamps every provider the film named, once each, in the order they appeared', () => {
  const end = film({}, { seconds: '45' }).scenes.at(-1);
  const marks = [...end.body.matchAll(/assets\/providers\/([\w.-]+)"/g)].map(m => m[1]);
  assert.deepEqual(marks, ['google-color.svg', 'openai-color.svg', 'stepfun-color.svg', 'deepinfra-color.svg', 'deepseek-color.svg']);
});

test('no fact is typed by hand: every word on screen is the feed\'s, the plan\'s, or the film\'s own labels', () => {
  const LABELS = ['New release', 'Highlights', 'Out now', 'Read more', '→'];
  for (const [plan, flags] of [[{}, {}], [PLAN, {}], [{}, { seconds: '60' }]]) {
    const f = film(plan, flags);
    const source = [JSON.stringify(rel), ...Object.values(plan.lines ?? {}), plan.headline ?? '', plan.kicker ?? '',
      ...LABELS, 'anyrouter.dev/changelog/'].join(' ');
    const known = new Set(source.split(/[\s"{}[\],:]+/).map(w => w.replace(/^https?\/\//, '')));
    for (const s of f.scenes.slice(1, -1)) {
      for (const w of shown(s.body).split(' ')) {
        if (/^\d\d$|^\/$|^·$/.test(w)) continue;   // the index "03 / 05" and separators
        const bare = w.replace(/^v(?=\d)/, '');
        assert.ok(known.has(w) || known.has(bare) || source.includes(w), `${s.id}: "${w}" is not from the facts`);
      }
    }
  }
});

test('feed text is HTML-escaped on screen, so a "<" in a release note cannot break the scene', () => {
  const f = film({}, {}, { highlights: [{ theme: 'A<b>', line: 'Use <script>x</script> now.', href: 'https://x/<y>' }] });
  const body = f.scenes.map(s => s.body).join('');
  assert.ok(!body.includes('<script>') && !body.includes('A<b>') && !body.includes('<y>'));
  assert.ok(body.includes('&lt;script&gt;') && body.includes('A&lt;b&gt;'));
});

test('the end card says the plan\'s headline when there is one, else the release name, over the date and its changelog link', () => {
  const plain = film().scenes.at(-1).body;
  assert.ok(plain.includes('<div class="big">AnyRouter 1.6</div>'));
  assert.ok(shown(plain).includes('2026-09-30 · anyrouter.dev/changelog/1.6.0'));
  const planned = film(PLAN);
  assert.ok(planned.scenes.at(-1).body.includes(`<div class="big">${PLAN.headline}</div>`));
  assert.ok(shown(planned.scenes.at(-1).body).includes(PLAN.kicker));
  const flat = h => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  assert.ok(flat(planned.scenes[0].body).includes(PLAN.kicker), 'the kicker also opens the film');
});

test('plan.seconds sets the length; the flag wins', () => {
  assert.equal(film().duration, 30);
  assert.equal(film({ seconds: 24 }).duration, 24);
  assert.equal(film({ seconds: 24 }, { seconds: '20' }).duration, 20);
});

// ── identity and copy ─────────────────────────────────────────────────────

test('release identity depends only on the version, so editing the copy never re-films it', async () => {
  const collect = async over => {
    const tmp = path.join(dir, '../../.build');
    fs.mkdirSync(tmp, { recursive: true });
    const f = path.join(tmp, 'release-test-feed.xml');
    fs.writeFileSync(f, xml.replace('name a model family', over));
    return kind.collect({ flags: { from: f } });
  };
  const a = await collect('name a model family');
  const b = await collect('completely rewritten headline');
  assert.notEqual(a.headline, b.headline);
  assert.deepEqual(a.parts, ['release:1.6.0']);
  assert.deepEqual(a.parts, b.parts);
  assert.equal(a.label, 'v1.6.0');
  assert.equal(a.notable, true);
});

test('an empty feed is "nothing to film", and an unknown --version fails loud', async () => {
  const f = path.join(dir, '../../.build/release-test-empty.xml');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, '<rss><channel></channel></rss>');
  assert.equal((await kind.collect({ flags: { from: f } })).notable, false);
  await assert.rejects(kind.collect({ flags: { from: path.join(dir, 'fixtures/rss.xml'), version: '9.9.9' } }), /no release "9.9.9"/);
});

test('notes and headline carry the summary, linked highlights and changelog link; plan.headline wins', () => {
  const n = kind.notes(rel, {}).join('\n');
  assert.ok(n.includes(rel.summary));
  assert.ok(n.includes(`[${rel.highlights[0].line}](${rel.highlights[0].href})`));
  assert.ok(n.includes('https://anyrouter.dev/changelog/1.6.0'));
  assert.equal(kind.headline(rel, {}), rel.headline);
  assert.equal(kind.headline(rel, { headline: 'Custom' }), 'Custom');
});
