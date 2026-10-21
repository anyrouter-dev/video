import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import kind, { FILM, parseDoc, redact, undash, restates, rollPools, fallbackOf, narrate } from './kind.mjs';
import { linesOf, TYPE, windowSpan, codeSpan, idFitsRow, barOf } from './scenes.mjs';
import { captureOf } from './captures.mjs';
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
  return kind.collect({ flags: { 'models-from': MODELS, 'skip-link-check': true, ...flags, from: file } });
};
const releases = async d => kind.split(await collect(d));
const byLabel = rs => Object.fromEntries(rs.map(r => [r.label, fingerprint(r.parts)]));
const filmOf = (d, slug) => kind.film(kind.split({ useCases: narrate(parseDoc(d)), pools }).find(r => r.label === slug));
// every film of the fixture, built once: a build reflows each window at every size
let built;
const films = () => (built ??= narrate(parseDoc(doc())).map(u => [u, kind.film(kind.split({ useCases: [u], pools })[0])]));
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
// (the landscape rows: each frame sets the same code in rows of its own)
const rolled = h => [...(h.match(/<div class="also">[\s\S]*?<\/div>/)?.[0] ?? '').matchAll(/<em class="ri[^"]*"[^>]*>([^<]*)<\/em>/g)].map(m => m[1]);

// The strings a use case states, redacted the way the film redacts them, the ids the catalog gave, and
// the line the page's curl prints when its fallback answers, with runs of spaces read as one, as `shown` reads them.
const factsOf = u => [u.kicker, u.title, u.url, `anyrouter.dev/use-cases/${u.slug}`, u.command?.text, ...u.steps, ...u.snippets.flatMap(s => [s.title, ...s.code.split('\n')]),
  ...pools.credit, ...pools.free, fallbackOf(u)].filter(Boolean).flatMap(f => [redact(f), undash(redact(f))]).map(f => f.replace(/\s+/g, ' '));
// Chrome, not copy: the brand, the line over the ids the same key runs, the "…" that marks code left
// out, and the badges over the problem and the result.
const CHROME = s => ['AnyRouter', 'The same key also runs', '…', 'The problem', 'The result'].includes(s);
const NARRATION = () => JSON.parse(fs.readFileSync(path.join(dir, 'narration.json'), 'utf8'));
// What a film says on screen from its script: the problem and the result as kinetic type, and the
// labels of the two diagrams. Each is in the film's claims ledger, with its source.
const scriptedOf = slug => {
  const f = NARRATION().films[slug], m = f.motif, fl = f.flow;
  const labels = { single: [m.a, m.b, m.tag, m.fail], rows: (m.rows ?? []).flat(), sprawl: [m.a, ...(m.rows ?? [])], chips: m.items }[m.kind];
  // a real screen's bar names where it came from: the address or the command its manifest row records
  const bars = [...f.steps.filter(st => st.capture).map(st => st.capture), `${slug}/page/viewport-landscape.png`].map(ref => barOf(captureOf(ref)));
  // and the line a step's screen is about, set again under it, as the ledger sources it off that screen
  const lines = f.steps.filter(st => st.line && f.claims.some(c => c.says === `line on ${st.capture}: ${st.line.text}`)).map(st => st.line.text);
  return [f.role === 'intro' ? f.problem : f.outcome, f.result, ...labels, ...fl.left, ...fl.right, fl.note, ...bars, ...lines].filter(Boolean);
};

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
  u.problem = 'A different problem.';
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
// so are the step labels: each is its step's line, said
const picture = h => h.replace(/<div class="caps"[\s\S]*$/, '').replace(/<div class="sl">[\s\S]*?<\/div>/g, '');
const captions = h => [...h.matchAll(/<div class="cap"[^>]*><span[^>]*>([^<]*)<\/span>/g)].map(m => m[1].replace(/&amp;/g, '&'));

test('every string on screen is a fact, verbatim, or a line of the script its ledger sources', () => {
  for (const [u, film] of films()) {
    const facts = [...factsOf(u), ...scriptedOf(u.slug)];
    for (const shownText of shown(picture(html(film)))) {
      // a line rewritten narrower is still the page's code: a " \\" continues a command onto the next row
      const text = shownText.replace(/\s*\\$/, '');
      if (CHROME(text) || !text) continue;
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

test('the film opens on the page title and closes on its live page', () => {
  for (const [u, film] of films()) {
    const text = shown(html(film));
    assert.equal(text.filter(t => t === u.title).length, 2, `${u.slug}: the headline opens the film and sits over the lockup`);
    // the end card names the live page while the short link does not answer (collect checks it does)
    const card = html(film).match(/<div class="url[^>]*>([\s\S]*?)<\/div>/)[1];
    assert.deepEqual(shown(card), [`anyrouter.dev/use-cases/${u.slug}`], `${u.slug}: the page link`);
    assert.ok(!html(film).includes('anyrouter.dev/u/'), `${u.slug}: no short link that does not answer`);
    assert.ok(text.includes(u.kicker), `${u.slug}: the kicker`);
  }
});

test('the page\'s own command is typed, in a terminal when it runs in a shell', () => {
  for (const [u, film] of films()) {
    const h = html(film);
    // the command's rows, a continued shell command joined back into one line
    const rows = [...h.matchAll(/<div class="ln(?: cont)? typed focus"[^>]*>([\s\S]*?)<span class="caret">/g)]
      .map(m => shown(m[1].replace(/<em[^>]*>[^<]*<\/em>/g, '')).join('').replace(/\s*\\$/, '').trim());
    const typed = [rows.join(' ')];
    assert.ok(rows.length >= 1, `${u.slug}: the command is typed`);
    // a command rewritten narrower is the same command once its spacing is set aside
    const bare = t => t.replace(/[\s→]+/g, '');
    assert.ok(bare(typed[0]).includes(bare(redact(u.command.text.trim()))), `${u.slug}: "${typed[0]}" holds the page's command`);
    assert.equal(/class="code sh/.test(h), u.command.shell, `${u.slug}: a $ prompt only for a shell command`);
  }
});

test('a preset keeps its own id in the request, and the ids the same key runs roll on a line under it', () => {
  // the title read "curl · anyrouter/free" over a request rolling "deepseek/…": a viewer reads that as a contradiction
  const credit = new Set(pools.credit), free = new Set(pools.free);
  let seen = 0;
  for (const [u, film] of films()) {
    const preset = u.command.text.match(/anyrouter\/[a-z0-9-]+/)?.[0];
    const ids = rolled(html(film));
    if (!preset) { assert.deepEqual(ids, [], `${u.slug} names no preset, so nothing rolls`); continue; }
    assert.ok(!/<div class="rows rl">[\s\S]*<em class="ri/.test(html(film).split('<div class="also">')[0]), `${u.slug}: no id rolls inside the request`);
    if (!ids.length) continue;
    seen++;
    assert.ok(ids.length >= 2, `${u.slug}: more than one other id`);
    assert.ok(ids.every(id => (preset === 'anyrouter/free' ? free : credit).has(id)), `${u.slug}: every id from the catalog's ${preset === 'anyrouter/free' ? 'free' : 'credit'} pool`);
  }
  assert.ok(seen >= 8, 'most pages that name a preset roll it');
});

test('an id too long for the line under the window is left out, and ai-sdk keeps its roll', () => {
  assert.ok(idFitsRow('deepseek/deepseek-v4-flash'));
  assert.ok(!idFitsRow(`deepseek/${'deepseek-v4-flash-'.repeat(3)}`));
  // its code line is 47 characters, one past a portrait row with the caret: the ids roll beside it, not in it
  assert.ok(rolled(html(filmOf(doc(), 'ai-sdk'))).length >= 2, 'ai-sdk rolls');
});

test('a page that promises $0 or free never rolls an id billed to credits', () => {
  // "Bring your own keys, $0 markup" over grok and kimi reads as "these are free"
  assert.deepEqual(rolled(html(filmOf(doc(), 'byok'))), []);
  assert.ok(rolled(html(filmOf(doc(), 'go-plan'))).length >= 2, 'the same preset rolls where the page names no price');
  const free = rolled(html(filmOf(doc(), 'free-llm-api')));
  assert.ok(free.length >= 2 && free.every(id => pools.free.includes(id)), 'a free preset rolls free ids');
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

test('every film runs what it is, the problem, its steps, the result and the end card, back to back on whole frames', () => {
  for (const [u, f] of films()) {
    assert.ok(f.duration >= FILM.min && f.duration <= FILM.max, `${u.slug}: ${f.duration}s`);
    const n = f.beats.length - 4;
    assert.ok(n >= 2 && n <= 3, `${u.slug}: two or three steps`);
    assert.deepEqual(f.beats.map(b => b.key), ['intro', 'problem', ...Array.from({ length: n }, (_, i) => `step-${i + 1}`), 'result', 'close']);
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
    // frame.md v3 display type is 184px; portrait sets it up to 168px to fill a phone's height. A long
    // headline steps down to leave the code its room
    assert.ok(+l >= 144 && +l <= 184, `${u.slug}: landscape headline ${l}px`);
    assert.ok(+p >= 120 && +p <= 168, `${u.slug}: portrait headline ${p}px`);
    const [, cl, cp] = h.match(/--cs:(\d+)px;--cs-p:(\d+)px/);
    // a window rewritten narrower for portrait is taller, so landscape may step down to 40px
    assert.ok(+cl >= 40 && +cl <= 56, `${u.slug}: landscape code ${cl}px`);
    // never under the 32px a phone reads, and that small only where a whole token needs the row; as
    // large as landscape's where the code is short enough
    assert.ok(+cp >= 32 && +cp <= 56, `${u.slug}: portrait code ${cp}px`);
    if (+cl >= 48) large++;
  }
  // the steps above the window take room from it, so half at 48px or more
  assert.ok(large >= films().length * 0.5, `${large} of ${films().length} at 48px or more`);
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
  assert.throws(() => filmOf(d, 'openrouter-free-fallback'), /does not fit under its step/);
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
  assert.ok(win.left >= PORTRAIT_SAFE.left && win.right <= PORTRAIT_SAFE.right, `the window spans x ${win.left.toFixed(1)} to ${win.right.toFixed(1)}`);
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
  // it arrives on the step that reads it, with time to read it before the window leaves
  const at = Number(f.scenes[0].inner.match(/ANSWER_AT = ([\d.]+)/)[1]), leaves = Number(f.scenes[0].inner.match(/W_OUT = ([\d.]+)/)[1]);
  const step = f.beats.find(b => b.key === 'step-2');
  assert.ok(at >= step.start && at + 1.5 <= leaves, `the answer at ${at}s, its step at ${step.start}s, the window out at ${leaves}s`);
  for (const [v, g] of films()) if (v.slug !== u.slug) assert.ok(!html(g).includes('class="ln out"'), `${v.slug} shows no fallback`);
});

test('every film has a licensed track of its own, and its sound effects are tied to what moves', () => {
  // the films shared one synthesized score; videos/use-case/sound-check.mjs also measures how far apart they sound
  const music = JSON.parse(fs.readFileSync(path.join(dir, 'audio/music.json'), 'utf8'));
  const tracks = parseDoc(doc()).map(u => music.films[u.slug]?.track);
  assert.ok(tracks.every(Boolean), 'every film has a track');
  assert.equal(new Set(tracks).size, tracks.length, 'no two films share a track');
  for (const t of tracks) assert.match(music.tracks[t].license, /^CC (BY [34]\.0|0)$/, `${t}: a license that allows public YouTube and commercial use`);
  for (const [u, f] of films()) {
    const kinds = new Set(f.scenes[0].cues.map(c => c.kind));
    for (const k of ['travel', 'step', 'key', 'end']) assert.ok(kinds.has(k), `${u.slug}: a ${k} sound`);
  }
});

test('the captions are the narration, word for word, in the order it is said', () => {
  // a caption that drops or adds a word reads as a different claim than the one voiced
  const narration = JSON.parse(fs.readFileSync(path.join(dir, 'narration.json'), 'utf8'));
  for (const [u, f] of films()) {
    // the lines not on screen as kinetic type or in the window are captioned: what it is, and how each step works
    const n = narration.films[u.slug];
    // the intro too, unless it says the headline again
    const intro = n.role === 'intro' ? n.outcome : n.intro;
    const lines = [...(restates(intro, u.title) ? [] : [intro]), ...n.steps.map(st => st.more).filter(Boolean)];
    assert.equal(captions(html(f)).join(' '), lines.join(' '), u.slug);
  }
});

test('the voice is placed where the story says, one line after another, inside the film', () => {
  const narration = NARRATION();
  for (const [u, f] of films()) {
    const n = narration.films[u.slug], other = n.role === 'intro' ? 'problem' : 'intro';
    const ids = [n.role === 'intro' ? 'outcome' : other, n.role === 'intro' ? other : 'outcome',
      ...n.steps.flatMap((st, i) => [`step-${i + 1}`, ...(st.more ? [`step-${i + 1}-more`] : [])]), 'result', 'link'].map(id => `${u.slug}-${id}`);
    assert.deepEqual(f.said.map(l => l.id), ids);
    f.said.forEach((l, i) => {
      assert.ok(fs.existsSync(l.file), `${l.id} is voiced`);
      if (i) assert.ok(l.speaks >= f.said[i - 1].speaks + f.said[i - 1].dur - 0.05, `${u.slug}: ${l.id} starts over the line before it`);
    });
    // each line is said in its own beat: intro, problem, its step, the result, the link over the end card
    const beatOf = id => (/-step-(\d+)/.exec(id) ? `step-${/-step-(\d+)/.exec(id)[1]}` : id.endsWith('-result') ? 'result' : id.endsWith('-link') ? 'close' : null);
    f.said.forEach((l, i) => {
      const key = beatOf(l.id) ?? (i === 0 ? 'intro' : 'problem'), b = f.beats.find(x => x.key === key);
      assert.ok(l.speaks >= b.start && l.speaks + l.dur <= b.start + b.dur + 0.05, `${u.slug}: ${l.id} is said inside ${key}`);
    });
  }
});

test('every real screen a film shows names its source in the film\'s claims ledger', () => {
  // a capture shown without its manifest row could be anything: the ledger keeps where each came from
  for (const [slug, f] of Object.entries(NARRATION().films)) {
    for (const st of f.steps.filter(x => x.capture)) {
      const c = captureOf(st.capture), claim = f.claims.find(x => x.says.startsWith(`capture: ${st.capture} `));
      assert.ok(claim, `${slug}: ${st.capture} has no claim`);
      assert.equal(claim.from, c.url ?? c.command, `${slug}: ${st.capture} names its source`);
      // its line is read off that screen, so the same source stands for it
      const line = f.claims.find(x => x.says === `line on ${st.capture}: ${st.line?.text}`);
      assert.ok(line, `${slug}: the line on ${st.capture} has no claim`);
      assert.equal(line.from, c.url ?? c.command, `${slug}: the line on ${st.capture} names the screen's source`);
    }
    assert.ok(f.claims.some(x => x.says.startsWith(`capture: ${slug}/page/viewport-landscape.png`)), `${slug}: the end card's page has a claim`);
  }
});
