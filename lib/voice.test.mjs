import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { voiceProblem, firstPassing, writeScript, polish, POLISH_MODEL, speakable, captionGroups, mixVoice, readWav } from './voice.mjs';
import { renderSound } from './sound.mjs';

const FACTS = {
  prices: true, unit: 1e6,
  lead: { name: 'Nemotron 3.5 Bolt E4B', provider: 'nvidia', context: 65536, inPrice: 0.15, outPrice: 0.6, free: false },
  totals: { listed: 299, free: 62, providers: 17 },
  excerpt: 'Scores 93 on a benchmark.',
};
const NAMES = ['Nemotron 3.5 Bolt E4B'];

// ── the gate ───────────────────────────────────────────────────────────────

test('a line that passes the gate states only what the facts state', () => {
  assert.equal(voiceProblem('Nemotron 3.5 Bolt E4B costs $0.15 in and $0.60 out per 1M tokens, with a 66K context window.', FACTS, { names: NAMES }), null);
  assert.equal(voiceProblem('299 models from 17+ providers, on a single AnyRouter key.', FACTS), null);
});

test('a number the facts do not carry is not spoken', () => {
  assert.match(voiceProblem('It reads 128K tokens.', FACTS), /128K, not in the facts/);
  assert.match(voiceProblem('Over 300 models.', FACTS), /300/);
});

test('a number spelled out is not spoken either, sourced or not', () => {
  // The plan's gate only sees digits: "seventy cents" would slip past it.
  assert.match(voiceProblem('It costs seventy cents.', FACTS), /spells out "seventy"/);
  assert.match(voiceProblem('Seventeen providers.', FACTS), /spells out/);
  assert.match(voiceProblem('Prices drop by ten percent.', FACTS), /spells out/);
  assert.match(voiceProblem('All on one key.', FACTS), /spells out "one"/);
  // A model's own name may hold such a word; the name is not a claim.
  assert.equal(voiceProblem('Meet One Mini, a text model.', { ...FACTS, lead: { name: 'One Mini' } }, { names: ['One Mini'] }), null);
});

test('"unlimited", superlatives and hype are not spoken', () => {
  assert.match(voiceProblem('Unlimited tokens on AnyRouter.', FACTS), /unlimited/i);
  assert.match(voiceProblem('The cheapest model on AnyRouter.', FACTS), /cheapest/);
  assert.match(voiceProblem('The best model yet.', FACTS), /best/);
  assert.match(voiceProblem('It is live!', FACTS), /exclamation/);
});

test('an id or a path is not read aloud, and a line fits one breath', () => {
  assert.match(voiceProblem('Try nvidia/nemotron-3.5-bolt-e4b today.', FACTS), /"\/"/);
  assert.match(voiceProblem(Array.from({ length: 30 }, () => 'word').join(' ') + '.', FACTS), /30 words/);
});

test('the catalog\'s own sentence never vouches for a number, and a film without prices speaks none', () => {
  assert.match(voiceProblem('It scores 93.', FACTS), /93, not in the facts/);
  assert.match(voiceProblem('It costs $0.15 in.', { ...FACTS, prices: false }), /quotes a price/);
});

test('the first line of a template that passes is its draft', () => {
  const [d] = firstPassing([{ slot: 'news', text: [FACTS.excerpt, 'Nemotron 3.5 Bolt E4B is a text model from nvidia.'] }], FACTS, { names: NAMES });
  assert.equal(d.text, 'Nemotron 3.5 Bolt E4B is a text model from nvidia.');
});

test('an LLM line that fails the gate falls back to the template\'s line, with a warning', () => {
  const drafts = [{ slot: 'hook', text: 'Nemotron 3.5 Bolt E4B is live on AnyRouter.' }, { slot: 'cta', text: '299 models on a single AnyRouter key.' }];
  const { script, warnings } = writeScript({
    drafts, facts: FACTS, names: NAMES,
    polished: { hook: 'Meet Nemotron 3.5 Bolt E4B, the fastest model ever!', cta: 'Reach 299 models with a single AnyRouter key.' },
  });
  assert.deepEqual(script, [
    { slot: 'hook', text: drafts[0].text, source: 'facts' },
    { slot: 'cta', text: 'Reach 299 models with a single AnyRouter key.', source: 'llm' },
  ]);
  // An LLM that hands the draft back unchanged did not write the line.
  assert.equal(writeScript({ drafts, facts: FACTS, names: NAMES, polished: { hook: drafts[0].text } }).script[0].source, 'facts');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /voice hook: dropped the LLM line/);
});

