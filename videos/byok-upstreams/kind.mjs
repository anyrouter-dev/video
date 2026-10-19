/**
 * byok-upstreams — the narrated short on bringing your own provider keys: add each key once,
 * call every model they reach through one AnyRouter endpoint, billed on your own provider
 * accounts with no AnyRouter markup.
 *
 * AUTHORED, not generated: built with the HyperFrames product-launch workflow
 * (BRIEF.md → STORYBOARD.md + SCRIPT.md → compositions/frames/). index.html is
 * rendered as it is. The narration, music and sound cues are files under
 * assets/, so they are part of the film's identity.
 *
 * Rendered on demand (`node lib/cli.mjs run byok-upstreams`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'byok-upstreams',
  title: 'Bring your own keys',
  scheduled: false,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'Bring your own provider keys to AnyRouter and call their models through one endpoint',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated film on bringing your own provider keys (BYOK).`,
    'Add your OpenAI, Anthropic, Google, OpenRouter or other provider key once at anyrouter.dev/dashboard/byok. Then one AnyRouter key calls their models through https://anyrouter.dev/api/v1.',
    'Those requests run on your provider account at that provider\'s price. AnyRouter adds no markup and no fee on BYOK requests, on every plan, Free included.',
    `Film version v${data.version}.`,
  ],

  /** The closing lockup, once it has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
