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
  assert.ok(a.parts.some(p => p.startsWith('assets/mix.wav:')), 'the sound is part of the identity');
  assert.ok(a.parts.some(p => p.startsWith('compositions/machine.html:')), 'the machine is part of the identity');
});

test('planning files and the build tools are not part of the identity', async () => {
  const { parts } = await kind.collect({ dir });
  assert.equal(parts.some(p => /^(tools|STORYBOARD|SCRIPT|BRIEF|sfx-cues)/.test(p)), false);
});

test('the cover is taken from the settled end card', async () => {
  const seconds = parseFloat(/data-duration="([\d.]+)"/.exec(read('index.html'))[1]);
  const at = kind.coverAt({ duration: seconds });
  assert.ok(at > seconds - 2.5 && at < seconds - 0.6, `cover at ${at}s of ${seconds}s`);
});

test('the swap changes one word: every agent runs the same model from the same command line', () => {
  const html = read('compositions/machine.html');
  assert.equal((html.match(/--model anyrouter\/free/g) ?? []).length, 1, 'one model row, shared by every agent');
  for (const agent of ['claude', 'pi', 'opencode']) assert.match(html, new RegExp(`class="sel sel-${agent}"`), `${agent} types into the same slot`);
});

test('the install line on screen is the one anyr --help prints, whole', () => {
  const rows = [...read('compositions/machine.html').matchAll(/<div class="row install"[^>]*>(.*?)<\/div>/g)].map(m => m[1].replace(/<[^>]+>/g, ''));
  assert.equal(rows.slice(0, 3).join(' '), '$ curl -fsSL https://anyrouter.dev/setup.sh | bash');
});

test('the music is credited where its CC BY license asks', () => {
  assert.match(kind.notes({ seconds: 34, version: 1 }).join('\n'), /Kevin MacLeod.*Creative Commons: By Attribution 4\.0/);
  assert.match(read('audio/LICENSES.md'), /CC BY 4\.0|By Attribution 4\.0/);
});