test('the polish asks a fixed model at temperature 0, and a failed call throws for the caller to fall back', async () => {
  let sent;
  const ok = async (url, req) => {
    sent = { url, body: JSON.parse(req.body), auth: req.headers.authorization };
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Sure: {"lines":{"hook":"A line."}}' } }] }) };
  };
  assert.deepEqual(await polish({ facts: FACTS, drafts: [{ slot: 'hook', text: 'x' }], key: 'k', fetchImpl: ok }), { hook: 'A line.' });
  assert.equal(sent.url, 'https://anyrouter.dev/api/v1/chat/completions');
  assert.equal(sent.body.model, POLISH_MODEL);
  assert.equal(sent.body.temperature, 0);
  assert.equal(sent.auth, 'Bearer k');
  await assert.rejects(polish({ facts: FACTS, drafts: [], key: 'k', fetchImpl: async () => ({ ok: false, status: 429 }) }), /HTTP 429/);
  await assert.rejects(polish({ facts: FACTS, drafts: [], key: 'k', fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'no json' } }] }) }) }), /no "lines"/);
  // A reply that wraps its JSON in prose with more braces after it still parses.
  const chatty = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'Here: {"lines":{"cta":"A {b} line."}} and {"note": 1}' } }] }) });
  assert.deepEqual(await polish({ facts: FACTS, drafts: [], key: 'k', fetchImpl: chatty }), { cta: 'A {b} line.' });
});

// ── the spoken form ────────────────────────────────────────────────────────

test('the TTS hears words where the script has digits and symbols', () => {
  assert.equal(speakable('It costs $0.15 in.'), 'It costs 15 cents in.');
  assert.equal(speakable('A 1.3M context.'), 'A 1.3 million context.');
  assert.equal(speakable('$2.00 out per 1M tokens, 66K context.'), '2 dollars out per million tokens, 66 thousand context.');
  assert.equal(speakable('$0 in, down 37%, from 17+ providers.'), '0 dollars in, down 37 percent, from 17 plus providers.');
  // A model id is never spoken, its name is; and a name is spoken as written ("E4B" is not 4 billion).
  const names = { 'nvidia/nemotron-3.5-bolt-e4b': 'Nemotron 3.5 Bolt E4B' };
  assert.equal(speakable('Try nvidia/nemotron-3.5-bolt-e4b.', { names }), 'Try Nemotron 3.5 Bolt E4B.');
});

// ── captions ───────────────────────────────────────────────────────────────

test('a line is captioned in short groups that cover exactly its span', () => {
  const text = 'Nemotron 3.5 Bolt E4B costs $0.15 in and $0.60 out per 1M tokens, with a 66K context window.';
  const groups = captionGroups(text, 10, 6);
  for (const g of groups) {
    assert.ok(g.text.split(' ').length <= 6 && g.text.length <= 42, g.text);
  }
  assert.equal(groups.map(g => g.text).join(' '), text, 'every word, in order');
  assert.equal(groups[0].start, 10);
  assert.ok(Math.abs(groups.at(-1).end - 16) < 1e-6);
  groups.slice(1).forEach((g, i) => assert.equal(g.start, groups[i].end, 'back to back'));
});

// ── the mix ────────────────────────────────────────────────────────────────

const rms = (x, a, b) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return 10 * Math.log10(s / (b - a));
};
function wav24k(seconds, f) {
  const n = Math.round(seconds * 24000), data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * f * i) / 24000) * 12000), i * 2);
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
  head.writeUInt32LE(24000, 24); head.writeUInt32LE(48000, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

test('the score ducks about 12 dB under the voice, and the voice lands where it is placed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-'));
  const silent = path.join(dir, 'silent.wav'), tone = path.join(dir, 'tone.wav');
  fs.writeFileSync(silent, wav24k(2, 0));
  fs.writeFileSync(tone, wav24k(1, 440));
  const score = renderSound({ duration: 8, palette: 'drop', cues: [] });
  const bed = readWav(score).channels[0];

  const ducked = readWav(mixVoice(score, [{ at: 3, wav: silent }]));
  assert.equal(ducked.rate, 48000);
  assert.equal(ducked.channels[0].length, bed.length, 'the mix is exactly the film\'s length');
  const [a, b] = [Math.round(3.3 * 48000), Math.round(4.7 * 48000)];
  const drop = rms(bed, a, b) - rms(ducked.channels[0], a, b);
  assert.ok(drop > 10 && drop < 14, `ducked ${drop.toFixed(1)} dB under the line`);
  const [c, d] = [Math.round(6 * 48000), Math.round(7.5 * 48000)];
  assert.ok(Math.abs(rms(bed, c, d) - rms(ducked.channels[0], c, d)) < 0.5, 'and back to full away from it');

  // A one-second 24 kHz line is one second at 48 kHz, starting at its `at`: against the same
  // duck with a silent line, the voice is all the difference.
  fs.writeFileSync(silent, wav24k(1, 0));
  const quiet = readWav(mixVoice(score, [{ at: 5, wav: silent }])).channels[0];
  const mixed = readWav(mixVoice(score, [{ at: 5, wav: tone }])).channels[0];
  const voiceAt = s => rms(mixed, Math.round(s * 48000), Math.round((s + 0.2) * 48000)) - rms(quiet, Math.round(s * 48000), Math.round((s + 0.2) * 48000));
  assert.ok(voiceAt(5.2) > 6, 'the line is heard well over the ducked score');
  assert.ok(Math.abs(voiceAt(4.5)) < 0.1, 'nothing before it');
  assert.ok(Math.abs(voiceAt(6.3)) < 0.1, 'nothing after its second');
  fs.rmSync(dir, { recursive: true, force: true });
});
