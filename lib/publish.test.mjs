import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The ledger and the renders go to a scratch dir; set before anything reads paths.mjs.
const state = fs.mkdtempSync(path.join(os.tmpdir(), 'video-state-'));
Object.assign(process.env, {
  VIDEO_STATE: state, GH_TOKEN: 'token', GITHUB_REPOSITORY: 'anyrouter-dev/video',
  YOUTUBE_CLIENT_ID: 'id', YOUTUBE_CLIENT_SECRET: 'secret', YOUTUBE_REFRESH_TOKEN: 'refresh',
});
delete process.env.YT_TITLE_TEMPLATE;
const { publish } = await import('./publish.mjs');
const ledger = await import('./ledger.mjs');
const { ROOT } = await import('./paths.mjs');

const kind = { id: 'dual', title: 'Dual', headline: () => 'One key, every model', notes: () => ['A two-second card.'] };

/** GitHub and YouTube at their boundary: each call is kept, each returns the link it would. */
function clients() {
  const calls = { github: [], youtube: [] };
  return {
    calls,
    github: async args => { calls.github.push(args); return `https://github.com/anyrouter-dev/video/releases/tag/${args.tag}`; },
    youtube: async args => { calls.youtube.push(args); return `https://youtu.be/${calls.youtube.length}`; },
  };
}

/** A release that is out, whose landscape film is on YouTube and whose portrait one is not. */
function released() {
  fs.rmSync(path.join(state, 'releases'), { recursive: true, force: true });
  const data = { notable: true, label: 'v1', parts: ['index.html:1'] };
  const hash = ledger.fingerprint(data.parts);
  const id = ledger.makeId(1, 'v1', hash, new Date('2026-10-01T00:00:00Z'));
  const film = name => {
    const f = path.join(state, 'renders', name);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, name);
    return path.relative(ROOT, f);
  };
  return ledger.snapshot('dual', {
    id, hash, kind: 'dual', label: 'v1', title: 'One key, every model', seconds: 2,
    renderedAt: '2026-10-01T00:00:00.000Z', commit: 'abc1234', source: null,
    renditions: {
      landscape: { artifact: film(`dual-${id}.mp4`), cover: film(`dual-${id}.png`), youtube: 'https://youtu.be/landscape' },
      portrait: { artifact: film(`dual-${id}-portrait.mp4`), cover: film(`dual-${id}-portrait.png`) },
    },
    published: { github: `https://github.com/anyrouter-dev/video/releases/tag/dual-${id}` },
  }, { data, plan: {} });
}

test('publish uploads only the rendition YouTube does not have yet, as a Short, and records it', async () => {
  const entry = released();
  const c = clients();
  await publish(kind, entry, {}, c);

  assert.equal(c.calls.youtube.length, 1);
  assert.match(c.calls.youtube[0].film, /-portrait\.mp4$/);
  assert.match(c.calls.youtube[0].title, / #Shorts$/);
  const row = ledger.find('dual', entry.id);
  assert.equal(row.renditions.portrait.youtube, 'https://youtu.be/1');
  assert.equal(row.renditions.landscape.youtube, 'https://youtu.be/landscape');

  // Again: both are on YouTube, so nothing is uploaded twice.
  await publish(kind, row, {}, c);
  assert.equal(c.calls.youtube.length, 1);
});

test('a replace (regen) never uploads to YouTube, and leaves the portrait waiting for youtube.yml', async () => {
  const entry = released();
  const c = clients();
  await publish(kind, entry, { replace: true }, c);
  assert.equal(c.calls.youtube.length, 0);
  assert.equal(ledger.find('dual', entry.id).renditions.portrait.youtube, undefined);
});

test('the Release gets both films, and its notes link each and say what it is for', async () => {
  const entry = released();
  const c = clients();
  await publish(kind, entry, {}, c);
  const { assets, notes, tag } = c.calls.github[0];
  const base = `https://github.com/anyrouter-dev/video/releases/download/${tag}`;

  assert.deepEqual(assets.map(([name]) => name),
    ['anyrouter-dual-v1.mp4', 'anyrouter-dual-v1.png', 'anyrouter-dual-v1-portrait.mp4', 'anyrouter-dual-v1-portrait.png']);
  assert.ok(notes.includes(`[anyrouter-dual-v1.mp4](${base}/anyrouter-dual-v1.mp4) is 1920×1080, for YouTube`), notes);
  assert.ok(notes.includes(`[anyrouter-dual-v1-portrait.mp4](${base}/anyrouter-dual-v1-portrait.mp4) is 1080×1920, for YouTube Shorts`), notes);
  assert.match(notes, /portrait\.mp4\).*by hand on Instagram Reels and TikTok/);
});

test('a film missing from disk is fine once its Release is out, and fatal before', async () => {
  const entry = released();
  fs.rmSync(path.join(ROOT, entry.renditions.landscape.artifact));
  const c = clients();
  await publish(kind, entry, {}, c);
  assert.deepEqual(c.calls.github[0].assets.map(([name]) => name), ['anyrouter-dual-v1-portrait.mp4', 'anyrouter-dual-v1-portrait.png']);
  await assert.rejects(publish(kind, { ...entry, published: {} }, {}, c), /is gone/);
  await assert.rejects(publish(kind, entry, { replace: true }, c), /is gone/);
});
