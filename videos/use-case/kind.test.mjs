import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import kind, { FILM, parseDoc, redact, firstSentence } from './kind.mjs';
import { landings } from './scenes.mjs';
import { fingerprint } from '../../lib/ledger.mjs';
import { writePortrait } from '../../shared/authoring/portrait.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(dir, 'fixtures/use-cases.json');
const doc = () => JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const collect = async (d = doc(), flags = {}) => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'use-case-')), 'use-cases.json');
  fs.writeFileSync(file, JSON.stringify(d));
  return kind.collect({ flags: { ...flags, from: file } });
};
const releases = async d => kind.split(await collect(d));
const byLabel = rs => Object.fromEntries(rs.map(r => [r.label, fingerprint(r.parts)]));
const filmOf = (d, slug) => kind.film(kind.split({ useCases: parseDoc(d) }).find(r => r.label === slug));
const keys = film => film.scenes.map(s => s.key);

// What a viewer can read in a scene: tags dropped, inline spans joined (word
// masks, typed characters, the URL halves), every block its own string.
const shown = html => html
  .replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, '\n')
  .replace(/<\/?span[^>]*>|<wbr>/g, '')
  .replace(/<[^>]+>/g, '\n')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);

// The strings a use case states, redacted the way the film redacts them.
const factsOf = u => [u.kicker, u.title, u.summary, u.problem, u.url, ...u.steps, u.command?.text,
  ...u.snippets.map(s => s.title), ...(u.diagram?.nodes ?? []).flatMap(n => [n.label, n.note])]
  .filter(Boolean).map(redact);
// Chrome, not copy: the stepper's numbers and the brand.
const CHROME = s => /^\d+$/.test(s) || s === 'AnyRouter';

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
  edited.useCases.find(u => u.slug === 'donate-keys').steps[0] = 'Add the key under BYOK in the dashboard.';
  const after = byLabel(await releases(edited));
  const changed = Object.keys(before).filter(slug => before[slug] !== after[slug]);
  assert.deepEqual(changed, ['donate-keys']);
});

