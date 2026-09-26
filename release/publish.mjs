#!/usr/bin/env node
/**
 * model-drop :: publish
 *
 * Attach a rendered film to a GitHub Release, and optionally push it to YouTube.
 * Both are OPTIONAL and both skip cleanly when not configured, so a repo with no
 * secrets still gets a working CI.
 *
 *   node release/publish.mjs                 → publish the newest rendered release
 *   node release/publish.mjs <id>            → publish a specific release
 *   node release/publish.mjs --dry-run       → show what would happen
 *   node release/publish.mjs --no-youtube
 *
 * ── GitHub Releases ──────────────────────────────────────────────────────
 * Needs a token with `contents: write`:
 *   local : export GH_TOKEN=$(gh auth token)
 *   CI    : the built-in GITHUB_TOKEN (actions already grants it)
 * Attaches the mp4 + a poster, generates notes from the ledger, tags the
 * release id, and marks the GitHub release as the published record.
 *
 * ── YouTube ───────────────────────────────────────────────────────────────
 * Uploading needs OAuth, which only the account owner can obtain. Set up once:
 *   1. Google Cloud console → enable "YouTube Data API v3"
 *   2. Credentials → OAuth client ID → Desktop app
 *   3. Run this once locally to get a redirect URL, open it, copy ?code=
 *   4. Store YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN
 * Without all three this prints why and skips. The film is never lost — the
 * GitHub Release is the durable record; YouTube is a convenience mirror.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { list, findByHash } from './ledger.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const dry = argv.includes('--dry-run');
const noYT = argv.includes('--no-youtube');
const wantId = argv.find(a => !a.startsWith('-') && a !== 'publish.mjs');

// ── pick the release ─────────────────────────────────────────────────────
const all = list();
if (!all.length) { console.error('FAIL: no releases in the ledger'); process.exit(1); }
const entry = wantId ? all.find(r => r.id === wantId) : [...all].reverse().find(r => r.renderedAt);
if (!entry) { console.error(`FAIL: no rendered release${wantId ? ` matching ${wantId}` : ''}`); process.exit(1); }
if (!entry.renderedAt) { console.error(`FAIL: ${entry.id} is planned but not rendered`); process.exit(1); }

const film = path.join(ROOT, entry.artifact);
if (!fs.existsSync(film)) { console.error(`FAIL: ${entry.artifact} is gone — re-render with --force`); process.exit(1); }
const poster = path.join(ROOT, 'renders', 'poster.jpg');
const { hash } = entry;

console.log(`release  ${entry.id}`);
console.log(`kind     ${entry.kind}`);
console.log(`models   ${(entry.added || []).map(m => m.id).join(', ') || '—'}`);
if (entry.changed?.length) console.log(`changed  ${entry.changed.map(c => `${c.id} (${c.kind})`).join(', ')}`);
console.log(`film     ${entry.artifact}  (${(fs.statSync(film).size / 1048576).toFixed(1)} MB)`);

const notes = [
  `AnyRouter model drop — ${entry.id}`,
  '',
  `**Kind:** ${entry.kind}`,
  `**New:** ${(entry.added || []).map(m => `\`${m.id}\`${m.free ? ' (free)' : ''}`).join(', ') || '—'}`,
  entry.changed?.length ? `**Pricing:** ${entry.changed.map(c => `\`${c.id}\` ${c.from} → ${c.to}`).join(', ')}` : '',
  '',
  entry.plan?.headline ? `**Claim:** ${entry.plan.headline}` : '',
  entry.plan?.share ? `${entry.plan.share}` : '',
  entry.plan?.rationale ? `_Why this story: ${entry.plan.rationale}_` : '',
  '',
  '---',
  '',
  `Source for this exact film is committed under \`releases/${entry.id}/\` —`,
  '`npm run gen` against it reproduces the same video.',
  '',
  '![poster](https://github.com/OWNER/REPO/raw/main/renders/poster.jpg)',
].filter(Boolean).join('\n');

const results = { github: 'skipped', youtube: 'skipped' };

// ── GitHub Release ───────────────────────────────────────────────────────
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
async function github() {
  if (!token || !repo) {
    console.log('\n── github: SKIP  (need GH_TOKEN or GITHUB_TOKEN, and GITHUB_REPOSITORY)');
    return;
  }
  const [owner, name] = repo.split('/');
  const api = `https://api.github.com/repos/${owner}/${name}`;
  const H = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'model-drop-publish',
  };
  const existing = await fetch(`${api}/releases/tags/${entry.id}`, { headers: H })
    .then(r => (r.ok ? r.json() : null)).catch(() => null);

  let rel = existing;
  if (!rel) {
    if (dry) { results.github = 'would create'; console.log('\n── github: would create release'); return; }
    const r = await fetch(`${api}/releases`, {
      method: 'POST', headers: { ...H, 'content-type': 'application/json' },
      body: JSON.stringify({ tag_name: entry.id, name: `Model drop — ${entry.id}`, body: notes, draft: false, prerelease: false }),
    });
    if (!r.ok) throw new Error(`create release ${r.status}: ${(await r.text()).slice(0, 300)}`);
    rel = await r.json();
    console.log(`\n── github: created release ${rel.html_url}`);
  } else {
    console.log(`\n── github: release ${entry.id} already exists (${rel.html_url})`);
  }

  const upload = async (file, label) => {
    if (!fs.existsSync(file)) return;
    if (dry) { console.log(`   would upload ${path.basename(file)}`); return; }
    const name = `${label}-${path.basename(file)}`;
    const r = await fetch(`${api}/releases/${rel.id}/assets?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { ...H, accept: 'application/octet-stream', 'content-type': 'application/octet-stream', 'content-length': String(fs.statSync(file).size) },
      body: fs.readFileSync(file),
    });
    if (r.ok) console.log(`   uploaded ${name}`);
    else if (r.status === 422) console.log(`   ${name} already attached — skipped`);
    else throw new Error(`upload ${name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  };
  await upload(film, 'model-drop');
  await upload(poster, 'poster');
  results.github = 'published';
}

// ── YouTube ──────────────────────────────────────────────────────────────
async function youtube() {
  const need = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'];
  const missing = need.filter(k => !process.env[k]);
  if (noYT) { console.log('\n── youtube: skipped (--no-youtube)'); return; }
  if (missing.length) {
    console.log(`\n── youtube: SKIP  (missing ${missing.join(', ')})`);
    console.log('   The film is not lost — the GitHub Release is the durable record.');
    return;
  }
  if (dry) { results.youtube = 'would upload'; console.log('\n── youtube: would upload'); return; }

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

  // resumable upload: an 8 MB film is a single request, no session needed
  const title = process.env.YT_TITLE_TEMPLATE
    ? process.env.YT_TITLE_TEMPLATE.replace('{id}', entry.id)
    : `AnyRouter — ${(entry.added || []).map(m => m.id).join(', ') || entry.kind}`;
  const desc = [
    entry.plan?.headline || `Model drop: ${entry.id}`,
    '',
    entry.plan?.share || '',
    '',
    'https://anyrouter.dev',
  ].filter(Boolean).join('\n');

  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${tok.access_token}`,
      'content-type': 'application/json',
      'x-upload-content-length': String(fs.statSync(film).size),
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
    method: 'PUT',
    headers: { 'content-type': 'video/mp4', 'content-length': String(fs.statSync(film).size) },
    body: fs.readFileSync(film),
  });
  const body = await put.json().catch(() => ({}));
  if (!put.ok) throw new Error(`upload ${put.status}: ${JSON.stringify(body).slice(0, 300)}`);
  console.log(`\n── youtube: uploaded https://youtu.be/${body.id}`);
  results.youtube = body.id;
}

try { await github(); } catch (e) { results.github = `FAILED: ${e.message}`; }
try { await youtube(); } catch (e) { results.youtube = `FAILED: ${e.message}`; }

console.log('\n── summary');
for (const [k, v] of Object.entries(results)) console.log(`   ${k.padEnd(8)} ${v}`);
if (Object.values(results).some(v => String(v).startsWith('FAILED'))) process.exit(1);
