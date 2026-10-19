import test from 'node:test';
import assert from 'node:assert/strict';
import { captureScale, isCapture, judgeCapture, longestSmallRun } from './capture-scale.mjs';

const STEP = 0.5;
const at = (...pairs) => pairs.map(([t, scale]) => ({ t, scale }));

test('a 2x capture drawn at its natural width shows the page at twice its CSS size', () => {
  const natural = { naturalWidth: 3840, naturalHeight: 2160 };
  assert.equal(captureScale({ width: 3840, height: 2160 }, natural), 2);
  // a 1600 px browser view across the whole 1920 CSS px page is far too small to read
  assert.equal(captureScale({ width: 1600, height: 900 }, natural), 1600 / 1920);
});

test('only images under assets/captures/ are captured screens', () => {
  assert.equal(isCapture('assets/captures/models-free.png'), true);
  assert.equal(isCapture('assets/providers/openai.svg'), false);
});

test('a capture that settles below scale 2 for longer than 0.8s fails', () => {
  const v = judgeCapture({ samples: at([0, 1.9], [0.5, 1.9], [1, 1.9], [1.5, 2.4]), context: false }, STEP);
  assert.equal(v.ok, false);
  assert.deepEqual(v.run, { start: 0, seconds: 1.5, minScale: 1.9 });
});

test('a camera move that passes through a small scale for one sample is fine', () => {
  assert.equal(judgeCapture({ samples: at([0, 2.3], [0.5, 1.4], [1, 2.6], [1.5, 2.6]), context: false }, STEP).ok, true);
});

test('an establishing wide shot marked data-capture-context may stay small', () => {
  assert.equal(judgeCapture({ samples: at([0, 0.8], [0.5, 0.8], [1, 0.8]), context: true }, STEP).ok, true);
});

test('a capture hidden between two small moments does not count as one long hold', () => {
  const run = longestSmallRun(at([0, 1.5], [2, 1.5], [4, 1.5]), STEP);
  assert.equal(run.seconds, 0.5);
});