test('a field the film never shows does not make a new release', async () => {
  // A new identity is a new render and a new YouTube upload, which the page would then have to re-embed.
  const before = byLabel(await releases());
  const edited = doc();
  edited.useCases.find(u => u.slug === 'claude-code').hook = 'A different hook line.';
  assert.deepEqual(byLabel(await releases(edited)), before);
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

test('pending lists every unreleased use case by slug', () => {
  const root = path.resolve(dir, '../..');
  const out = execFileSync(process.execPath, ['lib/cli.mjs', 'pending', 'use-case', `--from=${FIXTURE}`], { cwd: root, encoding: 'utf8' });
  for (const u of doc().useCases) assert.match(out, new RegExp(`→ ${u.slug} +PENDING`));
  assert.match(out, /pending: use-case/);
});

test('a malformed response fails loudly at the boundary', () => {
  assert.throws(() => parseDoc({ version: 2, useCases: [] }), /version/);
  const bad = doc();
  delete bad.useCases[0].title;
  assert.throws(() => parseDoc(bad), /claude-code\)\.title/);
});

// ── what reaches the screen ────────────────────────────────────────────────

test('every string on screen is a fact, verbatim', () => {
  for (const u of parseDoc(doc())) {
    const facts = factsOf(u);
    for (const s of kind.film(kind.split({ useCases: [u] })[0]).scenes) {
      for (const text of shown(s.body)) {
        if (CHROME(text)) continue;
        assert.ok(facts.some(f => f.includes(text)), `${u.slug} ${s.id} shows "${text}", which no fact states`);
      }
    }
  }
});

test('an API key never reaches the screen, only its prefix', () => {
  const d = doc();
  const u = d.useCases.find(x => x.slug === 'claude-code');
  u.steps[0] = 'Paste sk-ar-v1-0123456789abcdef0123456789 when the CLI asks.';
  u.command = { text: 'export ANYROUTER_API_KEY=sk-ar-v1-0123456789abcdef0123456789', shell: true };
  const html = filmOf(d, 'claude-code').scenes.map(s => s.body).join('\n');
  assert.ok(!html.includes('0123456789abcdef'), 'the key body is gone');
  assert.ok(shown(html).some(t => t.includes('sk-ar-v1-••••••••')), 'the prefix stays, so a viewer knows which key');
});

test('the scene list follows the facts: no diagram, no flow; no command, no terminal', () => {
  const full = filmOf(doc(), 'claude-code');
  assert.deepEqual(keys(full), ['title', 'command', 'step', 'step', 'step', 'flow', 'end']);
  const d = doc();
  const u = d.useCases.find(x => x.slug === 'claude-code');
  delete u.diagram;
  u.command = null;
  assert.deepEqual(keys(filmOf(d, 'claude-code')), ['title', 'step', 'step', 'step', 'end']);
});

test('the problem is kept when there is time, and is the first thing to go when there is not', () => {
  // ai-sdk is short enough to keep it; claude-code needs the room for its steps and flow.
  assert.ok(keys(filmOf(doc(), 'ai-sdk')).includes('problem'));
  assert.ok(!keys(filmOf(doc(), 'claude-code')).includes('problem'));
  const problem = filmOf(doc(), 'ai-sdk').scenes.find(s => s.key === 'problem');
  const u = parseDoc(doc()).find(x => x.slug === 'ai-sdk');
  assert.deepEqual(shown(problem.body), [firstSentence(u.problem)]);
});

test('at most three steps, each the step or its first sentence', () => {
  for (const u of parseDoc(doc())) {
    const steps = kind.film(kind.split({ useCases: [u] })[0]).scenes.filter(s => s.key === 'step');
    assert.equal(steps.length, Math.min(3, u.steps.length), u.slug);
    steps.forEach((s, i) => {
      const text = shown(s.body).filter(t => !CHROME(t)).join(' ');
      assert.ok([u.steps[i], firstSentence(u.steps[i])].includes(text), `${u.slug} step ${i + 1}: "${text}"`);
    });
  }
});

test('the dashed fallback edge is drawn after the solid ones', () => {
  const u = parseDoc(doc()).find(x => x.slug === 'openrouter-free-fallback');
  const nodes = Object.fromEntries(u.diagram.nodes.map(n => [n.id, n]));
  const levels = [['app'], ['gw'], ['or', 'free']].map(l => l.map(id => nodes[id]));
  const at = landings(levels, u.diagram.edges);
  assert.ok(u.diagram.edges.find(e => e.to === 'free').dashed);
  assert.ok(at.get('free') > at.get('or'), 'the fallback lands after the route it backs up');
  assert.ok(at.get('or') > at.get('gw') && at.get('gw') > at.get('app'), 'left to right');
});

// ── the film ───────────────────────────────────────────────────────────────

test('every film is 15 to 25 seconds, its scenes back to back on whole frames', () => {
  for (const u of parseDoc(doc())) {
    const f = kind.film(kind.split({ useCases: [u] })[0]);
    assert.ok(f.duration >= FILM.min && f.duration <= FILM.max, `${u.slug}: ${f.duration}s`);
    let at = 0;
    for (const s of f.scenes) {
      assert.ok(Math.abs(s.start - at) < 1e-9, `${u.slug} ${s.id} starts at ${s.start}, not ${at}`);
      assert.ok(Math.abs(s.dur * 30 - Math.round(s.dur * 30)) < 1e-6, `${u.slug} ${s.id} is a whole number of frames`);
      at = +(at + s.dur).toFixed(3);
    }
    assert.ok(Math.abs(at - f.duration) < 1e-9);
  }
});

test('no text a viewer must read is set below 44px, in either rendition', () => {
  for (const u of parseDoc(doc())) {
    const html = kind.film(kind.split({ useCases: [u] })[0]).scenes.map(s => s.body).join('\n');
    for (const [, px] of html.matchAll(/--fs(?:-p)?:(\d+)px/g)) assert.ok(+px >= 44, `${u.slug}: ${px}px`);
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
  for (const slug of ['openrouter-free-fallback', 'donate-keys']) {
    const film = kind.write(path.join(tmp, slug), kind.id, filmOf(doc(), slug));
    const index = fs.readFileSync(path.join(tmp, slug, 'index.html'), 'utf8');
    assert.equal((index.match(/data-composition-src=/g) || []).length, film.scenes.length);
    for (const f of ['fonts/geist.woff2', 'fonts/geist-mono.woff2', 'audio/mix.wav']) assert.ok(fs.existsSync(path.join(tmp, slug, f)), f);
    assert.doesNotThrow(() => writePortrait(path.join(tmp, slug), path.join(tmp, `${slug}-portrait`)));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});
