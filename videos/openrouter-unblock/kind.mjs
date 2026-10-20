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

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'OpenRouter free models rate limited? Add your key to AnyRouter and share it with the pool',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated film for people whose apps hit the daily limit on OpenRouter's free models.`,
    'Add your OpenRouter key to AnyRouter and share it with the pool. When your key hits its limit, AnyRouter can send your requests through keys other members share. Shared keys have their own limits, so how much more room you get can vary.',
    'In your app, switch the base URL and the key to AnyRouter\'s and keep the model, openrouter/free. Sharing lets other members use your OpenRouter quota too, and you can stop any time.',
    `Film version v${data.version}.`,
  ],

  /** The closing lockup, once it has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
