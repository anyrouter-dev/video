import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFeed, unescapeXml } from './feed.mjs';
import kind, { firstSentence } from './kind.mjs';
import { IGNITE, CTA } from '../../lib/film.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const xml = fs.readFileSync(path.join(dir, 'fixtures/rss.xml'), 'utf8');
const [rel] = parseFeed(xml);
const film = (over = {}, flags = {}) => kind.film({ ...rel, ...over }, { plan: {}, flags });

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
});

test('entities are unescaped exactly once, so "&amp;lt;" is shown as "&lt;" and never as "<"', () => {
  assert.equal(unescapeXml('a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos; &#65;&#x42;'), `a & b <c> "d" 'e' AB`);
  assert.equal(unescapeXml('&amp;lt;'), '&lt;');
  const [r] = parseFeed(`<item><title>T &amp; U</title><link>https://x/1.0.0</link><pubDate>Mon, 01 Jan 2029 00:00:00 GMT</pubDate><description>&lt;p&gt;a &amp;amp; b&lt;/p&gt;</description></item>`);
  assert.equal(r.headline, 'T & U');
  assert.equal(r.summary, 'a & b');
});

test('scenes never overlap and end exactly at the CTA, or the checker flags stacked layouts', () => {
  const f = film();
  const scenes = f.scenes;
  assert.equal(scenes[0].start, 0);
  for (let i = 0; i < scenes.length - 1; i++) {
    assert.ok(Math.abs(scenes[i].start + scenes[i].dur - scenes[i + 1].start) < 1e-6, `${scenes[i].id} → ${scenes[i + 1].id}`);
  }
  const last = scenes.at(-1);
  assert.equal(last.dur, CTA);
  assert.ok(Math.abs(last.start + last.dur - f.duration) < 1e-6);
  assert.ok(Math.abs(scenes[1].start - IGNITE) < 1e-6);
});

test('scene ids are unique, since they are file names and DOM ids', () => {
  const ids = film().scenes.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every text scene stays up long enough to read (~0.3s a word plus 1s of the shown copy)', () => {
  for (const s of film().scenes.slice(1, -1)) {
    const shown = [...s.body.matchAll(/<p class="(?:line[^"]*|tail)">([^<]*)</g)].map(x => x[1]).join(' ');
    const n = shown.split(/\s+/).filter(Boolean).length;
    assert.ok(s.dur >= 1 + 0.3 * n - 1e-6, `${s.id}: ${s.dur}s for ${n} words`);
  }
});

test('a 30s film uses the 30s score; a 20s film leaves music to the default so it is never outlasted', () => {
  assert.equal(film().music, 'audio/score-30s.wav');
  assert.equal(film({}, { seconds: '20' }).music, undefined);
});

test('the highlight cap is honoured; highlights that cannot be read in time are dropped from the end, never squeezed', () => {
  const count = f => f.scenes.length - 3;   // ignite + hero + cta
  assert.ok(count(film()) <= 5 && count(film()) >= 3);
  assert.equal(count(film({}, { limit: '2' })), 2);
  const short = film({}, { seconds: '12' });
  assert.ok(count(short) < count(film()));
  const end = short.scenes.at(-1);
  assert.ok(Math.abs(end.start + end.dur - 12) < 1e-6);
});

test('a long highlight is cut to its first sentence so the card stays legible', () => {
  const two = rel.highlights[0].line;
  assert.ok(two.split('. ').length > 1);
  assert.equal(firstSentence(two), '-latest aliases such as google/gemini-flash-latest resolve to the newest live model in a family.');
  assert.equal(firstSentence('New: GPT-6.1 Sol and Step 5.'), 'New: GPT-6.1 Sol and Step 5.');
  const body = film().scenes[2].body;
  assert.ok(!body.includes('They are listed'));
});

test('feed text is HTML-escaped on screen, so a "<" in a release note cannot break the scene', () => {
  const f = film({ highlights: [{ theme: 'A<b>', line: 'Use <script>x</script> now.', href: null }] });
  const body = f.scenes[2].body;
  assert.ok(!body.includes('<script>'));
  assert.ok(body.includes('&lt;script&gt;'));
});

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
