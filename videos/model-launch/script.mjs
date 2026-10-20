/**
 * script: what a model-launch film says, written from the facts of its one model.
 *
 * Every line is built from the catalog, the playground capture or a page of anyrouter.dev,
 * and `claims` names the source of each. Lines are short and plain: the copy lint
 * (shared/authoring/copy-lint.test.mjs) reads every line a fixture film speaks.
 *
 *   reveal  the name, the maker, and "new" only while the model is inside the launch window
 *   spec    what it reads and how long a context it takes
 *   price   free: $0 and no daily cap · BYOK: your own provider key, and whose keys run it
 *   reply   only with a real playground capture: what it was asked and that it answered
 *   use     its id in a request, or anyr claude with --model
 *   close   anyrouter.dev
 */
import { contextLabel } from '../../lib/models.mjs';
import { numberWords, ONES, speakName } from '../../shared/authoring/narrate.mjs';

/** "1.05M" → "one point zero five million", "262K" → "two hundred sixty two thousand". */
export function contextWords(label) {
  const m = /^([\d.]+)([MK])$/.exec(label);
  if (!m) throw new Error(`cannot say the context "${label}"`);
  const [whole, frac] = m[1].split('.');
  const said = `${numberWords(Number(whole))}${frac ? ` point ${[...frac].map(d => ONES[d]).join(' ')}` : ''}`;
  return `${said} ${m[2] === 'M' ? 'million' : 'thousand'}`;
}

const PLURAL = { image: 'images', file: 'files' };
/** ["text", "image", "video"] → "text, images and video". */
export const listWords = (xs, and = 'and') => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${and} ${xs.at(-1)}`);

/** How on-screen words are spoken. */
export const SAY = {
  anyr: 'any R',
  'anyrouter.dev': 'any router dot dev',
  AnyRouter: 'Any Router',
  BYOK: 'B Y O K',
  NVIDIA: 'Nvidia',
  inclusionAI: 'inclusion A I',
};

/**
 * The lines of one film, in order, each { beat, text, say, from }. `say` adds how this
 * film's own words are spoken (its name, its context).
 */
export function scriptOf(f) {
  const say = { ...SAY, [f.name]: speakName(f.name) };
  const ctx = contextLabel(f.context);
  const lines = [];
  const line = (beat, text, from, extra = {}) => lines.push({ beat, text, say: { ...say, ...extra }, from });

  // the catalog's date is when the model was created, not when AnyRouter listed it, so "new" is said of the model
  line('reveal', f.isNew ? `${f.name} is a new model from ${f.maker}, created on ${f.dateWords}.` : `${f.name}, from ${f.maker}, runs on AnyRouter.`,
    `catalog: name, provider${f.isNew ? `, created ${f.day} (inside the ${f.window}-day launch window)` : ''}`);

  const ins = f.inputs.map(i => PLURAL[i] ?? i);
  line('spec', ctx ? `It reads ${listWords(ins)}, with a ${ctx} token context.` : `It reads ${listWords(ins)}.`,
    'catalog: architecture.input_modalities, context_length', ctx ? { [ctx]: contextWords(ctx) } : {});

  if (f.billing === 'free') {
    line('price', 'It is free to call, with no daily cap.', 'catalog: pricing $0/$0, no billing "byok"; docs/features/free-tier.md: "Daily cap: None"');
  } else if (f.billing === 'byok') {
    line('price', 'It runs on your own provider key. AnyRouter adds no markup.', 'catalog: pricing.billing "byok"; docs/features/byok.md: "with no AnyRouter markup"');
    const keys = f.keyNames.map(k => k.name);
    line('price', keys.length <= 4 ? `Keys from ${listWords(keys, 'or')} run it.` : `Keys from ${numberWords(keys.length)} providers run it.`,
      'catalog: providers ending in -byok');
  } else {
    line('price', 'It runs on AnyRouter credits.', 'catalog: pricing');
  }

  if (f.capture) {
    line('reply', 'In the AnyRouter playground, it said hello back, at no cost.', `capture ${f.capture.file}: "${f.capture.reply}", ${f.capture.cost} cost, ${f.capture.date}`);
  }
  line('use', 'Use its id in any request, or run it with anyr claude.', 'anyr --help: "anyr claude --model <id>"; the OpenAI-compatible "model" field');
  line('close', 'Find it on anyrouter.dev.', `the page anyrouter.dev/model/${f.id}`);
  return lines;
}
