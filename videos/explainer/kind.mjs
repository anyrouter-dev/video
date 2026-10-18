/**
 * explainer — the narrated AnyRouter explainer for people who have never heard of it.
 *
 * AUTHORED, not generated: built with the HyperFrames product-launch workflow
 * (BRIEF.md → STORYBOARD.md + SCRIPT.md → compositions/frames/). index.html is
 * rendered as it is. The narration, music and sound cues are files under
 * assets/, so they are part of the film's identity.
 *
 * Rendered on demand (`node lib/cli.mjs run explainer`), never by the nightly run.
 */
import { collectAuthored } from '../../lib/authored.mjs';

const INPUTS = ['index.html', 'assets', 'compositions'];

export default {
  id: 'explainer',
  title: 'Explainer',
  scheduled: false,

  collect: ({ dir }) => collectAuthored(dir, INPUTS),

  headline: () => 'What is AnyRouter? One key for every AI model, and free models',

  notes: data => [
    `A ${Math.round(data.seconds)}-second narrated explainer for people new to AnyRouter.`,
    'It shows what AnyRouter is, how to unlock free models by donating an OpenRouter or NVIDIA key to the shared pool, and how to code with Claude Code through `anyr`.',
    `Film version v${data.version}.`,
  ],

  /** The closing lockup, once it has settled and before the fade to white. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
