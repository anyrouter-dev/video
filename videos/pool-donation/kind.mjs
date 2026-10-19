/**
 * pool-donation — the narrated guide for donating an idle provider key to the shared pool.
 *
 * AUTHORED, not generated: built like openrouter-unblock (BRIEF.md → STORYBOARD.md + SCRIPT.md →
 * compositions/frames/). index.html is rendered as it is.
 *
 * Rendered on demand (`node lib/cli.mjs run pool-donation`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'pool-donation',
  title: 'Donate a key to the AnyRouter pool',
  scheduled: false,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'Share an idle provider key with the AnyRouter pool: Go free, $4 credit a month and 5% back',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated film for anyone with a provider key whose quota sits idle.`,
    'Add the key to AnyRouter and turn on Donate to the shared pool. Pool members\' requests can then run through it, and your own requests always come first.',
    'You get the Go plan free, $4 of credit a month, and 5% back on what your key serves (8% on Pro and Max), up to $1 per key per day.',
    'Shared requests use your provider quota, so check that your provider\'s terms allow sharing. You can turn it off any time; turning off your last shared key pauses Go.',
    `Film version v${data.version}.`,
  ],

  /** The closing lockup, once it has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
