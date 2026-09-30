/**
 * film — turn a list of scenes into a HyperFrames project on disk.
 *
 * Every generated kind goes through here, so the rules the checker enforces are
 * obeyed once instead of once per kind:
 *
 *   index.html            root — mounts sub-compositions, owns the camera
 *   compositions/NN.html  one standalone composition per scene
 *   • the framework OWNS clip visibility — never tween autoAlpha/opacity on an
 *     element carrying data-start. Scenes animate #content, a child.
 *   • the root is built only from sub-compositions; scenes are not nested.
 *   • every font family has an @font-face, and every asset path is
 *     project-root-relative — fonts, score and marks are COPIED into the project
 *     because a path may not climb above the project root.
 *   • no scene outlives the next one (the overlap guard below).
 *
 * A kind supplies:  { title, duration, scenes: [{ id, start, dur, body, inner }],
 *                     css?, music?, assets?: [{ from, to }] }
 */
import fs from 'node:fs';
import path from 'node:path';
import { SHARED } from './paths.mjs';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Scene ids double as file names and DOM ids. */
export const slug = s => String(s).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

// ── the shared look: tokens, type, the backdrop ─────────────────────────
const BASE_CSS = `
  @font-face{font-family:'ArInter';src:url('fonts/inter.woff2') format('woff2-variations');
    font-weight:100 900;font-display:block}
  @font-face{font-family:'ArMono';src:url('fonts/mono.woff2') format('woff2-variations');
    font-weight:100 800;font-display:block}
  :root{--bg:#0A0A0A;--fg:#FAFAFA;--muted:#A1A1A1;--primary:#E87D45;--gold:#FFD230;--free:#00BC7D;
    --line:rgba(255,255,255,.10)}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'ArInter',Inter,system-ui,sans-serif;color:var(--fg);
    -webkit-font-smoothing:antialiased;perspective:2200px;transform-style:preserve-3d}
  .mono{font-family:'ArMono',ui-monospace,Menlo,monospace}
  .stage{position:relative;width:100%;height:100%;overflow:hidden;
    display:grid;place-items:center;transform-style:preserve-3d}
  .field{position:absolute;inset:-10%;background:
    radial-gradient(58% 48% at 20% 16%,rgba(232,125,69,.30),transparent 64%),
    radial-gradient(52% 44% at 84% 80%,rgba(96,72,225,.34),transparent 66%),var(--bg)}
  .mesh{position:absolute;inset:0;opacity:.5;background-image:
    linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:80px 80px;
    -webkit-mask-image:radial-gradient(68% 58% at 50% 50%,#000 18%,transparent 78%)}`;

// ── the two scenes every film shares: the opening flare and the closing CTA ──
const BOOKEND_CSS = `
  .flare{width:240px;height:240px;border-radius:50%;
    background:radial-gradient(circle,rgba(255,210,48,.92),rgba(232,125,69,.34) 44%,transparent 70%);
    filter:blur(16px)}
  .cta{text-align:center}
  .cta .k{font-size:21px;letter-spacing:.34em;text-transform:uppercase;color:var(--primary);font-weight:600}
  .cta .big{font-size:128px;font-weight:700;letter-spacing:-.05em;margin-top:24px;
    background:linear-gradient(96deg,#FAFAFA,#FFD230);-webkit-background-clip:text;
    background-clip:text;color:transparent}
  .cta .sub{font-size:31px;color:var(--muted);margin-top:26px}
  .cta .sub b{color:var(--fg)}
  .cta .cmd{margin:50px auto 0;display:inline-block;padding:22px 40px;border-radius:16px;
    background:rgba(255,255,255,.05);border:1px solid var(--line);
    font-family:'ArMono',monospace;font-size:27px}
  .c1{color:#B392F0}.c2{color:#9ECBFF}.c3{color:#79B8FF}`;

export const IGNITE = 1.88;   // where the first content scene starts
export const CTA = 2.2;       // how long the closing scene holds

/** The opening flare. Always scene 0. */
export const igniteScene = () => ({
  id: 's00-ignite', start: 0, dur: IGNITE,
  body: `<div class="flare" id="flare"></div>`,
  inner: `tl.fromTo("#content",{scale:.2,opacity:0},{scale:1.5,opacity:1,duration:1.5,ease:"expo.out"},0);
   tl.to("#content",{scale:2.6,opacity:0,duration:.34,ease:"power2.in"},1.5);`,
});

/** The closing call to action. `kicker`, `big` and `sub` are HTML — escape facts before passing them. */
export const ctaScene = (duration, { kicker, big, sub }) => ({
  id: 's99-cta', start: duration - CTA, dur: CTA,
  body: `<div class="cta">
  <div class="k">${kicker}</div>
  <div class="big">${big}</div>
  <div class="sub">${sub}</div>
  <div class="cmd"><span class="c1">curl</span>
    <span class="c2">-fsSL https://anyrouter.dev/setup.sh</span>
    <span class="c3">|</span> <span class="c3">bash</span></div>
</div>`,
  inner: `tl.from("#content > .cta > *",{opacity:0,y:44,stagger:.07,duration:.36,ease:"expo.out"},0);
   tl.from("#content .cmd",{scale:.9,opacity:0,duration:.30,ease:"back.out(1.6)"},.22);`,
});

