// The words a narrated film says and shows follow the unslop rules that a machine can check:
// no dashes as punctuation, straight quotes, no stock AI vocabulary, no "not just X, but Y".
// Judgment rules (metaphor, fragments for effect) still need a reader.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NARRATED = ['explainer', 'openrouter-unblock', 'sign-in-with-anyrouter', 'pool-donation', 'sign-in-with-agentid', 'cli-agents', 'cli-everyday', 'why-gateway', 'byok-upstreams', 'mcp', 'api-keys'];

const RULES = [
  [/[—–]/, 'a long or short dash'],
  [/[“”‘’]/, 'a curly quote'],
  [/\b(additionally|crucial|delve|enduring|enhance|fostering|garner|interplay|intricate|pivotal|showcase|tapestry|testament|underscore|vibrant|seamless(ly)?|leverage|utilize|unlock the power|game[- ]changer|supercharge)\b/i, 'AI vocabulary'],
  [/\bnot just\b[^.]*\bbut\b/i, '"not just X, but Y"'],
];

const spokenLines = kind => fs.readFileSync(path.join(ROOT, 'videos', kind, 'SCRIPT.md'), 'utf8')
  .split('\n').filter(l => /^ {4}\S/.test(l)).map(l => l.trim());

// Visible text of a frame: tags, scripts and styles stripped. Coarse, but every word a
// viewer reads is in here.
const screenText = html => html
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, '\n')
  .split('\n').map(s => s.trim()).filter(Boolean);

const offences = (lines, where) => lines.flatMap(line =>
  RULES.filter(([re]) => re.test(line)).map(([, name]) => `${where}: ${name} in "${line.slice(0, 90)}"`));

for (const kind of NARRATED) {
  test(`${kind}: the narration reads plainly`, () => {
    assert.deepEqual(offences(spokenLines(kind), 'SCRIPT.md'), []);
  });

  test(`${kind}: the words on screen read plainly`, () => {
    const dir = path.join(ROOT, 'videos', kind, 'compositions/frames');
    const found = fs.readdirSync(dir).flatMap(f => offences(screenText(fs.readFileSync(path.join(dir, f), 'utf8')), f));
    assert.deepEqual(found, []);
  });
}

test('the lint catches what it claims to', () => {
  assert.equal(offences(['One key — every model.'], 'x').length, 1);
  assert.equal(offences(['A seamless way to leverage models'], 'x').length, 1);
  assert.equal(offences(['It is not just fast, but cheap.'], 'x').length, 1);
  assert.equal(offences(['One key for every model.'], 'x').length, 0);
});

// The generated model films write their lines from facts. Each kind's fixture films are read
// here, what they say and what they show, with two more rules: "no daily cap", never
// "unlimited", and no ranking word unless a live page states it.
const MODEL_RULES = [...RULES, [/\bunlimited\b/i, '"unlimited"'], [/\b(best|fastest|cheapest|leading|smartest|top-rated)\b/i, 'a ranking word']];
const fixture = (kind, f) => path.join(ROOT, 'videos', kind, 'fixtures', f);
const json = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const lintAll = (lines, where) => lines.flatMap(line => MODEL_RULES.filter(([re]) => re.test(line)).map(([, name]) => `${where}: ${name} in "${line.slice(0, 90)}"`));

test('model-launch: the fixture films read plainly, said and shown', async () => {
  const { factsOf, FEATURED } = await import('../../videos/model-launch/kind.mjs');
  const { scriptOf } = await import('../../videos/model-launch/script.mjs');
  const { body } = await import('../../videos/model-launch/scene.mjs');
  const doc = json(fixture('model-launch', 'models.json'));
  const now = Date.parse('2026-10-21T23:59:59Z');
  const found = FEATURED.flatMap(id => {
    const f = factsOf(doc.data.find(m => m.id === id), { now });
    return [...lintAll(scriptOf(f).map(l => l.text), id), ...lintAll(screenText(body(f, { captions: [] })), id)];
  });
  assert.deepEqual(found, []);
});

test('free-roundup: the fixture film reads plainly', async () => {
  const { roundupOf, scriptOf } = await import('../../videos/free-roundup/kind.mjs');
  const d = roundupOf(json(fixture('free-roundup', 'models.json')), { now: Date.parse('2026-10-21T23:59:59Z') });
  assert.deepEqual(lintAll([...scriptOf(d).map(l => l.text), ...d.entries.map(e => e.name)], 'free-roundup'), []);
});

test('weekly: the fixture film reads plainly', async () => {
  const { weekOf, scriptOf } = await import('../../videos/weekly/week.mjs');
  const w = weekOf(json(fixture('weekly', 'models.json')), fs.readFileSync(fixture('weekly', 'llms.txt'), 'utf8'), '2026-W42');
  assert.deepEqual(lintAll(scriptOf(w).map(l => l.text), 'weekly'), []);
});

test('the model-film lint catches what it claims to', () => {
  assert.equal(lintAll(['Free, with unlimited calls.'], 'x').length, 1);
  assert.equal(lintAll(['The fastest model on AnyRouter.'], 'x').length, 1);
  assert.equal(lintAll(['It is free to call, with no daily cap.'], 'x').length, 0);
});
