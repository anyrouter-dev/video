/**
 * Where everything lives. One file so no script computes its own `../..`.
 *
 *   shared/            fonts, score, brand marks, provider marks — used by every kind
 *   videos/<kind>/     one folder per kind of film (kind.mjs + its own inputs)
 *   .build/<kind>/     scratch: data.json, plan.json, and the generated film/
 *   films/<day>/<kind>/ mp4s, covers, source tarballs (not tracked — they ship on the GitHub Release)
 *   releases/<kind>/   the ledger and the per-release record (tracked)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SHARED = path.join(ROOT, 'shared');
export const VIDEOS = path.join(ROOT, 'videos');
// What a run writes: scratch, films, the ledger. Tests point VIDEO_STATE at a
// temp dir so they never touch the real ledger.
const STATE = process.env.VIDEO_STATE || ROOT;
export const BUILD = path.join(STATE, '.build');
export const FILMS = path.join(STATE, 'films');
export const RELEASES = path.join(STATE, 'releases');

/** Where a kind's films from one day land: films/<YYYY-MM-DD>/<kind>/, the day in local time. */
export const filmsDir = (kind, day = new Date()) => path.join(FILMS, day.toLocaleDateString('sv-SE'), kind);

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
