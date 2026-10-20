import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import kind, { FILM, parseDoc, redact, rollPools, fallbackOf, styleOf, narrate } from './kind.mjs';
import { linesOf, TYPE, windowSpan, codeSpan, idFitsRow } from './scenes.mjs';
import { fingerprint } from '../../lib/ledger.mjs';
import { writePortrait, PORTRAIT_SAFE } from '../../shared/authoring/portrait.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(dir, 'fixtures/use-cases.json');
const MODELS = path.join(dir, 'fixtures/models.json');
const doc = () => JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const catalog = () => JSON.parse(fs.readFileSync(MODELS, 'utf8'));
const pools = rollPools(catalog());
const collect = async (d = doc(), flags = {}) => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'use-case-')), 'use-cases.json');
  fs.writeFileSync(file, JSON.stringify(d));
  return kind.collect({ flags: { 'models-from': MODELS, ...flags, from: file } });
};
const releases = async d => kind.split(await collect(d));
const byLabel = rs => Object.fromEntries(rs.map(r => [r.label, fingerprint(r.parts)]));
const filmOf = (d, slug) => kind.film(kind.split({ useCases: narrate(parseDoc(d)), pools }).find(r => r.label === slug));
const films = () => narrate(parseDoc(doc())).map(u => [u, kind.film(kind.split({ useCases: [u], pools })[0])]);
const html = film => film.scenes.map(s => s.body).join('\n');

// What a viewer can read: tags dropped, inline spans joined (word masks, typed
// characters, the URL halves), every block its own string. A rolled-in id is
// its own element, so it reads as its own string. A headline read across its
// line breaks is one string.
const shown = h => h
  .replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, '\n')
  // the lockup's URL as each frame sets it
  .replace(/<span class="u[lp]">/g, '\n')
  .replace(/<br[^>]*>/g, ' ')
  .replace(/<\/?span[^>]*>|<wbr>/g, '')
  .replace(/<[^>]+>/g, '\n')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
// The ids that roll into the preset's place, in order.
const rolled = h => [...h.matchAll(/<em class="ri[^"]*"[^>]*>([^<]*)<\/em>/g)].map(m => m[1]);

// The strings a use case states, redacted the way the film redacts them, the ids the catalog gave, and
// the line the page's curl prints when its fallback answers, with runs of spaces read as one, as `shown` reads them.
const factsOf = u => [u.kicker, u.title, u.url, u.command?.text, ...u.snippets.flatMap(s => [s.title, ...s.code.split('\n')]),
  ...pools.credit, ...pools.free, fallbackOf(u)].filter(Boolean).map(redact).map(f => f.replace(/\s+/g, ' '));
// Chrome, not copy: the brand.
const CHROME = s => s === 'AnyRouter';

// ── one release per use case ───────────────────────────────────────────────

test('every use case on the site is its own release, named by its slug', async () => {
  const rs = await releases();
  assert.equal(rs.length, doc().useCases.length);
  assert.deepEqual(rs.map(r => r.label), doc().useCases.map(u => u.slug));
  assert.ok(rs.every(r => r.notable && r.parts.length === 1));
});

test('editing one use case changes the identity of that film only', async () => {
  const before = byLabel(await releases());
  const edited = doc();
  edited.useCases.find(u => u.slug === 'donate-keys').title = 'Donate a key you do not use';
  const after = byLabel(await releases(edited));
  const changed = Object.keys(before).filter(slug => before[slug] !== after[slug]);
  assert.deepEqual(changed, ['donate-keys']);
});

test('a field the film never shows does not make a new release', async () => {
  // A new identity is a new render and a new YouTube upload, which the page would then have to re-embed.
  const before = byLabel(await releases());
  const edited = doc();
  const u = edited.useCases.find(x => x.slug === 'claude-code');
  u.hook = 'A different hook line.';
  u.steps[0] = 'A different first step.';
  assert.deepEqual(byLabel(await releases(edited)), before);
});

// The fixture catalog with `edit` applied to the model `id`, saved where collect can read it.
const catalogWith = (id, edit) => {
  const models = catalog();
  edit(models.data.find(m => m.id === id));
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'models-')), 'models.json');
  fs.writeFileSync(file, JSON.stringify(models));
  return file;
};

