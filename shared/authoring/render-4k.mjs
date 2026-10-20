// Renders a film's 4K masters: 3840x2160 from the landscape project and 2160x3840 from its
// portrait copy. The compositions are authored at 1920x1080, and `hyperframes render
// --resolution` draws them at device scale 2, so nothing in the film changes.
//
//   node shared/authoring/render-4k.mjs <project> --out=<dir> [--name=<stem>] [--ref=<commit>]
//     [--only=landscape|portrait] [--quality=delivery]
//
// <project> is a film folder (videos/explainer) or a generated one (.build/use-case/film).
// With --ref, the film is rendered from that commit in a detached worktree, so edits in
// progress never leak into a master. Each master is checked for its size and an audio track.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { writePortrait } from './portrait.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

export const MASTERS = [
  { id: 'landscape', resolution: 'landscape-4k', width: 3840, height: 2160, suffix: '-4k' },
  { id: 'portrait', resolution: 'portrait-4k', width: 2160, height: 3840, suffix: '-portrait-4k' },
];

export function verify(probe, master) {
  const video = probe.streams.find(s => s.codec_type === 'video');
  const problems = [];
  if (!video) problems.push('no video stream');
  else if (video.width !== master.width || video.height !== master.height) problems.push(`is ${video.width}x${video.height}, not ${master.width}x${master.height}`);
  if (!probe.streams.some(s => s.codec_type === 'audio')) problems.push('no audio track');
  return problems;
}

const probeFile = file => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));

function main() {
  const argv = process.argv.slice(2);
  const flag = k => argv.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
  const project = argv.find(a => !a.startsWith('--'));
  const out = flag('out') && path.resolve(flag('out'));
  if (!project || !out) throw new Error('usage: render-4k.mjs <project> --out=<dir> [--name=<stem>] [--ref=<commit>] [--only=landscape|portrait]');
  const ref = flag('ref');
  const name = flag('name') ?? path.basename(project);
  const masters = MASTERS.filter(m => !flag('only') || m.id === flag('only'));
  fs.mkdirSync(out, { recursive: true });

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'render-4k-'));
  let root = ROOT;
  if (ref) {
    root = path.join(scratch, 'tree');
    execFileSync('git', ['-C', ROOT, 'worktree', 'add', '--detach', root, ref], { stdio: 'pipe' });
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(root, 'node_modules'));
  }
  const cli = path.join(ROOT, 'node_modules/.bin/hyperframes');
  try {
    const src = path.join(root, project);
    if (!fs.existsSync(path.join(src, 'index.html'))) throw new Error(`${src} has no index.html`);
    for (const m of masters) {
      const dir = m.id === 'portrait' ? writePortrait(src, path.join(scratch, 'portrait')) : src;
      const file = path.join(out, `${name}${m.suffix}.mp4`);
      console.log(`── ${m.id} ${m.width}x${m.height}  ${path.relative(process.cwd(), file)}`);
      execFileSync(cli, ['render', dir, '-o', file, `--resolution=${m.resolution}`, `--quality=${flag('quality') ?? 'delivery'}`, '--quiet'], { stdio: 'inherit' });
      const problems = verify(probeFile(file), m);
      if (problems.length) throw new Error(`${file}: ${problems.join(', ')}`);
      const seconds = Number(probeFile(file).format.duration).toFixed(2);
      console.log(`   ok  ${seconds}s  ${(fs.statSync(file).size / 1048576).toFixed(1)} MB`);
    }
  } finally {
    if (ref) execFileSync('git', ['-C', ROOT, 'worktree', 'remove', '--force', root], { stdio: 'pipe' });
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
