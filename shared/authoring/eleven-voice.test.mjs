import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScript, spoken, timeWords } from './eleven-voice.mjs';

test('the voice hears product names spelled out, while each caption word keeps its written form', () => {
  const { say, words } = spoken('Start free at anyrouter.dev.');
  assert.equal(say, 'Start free at any router dot dev.');
  assert.deepEqual(words.map(w => w.text), ['Start', 'free', 'at', 'anyrouter.dev.']);
  assert.equal(say.slice(words[3].from, words[3].to), 'any router dot dev.');
});

test('a caption word lasts from its first spoken character to its last', () => {
  const { say, words } = spoken('Run anyr claude.');
  // one character per 0.1s, so a word's times are its character offsets
  const alignment = {
    characters: [...say],
    character_start_times_seconds: [...say].map((_, i) => i / 10),
    character_end_times_seconds: [...say].map((_, i) => (i + 1) / 10),
  };
  const timed = timeWords(words, alignment);
  assert.deepEqual(timed.map(w => w.text), ['Run', 'anyr', 'claude.']);
  assert.deepEqual([timed[1].start, timed[1].end], [0.4, 0.9]); // "any R"
});

test('only the indented block under a frame heading is spoken', () => {
  const md = '## Line 1 (Frame 1)\n\n**Delivery:** calm.\n\n    Every model.\n\n## Line 2 (Frame 2)\n\n    One API.\n';
  assert.deepEqual(parseScript(md), [{ frame: 1, text: 'Every model.' }, { frame: 2, text: 'One API.' }]);
});
