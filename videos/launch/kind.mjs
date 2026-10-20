/**
 * launch — the narrated AnyRouter launch film: one key and one endpoint for many models, the
 * shared key pool, and the anyr CLI, each explained by a machine drawn in the anatomy light style.
 *
 * AUTHORED, not generated: tools/frames.mjs writes compositions/frames/ and assets/lf-kit.js from
 * the figures in tools/figures/ and the choreography in tools/choreo.mjs (see CONCEPT.md).
 * index.html is rendered as it is.
 *
 * Rendered on demand (`node lib/cli.mjs run launch`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'launch',
  title: 'AnyRouter: one key, many models',
  scheduled: false,
  audited: true,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'AnyRouter: many models behind one key, a shared key pool, and the anyr CLI',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated introduction to AnyRouter.`,
    'One API key and one OpenAI- and Anthropic-compatible endpoint (https://anyrouter.dev/api/v1) reach hundreds of models; to switch models, change the model id. If one upstream fails, the request moves to the next, billed once.',
    'The pool: members donate spare provider keys, each request takes the key idle longest, your own requests come first and you can take your key back any time. Donors get Go free, $4 of credit a month and 5% back (8% on Pro and Max), up to $1 per key per day. Your own keys stay private at $0 markup.',
    'The anyr CLI: curl -fsSL https://anyrouter.dev/setup.sh | bash, then anyr login, then anyr claude, anyr pi, anyr opencode, anyr codex or anyr grok on the same key and model.',
    'Music: "Low key background music fragment" by Clacksberg (CC0). Figures drawn with the anatomy kit (MIT).',
    `Film version v${data.version}.`,
  ],

  link: () => 'https://anyrouter.dev',

  /** The closing lockup, once it has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
