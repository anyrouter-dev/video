import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'regroup-captions.mjs');

// Words spoken back to back at 0.3s each, the way captions.mjs writes them: groups of a few
// words, split at every comma.
function regroup(sentences) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'regroup-'));
  fs.mkdirSync(path.join(dir, 'compositions'));
  let t = 0;
  const words = sentences.join(' ').split(' ').map(text => ({ text, start: t, end: (t += 0.3) - 0.02 }));
  const groups = [];
  for (let i = 0; i < words.length; i += 3) groups.push({ frame: 1, words: words.slice(i, i + 3) });
  fs.writeFileSync(path.join(dir, 'compositions/captions.html'), `<script>\nvar GROUPS = ${JSON.stringify(groups)};\n</script>`);
  fs.writeFileSync(path.join(dir, 'caption_groups.json'), '{}');
  execFileSync(process.execPath, [SCRIPT], { cwd: dir, stdio: 'pipe' });
  return JSON.parse(fs.readFileSync(path.join(dir, 'caption_groups.json'), 'utf8')).groups.map(g => g.text);
}

test('a long sentence splits after its comma, not inside a clause', () => {
  assert.deepEqual(regroup(['AnyRouter encrypts your key, and you can stop sharing any time.']), [
    'AnyRouter encrypts your key,',
    'and you can stop sharing any time.',
  ]);
  assert.deepEqual(regroup(['While your key is shared, you get the pool\'s free models with no daily cap, the Go plan at no cost, and four dollars of credit every month.']), [
    'While your key is shared,',
    'you get the pool\'s free models with no daily cap,',
    'the Go plan at no cost,',
    'and four dollars of credit every month.',
  ]);
});

test('a sentence with no comma splits before a joining word', () => {
  const [first, second] = regroup(['Members share keys they are not using and those keys make up a pool of free AI usage.']);
  assert.equal(first, 'Members share keys they are not using');
  assert.equal(second, 'and those keys make up a pool of free AI usage.');
});

test('a short sentence stays whole', () => {
  assert.deepEqual(regroup(['There is also a shared pool.']), ['There is also a shared pool.']);
});

test('a phrase spoken in a moment joins the rest of its sentence', () => {
  assert.deepEqual(regroup(['And each one has its own key and its own bill.', 'Use three, and you have three keys and three bills to manage.']), [
    'And each one has its own key and its own bill.',
    'Use three, and you have three keys and three bills to manage.',
  ]);
});
