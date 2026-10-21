/**
 * narration: what each use-case film says, and when each word of it is spoken.
 *
 * videos/use-case/narration.json holds the scripts: per film an `outcome` (what
 * this is and why you would want it), its `steps`, each one short line and what
 * the code window shows on it (`shows`: install, command or result), `close`,
 * how its short link is spoken, and the claims ledger; the voice and its
 * settings; and `say`, how a word on screen is spoken ("anyr" is "any R").
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

export const loadNarration = (file = NARRATION) => JSON.parse(fs.readFileSync(file, 'utf8'));

/**
 * The two links a film can end on: the use case's live page, and the short link the site will
 * publish. kind.mjs collect picks the short link only when use-cases.json names one and it answers
 * 200, and fails the build when the link it picked does not.
 */
export const LINKS = { page: slug => `anyrouter.dev/use-cases/${slug}`, short: slug => `anyrouter.dev/u/${slug}` };
/** The link a film ends on: the one collect verified, else the use case's page. */
export const linkOf = (slug, verified) => (verified ?? LINKS.page(slug)).replace(/^https?:\/\//, '');

/** The spoken close for each link a film can end on, each its own recording, so either is ready. */
export function closeLines(narration, slug) {
  const word = narration.films[slug].close;
  return {
    [LINKS.page(slug)]: { id: `${slug}-link`, say: `any router dot dev slash use cases slash ${word}.` },
    [LINKS.short(slug)]: { id: `${slug}-close`, say: `any router dot dev slash u slash ${word}.` },
  };
}

/**
 * The lines one film speaks, in order, as { id, beat, text, step?, more?, shows?, say? }:
 * what this is (intro), the problem it removes, "Step 1. …" for each step and
 * the line that explains it (`more`), the result, then its short link. The
 * `outcome` take plays the beat `role` names, intro or problem, so a line voiced
 * before keeps its recording. The link is spoken as `close` says it ("any router
 * dot dev slash u slash open code").
 */
export function scriptOf(narration, slug, published) {
  const film = narration.films[slug];
  if (!film) throw new Error(`narration.json has no script for "${slug}": write one before this film can be built`);
  const link = linkOf(slug, published), close = closeLines(narration, slug)[link];
  if (!close) throw new Error(`${slug} ends on ${link}, and its close is written for ${Object.keys(closeLines(narration, slug)).join(' or ')}: rewrite it`);
  if (!['intro', 'problem'].includes(film.role)) throw new Error(`${slug}: role must say which beat the outcome take plays, intro or problem`);
  const other = film.role === 'intro' ? 'problem' : 'intro';
  if (!film[other] || !film.result) throw new Error(`${slug}: a film says what it is, its problem and its result`);
  const opening = { [film.role]: { id: `${slug}-outcome`, text: film.outcome }, [other]: { id: `${slug}-${other}`, text: film[other] } };
  return [
    { ...opening.intro, beat: 'intro' },
    { ...opening.problem, beat: 'problem' },
    ...film.steps.flatMap((st, i) => [
      { id: `${slug}-step-${i + 1}`, beat: 'step', step: i + 1, label: st.text.replace(/[.]$/, ''), shows: st.shows ?? null, capture: st.capture ?? null, line: st.line ?? null, text: `Step ${i + 1}. ${st.text}` },
      ...(st.more ? [{ id: `${slug}-step-${i + 1}-more`, beat: 'step', step: i + 1, more: true, text: st.more }] : []),
    ]),
    { id: `${slug}-result`, beat: 'result', text: film.result },
    { id: close.id, beat: 'close', text: link, say: { [link]: close.say } },
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
  const { words, spoken, anchor } = parseLine(line.text, { ...narration.say, ...line.say });
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
