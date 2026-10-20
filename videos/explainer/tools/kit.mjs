// Pastes the kit (tools/kit/kit.css and kit.js) into every frame, between its markers:
//   /* kit:css */ … /* /kit:css */   in the frame's <style>, %F scoped to the frame
//   // kit:js … // /kit:js           in the frame's <script>
// A sub-composition keeps only what is inside its <template>, so each frame carries its own
// copy. Run after editing the kit, for this film or for another film that shares it:
//   node tools/kit.mjs [film-dir]        film-dir defaults to the film this script sits in
// tools/shared-components.md lists what the kit holds and how another film reuses it.
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const FILM = path.resolve(process.argv[2] ?? path.join(HERE, '..'));
const FRAMES = path.join(FILM, 'compositions/frames');
const css = fs.readFileSync(path.join(HERE, 'kit/kit.css'), 'utf8').trim();
const js = fs.readFileSync(path.join(HERE, 'kit/kit.js'), 'utf8').trim();

for (const f of fs.readdirSync(FRAMES).filter(f => f.endsWith('.html'))) {
  const file = path.join(FRAMES, f);
  const html = fs.readFileSync(file, 'utf8');
  const id = /id="root" data-composition-id="([^"]+)"/.exec(html)?.[1];
  if (!id) throw new Error(`${f}: no #root with a data-composition-id`);
  const scope = `[data-composition-id="${id}"]`;
  const scoped = css.replaceAll('%F', scope);
  const out = html
    .replace(/\/\* kit:css \*\/[\s\S]*?\/\* \/kit:css \*\//, `/* kit:css */\n${scoped}\n    /* /kit:css */`)
    .replace(/\/\/ kit:js[\s\S]*?\/\/ \/kit:js/, `// kit:js\n${js}\n      // /kit:js`);
  if (!out.includes('/* kit:css */') || !out.includes('// kit:js')) throw new Error(`${f}: kit markers missing`);
  if (out !== html) { fs.writeFileSync(file, out); console.log(`kit → ${f}`); }
}
