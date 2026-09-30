/**
 * The kind registry. A kind is a folder under videos/ with a kind.mjs:
 *
 *   export default {
 *     id: 'model-drop',           // must equal the folder name
 *     title: 'Model drop',        // human name, used in logs and release notes
 *     scheduled: true,            // picked up by `--all` (the nightly run)
 *
 *     // FACTS. Returns what there is to film. Node builtins only — CI calls
 *     // this before `npm ci` to decide whether anything needs rendering.
 *     //   notable  false → nothing to film
 *     //   label    short slug for the release id, e.g. 'new-models' or 'v1.6.0'
 *     //   parts    strings that identify this release; their hash IS its identity
 *     async collect({ flags, dir, work }) → { notable, label, parts, ...facts }
 *
 *     // FILM. Pure: facts + plan → scenes. Omit it for a hand-authored film
 *     // (videos/<id>/index.html is then rendered as it is).
 *     film(data, { plan, flags }) → { title, duration, scenes, css?, music?, assets? }
 *
 *     // COPY for the GitHub Release and YouTube.
 *     headline(data, plan) → string
 *     notes(data, plan) → string[]
 *
 *     // Optional: advance a baseline after a release is recorded.
 *     accept({ dir, work })
 *     // Optional: the second at which to grab the cover frame.
 *     coverAt(film) → number
 *   }
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { VIDEOS, BUILD } from './paths.mjs';

export function kindIds() {
  return fs.readdirSync(VIDEOS)
    .filter(d => fs.existsSync(path.join(VIDEOS, d, 'kind.mjs')))
    .sort();
}

export async function loadKind(id) {
  const file = path.join(VIDEOS, id, 'kind.mjs');
  if (!fs.existsSync(file)) {
    throw new Error(`no such kind "${id}" — known kinds: ${kindIds().join(', ')}`);
  }
  const kind = (await import(pathToFileURL(file).href)).default;
  if (kind.id !== id) throw new Error(`videos/${id}/kind.mjs declares id "${kind.id}"`);
  const work = path.join(BUILD, id);
  return {
    ...kind,
    dir: path.join(VIDEOS, id),
    work,
    // A generated film is built into scratch; a hand-authored one is its folder.
    project: kind.film ? path.join(work, 'film') : path.join(VIDEOS, id),
  };
}

export async function loadKinds({ scheduledOnly = false } = {}) {
  const all = await Promise.all(kindIds().map(loadKind));
  return scheduledOnly ? all.filter(k => k.scheduled) : all;
}