test('a rolled id moving to the user\'s own key makes a new release only for films that roll it', async () => {
  const before = byLabel(await releases());
  const file = catalogWith('minimax/minimax-m3.1-flash', m => { m.pricing.billing = 'byok'; });
  const after = byLabel(kind.split(await collect(doc(), { 'models-from': file })));
  const changed = Object.keys(before).filter(slug => before[slug] !== after[slug]);
  assert.ok(changed.includes('cheapest-llm-api'), 'cheapest-llm-api rolls anyrouter/auto through the credit ids');
  assert.ok(changed.includes('claude-code-free-models'), 'it rolls anyrouter/free through the free ids');
  assert.ok(!changed.includes('claude-code'), 'claude-code names no preset, so it rolls nothing');
});

test('--slug collects one use case, so gen and check work on one film', async () => {
  const data = await collect(doc(), { slug: 'claude-code' });
  assert.deepEqual(data.useCases.map(u => u.slug), ['claude-code']);
  assert.equal(data.label, 'claude-code');
  await assert.rejects(collect(doc(), { slug: 'no-such-page' }), /no use case "no-such-page"/);
});

test('splitting a single release gives it back unchanged', async () => {
  // regen and plan read a frozen release, which has already been split once
  for (const r of await releases()) assert.deepEqual(kind.split(r), [r]);
});

test('pending reports every use case by slug', () => {
  // Each use case is its own release, so each gets its own line, pending or out.
  const root = path.resolve(dir, '../..');
  const out = execFileSync(process.execPath, ['lib/cli.mjs', 'pending', 'use-case', `--from=${FIXTURE}`, `--models-from=${MODELS}`], { cwd: root, encoding: 'utf8' });
  for (const u of doc().useCases) assert.match(out, new RegExp(`→ ${u.slug} +(PENDING|already released as )`));
  assert.match(out, /^pending: /m);
});

test('a malformed response fails loudly at the boundary', () => {
  assert.throws(() => parseDoc({ version: 2, useCases: [] }), /version/);
  const bad = doc();
  delete bad.useCases[0].title;
  assert.throws(() => parseDoc(bad), /claude-code\)\.title/);
  assert.throws(() => rollPools({ object: 'list' }), /models\.data/);
});

// ── what reaches the screen ────────────────────────────────────────────────

// The captions are the narration, whose claims narration.json sources line by line.
const picture = h => h.replace(/<div class="caps"[\s\S]*$/, '');
const captions = h => [...h.matchAll(/<div class="cap"[^>]*><span>([^<]*)<\/span>/g)].map(m => m[1].replace(/&amp;/g, '&'));

test('every string on screen is a fact, verbatim', () => {
  for (const [u, film] of films()) {
    const facts = factsOf(u);
    for (const text of shown(picture(html(film)))) {
      if (CHROME(text)) continue;
      assert.ok(facts.some(f => f.includes(text)), `${u.slug} shows "${text}", which no fact states`);
    }
  }
});

test('an API key never reaches the screen, only its prefix', () => {
  const d = doc();
  const u = d.useCases.find(x => x.slug === 'claude-code');
  u.command = { text: 'export ANYROUTER_API_KEY=sk-ar-v1-0123456789abcdef0123456789', shell: true };
  const h = html(filmOf(d, 'claude-code'));
  assert.ok(!h.includes('0123456789abcdef'), 'the key body is gone');
  assert.ok(shown(h).some(t => t.includes('sk-ar-v1-••••••••')), 'the prefix stays, so a viewer knows which key');
});

