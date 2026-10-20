// One command after any change to the voice, the figure or the timing, run from the film's folder:
// captions (build + regroup) → the machine composition and index.html → the mix.
// This film keeps its own sound table (sfx-cues.json maps machine events to sounds), so it does
// not use shared/authoring/finish.mjs, whose sfx-cues.json anchors sounds to words.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const LAUNCH = path.join(os.homedir(), '.claude/skills/product-launch-video/scripts');
const SHARED = path.resolve('../../shared/authoring');
const run = (script, args = []) => execFileSync(process.execPath, [script, ...args], { stdio: 'inherit' });

run(path.join(LAUNCH, 'captions.mjs'), ['build', '--storyboard', './STORYBOARD.md', '--audio-meta', './audio_meta.json', '--hyperframes', '.', '--out', './caption_groups.json']);
run(path.join(SHARED, 'regroup-captions.mjs'));

// captions.mjs gives "Geist" the geist-mono file (it matches fonts by name prefix); keep a face
// only when its file is named for its family.
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const caps = 'compositions/captions.html';
fs.writeFileSync(caps, fs.readFileSync(caps, 'utf8').replace(/[ \t]*@font-face\s*\{[^}]*\}\n?/g, (rule) => {
  const family = /font-family:\s*['"]([^'"]+)['"]/.exec(rule)?.[1];
  const src = /url\(['"]?([^'")]+)['"]?\)/.exec(rule)?.[1];
  if (!family || !src) return rule;
  return norm(path.basename(src).replace(/\.(woff2?|ttf|otf)$/i, '')) === norm(family) ? rule : '';
}));

run('tools/compose.mjs');
run('tools/mix.mjs', process.argv.slice(2));
