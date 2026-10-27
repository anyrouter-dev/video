// The owner approves everything that goes public. A run nobody started by hand
// (the nightly schedule, a repository_dispatch from the AnyRouter repo) may
// render and leave a draft, and nothing more. These read the workflow files as
// text, because the test job runs bare `node --test` with no YAML parser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.mjs';

const dir = path.join(ROOT, '.github', 'workflows');
const workflows = fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f))
  .map(f => ({ f, text: fs.readFileSync(path.join(dir, f), 'utf8') }));
/** The `on:` block: from `on:` to the next top-level key. */
const triggers = text => /^on:\n([\s\S]*?)^\S/m.exec(text)?.[1] ?? '';
const unattended = text => /^\s+(schedule|repository_dispatch|push|pull_request|workflow_run):/m.test(triggers(text));

test('a workflow that runs unattended holds no YouTube credentials', () => {
  for (const { f, text } of workflows.filter(w => unattended(w.text))) {
    assert.doesNotMatch(text, /YOUTUBE_|YT_PRIVACY/, `${f} runs unattended and can reach YouTube`);
  }
});

test('an unattended workflow publishes only a draft Release and never to YouTube', () => {
  for (const { f, text } of workflows.filter(w => unattended(w.text))) {
    for (const line of text.split('\n').filter(l => /--publish\b/.test(l))) {
      const ownerOnly = /GITHUB_EVENT_NAME"? = "?workflow_dispatch/.test(line);
      assert.ok(ownerOnly || (/--draft\b/.test(line) && /--no-youtube\b/.test(line)),
        `${f}: "${line.trim()}" can publish from an unattended run`);
    }
  }
});

test('the nightly render passes --draft and --no-youtube', () => {
  const render = workflows.find(w => w.f === 'render-video.yml');
  assert.ok(render && unattended(render.text), 'render-video.yml is the nightly job');
  assert.match(render.text, /--publish --draft --no-youtube --accept/);
});

test('only an owner dispatch uploads to YouTube, and only as private', () => {
  const uploaders = workflows.filter(w => /YOUTUBE_REFRESH_TOKEN/.test(w.text));
  assert.deepEqual(uploaders.map(w => w.f), ['youtube.yml']);
  const yt = uploaders[0].text;
  assert.deepEqual(triggers(yt).match(/^ {2}\w+:/gm), ['  workflow_dispatch:']);
  assert.match(yt, /YT_PRIVACY: private\n/);
});

test('a posting dispatch of the render only renders what is new: regen and force are refused', () => {
  const render = workflows.find(w => w.f === 'render-video.yml').text;
  assert.match(render, /requested_by:[\s\S]*?options: \[owner, posting\]/);
  assert.match(render, /REQUESTED_BY: \$\{\{ inputs\.requested_by \|\| 'owner' \}\}/);
  assert.match(render, /"\$REQUESTED_BY" = "posting" \] && \{ \[ -n "\$REGEN" \] \|\| \[ "\$\{\{ inputs\.force \}\}" = "true" \]; \}; then\n\s+echo '::error::[^\n]*'; exit 1/);
});
