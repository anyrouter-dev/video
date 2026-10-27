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
 *
 *     // Optional: the shapes this kind ships in (lib/renditions.mjs). Omit it
 *     // for every rendition. A kind whose frames have no portrait layout yet
 *     // says ['landscape'], and the CLI warns about the gap on every run.
 *     renditions: ['landscape']
 *     // Optional: one collect holds several films, each its own release (one
 *     // film per use case). Returns one `{ notable, label, parts, ...facts }`
 *     // per film, in the same shape `collect` returns, so split(one) is [one].
 *     // `run` renders each unreleased one, `pending` lists each, `gen` needs one.
 *     split(data) → data[]
 *     // Optional: write the project in the kind's own look instead of
 *     // lib/film.mjs's. Same arguments and result as writeFilm.
 *     write(dir, id, film) → { title, duration, scenes }
 *     // Optional: the page the film is about; YouTube's description links to it
 *     // (default https://anyrouter.dev).
 *     link(data) → url
 *     // Optional: the catalog model ids a film is about (posting.json `model_ids`).
 *     modelIds(data) → string[]
 *     // Optional: what a release's asset files are named after
 *     // (anyrouter-<kind>-<this>.mp4); default its version, else its day.
 *     asset(entry) → string
 *   }
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { VIDEOS, BUILD } from './paths.mjs';
import { IDS, rendition } from './renditions.mjs';

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
  const renditions = kind.renditions ?? IDS;
  renditions.forEach(rendition);
  // The portrait project is written from the landscape one, so landscape is never optional.
  if (!renditions.includes('landscape')) throw new Error(`videos/${id}/kind.mjs: renditions must include landscape`);
  const work = path.join(BUILD, id);
  return {
    ...kind,
    renditions: IDS.filter(r => renditions.includes(r)),
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
