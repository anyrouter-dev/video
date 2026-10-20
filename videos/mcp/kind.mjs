/**
 * mcp — the narrated guide to AnyRouter's MCP server: add it once to Claude, Cursor or any
 * MCP client, then ask for models, usage, credits or a new key in plain words.
 *
 * AUTHORED, not generated: built with the HyperFrames product-launch workflow
 * (BRIEF.md → STORYBOARD.md + SCRIPT.md → compositions/frames/). index.html is
 * rendered as it is. The narration, music and sound cues are files under
 * assets/, so they are part of the film's identity.
 *
 * Rendered on demand (`node lib/cli.mjs run mcp`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'mcp',
  title: 'AnyRouter MCP',
  scheduled: false,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'Add AnyRouter to Claude, Cursor or any MCP client, then ask in plain words',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated guide to the AnyRouter MCP server.`,
    'Add one entry to your MCP config (https://anyrouter.dev/api/v1/mcp) and authorize it once in your browser, choosing what the client may do.',
    'Then ask in plain words: pick a model for a task (recommend_model), make an API key (create_key), check usage (get_usage) or credits (get_credits).',
    `Film version v${data.version}.`,
  ],

  link: () => 'https://anyrouter.dev/docs/mcp',

  /** The closing lockup, once it has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
