#!/usr/bin/env node
/**
 * model-drop :: run  (the idempotent release driver)
 *
 *   node release/run.mjs                 → render if this release is new
 *   node release/run.mjs --force         → render even if it was rendered
 *   node release/run.mjs --dry-run       → decide and report, render nothing
 *   node release/run.mjs --seconds=14    → override the length
 *   node release/run.mjs --limit=1       → override the layout
 *
 * A release is identified by WHAT CHANGED, not by when. Same models at the same
 * prices → same fingerprint → already in the ledger → nothing to do. That is what
 * lets this run on a nightly schedule without burning a render every night.
 *
 * Order: decide → skip-or-render → snapshot the SOURCE for the record.
 * The snapshot happens after a successful render, so the ledger never claims a
 * release exists that has no film.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fingerprint, makeId, has, findByHash, list, nextSeq, snapshot, markRendered } from './ledger.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const val = (k, d) => (argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];
const force = argv.includes('--force');
const dry = argv.includes('--dry-run');

const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });

const out = m => console.log(m);
const die = (m, code = 1) => { console.error(`FAIL: ${m}`); process.exit(code); };

// ── 1. facts ────────────────────────────────────────────────────────────
out('── fetching the live catalog');
try { sh('node', ['release/fetch.mjs']); } catch (e) { die(`fetch failed\n${e.stderr || e.message}`); }
const rel = JSON.parse(fs.readFileSync(path.join(HERE, 'release.json'), 'utf8'));

// ── 2. decide ───────────────────────────────────────────────────────────
if (!rel.notable) {
  out(`nothing shipped (kind=${rel.kind}) — nothing to render`);
  process.exit(0);
}

const { hash, parts } = fingerprint(rel);
// IDENTITY IS THE HASH. The id is display-only and is minted once, on first
// snapshot — including the sequence number in the key made `has()` never match.
const prior = findByHash(hash);
const id = prior ? prior.id : makeId(nextSeq(), rel.kind, hash);
const planPath = path.join(HERE, 'plan.json');
let plan = {};
if (fs.existsSync(planPath)) { try { plan = JSON.parse(fs.readFileSync(planPath, 'utf8')); } catch { plan = {}; } }

out(`\n── release ${id}`);
out(`   kind      ${rel.kind}`);
out(`   added     ${rel.added.map(m => m.id).join(', ') || '—'}`);
out(`   changed   ${rel.changed.map(c => `${c.id} (${c.kind})`).join(', ') || '—'}`);
if (plan.headline) out(`   claim     ${plan.headline}`);

if (prior && !force) {
  out(`\nalready rendered as ${prior.id} — skipping`);
  out(`   (pass --force to re-render anyway)`);
  process.exit(0);
}
if (dry) { out(`\n[dry-run] would render ${id}`); process.exit(0); }

// The agent may veto a release it judges not worth filming.
if (Number(plan.limit) === 0) {
  out(`\nplan declined this release — recording the decision, no render`);
  snapshot(id, {
    hash, kind: rel.kind, parts, models: (rel.added || []).map(m => m.id),
    added: rel.added, changed: rel.changed, removed: rel.removed,
    plan, seconds: null, limits: 0, headline: plan.headline, share: plan.share,
  });
  out(`   snapshot → releases/${id}/`);
  process.exit(0);
}

// ── 3. build ────────────────────────────────────────────────────────────
const secs = val('seconds', String(plan.seconds || 20));
const lim = val('limit', String(plan.limit || ''));
const genArgs = ['release/generate.mjs', `--seconds=${secs}`];
if (lim) genArgs.push(`--limit=${lim}`);

out(`\n── generating (${secs}s${lim ? `, limit ${lim}` : ''})`);
try { sh('node', genArgs); } catch (e) { die(`generate failed\n${e.stderr || e.message}`); }

// check is a HARD GATE. A film that fails it is not uploaded and not recorded.
out('── check');
try { sh('npm', ['run', '--silent', 'check']); }
catch (e) { die(`check failed — refusing to render\n${(e.stdout || e.stderr || '').slice(-1500)}`); }

out('── render');
let mp4;
try { sh('npm', ['run', '--silent', 'render']); }
catch (e) { die(`render failed\n${(e.stderr || e.message).slice(-1500)}`); }

const renders = path.join(ROOT, 'renders');
const files = fs.existsSync(renders)
  ? fs.readdirSync(renders).filter(f => f.endsWith('.mp4')).sort((a, b) =>
      fs.statSync(path.join(renders, b)).mtimeMs - fs.statSync(path.join(renders, a)).mtimeMs)
  : [];
if (!files.length) die('render reported success but no mp4 appeared in renders/');
mp4 = files[0];

// verify the artifact before believing it
let dur = '?', frames = '?';
try {
  const p = sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-show_entries', 'stream=nb_frames', '-of', 'json', path.join(renders, mp4)]);
  const j = JSON.parse(p);
  dur = j.format?.duration ?? '?';
  frames = (j.streams || []).find(s => s.nb_frames)?.nb_frames ?? '?';
} catch { /* ffprobe missing is not fatal for the ledger */ }

out('── snapshotting the source for the record');
const entry = snapshot(id, {
  hash, kind: rel.kind, parts,
  models: (rel.added || []).map(m => m.id),
  added: rel.added, changed: rel.changed, removed: rel.removed,
  plan, seconds: +secs, limits: lim ? +lim : null,
  headline: plan.headline || null, share: plan.share || null,
});
markRendered(hash, `renders/${mp4}`);

out(`\nDONE  ${id}`);
out(`  film     renders/${mp4}   (${dur}s, ${frames} frames)`);
out(`  source   releases/${id}/   (index.html, compositions/, catalog-diff.json, manifest.json)`);
out(`  ledger   releases/index.json   [${list().length} release${list().length === 1 ? '' : 's'}]`);

if (fs.existsSync(planPath) && force === false) {
  out(`\n  note: release/plan.json is consumed by the agent; it is kept for the next run`);
}
