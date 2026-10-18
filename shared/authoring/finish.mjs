// Rebuilds a narrated film's index.html from its frames, run from the film's folder:
// assemble → inject + verify transitions → group the narration → carve the music bed
// under it. The assembler rewrites index.html from scratch, which drops the voice group
// and the carve, so they are re-applied here every time instead of by hand.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SKILLS = path.join(os.homedir(), '.claude/skills');
const LAUNCH = path.join(SKILLS, 'product-launch-video/scripts');
const CARVE = path.join(SKILLS, 'hyperframes-audio/scripts/carve.mjs');
// @hyperframes/core, pinned to the repo's CLI version; the CLI bundles core and can't lend it.
const CORE = path.join(os.homedir(), '.cache/hyperframes-core-0.8.78');

const run = (script, args) => execFileSync(process.execPath, [script, ...args], { stdio: 'inherit' });

run(path.join(LAUNCH, 'assemble-index.mjs'), ['--storyboard', './STORYBOARD.md', '--hyperframes', '.']);
run(path.join(LAUNCH, 'transitions.mjs'), ['inject', '--storyboard', './STORYBOARD.md', '--hyperframes', '.']);
run(path.join(LAUNCH, 'transitions.mjs'), ['verify', '--storyboard', './STORYBOARD.md', '--index', './index.html']);

const html = fs.readFileSync('index.html', 'utf8');
const grouped = html.replace(/<audio(\s+)id="(el-[\w-]+-voice)"/g, '<audio$1id="$2" data-audio-group="voiceover"');
const voices = (grouped.match(/data-audio-group="voiceover"/g) ?? []).length;
if (!voices) throw new Error('no narration clips (id="el-…-voice") found in index.html');
fs.writeFileSync('index.html', grouped);
console.log(`✓ ${voices} narration clips in audio group "voiceover"`);

if (!fs.existsSync(path.join(CORE, 'node_modules/@hyperframes/core'))) {
  throw new Error(`@hyperframes/core missing: npm i --prefix ${CORE} @hyperframes/core@0.8.78`);
}
run(CARVE, ['--comp', './index.html', '--bed', 'el-bgm', '--core', CORE]);
