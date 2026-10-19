import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHolds, judge, speechRate } from './pace-audit.mjs';

const FFMPEG_LOG = `
[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 4.2
[freezedetect @ 0x1] lavfi.freezedetect.freeze_duration: 0.9
[freezedetect @ 0x1] lavfi.freezedetect.freeze_end: 5.1
[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 20
[freezedetect @ 0x1] lavfi.freezedetect.freeze_duration: 2.5
[freezedetect @ 0x1] lavfi.freezedetect.freeze_end: 22.5
[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 42.5
`;

test('every still span ffmpeg reports becomes a hold, and one still running at the end stays open', () => {
  const { holds, openStart } = parseHolds(FFMPEG_LOG);
  assert.deepEqual(holds, [{ start: 4.2, end: 5.1 }, { start: 20, end: 22.5 }]);
  assert.equal(openStart, 42.5);
});

test('a still picture mid-film longer than the limit fails the film', () => {
  const v = judge({ duration: 45, holds: [{ start: 20, end: 22.5 }], maxHold: 1.5, endHold: 3 });
  assert.equal(v.ok, false);
  assert.equal(v.tooLong[0].seconds, 2.5);
});

test('the closing card may hold still for the end allowance, and no longer', () => {
  const lockup = { start: 42.5, end: 45 };
  assert.equal(judge({ duration: 45, holds: [lockup], maxHold: 1.5, endHold: 3 }).ok, true);
  assert.equal(judge({ duration: 45, holds: [{ start: 41, end: 45 }], maxHold: 1.5, endHold: 3 }).ok, false);
});

test('speech rate is words per minute of narration, not of the whole film', () => {
  const meta = { voices: [
    { duration_s: 3, words: Array.from({ length: 8 }, () => ({})) },
    { duration_s: 3, words: Array.from({ length: 7 }, () => ({})) },
  ] };
  assert.deepEqual(speechRate(meta), { words: 15, seconds: 6, wpm: 150 });
});
