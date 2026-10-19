// The phone sheet: every frame at its midpoint and at its settled moment (just before the
// next frame takes over), each scaled to 640px wide, four to a row. 640px is a phone held
// sideways; if a word on this sheet needs zooming, it is too small for the film.
//
//   node tools/phone-sheet.mjs <out-dir>        (run from the film's folder)
//
// Writes <out-dir>/sheet.jpg, <out-dir>/frames/NN.png and <out-dir>/times.txt.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SETTLE_BEFORE_END_S = 0.35;
const TILE_W = 640;
const COLS = 4;

const out = path.resolve(process.argv[2] ?? 'snapshots/phone-sheet');
const html = fs.readFileSync('index.html', 'utf8');
const scenes = [...html.matchAll(/<div\s+id="el-(\d\d-[\w-]+)"[^>]*?data-start="([\d.]+)"[^>]*?data-duration="([\d.]+)"/gs)]
  .map(m => ({ id: m[1], start: +m[2], end: +m[2] + +m[3] }));
if (!scenes.length) throw new Error('index.html: no scene hosts (id="el-NN-…") found');

const shots = scenes.flatMap((s, i) => {
  const until = Math.min(s.end, scenes[i + 1]?.start ?? Infinity);
  const mid = s.start + (until - s.start) / 2;
  const settled = until - SETTLE_BEFORE_END_S;
  return [{ id: s.id, label: 'mid', t: +mid.toFixed(3) }, { id: s.id, label: 'settled', t: +settled.toFixed(3) }];
});

const raw = path.join(out, 'raw');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(raw, { recursive: true });
execFileSync('npx', ['hyperframes', 'snapshot', '.', '--at', shots.map(s => s.t).join(','), '--no-end', '--describe', 'false', '--output', raw], { stdio: ['ignore', 'ignore', 'inherit'] });

const pngs = fs.readdirSync(raw).filter(f => f.endsWith('.png')).sort();
if (pngs.length !== shots.length) throw new Error(`expected ${shots.length} snapshots, got ${pngs.length} in ${raw}`);
const frames = path.join(out, 'frames');
fs.mkdirSync(frames);
pngs.forEach((f, i) => fs.copyFileSync(path.join(raw, f), path.join(frames, `${String(i).padStart(2, '0')}.png`)));
fs.writeFileSync(path.join(out, 'times.txt'), shots.map((s, i) => `${String(i).padStart(2, '0')}  ${s.t.toFixed(2)}s  ${s.id} ${s.label}`).join('\n') + '\n');

const rows = Math.ceil(shots.length / COLS);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(frames, '%02d.png'),
  '-vf', `scale=${TILE_W}:-1:flags=area,pad=iw+8:ih+8:4:4:color=0xE5E5E5,tile=${COLS}x${rows}:color=0xE5E5E5`,
  '-frames:v', '1', '-q:v', '3', path.join(out, 'sheet.jpg')]);
console.log(`${shots.length} shots → ${path.join(out, 'sheet.jpg')}`);
