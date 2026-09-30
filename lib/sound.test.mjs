// node --test lib/sound.test.mjs — builtins only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderSound, writeSound, PALETTES, BPM } from './sound.mjs';

const SR = 48000;
const CEILING = 32768 * 10 ** (-1 / 20);

/** The WAV header, and the samples as floats per channel. */
function parse(wav) {
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 16), 'WAVEfmt ');
  assert.equal(wav.toString('ascii', 36, 40), 'data');
  const fmt = { format: wav.readUInt16LE(20), channels: wav.readUInt16LE(22), rate: wav.readUInt32LE(24), bits: wav.readUInt16LE(34) };
  const s = new Int16Array(wav.buffer.slice(wav.byteOffset + 44, wav.byteOffset + 44 + wav.readUInt32LE(40)));
  return { fmt, s, frames: s.length / 2 };
}
/** RMS of both channels between two times, in linear units. */
function rms({ s }, a, b) {
  let e = 0;
  const i0 = Math.round(a * SR) * 2, i1 = Math.round(b * SR) * 2;
  for (let i = i0; i < i1; i++) e += (s[i] / 32768) ** 2;
  return Math.sqrt(e / (i1 - i0));
}

test('the tempo is the shared 120 BPM grid films cut on', () => {
  assert.equal(BPM, 120);
  assert.deepEqual(PALETTES, ['drop', 'release', 'changelog', 'intro']);
});

test('a film gets exactly its length — 48 kHz, stereo, 16-bit — however long it is', () => {
  for (const duration of [8, 12.34, 20, 90]) {
    const { fmt, frames } = parse(renderSound({ duration, palette: 'drop' }));
    assert.deepEqual(fmt, { format: 1, channels: 2, rate: SR, bits: 16 });
    assert.ok(Math.abs(frames - duration * SR) <= 1, `${duration}s rendered as ${frames} frames`);
  }
});

test('the render is deterministic: same input, byte-identical file; another seed, another file', () => {
  const opts = { duration: 10, palette: 'intro', cues: [{ at: 2, kind: 'cut' }, { at: 5, kind: 'hit' }, { at: 8, kind: 'end' }] };
  const a = renderSound(opts), b = renderSound(opts);
  assert.ok(a.equals(b));
  assert.ok(!a.equals(renderSound({ ...opts, seed: 2 })));
});

test('every palette is its own music, not the same bed at another level', () => {
  const beds = PALETTES.map(palette => parse(renderSound({ duration: 12, palette })));
  for (let i = 0; i < beds.length; i++) for (let j = i + 1; j < beds.length; j++) {
    const a = beds[i].s, b = beds[j].s;
    let e = 0;
    for (let k = 0; k < a.length; k++) e += ((a[k] - b[k]) / 32768) ** 2;
    const diff = Math.sqrt(e / a.length), level = Math.min(rms(beds[i], 0, 12), rms(beds[j], 0, 12));
    // uncorrelated signals differ by ~√2 × their level; a copy would be ~0
    assert.ok(diff > level, `${PALETTES[i]} vs ${PALETTES[j]}: difference ${diff.toFixed(3)} vs level ${level.toFixed(3)}`);
  }
});

test('it never clips: the peak stays at or under -1 dBFS even with effects stacked on each other', () => {
  const pile = [];
  for (let t = 1; t < 11; t += 1.5) pile.push({ at: t, kind: 'hit', gain: 2 }, { at: t, kind: 'cut', gain: 2 }, { at: t, kind: 'rise' }, { at: t, kind: 'type', dur: 1 });
  for (const palette of PALETTES) {
    const { s } = parse(renderSound({ duration: 12, palette, cues: pile }));
    let peak = 0;
    for (const v of s) peak = Math.max(peak, Math.abs(v));
    assert.ok(peak <= CEILING, `${palette}: peak ${(20 * Math.log10(peak / 32768)).toFixed(2)} dBFS`);
  }
});

