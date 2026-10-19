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

  headline: () => 'What is AnyRouter, and how do you get its free models?',

  notes: data => [
    `This ${Math.round(data.seconds)}-second narrated film explains AnyRouter to people who have never used it.`,
    'It shows what AnyRouter is, how to unlock the shared pool\'s free models by sharing an OpenRouter or NVIDIA key, and how to use AnyRouter with Claude Code through `anyr`.',
    `This is version ${data.version} of the film.`,
  ],

  /** The closing lockup, once it has settled and before the fade to white. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
