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

  headline: () => 'What is AnyRouter? One API for every AI model',

  notes: data => [
    `This ${Math.round(data.seconds)}-second narrated film explains AnyRouter to people who have never used it.`,
    'It shows what AnyRouter is: more than 270 models behind one API, a two-line change to existing code, models called by name, your own Claude or OpenAI key at no markup, automatic retries when a provider goes down, free models on every plan with no daily cap, and Claude Code with any model through `anyr`.',
    `This is version ${data.version} of the film.`,
  ],

  /** The closing lockup, once it has settled and before the fade to white. */
  coverAt: film => +(film.duration - 1.2).toFixed(2),
};
