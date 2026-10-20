// The words a narrated film says and shows follow the unslop rules that a machine can check:
// no dashes as punctuation, straight quotes, no stock AI vocabulary, no "not just X, but Y".
// Judgment rules (metaphor, fragments for effect) still need a reader.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NARRATED = ['explainer', 'openrouter-unblock', 'sign-in-with-anyrouter', 'pool-donation', 'sign-in-with-agentid', 'cli-agents', 'cli-everyday', 'why-gateway', 'byok-upstreams'];

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
