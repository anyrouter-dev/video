/**
 * publish — put a rendered film on a GitHub Release, and optionally on YouTube.
 *
 * The GitHub Release IS the store: an mp4 and a cover per rendition, and the
 * generated source, live there as assets, not in git. Both targets are optional
 * and both skip cleanly when not configured, so a clone with no secrets still has
 * a working CI.
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
 * skips — the GitHub Release is the durable record, YouTube a mirror. Each
 * rendition is its own video: it is uploaded once, and its link is recorded on
 * its film in the ledger row. The portrait one becomes a Short.
 *
 * ── replace ───────────────────────────────────────────────────────────────
 * A re-rendered release (`regen`) swaps the assets of its existing Release in
 * place and refreshes the title and notes. It never uploads to YouTube: a video
 * there cannot be replaced, only uploaded again as a duplicate. A rendition it
 * adds stays without a link until youtube.yml (or a plain publish) uploads it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.mjs';
import { load, tagOf, update } from './ledger.mjs';
import { RENDITIONS } from './renditions.mjs';

const mb = f => (fs.statSync(f).size / 1048576).toFixed(1);

/**
 * The films of a release by the names they have on its GitHub Release, one per
 * rendition in table order.
 */
export function releaseFiles(kindId, entry) {
  const stem = assetStem(kindId, entry);
  return RENDITIONS.filter(r => entry.renditions?.[r.id]).map(r => {
    const { artifact, cover, youtube } = entry.renditions[r.id];
    const file = path.join(ROOT, artifact);
    return {
      rendition: r, artifact, file, onDisk: fs.existsSync(file), youtube,
      name: `${stem}${r.fileSuffix}.mp4`,
      coverName: `${stem}${r.fileSuffix}.png`, cover: cover && path.join(ROOT, cover),
    };
  });
}