test('the film opens on the page title and closes on its URL', () => {
  for (const [u, film] of films()) {
    const text = shown(html(film));
    assert.equal(text.filter(t => t === u.title).length, 1, `${u.slug}: the headline is one element, carried through every beat`);
    const card = html(film).match(/<div class="url[^>]*>([\s\S]*?)<\/div>/)[1], page = u.url.replace(/^https:\/\//, '');
    // portrait names the list the page is on when the page's own URL would not sit on one row
    assert.ok(shown(card).length === 1 ? shown(card)[0] === page : shown(card)[0] === page && shown(card)[1] === 'anyrouter.dev/use-cases', `${u.slug}: the page URL`);
    assert.ok(text.includes(u.kicker), `${u.slug}: the kicker`);
  }
});

test('the page\'s own command is typed, in a terminal when it runs in a shell', () => {
  for (const [u, film] of films()) {
    const h = html(film);
    const typed = [...h.matchAll(/<div class="ln typed focus"[^>]*>([\s\S]*?)<span class="caret">/g)]
      .map(m => shown(m[1].replace(/<em[^>]*>[^<]*<\/em>/g, '')).join(''));
    assert.equal(typed.length, 1, `${u.slug}: one line is the command`);
    assert.ok(typed[0].includes(redact(u.command.text.trim())), `${u.slug}: "${typed[0]}" holds the page's command`);
    assert.equal(/class="code sh/.test(h), u.command.shell, `${u.slug}: a $ prompt only for a shell command`);
  }
});

test('a preset rolls through real ids one key runs, then comes back to the page\'s own', () => {
  const credit = new Set(pools.credit), free = new Set(pools.free);
  let seen = 0;
  for (const [u, film] of films()) {
    const preset = u.command.text.match(/anyrouter\/[a-z0-9-]+/)?.[0];
    const ids = rolled(html(film));
    if (!preset) { assert.deepEqual(ids, [], `${u.slug} names no preset, so nothing rolls`); continue; }
    if (!ids.length) continue;
    seen++;
    assert.equal(ids.at(-1), preset, `${u.slug}: the roll ends on the page's own id`);
    const real = ids.slice(0, -1);
    assert.ok(real.length >= 2, `${u.slug}: more than one other id`);
    assert.ok(real.every(id => (preset === 'anyrouter/free' ? free : credit).has(id)), `${u.slug}: every id from the catalog's ${preset === 'anyrouter/free' ? 'free' : 'credit'} pool`);
  }
  assert.ok(seen >= 8, 'most pages that name a preset roll it');
});

test('a roll id that cannot sit whole on a portrait row is left out, and one that can takes a row of its own', () => {
  // a token is never cut, so an id wider than a row at the smallest code size would reflow the line as it rolls in
  const line = { text: 'model: anyrouter("anyrouter/free"),', focus: true };
  assert.ok(idFitsRow(line, 'anyrouter/free', 'deepseek/deepseek-v4-flash', false));
  assert.ok(!idFitsRow(line, 'anyrouter/free', `deepseek/${'deepseek-v4-flash-'.repeat(3)}`, false));
  // anyrouter("deepseek/deepseek-v4-flash"), is 40 characters: in portrait it sits on a row under "model:", for every id
  const h = html(filmOf(doc(), 'ai-sdk'));
  assert.ok(rolled(h).length > 2 && /class="code ed[^"]* brk-p/.test(h), 'ai-sdk rolls each id on a row of its own in portrait');
});

test('a page that promises $0 or free never rolls an id billed to credits', () => {
  // "Bring your own keys, $0 markup" over grok and kimi reads as "these are free"
  assert.deepEqual(rolled(html(filmOf(doc(), 'byok'))), []);
  assert.ok(rolled(html(filmOf(doc(), 'cheapest-llm-api'))).length > 2, 'the same preset rolls where the page names no price');
  const free = rolled(html(filmOf(doc(), 'free-llm-api')));
  assert.ok(free.length > 2 && free.slice(0, -1).every(id => pools.free.includes(id)), 'a free preset rolls free ids');
});

test('a roll never shows an id that needs the user\'s own key, and a free roll never a paid one', () => {
  // billing "byok" means the user's own provider key, not one AnyRouter key: under a preset it would read as included
  const byId = Object.fromEntries(catalog().data.map(m => [m.id, m]));
  const runsOnCredits = id => byId[id] && byId[id].pricing.billing !== 'byok' && !id.startsWith('anyrouter/');
  const isFree = id => runsOnCredits(id) && Number(byId[id].pricing.prompt) === 0 && Number(byId[id].pricing.completion) === 0;
  let seen = 0;
  for (const [u, film] of films()) {
    const ids = rolled(html(film)).slice(0, -1);
    const free = u.command.text.includes('anyrouter/free');
    for (const id of ids) {
      seen++;
      assert.ok(runsOnCredits(id), `${u.slug} rolls ${id}, which the catalog bills to the user's own key`);
      if (free) assert.ok(isFree(id), `${u.slug} rolls ${id} under anyrouter/free, and it is not priced 0`);
    }
  }
  assert.ok(seen > 0, 'some film rolls');
  assert.deepEqual(pools.credit, ['deepseek/deepseek-v4-flash', 'nvidia/nemotron-3-super-120b-a12b', 'minimax/minimax-m3.1-flash']);
});

test('an id the catalog bills to the user\'s own key, or prices above 0 under free, drops out of its roll', () => {
  const pick = (id, edit) => rollPools(JSON.parse(fs.readFileSync(catalogWith(id, edit), 'utf8')));
  assert.ok(!pick('deepseek/deepseek-v4-flash', m => { m.pricing.billing = 'byok'; }).credit.includes('deepseek/deepseek-v4-flash'));
  const priced = pick('nvidia/nemotron-3-super-120b-a12b', m => { m.pricing.prompt = '0.1'; });
  assert.ok(priced.credit.includes('nvidia/nemotron-3-super-120b-a12b'), 'a priced id still runs on credits');
  assert.ok(!priced.free.includes('nvidia/nemotron-3-super-120b-a12b'), 'but never rolls under anyrouter/free');
});

// ── the film ───────────────────────────────────────────────────────────────

test('every film is 25 to 45 seconds, its three beats back to back on whole frames', () => {
  for (const [u, f] of films()) {
    assert.ok(f.duration >= FILM.min && f.duration <= FILM.max, `${u.slug}: ${f.duration}s`);
    assert.deepEqual(f.beats.map(b => b.key), ['outcome', 'doing', 'lockup']);
    let at = 0;
    for (const b of f.beats) {
      assert.ok(Math.abs(b.start - at) < 1e-9, `${u.slug} ${b.key} starts at ${b.start}, not ${at}`);
      assert.ok(Math.abs(b.dur * 30 - Math.round(b.dur * 30)) < 1e-6, `${u.slug} ${b.key} is a whole number of frames`);
      at = +(at + b.dur).toFixed(3);
    }
    assert.ok(Math.abs(at - f.duration) < 1e-9);
  }
});

test('the headline fills the frame and the code reads from across the room', () => {
  // A 1920 frame holding a thin strip of 40px code reads as an empty white frame, and a phone screen as a smudge.
  let large = 0;
  for (const [u, f] of films()) {
    const h = html(f);
    const [, l, p] = h.match(/--fs:(\d+)px;--fs-p:(\d+)px/);
    // frame.md v3 display type is 184px, 148px in portrait; a long headline steps down to leave the code its room
    assert.ok(+l >= 144 && +l <= 184, `${u.slug}: landscape headline ${l}px`);
    assert.ok(+p >= 120 && +p <= 148, `${u.slug}: portrait headline ${p}px`);
    const [, cl, cp] = h.match(/--cs:(\d+)px;--cs-p:(\d+)px/);
    assert.ok(+cl >= 48 && +cl <= 56, `${u.slug}: landscape code ${cl}px`);
    // never under the 32px a phone reads, and that small only where a whole token needs the row
    assert.ok(+cp >= 32 && +cp <= 44, `${u.slug}: portrait code ${cp}px`);
    if (+cl >= 52) large++;
  }
  assert.ok(large >= films().length * 0.75, `${large} of ${films().length} at 52px or more: 48px is only for a line that would wrap or a tall editor`);
});

test('no headline word is wider than its frame', () => {
  // each word rises in its own mask, which never breaks: "anyrouter/free" at 148px runs past a portrait frame
  for (const [u, f] of films()) {
    const [, l, p] = html(f).match(/--fs:(\d+)px;--fs-p:(\d+)px/);
    for (const [o, px] of [['landscape', +l], ['portrait', +p]]) {
      for (const word of u.title.split(/\s+/)) {
        const lines = linesOf(word, { px, width: TYPE.title[o].width, weight: TYPE.title.weight, tracking: TYPE.title.tracking });
        assert.equal(lines, 1, `${u.slug}: "${word}" at ${px}px is wider than the ${o} frame`);
      }
    }
  }
});

test('code too tall to sit under the caption fails the build, never a caption too small to read', () => {
  const d = doc();
  const u = d.useCases.find(x => x.slug === 'openrouter-free-fallback');
  u.snippets = u.snippets.map(s => ({ ...s, code: s.code.split('\n').map(l => (l.includes(u.command.text) ? l : `${l} ${'x'.repeat(30)} ${'y'.repeat(30)}`)).join('\n').replace(u.command.text, `${u.command.text} ${'z '.repeat(120)}`) }));
  assert.throws(() => filmOf(d, 'openrouter-free-fallback'), /too tall to sit under the caption/);
});

test('the release copy is the page: its title, its summary and a link back', async () => {
  const [r] = kind.split(await collect(doc(), { slug: 'claude-code' }));
  assert.equal(kind.headline(r), 'Run Claude Code through AnyRouter');
  assert.deepEqual(kind.notes(r), ['Run Claude Code through AnyRouter with one command', 'https://anyrouter.dev/use-cases/claude-code']);
  assert.equal(kind.link(r), 'https://anyrouter.dev/use-cases/claude-code');
});

test('the written project turns into the portrait rendition with nothing left at landscape sizes', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'use-case-film-'));
  for (const slug of ['openrouter-free-fallback', 'byok']) {
    const film = kind.write(path.join(tmp, slug), kind.id, filmOf(doc(), slug));
    const index = fs.readFileSync(path.join(tmp, slug, 'index.html'), 'utf8');
    assert.equal((index.match(/data-composition-src=/g) || []).length, film.scenes.length);
    for (const f of ['fonts/geist.woff2', 'fonts/geist-mono.woff2', 'audio/mix.wav']) assert.ok(fs.existsSync(path.join(tmp, slug, f)), f);
    assert.doesNotThrow(() => writePortrait(path.join(tmp, slug), path.join(tmp, `${slug}-portrait`)));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('the kicker is a quarter larger than frame.md\'s badge, so it reads on a phone', () => {
  // at 36px the kicker on a portrait film shown on a phone is a few px tall
  const film = filmOf(doc(), 'openai-sdk');
  const px = rule => Number(film.css.match(new RegExp(`\\.film \\.kick\\{[^}]*${rule}:(\\d+)px`))?.[1]);
  assert.ok(px('font-size') >= 36 * 1.25, `kicker at ${px('font-size')}px`);
  assert.ok(px('height') >= 64 * 1.25, `kicker pill ${px('height')}px tall`);
});

test('portrait code leaned in all the way stays inside the safe area across', () => {
  // the window spans the safe width, so its code has the room for a whole URL; the camera leans in about
  // the safe area's centre, so the code stays inside it and only the card's edge passes it, by a hair
  const code = codeSpan('portrait'), win = windowSpan('portrait');
  assert.ok(code.left >= PORTRAIT_SAFE.left && code.right <= PORTRAIT_SAFE.right, `the code spans x ${code.left.toFixed(1)} to ${code.right.toFixed(1)}`);
  assert.ok(win.left >= PORTRAIT_SAFE.left - 20 && win.right <= PORTRAIT_SAFE.right + 20, `the window spans x ${win.left.toFixed(1)} to ${win.right.toFixed(1)}`);
});

// The headline's lines in one frame, as the film breaks them.
const headline = (h, o) => h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]
  .split(`<br class="b${o[0]}">`).map(part => shown(part).join(' '));

