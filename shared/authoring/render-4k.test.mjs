import test from 'node:test';
import assert from 'node:assert/strict';
import { MASTERS, verify } from './render-4k.mjs';

const [landscape, portrait] = MASTERS;
const probe = (width, height, audio = true) => ({
  streams: [{ codec_type: 'video', width, height }, ...(audio ? [{ codec_type: 'audio' }] : [])],
});

test('a 4K master is accepted only at its own size, with sound', () => {
  assert.deepEqual(verify(probe(3840, 2160), landscape), []);
  assert.deepEqual(verify(probe(2160, 3840), portrait), []);
});

test('a master rendered at the source size is rejected, so a 1080p file never ships as 4K', () => {
  assert.match(verify(probe(1920, 1080), landscape)[0], /not 3840x2160/);
});

test('a silent master is rejected', () => {
  assert.deepEqual(verify(probe(3840, 2160, false), landscape), ['no audio track']);
});
