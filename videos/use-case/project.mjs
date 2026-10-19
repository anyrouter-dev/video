/**
 * project: scenes to a HyperFrames project in the Clear look of
 * videos/explainer/frame.md (v2): a white page, Geist, shadcn surfaces at 2x,
 * one accent per moment. It shares nothing with lib/film.mjs's print look.
 *
 * The project is authored at 1920x1080. Every scene carries its portrait layout
 * under `@media (orientation: portrait)`, and the stage size appears only in the
 * root declarations shared/authoring/portrait.mjs rewrites, so that script turns
 * this project into the 1080x1920 rendition. Geometry that follows the stage is
 * read from the DOM at runtime, never written as a number.
 *
 *   index.html                 root: one host per scene, the score
 *   compositions/<scene>.html  one sub-composition per scene, back to back
 *   fonts/  assets/providers/  audio/mix.wav
 *
 * A scene is { id, start, dur, cls, body, inner, cues }: `body` is HTML, `inner`
 * is GSAP code run with tl, D, Q, $, $$ and has in scope once the fonts are in,
 * `cues` are sound effects at seconds into the scene.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SHARED } from '../../lib/paths.mjs';
import { MARKS_DIR, marksUsed } from '../../lib/marks.mjs';
import { writeSound } from '../../lib/sound.mjs';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const GSAP = 'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js';
const FONTS = ['geist.woff2', 'geist-mono.woff2'];

// frame.md tokens
export const C = {
  bg: '#FFFFFF', surface: '#FAFAFA', surface2: '#F5F5F5', ink: '#0A0A0A', ink2: '#3F3F46', muted: '#636363',
  line: '#E5E5E5', lineStrong: '#D4D4D8', primary: '#BB4D00', primaryTint: '#FFF4EC',
  termBg: '#0A0A0A', termBar: '#18181B', termInk: '#F4F4F5', termDim: '#A1A1AA', model: '#F0915A',
};

const BASE_CSS = `
  @font-face{font-family:'Geist';src:url('fonts/geist.woff2') format('woff2');font-weight:100 900;font-display:block}
  @font-face{font-family:'Geist Mono';src:url('fonts/geist-mono.woff2') format('woff2');font-weight:100 900;font-display:block}
  .uc{position:absolute;inset:0;overflow:hidden;background:${C.bg};color:${C.ink};
    font-family:'Geist',ui-sans-serif,system-ui,sans-serif;font-weight:400;
    -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
  .uc *{margin:0;padding:0;box-sizing:border-box}
  .mono{font-family:'Geist Mono',ui-monospace,Menlo,monospace}
  .w{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.14em;margin-bottom:-.14em}
  .w>span{display:inline-block}
  .card{background:${C.bg};border:2px solid ${C.line};border-radius:24px;box-shadow:0 2px 4px rgba(0,0,0,.05)}
  .badge{display:inline-flex;align-items:center;height:64px;padding:0 24px;border-radius:12px;
    font-size:36px;font-weight:500;line-height:1;white-space:nowrap}
  .badge.accent{background:${C.primaryTint};color:${C.primary}}
  .mk{display:block;flex:none;background-position:center;background-size:contain;background-repeat:no-repeat}`;

// Run inside every scene. Selectors are scoped to the scene: sub-compositions
// share one document, so a bare class would reach into another scene.
const HELPERS = `
    const Q = s => s.split(",").map(x => '[data-composition-id="' + ID + '"] ' + x.trim()).join(",");
    const $ = s => document.querySelector(Q(s));
    const $$ = s => Array.from(document.querySelectorAll(Q(s)));
    const has = s => $$(s).length > 0;`;

const sceneFile = (s, css) => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><title>${s.id}</title></head>
<body><template>
<style>${BASE_CSS}${css}</style>
<div id="root" data-composition-id="${s.id}" data-width="1920" data-height="1080" data-duration="${s.dur}">
  <div class="uc ${s.cls ?? ''}">${s.body}</div>
</div>
<script src="${GSAP}"></script>
<script>
  // Built once the fonts are in, because it places things by the boxes the
  // layout gives the text; registered only once it is whole. fonts.ready alone
  // resolves before a face is first asked for, so each face is loaded by name.
  Promise.all(["600 100px Geist", "400 100px Geist", "400 48px 'Geist Mono'"].map(f => document.fonts.load(f))).then(() => {
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
    background: ${C.bg};
  }
  #root {
    position: relative;
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: ${C.bg};
  }
  .clip{position:absolute;inset:0}
</style></head>
<body>
<div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-duration="${film.duration}" data-fps="30">
${scenes.map(s => `  <div id="clip-${s.id}" class="clip" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html"
       data-start="${s.start}" data-duration="${s.dur}" data-track-index="1" data-width="1920" data-height="1080"></div>`).join('\n')}
  <audio id="score" data-start="0" data-duration="${film.duration}" data-track-index="9" src="audio/mix.wav" data-volume="${film.volume}"></audio>
</div>
<script>
  // The root only mounts the scenes; each scene drives its own timeline.
  window.__timelines["main"] = gsap.timeline({ paused: true });
</script>
</body></html>
`;

/** Scenes must sit back to back: a gap is a blank frame, an overlap two layouts at once. */
function assertBackToBack(scenes, duration) {
  scenes.forEach((s, i) => {
    const next = i + 1 < scenes.length ? scenes[i + 1].start : duration;
    if (Math.abs(s.start + s.dur - next) > 1e-6) throw new Error(`scene ${s.id} ends at ${s.start + s.dur}, the next starts at ${next}`);
  });
}

/**
 * Write the project. `dir` is wiped first: a build is a freeze, not a merge.
 * Same arguments and result as lib/film.mjs's writeFilm, so the CLI can use either.
 */
export function writeProject(dir, id, spec) {
  const film = { palette: 'intro', volume: 0.5, css: '', ...spec };
  const { scenes, duration } = film;
  assertBackToBack(scenes, duration);

  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'compositions'), { recursive: true });
  for (const s of scenes) fs.writeFileSync(path.join(dir, 'compositions', `${s.id}.html`), sceneFile(s, film.css));
  fs.writeFileSync(path.join(dir, 'index.html'), rootFile(film, scenes));

  fs.mkdirSync(path.join(dir, 'fonts'), { recursive: true });
  for (const f of FONTS) fs.copyFileSync(path.join(SHARED, 'fonts', f), path.join(dir, 'fonts', f));
  for (const f of marksUsed(scenes.map(s => s.body).join('\n'))) {
    fs.mkdirSync(path.join(dir, 'assets/providers'), { recursive: true });
    fs.copyFileSync(path.join(MARKS_DIR, f), path.join(dir, 'assets/providers', f));
  }

  const cues = scenes.flatMap(s => (s.cues ?? []).map(c => ({ ...c, at: +(s.start + c.at).toFixed(3) })))
    .filter(c => c.at >= 0 && c.at < duration).sort((a, b) => a.at - b.at);
  const sound = writeSound(path.join(dir, 'audio', 'mix.wav'), { duration, palette: film.palette, cues });

  fs.writeFileSync(path.join(dir, 'hyperframes.json'), JSON.stringify({
    $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
    paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
    media: { autoProxy: true },
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id, name: id }, null, 2) + '\n');
  return { ...film, cues, sound };
}
