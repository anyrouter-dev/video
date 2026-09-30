/**
 * intro — the hand-authored AnyRouter introduction film.
 *
 * AUTHORED, not generated: there is no film(). This folder is the HyperFrames
 * project and index.html is rendered as it is. Its identity is its content —
 * the hash of every file the render reads — so editing the film is a new
 * release and re-running without edits is not. Bump `version` in meta.json when
 * the film changes on purpose; that is the label (v3, v4, …).
 *
 * Rendered on demand (`node lib/cli.mjs run intro`), never by the nightly run.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** Everything the render depends on. Scratch (renders/, snapshots/, …) is not in the list. */
const INPUTS = ['index.html', 'fonts', 'assets', 'audio/score.wav', 'compositions'];

const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** Relative posix paths of every file under `p`, sorted; [] when it does not exist. */
function filesUnder(dir, p) {
  const abs = path.join(dir, p);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [p];
  return fs.readdirSync(abs)
    .filter(n => n !== '.DS_Store')
    .flatMap(n => filesUnder(dir, `${p}/${n}`));
}

export default {
  id: 'intro',
  title: 'Introduction',
  scheduled: false,

  async collect({ dir }) {
    const files = INPUTS.flatMap(p => filesUnder(dir, p)).sort();
    const parts = files.map(f => `${f}:${sha256(path.join(dir, f))}`);

    const { version } = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    if (!Number.isInteger(version)) throw new Error('videos/intro/meta.json needs an integer "version"');

    const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    const seconds = parseFloat(/data-duration="([\d.]+)"/.exec(html)?.[1]);
    if (!seconds) throw new Error('videos/intro/index.html has no data-duration on its root');

    return { notable: true, label: `v${version}`, parts, version, seconds };
  },

  headline: data => `AnyRouter in ${data.seconds} seconds — one key, every model`,

  notes: data => [
    `A ${data.seconds}-second introduction to AnyRouter: one OpenAI-compatible gateway, 200+ models, one key.`,
    'It walks through the one-line setup, the model catalog, the shared key pool that unlocks free usage, and pricing.',
    `Film version v${data.version}.`,
  ],

  /** The closing card, once it has settled: logo, tagline and call to action on screen. */
  coverAt: film => +(film.duration - 0.8).toFixed(2),
};
