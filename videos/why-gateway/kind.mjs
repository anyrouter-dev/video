/**
 * why-gateway — the narrated short on why a unified LLM gateway: one address and one key for
 * models from many providers, a model switch that is only a name, and a backup model when a
 * provider fails.
 *
 * AUTHORED, not generated: built with the HyperFrames product-launch workflow
 * (BRIEF.md → STORYBOARD.md + SCRIPT.md → compositions/frames/). index.html is
 * rendered as it is. The narration, music and sound cues are files under
 * assets/, so they are part of the film's identity.
 *
 * Rendered on demand (`node lib/cli.mjs run why-gateway`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'why-gateway',
  title: 'Why an LLM gateway',
  scheduled: false,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'Why an LLM gateway: one address and one key for models from many providers',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated film on why to call models through one gateway.`,
    'Point your OpenAI or Anthropic SDK at https://anyrouter.dev/api/v1 with one AnyRouter key, and call models from many providers by name. To switch models, change the model name.',
    'List a backup model in `models` on chat completions, and if a provider fails, the backup answers.',
    `Film version v${data.version}.`,
  ],

  /** The closing lockup, once it has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
