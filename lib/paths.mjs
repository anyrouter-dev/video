/**
 * Where everything lives. One file so no script computes its own `../..`.
 *
 *   shared/            fonts, score, brand marks, provider marks — used by every kind
 *   videos/<kind>/     one folder per kind of film (kind.mjs + its own inputs)
 *   .build/<kind>/     scratch: data.json, plan.json, and the generated film/
 *   renders/           mp4s, covers, source tarballs (not tracked — they ship on the GitHub Release)
 *   releases/<kind>/   the ledger and the per-release record (tracked)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SHARED = path.join(ROOT, 'shared');
export const VIDEOS = path.join(ROOT, 'videos');
export const BUILD = path.join(ROOT, '.build');
export const RENDERS = path.join(ROOT, 'renders');
export const RELEASES = path.join(ROOT, 'releases');

export const rel = p => path.relative(ROOT, p);

/** `--key=value` and `--flag` parsing, shared by the CLI and every kind. */
export function parseArgs(argv) {
  const flags = {};
  const rest = [];
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) flags[m[1]] = m[2] ?? true;
    else rest.push(a);
  }
  return { flags, rest };
}
