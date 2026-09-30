/**
 * publish — put a rendered film on a GitHub Release, and optionally on YouTube.
 *
 * The GitHub Release IS the store: the mp4, the cover and the generated source
 * live there as assets, not in git. Both targets are optional and both skip
 * cleanly when not configured, so a clone with no secrets still has a working CI.
 *
 * ── GitHub Releases ──────────────────────────────────────────────────────
 * Needs a token with `contents: write` and the repo name:
 *   local : GH_TOKEN=$(gh auth token) GITHUB_REPOSITORY=owner/name
 *   CI    : the built-in GITHUB_TOKEN
 * The tag is `<kind>-<id>`, so the ledger row and the Release are one thing.
 *
 * ── YouTube ───────────────────────────────────────────────────────────────
 * Needs YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN
 * (`npm run yt:auth` mints the last one). Without all three it says why and
 * skips — the GitHub Release is the durable record, YouTube a mirror.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.mjs';
import { load, tagOf, update } from './ledger.mjs';

const mb = f => (fs.statSync(f).size / 1048576).toFixed(1);

export async function publish(kind, entry, { dry = false, youtube: wantYouTube = true } = {}) {
  if (!entry.renderedAt) throw new Error(`${entry.id} is recorded but not rendered`);
  const film = path.join(ROOT, entry.artifact);
  if (!fs.existsSync(film)) throw new Error(`${entry.artifact} is gone — re-render with --force`);

  const { data, plan } = load(kind.id, entry.id);
  const tag = tagOf(kind.id, entry.id);
  const headline = kind.headline(data, plan);
  const repo = process.env.GITHUB_REPOSITORY;
  // Asset name → file. Names are fixed so a Release always reads the same way.
  const assets = [
    [`${kind.id}.mp4`, film],
    ['cover.png', entry.cover && path.join(ROOT, entry.cover)],
    ['source.tar.gz', entry.source && path.join(ROOT, entry.source)],
  ].filter(([, f]) => f && fs.existsSync(f));
  const hasCover = assets.some(([n]) => n === 'cover.png');

  const notes = [
    hasCover && repo && `![cover](https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/cover.png)`,
    headline,
    ...kind.notes(data, plan),
    '---',
    `${kind.title} · \`${entry.id}\` · ${entry.seconds}s. The facts this film was cut from are committed under`
      + ` \`releases/${kind.id}/${entry.id}/\`; the generated composition is attached as \`source.tar.gz\`.`,
  ].filter(Boolean).join('\n\n');

  console.log(`release  ${tag}`);
  console.log(`title    ${headline}`);
  for (const [name, f] of assets) console.log(`asset    ${name.padEnd(14)} ${mb(f)} MB`);
  if (!hasCover) console.log('asset    cover.png      MISSING');

  const results = { github: entry.published?.github || 'skipped', youtube: entry.published?.youtube || 'skipped' };
  const attempt = async (name, fn) => {
    try { await fn(); } catch (e) { results[name] = `FAILED: ${e.message}`; }
  };

  await attempt('github', async () => {
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    if (!token || !repo) {
      console.log('\n── github: SKIP  (need GH_TOKEN or GITHUB_TOKEN, and GITHUB_REPOSITORY)');
      return;
    }
    if (dry) { console.log('\n── github: would publish'); results.github = 'would publish'; return; }
    results.github = await github({ token, repo, tag, headline, notes, assets });
  });

  await attempt('youtube', async () => {
    const need = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'];
    const missing = need.filter(k => !process.env[k]);
    if (!wantYouTube) { console.log('\n── youtube: skipped (--no-youtube)'); return; }
    if (entry.published?.youtube) { console.log(`\n── youtube: already uploaded (${entry.published.youtube})`); return; }
    if (missing.length) {
      console.log(`\n── youtube: SKIP  (missing ${missing.join(', ')})`);
      console.log('   The film is not lost — the GitHub Release is the durable record.');
      return;
    }
    if (dry) { console.log('\n── youtube: would upload'); results.youtube = 'would upload'; return; }
    results.youtube = await youtube({ film, headline, tag, share: plan.share });
  });

  console.log('\n── summary');
  for (const [k, v] of Object.entries(results)) console.log(`   ${k.padEnd(8)} ${v}`);

  // Remember what is already out, so a re-run never uploads a second copy.
  const done = Object.fromEntries(Object.entries(results).filter(([, v]) => /^https:/.test(v)));
  if (Object.keys(done).length) update(kind.id, entry.hash, { published: { ...entry.published, ...done } });

  const failed = Object.entries(results).filter(([, v]) => String(v).startsWith('FAILED'));
  if (failed.length) throw new Error(failed.map(([k, v]) => `${k} ${v}`).join('; '));
  return results;
}

async function github({ token, repo, tag, headline, notes, assets }) {
  const api = `https://api.github.com/repos/${repo}`;
  const H = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'anyrouter-video-publish',
  };
  const json = { ...H, 'content-type': 'application/json' };

  let rel = await fetch(`${api}/releases/tags/${encodeURIComponent(tag)}`, { headers: H })
    .then(r => (r.ok ? r.json() : null));
  if (!rel) {
    // The NAME is the human title, which leads with what shipped.
    const r = await fetch(`${api}/releases`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ tag_name: tag, name: headline, body: notes, draft: false, prerelease: false }),
    });
    if (!r.ok) throw new Error(`create release ${r.status}: ${(await r.text()).slice(0, 300)}`);
    rel = await r.json();
    console.log(`\n── github: created release ${rel.html_url}`);
  } else {
    // Refresh the title and notes in place, so fixing the copy does not mean
    // deleting and recreating a published release.
    console.log(`\n── github: release ${tag} already exists (${rel.html_url})`);
    const r = await fetch(`${api}/releases/${rel.id}`, {
      method: 'PATCH', headers: json, body: JSON.stringify({ name: headline, body: notes }),
    });
    if (r.ok) console.log('   refreshed title and notes');
  }

  // Assets go to the upload host named by the release, not to the API host.
  const uploadUrl = rel.upload_url.replace(/\{.*$/, '');
  const attached = new Set((rel.assets || []).map(a => a.name));
  for (const [name, file] of assets) {
    if (attached.has(name)) { console.log(`   ${name} already attached — skipped`); continue; }
    const r = await fetch(`${uploadUrl}?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { ...H, 'content-type': 'application/octet-stream', 'content-length': String(fs.statSync(file).size) },
      body: fs.readFileSync(file),
    });
    if (!r.ok) throw new Error(`upload ${name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    console.log(`   uploaded ${name}`);
  }
  return rel.html_url;
}

async function youtube({ film, headline, tag, share }) {
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  }).then(r => r.json());
  if (!tok.access_token) throw new Error(`token exchange failed: ${JSON.stringify(tok).slice(0, 200)}`);

  const title = process.env.YT_TITLE_TEMPLATE
    ? process.env.YT_TITLE_TEMPLATE.replace('{id}', tag).replace('{title}', headline)
    : `AnyRouter — ${headline}`;
  const desc = [headline, share, 'https://anyrouter.dev'].filter(Boolean).join('\n\n');
  const size = String(fs.statSync(film).size);

  // Resumable upload: a film this size is a single request, no chunking needed.
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${tok.access_token}`,
      'content-type': 'application/json',
      'x-upload-content-length': size,
      'x-upload-content-type': 'video/mp4',
    },
    body: JSON.stringify({
      snippet: { title: title.slice(0, 100), description: desc.slice(0, 5000), categoryId: '28' },
      status: { privacyStatus: process.env.YT_PRIVACY || 'unlisted', selfDeclaredMadeForKids: false },
    }),
  });
  if (!init.ok) throw new Error(`resumable init ${init.status}: ${(await init.text()).slice(0, 300)}`);
  const session = init.headers.get('location');
  if (!session) throw new Error('no resumable session URL returned');

  const put = await fetch(session, {
    method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-length': size }, body: fs.readFileSync(film),
  });
  const body = await put.json().catch(() => ({}));
  if (!put.ok) throw new Error(`upload ${put.status}: ${JSON.stringify(body).slice(0, 300)}`);
  console.log(`\n── youtube: uploaded https://youtu.be/${body.id}`);
  return `https://youtu.be/${body.id}`;
}
