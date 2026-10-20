/**
 * cli-agents — the narrated guide: install the anyr CLI once, then run any coding agent on any model.
 *
 * AUTHORED, not generated: built with the HyperFrames product-launch workflow
 * (BRIEF.md → STORYBOARD.md + SCRIPT.md → compositions/frames/). index.html is
 * rendered as it is. The narration, music and sound cues are files under
 * assets/, so they are part of the film's identity.
 *
 * Rendered on demand (`node lib/cli.mjs run cli-agents`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'cli-agents',
  title: 'Any coding agent, any model, with anyr',
  scheduled: false,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'Install anyr once, then run Claude Code, Codex or OpenCode on any model',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated guide to the anyr CLI.`,
    'Install it with curl -fsSL https://anyrouter.dev/setup.sh | bash and sign in with anyr auth login. Then anyr claude --model deepseek/deepseek-v4-flash starts Claude Code on that model.',
    'Codex, OpenCode, Grok Build, Pi and Poolside launch the same way with the same key. anyr points the agent at AnyRouter for that session only and does not edit its config files.',
    `Film version v${data.version}.`,
  ],

  /** The closing lockup, once it has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