test('a headline breaks in even lines across the safe width, never inside a name when it need not', () => {
  // the browser's balancing gave "Run Claude / Code through / AnyRouter" and "Keep the / OpenAI / SDK, change / two fields"
  assert.deepEqual(headline(html(filmOf(doc(), 'claude-code')), 'portrait'), ['Run', 'Claude Code', 'through', 'AnyRouter']);
  assert.deepEqual(headline(html(filmOf(doc(), 'openai-sdk')), 'portrait'), ['Keep the', 'OpenAI SDK,', 'change', 'two fields']);
  assert.deepEqual(headline(html(filmOf(doc(), 'openai-sdk')), 'landscape'), ['Keep the OpenAI SDK,', 'change two fields']);
  for (const [u, f] of films()) {
    const h = html(f), [, l, p] = h.match(/--fs:(\d+)px;--fs-p:(\d+)px/);
    for (const [o, px] of [['landscape', +l], ['portrait', +p]]) {
      for (const line of headline(h, o)) {
        const n = linesOf(line, { px, width: TYPE.title[o].width, weight: TYPE.title.weight, tracking: TYPE.title.tracking, breakWords: false });
        assert.equal(n, 1, `${u.slug}: "${line}" at ${px}px is wider than the ${o} safe area`);
      }
    }
  }
});

