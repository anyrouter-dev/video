import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kind from './kind.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

test('collect is deterministic: an unedited film keeps the same identity', async () => {
  const a = await kind.collect({ dir });
  const b = await kind.collect({ dir });
  assert.deepEqual(a.parts, b.parts);
  assert.ok(a.parts.some(p => p.startsWith('assets/voice/01.wav:')), 'the narration is part of the identity');
  assert.ok(a.parts.some(p => p.startsWith('compositions/frames/06-close.html:')), 'the scenes are part of the identity');
});

test('planning files and the raw capture are not part of the identity', async () => {
  const { parts } = await kind.collect({ dir });
  assert.equal(parts.some(p => /^(capture|tools|STORYBOARD|SCRIPT|BRIEF)/.test(p)), false);
});

test('the cover is taken from the settled end card', async () => {
  const seconds = parseFloat(/data-duration="([\d.]+)"/.exec(read('index.html'))[1]);
  const at = kind.coverAt({ duration: seconds });
  assert.ok(at > seconds - 2.5 && at < seconds - 0.6, `cover at ${at}s of ${seconds}s`);
});

test('no real API key is on screen: every key prefix in a frame is followed by redaction bullets or the field placeholder', () => {
  const frames = path.join(dir, 'compositions/frames');
  for (const f of fs.readdirSync(frames)) {
    const html = fs.readFileSync(path.join(frames, f), 'utf8');
    for (const m of html.matchAll(/\b(sk-(?:ar-|or-)?(?:v1-)?|nvapi-)([^\s<"'`]*)/g)) {
      // "sk-..." is a key field placeholder: three dots, no key
      assert.match(m[2], /^(•|\.\.\.$)/, `${f}: ${m[0]} is not redacted`);
    }
  }
});

test('no AgentID auth token is on screen: the waiting page token is shown truncated', () => {
  const frames = path.join(dir, 'compositions/frames');
  for (const f of fs.readdirSync(frames)) {
    const html = fs.readFileSync(path.join(frames, f), 'utf8');
    for (const m of html.matchAll(/"auth_token":\s*"([^"]*)"/g)) {
      assert.match(m[1], /^[A-Za-z0-9_-]{0,4}…$/, `${f}: auth_token ${m[1]} is not truncated`);
    }
  }
});