export async function publish(kind, entry, { dry = false, youtube: wantYouTube = true, replace = false } = {},
  clients = { github, youtube }) {
  if (!entry.renderedAt) throw new Error(`${entry.id} is recorded but not rendered`);
  const out = !!entry.published?.github;
  const films = releaseFiles(kind.id, entry);
  // A film that is not on disk must already be on its Release. A replace swaps every one.
  for (const f of films) {
    if (!f.onDisk && (replace || !out)) throw new Error(`${f.artifact} is gone — render it again (run --force, or regen)`);
  }

  const { data, plan } = load(kind.id, entry.id);
  const tag = tagOf(kind.id, entry.id);
  const headline = kind.headline(data, plan);
  const repo = process.env.GITHUB_REPOSITORY;
  const sourceName = `${assetStem(kind.id, entry)}-source.tar.gz`;
  const assets = [
    ...films.filter(f => f.onDisk).flatMap(f => [[f.name, f.file], [f.coverName, f.cover]]),
    [sourceName, entry.source && path.join(ROOT, entry.source)],
  ].filter(([, f]) => f && fs.existsSync(f));

  const download = name => `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${name}`;
  const lead = films[0];
  const notes = [
    ((lead.cover && fs.existsSync(lead.cover)) || out) && `![cover](${download(lead.coverName)})`,
    headline,
    ...kind.notes(data, plan),
    films.map(f => `- [${f.name}](${download(f.name)}) is ${f.rendition.width}×${f.rendition.height}, ${f.rendition.label}.`).join('\n'),
    '---',
    `${kind.title} · \`${entry.id}\` · ${entry.seconds}s. The facts this film was cut from are committed under`
      + ` \`releases/${kind.id}/${entry.id}/\`; the generated composition is attached as \`${sourceName}\`.`,
  ].filter(Boolean).join('\n\n');

  console.log(`release  ${tag}`);
  console.log(`title    ${headline}`);
  for (const [name, f] of assets) console.log(`asset    ${name.padEnd(48)} ${mb(f)} MB`);
  for (const f of films) {
    if (!f.onDisk) console.log(`asset    ${f.name.padEnd(48)} not on disk, already on the Release`);
    else if (!assets.some(([n]) => n === f.coverName)) console.log(`asset    ${f.coverName}  MISSING`);
  }

  const results = { github: entry.published?.github || 'skipped' };
  for (const f of films) results[`youtube ${f.rendition.id}`] = f.youtube || 'skipped';
  const attempt = async (name, fn) => {
    try { await fn(); } catch (e) { results[name] = `FAILED: ${e.message}`; }
  };
  // Each link is recorded the moment it exists, so a re-run, or a run after a
  // crash between two uploads, never uploads a second copy.
  let row = entry;
  const record = patch => { row = update(kind.id, entry.hash, patch(row)); };

  await attempt('github', async () => {
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    if (!token || !repo) {
      console.log('\n── github: SKIP  (need GH_TOKEN or GITHUB_TOKEN, and GITHUB_REPOSITORY)');
      return;
    }
    if (dry) { console.log('\n── github: would publish'); results.github = 'would publish'; return; }
    results.github = await clients.github({ token, repo, tag, headline, notes, assets, replace });
    if (results.github !== row.published?.github) record(r => ({ published: { ...r.published, github: results.github } }));
  });

  for (const f of films.filter(f => f.youtube)) console.log(`\n── youtube: ${f.rendition.id} already uploaded (${f.youtube})`);
  const waiting = films.filter(f => !f.youtube);
  const missing = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'].filter(k => !process.env[k]);
  const skip = replace ? 'a replace never uploads; youtube.yml uploads what is missing'
    : !wantYouTube ? '--no-youtube'
    : missing.length ? `missing ${missing.join(', ')}` : null;
  if (waiting.length && skip) {
    console.log(`\n── youtube: SKIP ${waiting.map(f => f.rendition.id).join(' and ')}  (${skip})`);
    console.log('   The film is not lost — the GitHub Release is the durable record.');
  } else if (waiting.length) {
    const description = [headline, plan.share, 'https://anyrouter.dev'].filter(Boolean).join('\n\n');
    for (const f of waiting) {
      const id = f.rendition.id;
      await attempt(`youtube ${id}`, async () => {
        if (!f.onDisk) { console.log(`\n── youtube: ${id} skipped (not on disk; youtube.yml fetches it from the Release)`); return; }
        if (dry) { console.log(`\n── youtube: would upload ${id}`); results[`youtube ${id}`] = 'would upload'; return; }
        const url = await clients.youtube({ film: f.file, title: youtubeTitle(headline, tag, f.rendition), description });
        console.log(`\n── youtube: uploaded ${id} ${url}`);
        results[`youtube ${id}`] = url;
        record(r => ({ renditions: { ...r.renditions, [id]: { ...r.renditions[id], youtube: url } } }));
      });
    }
  }

  console.log('\n── summary');
  for (const [k, v] of Object.entries(results)) console.log(`   ${k.padEnd(18)} ${v}`);

  // The GitHub Release is the store, so failing to write it fails the run.
  // YouTube is a mirror: a failure there is reported loudly (an annotation in
  // CI) but does not undo a release that is already out.
  for (const [k, v] of Object.entries(results)) {
    if (!k.startsWith('youtube') || !String(v).startsWith('FAILED')) continue;
    console.log(`${process.env.GITHUB_ACTIONS ? '::warning title=YouTube upload failed::' : 'WARNING: '}${tag} ${k}: ${v.replace(/\s+/g, ' ').slice(0, 400)}`);
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

/** One rendition's YouTube title. Its suffix (#Shorts) survives the 100-character cap. */
function youtubeTitle(headline, tag, r) {
  const title = process.env.YT_TITLE_TEMPLATE
    ? process.env.YT_TITLE_TEMPLATE.replace('{id}', tag).replace('{title}', headline)
    : `AnyRouter — ${headline}`;
  return title.slice(0, 100 - r.titleSuffix.length) + r.titleSuffix;
}

async function youtube({ film, title, description }) {
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
      snippet: { title, description: description.slice(0, 5000), categoryId: '28' },
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
  return `https://youtu.be/${body.id}`;
}