test('the bed has a shape: a quieter teaser, a body, and a tail that fades to silence', () => {
  for (const palette of PALETTES) {
    const w = parse(renderSound({ duration: 30, palette }));
    const teaser = rms(w, 0.1, 1.9), body = rms(w, 8, 20);
    assert.ok(body > 1e-2, `${palette}: body is ${body}`);
    assert.ok(teaser < body / 2, `${palette}: teaser ${teaser.toFixed(3)} is not under the body ${body.toFixed(3)}`);
    assert.equal(w.s[0], 0);
    assert.ok(Math.abs(w.s.at(-1)) + Math.abs(w.s.at(-2)) < 4, 'ends on silence, not a click');
    assert.ok(rms(w, 29.9, 30) < body / 20, `${palette}: tail still loud`);
    let dc = 0;
    for (const v of w.s) dc += v / 32768;
    assert.ok(Math.abs(dc / w.s.length) < 1e-3, `${palette}: DC offset ${dc / w.s.length}`);
  }
});

test('the music resolves on the `end` cue, wherever it is', () => {
  // an end card at 12s of a 30s film: the groove has stopped by 14s, it does not play on to 28
  const early = parse(renderSound({ duration: 30, palette: 'drop', cues: [{ at: 12, kind: 'end' }] }));
  const late = parse(renderSound({ duration: 30, palette: 'drop' }));
  assert.ok(rms(early, 16, 26) < rms(late, 16, 26) / 3);
});

test('a hit lands: it raises the energy around its time over the same render without it', () => {
  for (const palette of PALETTES) {
    const base = [{ at: 4, kind: 'cut' }, { at: 14, kind: 'end' }];
    const without = parse(renderSound({ duration: 16, palette, cues: base }));
    const withHit = parse(renderSound({ duration: 16, palette, cues: [...base, { at: 8.5, kind: 'hit' }] }));
    const a = rms(without, 8.5, 8.8), b = rms(withHit, 8.5, 8.8);
    assert.ok(b > a * 1.5, `${palette}: ${a.toFixed(3)} → ${b.toFixed(3)}`);
    // …and only there: the bed a bar later is untouched by it
    assert.ok(Math.abs(rms(without, 11, 12) - rms(withHit, 11, 12)) < 1e-4);
  }
});

test('every cue kind renders; unknown kinds throw; cues outside the film are ignored', () => {
  const kinds = ['cut', 'tick', 'rise', 'hit', 'type', 'end'];
  const base = renderSound({ duration: 10, palette: 'changelog' });
  for (const kind of kinds) assert.ok(!renderSound({ duration: 10, palette: 'changelog', cues: [{ at: 5, kind, dur: 0.5 }] }).equals(base), kind);
  assert.throws(() => renderSound({ duration: 10, cues: [{ at: 1, kind: 'boom' }] }), /unknown cue kind "boom"/);
  assert.throws(() => renderSound({ duration: 10, palette: 'jazz' }), /unknown palette/);
  assert.throws(() => renderSound({ duration: 10, cues: [{ kind: 'tick' }] }), /numeric `at`/);
  assert.ok(renderSound({ duration: 10, cues: [{ at: -1, kind: 'hit' }, { at: 11, kind: 'end' }] }).equals(renderSound({ duration: 10 })));
});

test('writeSound writes the file and reports what it wrote', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sound-')), 'deep', 'score.wav');
  const r = writeSound(file, { duration: 8, palette: 'release', cues: [{ at: 2, kind: 'tick' }, { at: 9, kind: 'hit' }] });
  assert.equal(r.seconds, 8);
  assert.equal(r.cues, 1);
  assert.ok(r.peakDb <= -1 && r.peakDb > -20, `peak ${r.peakDb}`);
  assert.equal(fs.statSync(file).size, 44 + 8 * SR * 4);
});

test('it is fast enough to run on every render', () => {
  const t0 = performance.now();
  renderSound({ duration: 30, palette: 'intro', cues: [{ at: 4, kind: 'cut' }, { at: 15, kind: 'hit' }, { at: 28, kind: 'end' }] });
  assert.ok(performance.now() - t0 < 3000);
});
