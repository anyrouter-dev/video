/**
 * cli-everyday — the narrated guide to the anyr CLI for daily work: models, credits and keys.
 *
 * AUTHORED, not generated: built with the HyperFrames product-launch workflow
 * (BRIEF.md → STORYBOARD.md + SCRIPT.md → compositions/frames/). index.html is
 * rendered as it is. The narration, music and sound cues are files under
 * assets/, so they are part of the film's identity.
 *
 * Rendered on demand (`node lib/cli.mjs run cli-everyday`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'cli-everyday',
  title: 'Your dashboard in the terminal, with anyr',
  scheduled: false,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'List models, check credits and manage API keys from the terminal with anyr',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated guide to the anyr CLI for daily work.`,
    'anyr models lists every model id you can pass to --model. anyr usage shows the credits you have left. anyr keys list shows your API keys, redacted, and anyr keys create makes a new one.',
    `Film version v${data.version}.`,
  ],

  /** The closing lockup, once it has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
