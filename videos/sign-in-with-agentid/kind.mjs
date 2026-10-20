/**
 * sign-in-with-agentid — the narrated announcement for developers who run agents: an agent signs
 * in to AnyRouter with AgentID, from its own AgentMail inbox, and gets its own account.
 *
 * AUTHORED, not generated: built like sign-in-with-anyrouter (BRIEF.md → STORYBOARD.md + SCRIPT.md →
 * compositions/frames/). index.html is rendered as it is. Every value on screen comes from the
 * captures in shared/captures/2026-10-20/agentid/ (manifest.json says where each came from).
 *
 * Rendered on demand (`node lib/cli.mjs run sign-in-with-agentid`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'sign-in-with-agentid',
  title: 'Sign in with AgentID',
  scheduled: false,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'Sign in with AgentID: your agent signs in to AnyRouter from its own AgentMail inbox and gets its own account',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated film for developers who run agents.`,
    'AnyRouter now supports sign-in with AgentID. The agent authorizes the sign-in with one call from its own AgentMail inbox, and seconds later it has its own AnyRouter account, with no password.',
    'With its own key, its first request runs on the free tier.',
    `Film version v${data.version}.`,
  ],

  /** The closing lockup, once it has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