test('a line that sets what the page changes, its base URL, key or model, is shown whole', () => {
  // "Keep the OpenAI SDK, change two fields" showed its second field, apiKey, as a faded context line cut to "process.env.ANYROUTER_AP"
  const changes = /anyrouter\.dev\/api|ANYROUTER_API_KEY|sk-ar-|\bmodels?\b"?\s*[:=]/;
  const lines = h => [...h.matchAll(/<div class="ln ([^"]*)"[^>]*>([\s\S]*?)<\/div>/g)].map(m => ({ cls: m[1], text: shown(m[2].replace(/<em[^>]*>[^<]*<\/em>/g, '')).join('') }));
  const key = lines(html(filmOf(doc(), 'openai-sdk'))).find(l => l.text.includes('apiKey'));
  assert.ok(key && !/ctx|clip/.test(key.cls), `openai-sdk sets apiKey whole: ${JSON.stringify(key)}`);
  for (const [u, f] of films()) {
    for (const l of lines(html(f)).filter(x => changes.test(x.text))) {
      assert.ok(!/ctx|clip/.test(l.cls), `${u.slug}: "${l.text}" sets what the page changes, so it is not faded or cut`);
    }
  }
});

test('the caret follows the command\'s last character, and a blank line keeps its row', () => {
  // after a wrapped token the caret took a row of its own, which read as a blank line between the two fields
  const h = html(filmOf(doc(), 'openai-sdk'));
  assert.match(h, /<span class="c">,<\/span><span class="caret"><\/span><\/span><\/div>/, 'the caret is inside the last token');
  // an empty context line collapsed to nothing, so the window drew one row less than it was sized for
  assert.match(filmOf(doc(), 'openai-sdk').css, /\.film \.ln\{min-height:1\.45em;/);
});

test('a page about a fallback shows its request answered through it, as the page\'s curl prints it', () => {
  // "OpenRouter free models, with fallback to another free model" typed the request and never showed the fallback
  const u = doc().useCases.find(x => x.slug === 'openrouter-free-fallback');
  assert.ok(u.steps.some(t => /X-AnyRouter-Fallback header\. When the header reads anyrouter\/free/.test(t)), 'the page says what the header reads');
  assert.ok(u.snippets[0].code.includes('grep -i -e x-anyrouter-fallback'), 'and its curl greps for it');
  const f = filmOf(doc(), 'openrouter-free-fallback'), h = html(f);
  const out = h.match(/<div class="ln out"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(out, 'the window holds the answer');
  assert.deepEqual(shown(out[1]), ['x-anyrouter-fallback: anyrouter/free']);
  assert.match(out[1], /<span class="m">anyrouter\/free<\/span>/, 'the fallback that answered takes the accent');
  // it arrives inside beat 2, with time to read it before the window leaves
  const at = Number(f.scenes[0].inner.match(/ANSWER_AT = ([\d.]+)/)[1]);
  assert.ok(at > f.beats[1].start && at + 1.5 <= f.beats[2].start, `the answer at ${at}s, beat 3 at ${f.beats[2].start}s`);
  for (const [v, g] of films()) if (v.slug !== u.slug) assert.ok(!html(g).includes('class="ln out"'), `${v.slug} shows no fallback`);
});

test('every film has a score of its own, read off its slug', () => {
  // all 29 films shared the intro score; videos/use-case/sound-check.mjs measures how far apart they sound
  const styles = parseDoc(doc()).map(u => [u.slug, styleOf(u.slug)]);
  assert.deepEqual(styleOf('claude-code'), styleOf('claude-code'), 'the same page always gets the same music');
  for (const [, f] of films()) assert.equal(f.palette, 'calm');
  const sig = s => `${s.key} ${s.mode} ${s.groove} ${s.lead} ${s.prog}`;
  for (let i = 0; i < styles.length; i++) for (let j = i + 1; j < styles.length; j++) {
    const [a, x] = styles[i], [b, y] = styles[j];
    assert.ok(sig(x) !== sig(y) || Math.abs(x.bpm - y.bpm) > 6, `${a} and ${b} share key, mode, groove, motif voice and chords`);
  }
});

test('the captions are the narration, word for word, in the order it is said', () => {
  // a caption that drops or adds a word reads as a different claim than the one voiced
  const narration = JSON.parse(fs.readFileSync(path.join(dir, 'narration.json'), 'utf8'));
  for (const [u, f] of films()) {
    const lines = ['outcome', 'doing', 'then'].map(b => narration.films[u.slug][b]).filter(Boolean).concat(narration.lockup);
    assert.equal(captions(html(f)).join(' '), lines.join(' ').replace(/\^/g, ''), u.slug);
  }
});

test('the voice is placed where the story says, one line after another, inside the film', () => {
  for (const [u, f] of films()) {
    assert.deepEqual(f.said.map(l => l.id), [...['outcome', 'doing', 'then'].map(b => `${u.slug}-${b}`).filter(id => fs.existsSync(path.join(dir, 'voice', `${id}.json`))), 'lockup']);
    f.said.forEach((l, i) => {
      assert.ok(fs.existsSync(l.file), `${l.id} is voiced`);
      if (i) assert.ok(l.at >= f.said[i - 1].at + f.said[i - 1].dur - 0.3, `${u.slug}: ${l.id} starts over the line before it`);
    });
    assert.ok(f.said.at(-1).at >= f.beats[2].start && f.said.at(-1).at + f.said.at(-1).dur <= f.duration, `${u.slug}: the last line is said over the lockup`);
    // the music steps down under every spoken stretch
    assert.equal(f.voice.length, f.said.length);
  }
});
