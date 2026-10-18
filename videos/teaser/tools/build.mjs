#!/usr/bin/env node
/**
 * Build both themes end to end: generate → check → render → poster → verify.
 *
 *   node tools/build.mjs              # both themes
 *   node tools/build.mjs --theme=dark # one
 *   node tools/build.mjs --skip-check # render without the gate (not advised)
 *
 * The generator writes to the project root, and the sub-compositions reference
 * `fonts/` and `assets/` from there, so each theme is generated and rendered
 * in turn rather than into sibling build dirs. That is why the root index.html
 * is whichever theme ran last — it is a preview target, not an artifact. The
 * artifacts are renders/intro-<theme>.mp4 and renders/intro-<theme>-poster.jpg.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'renders');
const argv = process.argv.slice(2);
const val = (k, d) => (argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];
const has = (k) => argv.includes(`--${k}`);

const THEMES = val('theme', 'dark,light').split(',').filter(Boolean);
const SKIP_CHECK = has('skip-check');
const QUALITY = val('quality', 'delivery');
// The end card, held: domain + the three stats + the install command.
const POSTER_AT = val('poster-at', '18.6');
const SECONDS = 20;

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });

const sh = (cmd, args) =>
  execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8' }).trim();

fs.mkdirSync(OUT, { recursive: true });
const results = [];
let failed = false;

for (const theme of THEMES) {
  console.log(`\n${'═'.repeat(64)}\n  ${theme.toUpperCase()}\n${'═'.repeat(64)}`);
  try {
    run(process.execPath, ['release/generate.mjs', `--theme=${theme}`]);

    if (!SKIP_CHECK) {
      run('npx', ['hyperframes', 'check', '--at-transitions', '--samples=31',
                   '--max-transition-samples=400']);
    } else {
      console.log('  ! --skip-check: the contrast/layout gate did NOT run');
    }

    const mp4 = path.join(OUT, `intro-${theme}.mp4`);
    run('npx', ['hyperframes', 'render', '-o', mp4, '-q', QUALITY]);

    const poster = path.join(OUT, `intro-${theme}-poster.jpg`);
    run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', POSTER_AT, '-i', mp4,
                   '-frames:v', '1', '-q:v', '2', poster]);

    // Verify with ffprobe rather than trusting the renderer's own summary.
    const probe = JSON.parse(
      sh('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
                     '-count_frames',
                     '-show_entries', 'stream=nb_read_frames,width,height,r_frame_rate,duration',
                     '-show_entries', 'format=duration,size',
                     '-of', 'json', mp4])
    );
    const v = probe.streams[0];
    const nFrames = Number(v.nb_read_frames);
    const dur = Number(probe.format.duration);
    const expected = SECONDS * 30;
    const fps = eval(v.r_frame_rate); // "30/1"

    const ok = nFrames === expected && Math.abs(dur - SECONDS) < 0.05 && v.width === 1920 && v.height === 1080;
    if (!ok) failed = true;

    console.log(`\n  ${ok ? '✓' : '✗'} ${path.relative(ROOT, mp4)}`);
    console.log(`      ${nFrames} frames (expected ${expected}) · ${dur.toFixed(3)}s · ${v.width}x${v.height} @ ${fps}fps`);
    console.log(`      ${(Number(probe.format.size) / 1048576).toFixed(2)} MB · poster ${path.relative(ROOT, poster)}`);

    results.push({ theme, mp4, poster, nFrames, dur, w: v.width, h: v.height, ok });
  } catch (e) {
    failed = true;
    console.error(`\n  ✗ ${theme} failed: ${e.message}`);
  }
}

console.log(`\n${'═'.repeat(64)}`);
for (const r of results) {
  console.log(`  ${r.ok ? '✓' : '✗'} intro-${r.theme}.mp4  ${r.nFrames}f  ${r.dur.toFixed(3)}s  ${r.w}x${r.h}`);
}
console.log(failed ? '\nBUILD FAILED' : '\nBUILD OK');
process.exit(failed ? 1 : 0);
