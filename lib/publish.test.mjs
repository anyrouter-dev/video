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

/** A release rendered tonight that is not out anywhere yet. */
function fresh() {
  const entry = released();
  return ledger.update('dual', entry.hash, {
    published: {},
    renditions: Object.fromEntries(Object.entries(entry.renditions).map(([r, f]) => [r, { artifact: f.artifact, cover: f.cover }])),
  });
}

/** Runs fn with GITHUB_EVENT_NAME set (or removed), then puts it back. */
async function as(event, fn) {
  const prior = process.env.GITHUB_EVENT_NAME;
  if (event) process.env.GITHUB_EVENT_NAME = event; else delete process.env.GITHUB_EVENT_NAME;
  try { return await fn(); } finally {
    if (prior === undefined) delete process.env.GITHUB_EVENT_NAME; else process.env.GITHUB_EVENT_NAME = prior;
  }
}

for (const event of ['schedule', 'repository_dispatch']) {
  test(`a ${event} run refuses to upload to YouTube or publish a Release, and calls neither`, async () => {
    await as(event, async () => {
      const c = clients();
      await assert.rejects(publish(kind, fresh(), {}, c), /unattended/);
      await assert.rejects(publish(kind, fresh(), { draft: true }, c), /unattended.*YouTube/);
      await assert.rejects(publish(kind, fresh(), { youtube: false }, c), /unattended.*draft/);
      await assert.rejects(publish(kind, released(), { replace: true, draft: true, youtube: false }, c), /unattended/);
      assert.equal(c.calls.github.length, 0);
      assert.equal(c.calls.youtube.length, 0);
    });
  });

  test(`a ${event} run with --draft --no-youtube makes a draft Release and nothing else`, async () => {
    await as(event, async () => {
      const c = clients();
      const entry = fresh();
      await publish(kind, entry, { draft: true, youtube: false }, c);
      assert.equal(c.calls.github.length, 1);
      assert.equal(c.calls.github[0].draft, true);
      assert.equal(c.calls.youtube.length, 0);
      assert.equal(ledger.find('dual', entry.id).published.draft, true);
    });
  });
}

test('a posting dispatch is a workflow_dispatch nobody pressed: draft Release only, never YouTube', async () => {
  process.env.REQUESTED_BY = 'posting';
  try {
    await as('workflow_dispatch', async () => {
      const c = clients();
      await assert.rejects(publish(kind, fresh(), { draft: true }, c), /posting dispatch.*YouTube/);
      await assert.rejects(publish(kind, fresh(), { youtube: false }, c), /posting dispatch.*draft/);
      await assert.rejects(publish(kind, released(), { replace: true, draft: true, youtube: false }, c), /posting dispatch/);
      assert.equal(c.calls.github.length, 0);
      await publish(kind, fresh(), { draft: true, youtube: false }, c);
      assert.equal(c.calls.github.length, 1);
      assert.equal(c.calls.github[0].draft, true);
      assert.equal(c.calls.youtube.length, 0);
    });
  } finally { delete process.env.REQUESTED_BY; }
});

test('YT_PRIVACY=public is refused before anything is called', async () => {
  await as('workflow_dispatch', async () => {
    const c = clients();
    process.env.YT_PRIVACY = 'public';
    try {
      await assert.rejects(publish(kind, fresh(), {}, c), /YT_PRIVACY/);
    } finally { delete process.env.YT_PRIVACY; }
    assert.equal(c.calls.github.length, 0);
    assert.equal(c.calls.youtube.length, 0);
  });
});

test('YouTube privacy is private unless set to unlisted, and nothing else is accepted', async () => {
  const { youtubePrivacy } = await import('./publish.mjs');
  assert.equal(youtubePrivacy({}), 'private');
  assert.equal(youtubePrivacy({ YT_PRIVACY: 'unlisted' }), 'unlisted');
  for (const v of ['public', 'PUBLIC', 'Public ', 'listed']) assert.throws(() => youtubePrivacy({ YT_PRIVACY: v }), /YT_PRIVACY/);
});

test('handoff writes a posting draft folder: post.md, posting.json, the landscape film and its cover', async () => {
  const { handoff } = await import('./handoff.mjs');
  const entry = fresh();
  const dual = { ...kind, link: () => 'https://anyrouter.dev/models' };
  const dir = handoff(dual, entry);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['anyrouter-dual-v1.mp4', 'anyrouter-dual-v1.png', 'post.md', 'posting.json']);
  const md = fs.readFileSync(path.join(dir, 'post.md'), 'utf8');
  assert.match(md, new RegExp(`^external_ref: "dual-${entry.id}"$`, 'm'));
  assert.match(md, /^media: \["anyrouter-dual-v1.mp4", "anyrouter-dual-v1.png"\]$/m);
  assert.match(md, /^## x\nOne key, every model\n\nhttps:\/\/anyrouter.dev\/models$/m);
  assert.match(md, /^## youtube\nOne key, every model\n/m);
});

test('handoff writes posting.json: the AgentDraft posting imports, keyed on the tag, with the film by sha256', async () => {
  const { handoff, POSTING_FILM_SCHEMA } = await import('./handoff.mjs');
  const crypto = await import('node:crypto');
  const entry = fresh();
  const dual = { ...kind, link: () => 'https://anyrouter.dev/models', modelIds: () => ['acme/one'] };
  const dir = handoff(dual, entry);
  assert.ok(fs.readdirSync(dir).includes('posting.json'));
  const j = JSON.parse(fs.readFileSync(path.join(dir, 'posting.json'), 'utf8'));
  const film = fs.readFileSync(path.join(dir, 'anyrouter-dual-v1.mp4'));
  const sha = crypto.createHash('sha256').update(film).digest('hex');
  assert.equal(j.schema, POSTING_FILM_SCHEMA);
  assert.equal(j.tag, `dual-${entry.id}`);
  assert.deepEqual(j.model_ids, ['acme/one']);
  assert.deepEqual(j.film, { file: 'anyrouter-dual-v1.mp4', sha256: sha, bytes: film.length, width: 1920, height: 1080 });
  assert.equal(j.cover, 'anyrouter-dual-v1.png');
  // Only AgentDraftSchema's keys: posting parses `draft` strictly.
  assert.deepEqual(Object.keys(j.draft).sort(), ['brief', 'external_ref', 'link', 'media', 'title', 'variants']);
  assert.equal(j.draft.external_ref, j.tag);
  assert.deepEqual(Object.keys(j.draft.variants).sort(), ['linkedin', 'x', 'youtube']);
  assert.equal(j.draft.variants.youtube.title, 'One key, every model');
  // A draft Release link is not public, so no copy may point at github.com.
  assert.doesNotMatch(JSON.stringify(j.draft), /github\.com/);
  assert.deepEqual(j.draft.media, [{ ref: sha, kind: 'video', mime: 'video/mp4', bytes: film.length, alt: 'One key, every model' }]);
});
