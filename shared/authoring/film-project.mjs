/**
 * film-project: a generated, narrated film's scenes → a HyperFrames project, for kinds that
 * bring their own look (model-launch, free-roundup, weekly). It owns only the mechanics; the
 * look is the kind's CSS and scene code.
 *
 * The project is authored at 1920x1080. Each scene carries its portrait layout under
 * `@media (orientation: portrait)`, and the stage size appears only in the declarations
 * shared/authoring/portrait.mjs rewrites, so that script turns it into the 1080x1920 rendition.
 *
 *   index.html                 root: one host per scene, back to back, and the soundtrack
 *   compositions/<scene>.html  one sub-composition per scene
 *   fonts/  assets/providers/  assets/<file>  audio/mix.wav
 *
 * A scene is { id, start, dur, body, inner }: `body` is HTML, `inner` is GSAP code run with
 * tl, D, Q, $, $$, PORTRAIT in scope once the fonts are in. The soundtrack is one file made by
 * mixdown.mjs: music, voice and effects, at -14 LUFS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SHARED } from '../../lib/paths.mjs';
import { MARKS_DIR, marksUsed } from '../../lib/marks.mjs';
import { mixdown } from './mixdown.mjs';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const GSAP = 'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js';

// Run inside every scene. Selectors are scoped to the scene: sub-compositions share one document.
const HELPERS = `
    const Q = s => s.split(",").map(x => '[data-composition-id="' + ID + '"] ' + x.trim()).join(",");
    const $ = s => document.querySelector(Q(s));
    const $$ = s => Array.from(document.querySelectorAll(Q(s)));
    const PORTRAIT = matchMedia("(orientation: portrait)").matches;
    // Shrinks each element's font until its text fits the width of its box, never under 32px.
    const fit = (els, floor = 32) => els.forEach(el => {
      let px = parseFloat(getComputedStyle(el).fontSize);
      const room = el.clientWidth || el.parentElement.clientWidth;
      while (el.scrollWidth > room + 1 && px > floor) { px -= 1; el.style.fontSize = px + "px"; }
    });`;

const sceneFile = (s, film) => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><title>${s.id}</title></head>
<body><template>
<style>${film.fontFaces}${film.css}</style>
<div id="root" data-composition-id="${s.id}" data-width="1920" data-height="1080" data-duration="${s.dur}">
  <div class="stage">${s.body}</div>
</div>
<script src="${GSAP}"></script>
<script>
  // Built once the fonts are in: it measures the text the layout sets.
  Promise.all(${JSON.stringify(film.fontLoads)}.map(f => document.fonts.load(f))).then(() => {
    const ID = "${s.id}", D = ${s.dur};
    // Animate children, never the clip host: the framework owns clip visibility.
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    ${HELPERS}
    ${s.inner}
    window.__timelines[ID] = tl;
  });
</script>
</template></body></html>
`;

// The stage size is written only in the forms portrait.mjs rewrites.
const rootFile = (film, scenes) => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>${esc(film.title)}</title>
<script src="${GSAP}"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html, body {
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: ${film.bg};
  }
  #root {
    position: relative;
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: ${film.bg};
  }
  .clip{position:absolute;inset:0}
</style></head>
<body>
<div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-duration="${film.duration}" data-fps="30">
${scenes.map(s => `  <div id="clip-${s.id}" class="clip" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html"
       data-start="${s.start}" data-duration="${s.dur}" data-track-index="1" data-width="1920" data-height="1080"></div>`).join('\n')}
  <audio id="soundtrack" data-start="0" data-duration="${film.duration}" data-track-index="9" src="audio/mix.wav" data-volume="1"></audio>
</div>
<script>
  // The root only mounts the scenes; each scene drives its own timeline.
  window.__timelines["main"] = gsap.timeline({ paused: true });
</script>
</body></html>
`;

/** Scenes must sit back to back: a gap is a blank frame, an overlap two layouts at once. */
export function assertBackToBack(scenes, duration) {
  scenes.forEach((s, i) => {
    const next = i + 1 < scenes.length ? scenes[i + 1].start : duration;
    if (Math.abs(s.start + s.dur - next) > 1e-6) throw new Error(`scene ${s.id} ends at ${s.start + s.dur}, the next starts at ${next}`);
  });
}

/**
 * Write the project. `dir` is wiped first: a build is a freeze, not a merge.
 * spec: { title, duration, bg, css, fonts: [{ family, file, weight, style }], scenes,
 *         assets: [{ from, to }], sound: { music, voice, sfx } }
 * Same result shape as lib/film.mjs's writeFilm, so the CLI can use either.
 */
export function writeProject(dir, id, spec) {
  const { scenes, duration } = spec;
  assertBackToBack(scenes, duration);
  const fontFaces = spec.fonts.map(f => `@font-face{font-family:'${f.family}';src:url('fonts/${f.file}') format('woff2');font-weight:${f.weight ?? '100 900'};font-style:${f.style ?? 'normal'};font-display:block}`).join('\n');
  const fontLoads = spec.fonts.map(f => `${f.style === 'italic' ? 'italic ' : ''}${String(f.weight ?? 400).split(' ').at(-1)} 100px '${f.family}'`);
  const film = { bg: '#000', css: '', ...spec, fontFaces, fontLoads };

  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'compositions'), { recursive: true });
  for (const s of scenes) fs.writeFileSync(path.join(dir, 'compositions', `${s.id}.html`), sceneFile(s, film));
  fs.writeFileSync(path.join(dir, 'index.html'), rootFile(film, scenes));

  fs.mkdirSync(path.join(dir, 'fonts'), { recursive: true });
  for (const f of spec.fonts) fs.copyFileSync(path.join(SHARED, 'fonts', f.file), path.join(dir, 'fonts', f.file));
  for (const f of marksUsed(scenes.map(s => s.body).join('\n'))) {
    fs.mkdirSync(path.join(dir, 'assets/providers'), { recursive: true });
    fs.copyFileSync(path.join(MARKS_DIR, f), path.join(dir, 'assets/providers', f));
  }
  for (const a of spec.assets ?? []) {
    fs.mkdirSync(path.dirname(path.join(dir, a.to)), { recursive: true });
    fs.copyFileSync(a.from, path.join(dir, a.to));
  }

  const sound = mixdown({ out: path.join(dir, 'audio', 'mix.wav'), duration, ...spec.sound });

  fs.writeFileSync(path.join(dir, 'hyperframes.json'), JSON.stringify({
    $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
    paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
    media: { autoProxy: true },
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id, name: id }, null, 2) + '\n');
  return { ...spec, sound };
}
