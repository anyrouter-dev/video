/**
 * cli-swap — the narrated short on swapping coding agents with anyr: one sign-in, then
 * `anyr claude`, `anyr pi` and `anyr opencode` on the same key and the same model.
 *
 * AUTHORED, not generated: the film is one Anatomy figure (tools/figure.mjs, a microscope on a
 * bench console) animated by tools/compose.mjs into compositions/machine.html; tools/mix.mjs
 * writes assets/mix.wav from the voice, the music and sfx-cues.json. index.html is rendered as
 * it is. Rebuild everything with `node tools/finish.mjs` from this folder.
 *
 * Rendered on demand (`node lib/cli.mjs run cli-swap`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'cli-swap',
  title: 'Swap the agent, keep the key, with anyr',
  scheduled: false,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'Change one word: anyr claude, anyr pi and anyr opencode on one key and one model',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated short on the anyr CLI.`,
    'Install it with curl -fsSL https://anyrouter.dev/setup.sh | bash and sign in once with anyr login. Then anyr claude --model anyrouter/free starts Claude Code; change one word and anyr pi or anyr opencode start Pi or OpenCode on the same key and model. Codex, Grok Build and Poolside launch the same way.',
    'Get it at https://anyrouter.dev/cli',
    'Music: "Cherry Blossom" by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0, https://creativecommons.org/licenses/by/4.0/',
    `Film version v${data.version}.`,
  ],

  link: () => 'https://anyrouter.dev/cli',

  /** The end card, once the address has settled. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
