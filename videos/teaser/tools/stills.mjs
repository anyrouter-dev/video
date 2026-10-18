#!/usr/bin/env node
/**
 * Pull one still per beat, per theme, for visual review.
 *
 *   node tools/stills.mjs                     # both themes, all beats
 *   node tools/stills.mjs --theme=light
 *   node tools/stills.mjs --beat=pool         # one beat
 *   node tools/stills.mjs --at=6.9            # an arbitrary timestamp
 *
 * Frames are cut from the rendered mp4 with ffmpeg rather than screenshotted
 * from the preview, so what you review is exactly what shipped.
 *
 * Each still is sampled at a point where the beat's payload is fully landed —
 * that is the point of the review. The table below is `beat start + settle`,
 * where `settle` is roughly when the last entrance tween finishes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const val = (k, d) => (argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];

// Mirrors BEATS in release/generate.mjs. Keep in step — this is a review aid,
// not the source of truth.
const BEATS = [
  ['estab', 0.0, 0.9],
  ['brand', 1.88, 0.5],
  ['unify', 2.8, 0.45],
  ['catalog', 3.75, 1.15],
  ['endpoint', 5.3, 0.55],
  ['free', 6.56, 0.5],
  ['preset', 7.9, 0.45],
  ['auto', 8.85, 0.45],
  ['decision', 9.9, 0.35],
  ['byok', 10.5, 0.5],
  ['markup', 11.65, 0.5],
  ['pool', 12.85, 1.2],
  ['domain', 14.35, 0.6],
  ['board', 15.7, 1.1],
  ['end', 17.2, 1.2],
];

const themes = val('theme', 'dark,light').split(',').filter(Boolean);
const only = val('beat', '');
const at = val('at', '');
const outRoot = path.join(ROOT, 'renders', 'stills');

let made = 0;
let missing = 0;

for (const theme of themes) {
  const mp4 = path.join(ROOT, 'renders', `intro-${theme}.mp4`);
  if (!fs.existsSync(mp4)) {
    console.error(`  ! ${path.relative(ROOT, mp4)} missing — run: node tools/build.mjs --theme=${theme}`);
    missing++;
    continue;
  }
  const dir = path.join(outRoot, theme);
  fs.mkdirSync(dir, { recursive: true });

  const shots = at
    ? [['custom', parseFloat(at), 0]]
    : BEATS.filter(([id]) => !only || id === only).map(([id, start, settle]) => [
        id,
        +(start + settle).toFixed(3),
        0,
      ]);

  for (const [id, t] of shots) {
    const file = path.join(dir, `${id}.jpg`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(t), '-i', mp4,
                            '-frames:v', '1', '-q:v', '2', file]);
    made++;
    console.log(`  ${theme.padEnd(6)} ${String(t).padStart(6)}s  ${path.relative(ROOT, file)}`);
  }
}

console.log(`\n${made} still(s) written${missing ? `, ${missing} theme(s) skipped (no mp4)` : ''}`);
process.exit(missing ? 1 : 0);
