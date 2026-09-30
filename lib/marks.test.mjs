import test from 'node:test';
import assert from 'node:assert/strict';
import { markFor, marksIn, monogram, marksUsed, markImg } from './marks.mjs';

test('a provider resolves to its mark however the data spells it', () => {
  // These are the spellings that shipped without a logo in the real model-drop records.
  assert.equal(markFor('Mistral AI'), 'mistral-color.svg');
  assert.equal(markFor('mistralai/mistral-small-3.2-24b-instruct'), 'mistral-color.svg');
  assert.equal(markFor('stepfun-ai'), 'stepfun-color.svg');
  assert.equal(markFor('z-ai/glm-5.3-prime'), 'z-ai.svg');
  assert.equal(markFor('openai'), 'openai-color.svg');
});

test('a provider with no vendored mark gets none, never a wrong one', () => {
  // A wrong logo on a launch film is worse than a monogram.
  assert.equal(markFor('baai'), null);
  assert.equal(markFor('respan'), null);
});

test('marks are read out of running text in the order it names them', () => {
  // Release and changelog copy names providers in prose; the film shows who shipped.
  assert.deepEqual(marksIn("OpenAI's GPT-6.1 Sol joins the catalog"), ['openai-color.svg']);
  assert.deepEqual(marksIn('New in the catalog: GPT-6.1 Sol and Step 5 Preview, plus a DeepInfra route for DeepSeek V4.1 Flash.'),
    ['openai-color.svg', 'stepfun-color.svg', 'deepinfra-color.svg', 'deepseek-color.svg']);
  assert.deepEqual(marksIn('Send google/gemini-flash-latest, anthropic/claude-sonnet-latest'), ['google-color.svg', 'anthropic-color.svg']);
  assert.deepEqual(marksIn('A client hanging up no longer cools a route'), [], 'ordinary words name no provider');
});

test('a monogram is initials, escaped, and a scene\'s marks can be found again', () => {
  assert.match(monogram('Beijing Academy <AI>'), />BA</);
  assert.deepEqual(marksUsed(`<p>${markImg('openai-color.svg')}${markImg('openai-color.svg')}</p>`), ['openai-color.svg']);
});
