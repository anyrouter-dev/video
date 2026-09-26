#!/usr/bin/env node
/**
 * model-drop :: cover
 *
 *   node release/cover.mjs               → cover for the newest release
 *   node release/cover.mjs <id>          → cover for a specific release
 *   node release/cover.mjs --at=5.9      → override the frame
 *
 * A release needs a cover, and an arbitrary ffmpeg grab is not one. This picks
 * the frame where the film's hero card has settled, captures it at 2x density,
 * and writes `covers/<id>.png` — which is a TRACKED artifact. The mp4s are not
 * tracked (they live on the GitHub Release); the covers are, because a changelog
 * is browsed as a grid of images and a release with no image does not read.
 *
 * Frame choice: the first content scene, a third of the way in. The card enters
 * with a scale+opacity move, so the very start of the scene is mid-transition and
 * the end is drifting into the next scene's overlap guard. A third of the way in
 * is where the card is fully settled and still centred.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { list } from './ledger.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const val = (k, d) => (argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];

const sh = (cmd, args) =>
  execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** First content scene after the ignite, from compositions/s01-*.html. */
function heroTime() {
  const dir = path.join(ROOT, 'compositions');
  if (!fs.existsSync(dir)) return 5.9;
  const files = fs.readdirSync(dir).filter(f => /^s0[1-9]/.test(f)).sort();
  if (!files.length) return 5.9;

  // Scenes are laid end to end, so the first content scene starts where the
  // ignite ends. Read the durations rather than assuming, because the overlap
  // guard in generate.mjs clamps them.
  let t = 0;
  for (const f of fs.readdirSync(dir).sort()) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8');
    const d = +(/data-duration="([\d.]+)"/.exec(html)?.[1] ?? 0);
    if (/^s0[1-9]/.test(f)) return t + d / 3;
    t += d;
  }
  return 5.9;
}

const all = list();
if (!all.length) { console.error('no releases in the ledger'); process.exit(1); }
const want = argv.find(a => !a.startsWith('-')) || null;
const entry = want ? all.find(r => r.id === want) : [...all].reverse()[0];
if (!entry) { console.error(`no such release: ${want}`); process.exit(1); }

if (!fs.existsSync(path.join(ROOT, 'compositions'))) {
  console.error('no generated composition — run `npm run gen` first');
  process.exit(1);
}

const at = +val('at', 0) || heroTime();
const outDir = path.join(ROOT, 'covers');
const tmpDir = path.join(ROOT, '.cover-tmp');
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

console.log(`cover for ${entry.id}  at ${at.toFixed(2)}s`);
sh('npx', ['hyperframes', 'snapshot', `--at=${at}`, '--no-end', '--zoom-scale=2', '-o', tmpDir]);

const shot = fs.readdirSync(tmpDir).find(f => f.endsWith('.png'));
if (!shot) { console.error('snapshot produced no png'); process.exit(1); }

const dest = path.join(outDir, `${entry.id}.png`);
fs.copyFileSync(path.join(tmpDir, shot), dest);
fs.rmSync(tmpDir, { recursive: true, force: true });
const kb = (fs.statSync(dest).size / 1024).toFixed(0);
console.log(`  → covers/${entry.id}.png  (${kb} KB)`);
