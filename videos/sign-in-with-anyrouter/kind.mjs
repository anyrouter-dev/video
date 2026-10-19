/**
 * sign-in-with-anyrouter — the narrated guide for app builders: add a "Sign in with AnyRouter"
 * button and each user's AI usage is billed to their own AnyRouter account.
 *
 * AUTHORED, not generated: built like openrouter-unblock (BRIEF.md → STORYBOARD.md + SCRIPT.md →
 * compositions/frames/). index.html is rendered as it is.
 *
 * Rendered on demand (`node lib/cli.mjs run sign-in-with-anyrouter`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'sign-in-with-anyrouter',
  title: 'Sign in with AnyRouter',
  scheduled: false,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'Sign in with AnyRouter: your users bring their own AnyRouter account, and their AI usage is billed to them',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated film for developers adding AI to their app.`,
    'Add a Sign in with AnyRouter button. Each user approves your app on AnyRouter, and their usage is billed to their own credits or free tier, never to you.',
    'Your app gets a temporary key limited to AI requests and the user\'s profile, and uses it like any AnyRouter API key. Users can revoke your app any time from Connected apps.',
    `Film version v${data.version}.`,
  ],

  /** The closing lockup, once it has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
