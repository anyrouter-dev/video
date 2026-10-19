/**
 * hyperframes — the three CLI calls the pipeline makes, against any project dir.
 *
 *   check()   lint + runtime + layout + motion + contrast, then the stage audit. The hard gate.
 *   render()  → an mp4 at an exact path (no "newest file in renders/" guessing)
 *   cover()   → one settled frame as a png
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './paths.mjs';

const BIN = path.join(ROOT, 'node_modules/.bin/hyperframes');
const AUDIT = path.join(ROOT, 'shared/authoring/stage-audit.mjs');

function hf(args, { inherit = false } = {}) {
  if (!fs.existsSync(BIN)) throw new Error('hyperframes is not installed — run `npm ci`');
  return execFileSync(BIN, args, {
    cwd: ROOT, encoding: 'utf8', stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });
}

/** Run any hyperframes command against a project, streaming its output. */
export const passthrough = (cmd, dir, args = []) => hf([cmd, dir, ...args], { inherit: true });

/**
 * What hyperframes check lets through: a full-bleed layer that misses the stage, and text
 * outside the rendition's safe area (`safe` in lib/renditions.mjs). A portrait copy still drawn
 * at 1920x1080 passes check; it does not pass this.
 */
export function audit(dir, safe, { inherit = false } = {}) {
  const args = [AUDIT, dir, `--safe=${[safe.left, safe.top, safe.right, safe.bottom].join(',')}`];
  try { return execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { throw new Error(`stage audit failed — refusing to render\n${(e.stdout || e.stderr || e.message).slice(-2500)}`); }
}

/** One rendition's gate: hyperframes check, then the stage audit when the rendition has a safe area. */
export function check(dir, { safe = null } = {}) {
  try { hf(['check', dir]); }
  catch (e) { throw new Error(`check failed — refusing to render\n${(e.stdout || e.stderr || e.message).slice(-2500)}`); }
  if (safe) audit(dir, safe);
}

export function render(dir, out, { quality, workers } = {}) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const args = ['render', dir, '-o', out, '--quiet'];
  if (quality) args.push(`--quality=${quality}`);
  if (workers) args.push(`--workers=${workers}`);
  try { hf(args); }
  catch (e) { throw new Error(`render failed\n${(e.stderr || e.message).slice(-2500)}`); }
  if (!fs.existsSync(out)) throw new Error(`render reported success but ${out} does not exist`);
  return probe(out);
}

/** Duration, frame count and size of a rendered file, straight from the container. */
export function probe(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration:stream=nb_frames,width,height', '-of', 'json', file], { encoding: 'utf8' }));
  const video = (j.streams || []).find(s => s.width);
  return {
    seconds: parseFloat(j.format?.duration),
    frames: +(video?.nb_frames ?? NaN),
    width: video?.width,
    height: video?.height,
  };
}

/**
 * One frame at 2x density. An arbitrary ffmpeg grab is not a cover — the caller
 * picks a second at which the film's main card has settled.
 */
export function cover(dir, at, out) {
  const tmp = `${out}.tmp`;
  fs.rmSync(tmp, { recursive: true, force: true });
  hf(['snapshot', dir, `--at=${at}`, '--no-end', '--zoom-scale=2', '--describe=false', '-o', tmp]);
  const shot = fs.readdirSync(tmp).find(f => f.endsWith('.png'));
  if (!shot) throw new Error('snapshot produced no png');
  fs.copyFileSync(path.join(tmp, shot), out);
  fs.rmSync(tmp, { recursive: true, force: true });
  return out;
}
