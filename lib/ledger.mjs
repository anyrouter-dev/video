/**
 * ledger — one row per release, per kind.
 *
 *   releases/<kind>/index.json        the rows
 *   releases/<kind>/<id>/             the record: manifest.json, data.json, plan.json
 *
 * Three jobs:
 *
 *  1. fingerprint()  — a deterministic identity for "this exact release". The
 *     same facts always hash the same, which is what makes the nightly run
 *     idempotent: a hash already in the ledger is never rendered twice.
 *  2. snapshot()     — freeze the INPUTS of a film (the facts and the plan). The
 *     generator is deterministic, so inputs + the commit they were built at
 *     rebuild the film. The generated HTML itself ships as source.tar.gz on the
 *     GitHub Release instead of being committed — it was 11k lines a night.
 *  3. list()/find()  — read it back.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RELEASES } from './paths.mjs';

const file = kind => path.join(RELEASES, kind, 'index.json');
const read = kind => (fs.existsSync(file(kind)) ? JSON.parse(fs.readFileSync(file(kind), 'utf8')) : { releases: [] });
// Several regens of one kind may finish close together, so every write
// re-reads the index right before it and lands with an atomic rename: a reader
// never sees half a file, and the window for a lost update is one sync call.
const write = (kind, change) => {
  const l = read(kind);
  const result = change(l);
  const tmp = `${file(kind)}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(l, null, 2) + '\n');
  fs.renameSync(tmp, file(kind));
  return result;
};

/**
 * A release is identified by WHAT it is about, not by when it ran. Two runs on
 * the same day over the same facts are the same release.
 */
export function fingerprint(parts) {
  const sorted = [...parts].map(String).sort();
  return crypto.createHash('sha256').update(sorted.join('\n')).digest('hex').slice(0, 10);
}

/** Short, sortable, human-readable: <seq>-<yyyymmdd>-<label>-<hash>.
 *  The seq and date are for humans only — identity is the hash. Putting the
 *  seq in the lookup key once made the CI re-render the same release forever. */
export function makeId(seq, label, hash, date = new Date()) {
  const d = date.toISOString().slice(0, 10).replace(/-/g, '');
  const slug = String(label).toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
  return `${String(seq).padStart(3, '0')}-${d}-${slug}-${hash}`;
}

/** The git tag and GitHub Release a row is published under. */
export const tagOf = (kind, id) => `${kind}-${id}`;

export const list = kind => read(kind).releases;
export const findByHash = (kind, hash) => list(kind).find(r => r.hash === hash) || null;
export const find = (kind, id) => list(kind).find(r => r.id === id) || null;
export const recordDir = (kind, id) => path.join(RELEASES, kind, id);

export function nextSeq(kind) {
  return list(kind).reduce((m, r) => Math.max(m, parseInt(String(r.id).split('-')[0], 10) || 0), 0) + 1;
}

/**
 * Freeze the inputs and write the row. Keyed on the hash: recording the same
 * release again updates its row and keeps its id, it never appends a second.
 */
export function snapshot(kind, row, { data, plan }) {
  const prior = findByHash(kind, row.hash);
  const entry = { ...prior, ...row, id: prior?.id ?? row.id, createdAt: prior?.createdAt ?? new Date().toISOString() };

  const dir = recordDir(kind, entry.id);
  // A snapshot is a freeze, not a merge: nothing from a previous take survives.
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(data, null, 2) + '\n');
  if (plan && Object.keys(plan).length) {
    fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(entry, null, 2) + '\n');

  write(kind, l => {
    l.releases = l.releases.some(r => r.hash === row.hash)
      ? l.releases.map(r => (r.hash === row.hash ? entry : r)) : [...l.releases, entry];
  });
  return entry;
}

/** Merge fields into a row (rendered, published…) and keep its manifest in step. */
export function update(kind, hash, patch) {
  const entry = write(kind, l => {
    let found = null;
    l.releases = l.releases.map(r => (r.hash === hash ? (found = { ...r, ...patch }) : r));
    return found;
  });
  if (!entry) throw new Error(`no ${kind} release with hash ${hash}`);
  const manifest = path.join(recordDir(kind, entry.id), 'manifest.json');
  if (fs.existsSync(manifest)) fs.writeFileSync(manifest, JSON.stringify(entry, null, 2) + '\n');
  return entry;
}

/** The frozen inputs of a recorded release. */
export function load(kind, id) {
  const dir = recordDir(kind, id);
  const json = f => (fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) : null);
  return { data: json('data.json'), plan: json('plan.json') ?? {} };
}