const sceneFile = (s, css) => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>${s.id}</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>${css}</style></head>
<body>
<div id="root" data-composition-id="${s.id}" data-width="1920" data-height="1080"
     data-duration="${s.dur}" data-fps="30">
  <div class="stage" id="stage">
    <div class="field" data-layout-allow-overflow></div><div class="mesh"></div>
    <div id="content">${s.body}</div>
  </div>
</div>
<script>
  // Animate #content, never the clip host — the framework owns clip visibility.
  const tl = gsap.timeline({ paused: true });
  tl.set("#content", { transformOrigin: "50% 50%" });
  ${s.inner}
  window.__timelines["${s.id}"] = tl;
</script>
</body></html>`;

/**
 * HARD GUARD: clamp every scene so it ends at or before the next one begins.
 * Overlapping scenes are what produced "content_overlap ... may render
 * unreadable" — two full layouts on screen at once. Returns the scenes in
 * timeline order; a clamped scene carries a `warn`.
 */
export function clampScenes(scenes, duration) {
  const out = scenes.map(s => ({ ...s })).sort((a, b) => a.start - b.start);
  for (let i = 0; i < out.length; i++) {
    const next = i + 1 < out.length ? out[i + 1].start : duration;
    if (out[i].start + out[i].dur > next + 1e-6) {
      out[i].warn = `clamped ${out[i].dur.toFixed(3)}s → ${(next - out[i].start).toFixed(3)}s (would overlap ${out[i + 1]?.id ?? 'the end'})`;
      out[i].dur = +(next - out[i].start).toFixed(3);
    }
  }
  return out;
}

const rootFile = (film, scenes) => {
  const D = film.duration;
  const camPunches = scenes.map(s =>
    `tl.fromTo("#root",{scale:1.052},{scale:1,duration:.5,ease:"expo.out",overwrite:"auto"},${s.start});`).join('\n  ');
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>${esc(film.title)}</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1920px;height:1080px;overflow:hidden;background:#0A0A0A;perspective:2200px}
  #root{position:relative;width:1920px;height:1080px;overflow:hidden;
    transform-style:preserve-3d;will-change:transform}
  .clip{position:absolute;inset:0}
  .field{position:absolute;inset:-10%;background:
    radial-gradient(58% 48% at 20% 16%,rgba(232,125,69,.15),transparent 62%),
    radial-gradient(52% 44% at 84% 80%,rgba(86,64,210,.17),transparent 64%),#0A0A0A}
  .mesh{position:absolute;inset:0;opacity:.26;background-image:
    linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:80px 80px;
    -webkit-mask-image:radial-gradient(68% 58% at 50% 50%,#000 18%,transparent 78%)}
</style></head>
<body>
<div id="root" data-composition-id="main" data-width="1920" data-height="1080"
     data-duration="${D}" data-fps="30">
  <div class="field" data-layout-allow-overflow></div>
  <div class="mesh"></div>
${scenes.map(s => `  <div id="clip-${s.id}" class="clip" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html"
       data-start="${s.start}" data-duration="${s.dur}"></div>`).join('\n')}
  <audio id="music" data-start="0" data-duration="${D}" data-track-index="9"
         src="${film.music}" data-volume="1"></audio>
</div>
<script>
  // The camera lives on #root: a continuous slow push plus a punch on every
  // scene, and a slow 3D orbit so the frame is never fully static.
  const tl = gsap.timeline({ paused: true });
  tl.set("#root", { scale: 1.17, rotateY: -6.5, rotateX: 2.2 }, 0);
  tl.to("#root", { scale: 1.05, duration: ${(D * 0.55).toFixed(2)}, ease: "sine.inOut", overwrite: false }, 0);
  tl.to("#root", { rotateY: 3.4, rotateX: -1.6, duration: ${(D / 2).toFixed(2)}, ease: "sine.inOut", overwrite: false }, 0);
  tl.to("#root", { rotateY: -3.4, rotateX: 1.6, duration: ${(D / 2).toFixed(2)}, ease: "sine.inOut", overwrite: false }, ${(D / 2).toFixed(2)});
  ${camPunches}
  window.__timelines["main"] = tl;
</script>
</body></html>
`;
};

/**
 * Write the project. `dir` is wiped first: a build is a freeze, not a merge, so
 * no scene from a previous film can survive into this one.
 */
export function writeFilm(dir, id, spec) {
  const film = { music: 'audio/score.wav', css: '', assets: [], ...spec };
  const scenes = clampScenes(film.scenes, film.duration);
  const css = BASE_CSS + film.css + BOOKEND_CSS;

  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'compositions'), { recursive: true });
  for (const s of scenes) fs.writeFileSync(path.join(dir, 'compositions', `${s.id}.html`), sceneFile(s, css));
  fs.writeFileSync(path.join(dir, 'index.html'), rootFile(film, scenes));

  fs.cpSync(path.join(SHARED, 'fonts'), path.join(dir, 'fonts'), { recursive: true });
  const copy = (from, to) => {
    fs.mkdirSync(path.dirname(path.join(dir, to)), { recursive: true });
    fs.copyFileSync(from, path.join(dir, to));
  };
  copy(path.join(SHARED, film.music), film.music);
  for (const a of film.assets) copy(a.from, a.to);

  fs.writeFileSync(path.join(dir, 'hyperframes.json'), JSON.stringify({
    $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
    paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
    media: { autoProxy: true },
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id, name: id }, null, 2) + '\n');

  return { ...film, scenes };
}
