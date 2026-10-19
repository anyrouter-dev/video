/**
 * openrouter-unblock — the narrated tutorial for OpenRouter free-model users who hit its rate limit.
 *
 * AUTHORED, not generated: built with the HyperFrames product-launch workflow
 * (BRIEF.md → STORYBOARD.md + SCRIPT.md → compositions/frames/). index.html is
 * rendered as it is. The narration, music and sound cues are files under
 * assets/, so they are part of the film's identity.
 *
 * Rendered on demand (`node lib/cli.mjs run openrouter-unblock`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'openrouter-unblock',
  title: 'Unblock OpenRouter free models',
  scheduled: false,
  // The portrait cut fails shared/authoring/stage-audit.mjs in 04-step-1-key (26.5s) and 05-step-2-add (32.5s): the zoomed
  // screen leaves the stage bare.
  // Captions also need data-outside-safe-area. Delete this once `check openrouter-unblock` passes without it.
  renditions: ['landscape'],

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'OpenRouter free models rate limited? Add your key to AnyRouter and share it with the pool',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated tutorial for people who use OpenRouter's free models.`,
    'It shows why your OpenRouter account hits its free limit. Then it adds a new OpenRouter key to AnyRouter as a BYOK key, shares it with the pool, and points the app at an AnyRouter key.',
    'When your key hits the limit, AnyRouter sends the next requests through keys other members shared, and those requests use their quota.',
    `Film version v${data.version}.`,
  ],

  /** The closing lockup, once it has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
