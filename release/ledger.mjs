#!/usr/bin/env node
/**
 * model-drop :: ledger
 *
 * One entry per rendered release. Three jobs:
 *
 *  1. fingerprint()  — a deterministic id for "this exact release". The same
 *     models at the same prices always produce the same id, which is what makes
 *     the CI render idempotent: if the fingerprint is already in the ledger and
 *     its artifact is committed, there is nothing to do.
 *  2. snapshot()     — freeze the GENERATED SOURCE for a release into
 *     releases/<id>/ so every film that ever shipped can be rebuilt, not just
 *     the newest one. index.html and compositions/ are gitignored because they
 *     are build output; the per-release copies are not, because they are history.
 *  3. list()/has()   — read the ledger back.
 *
 *   node release/ledger.mjs list
 *   node release/ledger.mjs show <id>
 *   node release/ledger.mjs has <id>
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
export const RELEASES = path.join(ROOT, 'releases');
const LEDGER = path.join(RELEASES, 'index.json');

const read = () => (fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : { releases: [] });
const write = l => {
  fs.mkdirSync(RELEASES, { recursive: true });
  fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2) + '\n');
};

/**
 * A release is identified by WHAT changed, not by when. Two runs on the same
 * day with the same models at the same prices are the same release — that is
 * the whole reason the nightly CI can skip.
 */
export function fingerprint(rel) {
  const parts = [
    ...(rel.added || []).map(m => `+${m.id}@${m.inPrice}/${m.outPrice}@${m.context ?? 'x'}`),
    ...(rel.changed || []).map(c => `~${c.id} ${c.from}->${c.to}`),
    ...(rel.removed || []).map(id => `-${id}`),
  ].sort();
  const h = crypto.createHash('sha256').update(parts.join('\n')).digest('hex').slice(0, 10);
  return { hash: h, parts };
}

/** Short, sortable, human-readable id: <seq>-<yyyymmdd>-<kind>[-<hash>]
 *  NOTE: the seq is for humans only. It is assigned at snapshot time and is NOT
 *  part of a release's identity — including it in the key made `has()` never
 *  match and the CI re-render the same release forever. Identity is `hash`. */
export function makeId(seq, kind, hash, date = new Date()) {
  const d = date.toISOString().slice(0, 10).replace(/-/g, '');
  const n = String(seq).padStart(3, '0');
  return kind === 'none' || kind === 'first-run'
    ? `${n}-${d}-${kind}`
    : `${n}-${d}-${kind}-${hash}`;
}

/** Has THIS release already been recorded? Keyed on the hash, never the id. */
export function has(hash) {
  return read().releases.some(r => r.hash === hash);
}

export function findByHash(hash) {
  return read().releases.find(r => r.hash === hash) || null;
}

export function list() {
  return read().releases;
}

/** Latest sequence number, so ids keep increasing. */
export function nextSeq() {
  const rs = read().releases;
  if (!rs.length) return 1;
  const max = rs.reduce((m, r) => Math.max(m, parseInt(String(r.id).split('-')[0], 10) || 0), 0);
  return max + 1;
}

/**
 * Freeze the built source for this release. index.html and compositions/ are
 * gitignored as build output; the copy under releases/ is the artefact of record
 * and must be committed, or a year from now the film cannot be rebuilt.
 *
 * A snapshot holds: index.html, compositions/, catalog-diff.json (the live API
 * diff at render time), plan.json (the story), manifest.json (the ledger row).
 * Copy it over the project root and `npm run gen` rebuilds this exact film.
 */
export function snapshot(id, meta) {
  const dir = path.join(RELEASES, id);
  // A snapshot is a freeze, not a merge. Wiping first guarantees no file from a
  // previous take survives — which is how a stale fonts/ and a stale
  // release.json manifest outlived the code that stopped writing them.
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  for (const rel of ['index.html']) {
    const src = path.join(ROOT, rel);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, 'index.html'));
  }
  const comps = path.join(ROOT, 'compositions');
  if (fs.existsSync(comps)) {
    const out = path.join(dir, 'compositions');
    fs.rmSync(out, { recursive: true, force: true });
    fs.cpSync(comps, out, { recursive: true });
  }
  // The API diff the film was actually built from. Without this the snapshot is
  // NOT reproducible — index.html alone renders whatever the live catalog says
  // today, not what it said when the film was cut.
  const diff = path.join(ROOT, 'release/release.json');
  if (fs.existsSync(diff)) fs.copyFileSync(diff, path.join(dir, 'catalog-diff.json'));

  // plan.json too, so the story travels with the source it produced.
  const plan = path.join(ROOT, 'release/plan.json');
  if (meta.plan && fs.existsSync(plan)) fs.copyFileSync(plan, path.join(dir, 'plan.json'));

  // NOTE: fonts/ is deliberately NOT copied. The woff2 files are identical in
  // every release, already committed at the repo root, and index.html references
  // them root-relative. Copying them added 88 KB of duplicate binaries per
  // release and bought nothing.

  const entry = {
    id,
    hash: meta.hash,
    kind: meta.kind,
    createdAt: new Date().toISOString(),
    models: meta.models || [],
    added: meta.added || [],
    changed: meta.changed || [],
    removed: meta.removed || [],
    plan: meta.plan || null,
    seconds: meta.seconds || null,
    limits: meta.limits || null,
    headline: meta.headline || null,
    share: meta.share || null,
  };
  // Keyed on the hash: a re-run of the same release updates its row, it does
  // not append a second one. Keying on `id` produced duplicate ledger rows.
  const l = read();
  if (!l.releases.some(r => r.hash === meta.hash)) l.releases.push(entry);
  else l.releases = l.releases.map(r => (r.hash === meta.hash ? { ...entry, id: r.id } : r));
  write(l);

  // Named manifest.json, not release.json: `release/release.json` is the live API
  // diff and reusing the name inside the snapshot made the two indistinguishable.
  fs.writeFileSync(
    path.join(dir, 'manifest.json'),
    JSON.stringify({ ...entry, fingerprintParts: meta.parts }, null, 2) + '\n'
  );
  return entry;
}

/** Mark that an artifact actually exists for this release. */
export function markRendered(hash, artifact) {
  const l = read();
  l.releases = l.releases.map(r =>
    (r.hash === hash ? { ...r, renderedAt: new Date().toISOString(), artifact } : r));
  write(l);
}

// ── cli ──────────────────────────────────────────────────────────────────
// Top-level `return` is a SyntaxError in an ES module, so this is scoped.
if (process.argv[1] && process.argv[1].endsWith('ledger.mjs')) {
  const [, , cmd, arg] = process.argv;
  const l = read();
  if (cmd === 'list' || !cmd) {
    if (l.releases.length) {
      for (const r of l.releases) {
        console.log(
          `${r.id.padEnd(34)} ${String(r.kind).padEnd(14)} ` +
          `+${(r.added || []).length} ~${(r.changed || []).length} -${(r.removed || []).length}  ` +
          `${r.renderedAt ? 'rendered' : 'planned'}`
        );
      }
    } else {
      console.log('no releases yet');
    }
  } else if (cmd === 'has') {
    process.exit(has(arg) ? 0 : 1);
  } else if (cmd === 'show') {
    const r = l.releases.find(x => x.id === arg);
    if (!r) { console.error('not found:', arg); process.exit(1); }
    console.log(JSON.stringify(r, null, 2));
  }
}
