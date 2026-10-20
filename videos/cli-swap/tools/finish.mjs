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

// A product name never breaks across caption rows: join its words with a no-break space.
const NAMES = ['Claude Code'];
const html = fs.readFileSync(caps, 'utf8');
const m = /var GROUPS = (\[.*?\]);\n/s.exec(html);
const groups = JSON.parse(m[1]).map((g) => {
  for (const name of NAMES) {
    const parts = name.split(' ');
    for (let i = 0; i + parts.length <= g.words.length; i++) {
      if (parts.every((p, j) => g.words[i + j].text.replace(/[.,]$/, '') === p)) {
        const last = g.words[i + parts.length - 1];
        g.words.splice(i, parts.length, { ...g.words[i], text: g.words.slice(i, i + parts.length).map((x) => x.text).join('\u00a0'), end: last.end });
      }
    }
    g.text = g.text.split(name).join(name.replace(/ /g, '\u00a0'));
  }
  return g;
});
fs.writeFileSync(caps, html.replace(m[0], `var GROUPS = ${JSON.stringify(groups)};\n`));

run('tools/compose.mjs');
run('tools/mix.mjs', process.argv.slice(2));
