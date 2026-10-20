/**
 * api-keys — the narrated guide to AnyRouter API keys: one key per app, the limits a key
 * really has, the shown-once rule, the two values an app needs, and the one-click off switch.
 *
 * AUTHORED, not generated: built with the HyperFrames product-launch workflow
 * (BRIEF.md → STORYBOARD.md + SCRIPT.md → compositions/frames/). index.html is
 * rendered as it is. The narration, music and sound cues are files under
 * assets/, so they are part of the film's identity.
 *
 * Rendered on demand (`node lib/cli.mjs run api-keys`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'api-keys',
  title: 'AnyRouter API keys',
  scheduled: false,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'Give each app its own AnyRouter API key, with the limits you want',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated guide to AnyRouter API keys.`,
    'Make one key per app in the dashboard (API Keys). Name it, then add any limits you want: an expiration, a rate limit in requests per minute, a credit limit with a daily, weekly or monthly reset.',
    'The full key is shown once. Use it in your app with the base URL https://anyrouter.dev/api/v1. Disable a key from its page in one click; its requests are then rejected.',
    `Film version v${data.version}.`,
  ],

  link: () => 'https://anyrouter.dev/docs/features/api-keys',

  /** The closing lockup, once it has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
