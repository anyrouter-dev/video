/**
 * narration: what each use-case film says, and when each word of it is spoken.
 *
 * videos/use-case/narration.json holds the scripts: per film an `outcome`, a
 * `doing` and an optional `then` line, the `lockup` line every film shares, the
 * claims ledger, the voice and its settings, and `say`, how a word on screen is
 * spoken ("anyr" is "any R"). A `^` before a word marks where the picture moves
 * on it: the typing starts on that word of `doing`, the roll or the answer on
 * that word of `then`.
 *
 * videos/use-case/voice/<line>.mp3 is each line voiced, and <line>.json its
 * alignment: when each character of the spoken text starts and ends. They are
 * written by voice.mjs, only when the spoken text or the voice changes, so the
 * render never calls a voice service.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const NARRATION = path.join(DIR, 'narration.json');
export const VOICE_DIR = path.join(DIR, 'voice');
export const BEATS = ['outcome', 'doing', 'then'];

export const loadNarration = (file = NARRATION) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** The lines one film speaks, in order, as { id, beat, text }; the lockup line is shared by every film. */
export function scriptOf(narration, slug) {
  const film = narration.films[slug];
  if (!film) throw new Error(`narration.json has no script for "${slug}": write one before this film can be built`);
  return [
    ...BEATS.filter(b => film[b]).map(beat => ({ id: `${slug}-${beat}`, beat, text: film[beat] })),
    { id: 'lockup', beat: 'lockup', text: narration.lockup },
  ];
}

/**
 * A line as it is shown and as it is spoken: its words, each with the range of
 * the spoken text it becomes, and the word the picture moves on.
 */
export function parseLine(text, say = {}) {
  const words = [];
  let spoken = '', anchor = null;
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const marked = raw.startsWith('^'), word = marked ? raw.slice(1) : raw;
    const [, lead, core, tail] = word.match(/^(["'(]*)(.*?)([,.;:!?"')]*)$/);
    const out = `${lead}${say[core] ?? core}${tail}`;
    if (spoken) spoken += ' ';
    if (marked) anchor = words.length;
    words.push({ text: word, from: spoken.length, to: spoken.length + out.length });
    spoken += out;
  }
  return { words, spoken, anchor };
}

/** What a line's voice is made from: a new hash is a new recording. */
export const hashOf = (voice, spoken) => crypto.createHash('sha256').update(JSON.stringify([voice.id, voice.model, voice.settings, spoken])).digest('hex').slice(0, 16);

/**
 * A voiced line: its audio file, its length, and each shown word's time in
 * seconds from the start of its audio. Throws when the line has no recording of
 * its current text, so a stale voice never reaches a render.
 */
export function voicedLine(narration, line, dir = VOICE_DIR) {
  const { words, spoken, anchor } = parseLine(line.text, narration.say);
  const meta = path.join(dir, `${line.id}.json`);
  const rec = fs.existsSync(meta) && JSON.parse(fs.readFileSync(meta, 'utf8'));
  if (!rec || rec.hash !== hashOf(narration.voice, spoken)) {
    throw new Error(`videos/use-case/voice/${line.id} is not voiced for "${spoken}": run node videos/use-case/voice.mjs`);
  }
  const { start, end } = rec.alignment;
  const timed = words.map(w => {
    // a word is spoken from its first sounding character to its last
    const at = [...Array(w.to - w.from).keys()].map(k => w.from + k).filter(i => /[\p{L}\p{N}]/u.test(spoken[i]));
    const span = at.length ? at : [w.from];
    return { text: w.text, start: Math.min(...span.map(i => start[i])), end: Math.max(...span.map(i => end[i])) };
  });
  return { ...line, file: path.join(dir, `${line.id}.mp3`), duration: rec.duration, words: timed, anchor, spoken };
}
