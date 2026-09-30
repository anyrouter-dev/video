/**
 * hyperframes — the three CLI calls the pipeline makes, against any project dir.
 *
 *   check()   lint + runtime + layout + motion + contrast. The hard gate.
 *   render()  → an mp4 at an exact path (no "newest file in renders/" guessing)
 *   cover()   → one settled frame as a png
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './paths.mjs';

const BIN = path.join(ROOT, 'node_modules/.bin/hyperframes');

function hf(args, { inherit = false } = {}) {
  if (!fs.existsSync(BIN)) throw new Error('hyperframes is not installed — run `npm ci`');
  return execFileSync(BIN, args, {
    cwd: ROOT, encoding: 'utf8', stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });
}

/** Run any hyperframes command against a project, streaming its output. */
export const passthrough = (cmd, dir, args = []) => hf([cmd, dir, ...args], { inherit: true });

export function check(dir) {
  try { return hf(['check', dir]); }
  catch (e) { throw new Error(`check failed — refusing to render\n${(e.stdout || e.stderr || e.message).slice(-2500)}`); }
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

/** Duration and frame count of a rendered file, straight from the container. */
export function probe(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-show_entries', 'stream=nb_frames', '-of', 'json', file], { encoding: 'utf8' }));
  return {
    seconds: parseFloat(j.format?.duration),
    frames: +((j.streams || []).find(s => s.nb_frames)?.nb_frames ?? NaN),
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
