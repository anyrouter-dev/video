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
import { collectAuthored } from '../../lib/authored.mjs';

/** Everything the render depends on. Scratch (renders/, snapshots/, …) is not in the list. */
const INPUTS = ['index.html', 'fonts', 'assets', 'audio/score.wav', 'compositions'];

export default {
  id: 'intro',
  title: 'Introduction',
  scheduled: false,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: data => `AnyRouter in ${data.seconds} seconds — one key, every model`,

  notes: data => [
    `A ${data.seconds}-second introduction to AnyRouter: one OpenAI-compatible gateway, 200+ models, one key.`,
    'It walks through the one-line setup, the model catalog, the shared key pool that unlocks free usage, and pricing.',
    `Film version v${data.version}.`,
  ],

  /** The closing card, once it has settled: logo, tagline and call to action on screen. */
  coverAt: film => +(film.duration - 0.8).toFixed(2),
};
