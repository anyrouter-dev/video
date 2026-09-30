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
 *
 * ── replace ───────────────────────────────────────────────────────────────
 * A re-rendered release (`regen`) swaps the assets of its existing Release in
 * place and refreshes the title and notes. It never touches YouTube: a video
 * there cannot be replaced, only uploaded again as a duplicate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.mjs';
import { load, tagOf, update } from './ledger.mjs';

const mb = f => (fs.statSync(f).size / 1048576).toFixed(1);

export async function publish(kind, entry, { dry = false, youtube: wantYouTube = true, replace = false } = {}) {
  if (!entry.renderedAt) throw new Error(`${entry.id} is recorded but not rendered`);
  const film = path.join(ROOT, entry.artifact);
  if (!fs.existsSync(film)) throw new Error(`${entry.artifact} is gone — re-render with --force`);

  const { data, plan } = load(kind.id, entry.id);
  const tag = tagOf(kind.id, entry.id);
  const headline = kind.headline(data, plan);
  const repo = process.env.GITHUB_REPOSITORY;
  // Asset name → file. A downloaded file keeps only its name, so the name says
  // what the film is about: anyrouter-release-v1.6.0.mp4, not release.mp4.
  const stem = assetStem(kind.id, entry);
  const coverName = `${stem}.png`, sourceName = `${stem}-source.tar.gz`;
  const assets = [
    [`${stem}.mp4`, film],
    [coverName, entry.cover && path.join(ROOT, entry.cover)],
    [sourceName, entry.source && path.join(ROOT, entry.source)],
  ].filter(([, f]) => f && fs.existsSync(f));
  const hasCover = assets.some(([n]) => n === coverName);

  const notes = [
    hasCover && repo && `![cover](https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${coverName})`,
    headline,
    ...kind.notes(data, plan),
    '---',
    `${kind.title} · \`${entry.id}\` · ${entry.seconds}s. The facts this film was cut from are committed under`
      + ` \`releases/${kind.id}/${entry.id}/\`; the generated composition is attached as \`${sourceName}\`.`,
  ].filter(Boolean).join('\n\n');

  console.log(`release  ${tag}`);
  console.log(`title    ${headline}`);
  for (const [name, f] of assets) console.log(`asset    ${name.padEnd(40)} ${mb(f)} MB`);
  if (!hasCover) console.log(`asset    ${coverName}  MISSING`);

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
    results.github = await github({ token, repo, tag, headline, notes, assets, replace });
  });

  await attempt('youtube', async () => {
    const need = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'];
    const missing = need.filter(k => !process.env[k]);
    if (replace) { console.log('\n── youtube: skipped (a replaced film would be a duplicate there)'); return; }
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

  // The GitHub Release is the store, so failing to write it fails the run.
  // YouTube is a mirror: a failure there is reported loudly (an annotation in
  // CI) but does not undo a release that is already out.
  if (String(results.youtube).startsWith('FAILED')) {
    console.log(`${process.env.GITHUB_ACTIONS ? '::warning title=YouTube upload failed::' : 'WARNING: '}${tag}: ${results.youtube.replace(/\s+/g, ' ').slice(0, 400)}`);
  }
  if (String(results.github).startsWith('FAILED')) throw new Error(`github ${results.github}`);
  return results;
}

async function github({ token, repo, tag, headline, notes, assets, replace }) {
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
    if (!r.ok) throw new Error(`refresh title and notes ${r.status}: ${(await r.text()).slice(0, 300)}`);
    console.log('   refreshed title and notes');
  }

  // Assets go to the upload host named by the release, not to the API host.
  const uploadUrl = rel.upload_url.replace(/\{.*$/, '');
  const attached = new Map((rel.assets || []).map(a => [a.name, a.id]));
  for (const [name, file] of assets) {
    if (attached.has(name)) {
      if (!replace) { console.log(`   ${name} already attached — skipped`); continue; }
      // An asset name is unique per Release, so the old file goes first. If the
      // upload below then fails, a re-run finds it missing and uploads it.
      const d = await fetch(`${api}/releases/assets/${attached.get(name)}`, { method: 'DELETE', headers: H });
      if (!d.ok) throw new Error(`delete ${name} ${d.status}: ${(await d.text()).slice(0, 200)}`);
      console.log(`   deleted the old ${name}`);
    }
    const r = await fetch(`${uploadUrl}?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { ...H, 'content-type': 'application/octet-stream', 'content-length': String(fs.statSync(file).size) },
      body: fs.readFileSync(file),
    });
    if (!r.ok) throw new Error(`upload ${name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    console.log(`   uploaded ${name}`);
  }
  // A replaced film leaves nothing of the old take behind, including assets
  // published under an earlier naming scheme (release.mp4, cover.png…).
  if (replace) {
    const keep = new Set(assets.map(([n]) => n));
    for (const [name, id] of attached) {
      if (keep.has(name)) continue;
      const d = await fetch(`${api}/releases/assets/${id}`, { method: 'DELETE', headers: H });
      if (!d.ok) throw new Error(`delete stale ${name} ${d.status}: ${(await d.text()).slice(0, 200)}`);
      console.log(`   deleted the stale ${name}`);
    }
  }
  return rel.html_url;
}

/**
 * The file name of a release's assets: anyrouter-<kind>-<what>. A versioned
 * release is named by its version (v1.6.0, v4); anything else by the day it
 * was recorded, taken from the id (<seq>-<yyyymmdd>-…).
 */
export function assetStem(kindId, entry) {
  const d = /^\d+-(\d{4})(\d{2})(\d{2})-/.exec(entry.id);
  const what = /^v\d/.test(entry.label ?? '') ? entry.label : d ? `${d[1]}-${d[2]}-${d[3]}` : entry.hash;
  return `anyrouter-${kindId}-${what}`;
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
