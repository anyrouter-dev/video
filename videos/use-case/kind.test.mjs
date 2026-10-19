import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import kind, { FILM, parseDoc, redact, rollPools } from './kind.mjs';
import { fingerprint } from '../../lib/ledger.mjs';
import { writePortrait } from '../../shared/authoring/portrait.mjs';

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
const filmOf = (d, slug) => kind.film(kind.split({ useCases: parseDoc(d), pools }).find(r => r.label === slug));
const films = () => parseDoc(doc()).map(u => [u, kind.film(kind.split({ useCases: [u], pools })[0])]);
const html = film => film.scenes.map(s => s.body).join('\n');

// What a viewer can read: tags dropped, inline spans joined (word masks, typed
// characters, the URL halves), every block its own string. A rolled-in id is
// its own element, so it reads as its own string.
const shown = h => h
  .replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, '\n')
  .replace(/<\/?span[^>]*>|<wbr>/g, '')
  .replace(/<[^>]+>/g, '\n')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
// The ids that roll into the preset's place, in order.
const rolled = h => [...h.matchAll(/<em class="ri[^"]*"[^>]*>([^<]*)<\/em>/g)].map(m => m[1]);

// The strings a use case states, redacted the way the film redacts them, and the ids the catalog gave,
// with runs of spaces read as one, as `shown` reads them.
const factsOf = u => [u.kicker, u.title, u.url, u.command?.text, ...u.snippets.flatMap(s => [s.title, ...s.code.split('\n')]),
  ...pools.credit, ...pools.free].filter(Boolean).map(redact).map(f => f.replace(/\s+/g, ' '));
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

test('a new id in the catalog makes a new release only for films that roll it', async () => {
  const before = byLabel(await releases());
  const models = catalog();
  models.data.push({ id: 'x-ai/grok-5', owned_by: 'xai', category: 'text', capabilities: ['chat'], created: 2e9, pricing: { input_per_1m: 2, output_per_1m: 8 } });
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'models-')), 'models.json');
  fs.writeFileSync(file, JSON.stringify(models));
  const after = byLabel(kind.split(await collect(doc(), { 'models-from': file })));
  const changed = Object.keys(before).filter(slug => before[slug] !== after[slug]);
  assert.ok(changed.includes('cheapest-llm-api'), 'cheapest-llm-api rolls anyrouter/auto through the credit ids');
  assert.ok(!changed.includes('claude-code'), 'claude-code names no preset, so it rolls nothing');
  assert.ok(!changed.includes('claude-code-free-models'), 'a free roll never shows a paid id');
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

test('every string on screen is a fact, verbatim', () => {
  for (const [u, film] of films()) {
    const facts = factsOf(u);
    for (const text of shown(html(film))) {
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
    assert.ok(text.includes(u.url.replace(/^https:\/\//, '')), `${u.slug}: the page URL`);
    assert.ok(text.includes(u.kicker), `${u.slug}: the kicker`);
  }
});

test('the page\'s own command is typed, in a terminal when it runs in a shell', () => {
  for (const [u, film] of films()) {
    const h = html(film);
    const typed = [...h.matchAll(/<div class="ln typed focus">([\s\S]*?)<span class="caret">/g)]
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

test('a page that promises $0 or free never rolls an id billed to credits', () => {
  // "Bring your own keys, $0 markup" over grok and kimi reads as "these are free"
  assert.deepEqual(rolled(html(filmOf(doc(), 'byok'))), []);
  assert.ok(rolled(html(filmOf(doc(), 'cheapest-llm-api'))).length > 2, 'the same preset rolls where the page names no price');
  const free = rolled(html(filmOf(doc(), 'free-llm-api')));
  assert.ok(free.length > 2 && free.slice(0, -1).every(id => pools.free.includes(id)), 'a free preset rolls free ids');
});

test('a roll never shows an id that needs the user\'s own key, and a free roll never a paid one', () => {
  const byId = Object.fromEntries(catalog().data.map(m => [m.id, m]));
  for (const id of [...pools.credit, ...pools.free]) {
    assert.ok(byId[id], `${id} is in the catalog`);
    assert.ok(!/^(anthropic|openai|google)\//.test(id), `${id} would need the user's own key`);
  }
  for (const id of pools.free) assert.equal(byId[id].pricing.input_per_1m + byId[id].pricing.output_per_1m, 0, `${id} is free`);
  // newest per maker, never an alias or a dated snapshot of one
  assert.deepEqual(pools.credit, ['deepseek/deepseek-v4.1-flash', 'moonshotai/kimi-k3', 'x-ai/grok-4.7', 'z-ai/glm-5.3']);
});

// ── the film ───────────────────────────────────────────────────────────────

test('every film is 12 to 18 seconds, its three beats back to back on whole frames', () => {
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

test('the headline fills the frame and no code is set below the 36px floor', () => {
  for (const [u, f] of films()) {
    const h = html(f);
    const [, l, p] = h.match(/--fs:(\d+)px;--fs-p:(\d+)px/);
    assert.ok(+l >= 120 && +l <= 140, `${u.slug}: landscape headline ${l}px`);
    assert.ok(+p >= 104 && +p <= 112, `${u.slug}: portrait headline ${p}px`);
    for (const [, px] of h.matchAll(/--cs(?:-p)?:(\d+)px/g)) assert.ok(+px >= 36, `${u.slug}: code ${px}px`);
  }
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
