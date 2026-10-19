import test from 'node:test';
import assert from 'node:assert/strict';
import { pads } from './pad-voices.mjs';

test('without a beat every line gets the same breath, and the last line the end-card hold', () => {
  assert.deepEqual(pads([3, 4, 2]), [0.4, 0.4, 2.5]);
});

test('with a beat each next line starts on the grid, after at least a short breath', () => {
  const raws = [3.994, 3.947, 4.69];
  const grid = { beat: 0.5, phase: 0.059 };
  const p = pads(raws, grid);
  let at = 0;
  for (let i = 0; i < raws.length - 1; i++) {
    assert.ok(p[i] >= 0.25 && p[i] < 0.75, `breath ${p[i]}`);
    at += raws[i] + p[i];
    const k = (at - grid.phase) / grid.beat;
    assert.ok(Math.abs(k - Math.round(k)) < 1e-6, `line ${i + 2} starts on a beat (${at.toFixed(3)}s)`);
  }
  assert.equal(p.at(-1), 2.5);
});
