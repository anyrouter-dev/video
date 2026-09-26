#!/usr/bin/env node
/**
 * model-drop :: generate
 *
 * Writes a HyperFrames project from release/release.json. This is what makes the
 * video PARAMETRIC: a composition is static HTML, so "1 model" and "7 models"
 * are one template choosing a different layout and scene count.
 *
 *   N = 1        hero      one model, full frame, deep push-in
 *   N = 2..4     cards     that many cards, swapped on the beat
 *   N >= 5      list      ranked rows, tight stagger
 *
 * Architecture (required by lint, learned the hard way):
 *   index.html            root — mounts sub-compositions, owns the camera
 *   compositions/NN.html  one standalone composition per scene
 *   • the framework OWNS clip visibility — never tween autoAlpha/opacity on an
 *     element carrying data-start. Animate the child instead.
 *   • the root is built only from sub-compositions; scenes are not nested.
 *   • every font family needs an @font-face (src: local() is not enough if the
 *     renderer cannot supply the file).
 *
 *   node release/generate.mjs                → from release/release.json
 *   node release/generate.mjs --limit=1      → force the hero layout
 *   node release/generate.mjs --seconds=15
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const COMPS = path.join(ROOT, 'compositions');
const argv = process.argv.slice(2);
const val = (k, d) => (argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];

const rel = JSON.parse(fs.readFileSync(path.join(HERE, 'release.json'), 'utf8'));
const limit = parseInt(val('limit', '0'), 10);
const DURATION = parseFloat(val('seconds', '20'));
const music = val('music', 'audio/score.wav');

let models = rel.incoming?.length ? rel.incoming : rel.spotlight ? [rel.spotlight] : [];
if (limit > 0) models = models.slice(0, limit);
if (!models.length) {
  console.error('FAIL: no models. Run: node release/fetch.mjs');
  process.exit(1);
}
const LAYOUT = models.length === 1 ? 'hero' : models.length <= 4 ? 'cards' : 'list';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Provider marks are copied INTO the project: an asset path may not traverse
// above the project root, and the repo's public/providers/ is outside it.
const ASSET_PROVIDERS = path.join(ROOT, 'assets/providers');
const logo = m => (m.logo ? `<img class="lg" src="assets/providers/${m.logo}" alt="">` : `<span class="lgdot"></span>`);
const price = m => (m.free ? '$0' : `$${m.inPrice.toFixed(2)}`);
// Below 1M, "0.0M" throws away the number entirely (a 32k window read as 0.0M).
const fmtCtx = n => {
  if (!n) return '—';
  if (n >= 1e6) return `${+(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(0)}K`;
  return String(n);
};
const ctx = m => fmtCtx(m.context);

fs.rmSync(COMPS, { recursive: true, force: true });
fs.mkdirSync(COMPS, { recursive: true });
fs.rmSync(ASSET_PROVIDERS, { recursive: true, force: true });
fs.mkdirSync(ASSET_PROVIDERS, { recursive: true });
for (const m of models) {
  if (!m.logo) continue;
  const src = path.resolve(ROOT, 'assets/providers-src', m.logo);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(ASSET_PROVIDERS, m.logo));
}

// ── shared CSS + the per-scene timeline factory ─────────────────────────
const CSS = `
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
    -webkit-mask-image:radial-gradient(68% 58% at 50% 50%,#000 18%,transparent 78%)}
  .card{width:min(1440px,90vw);background:linear-gradient(180deg,#171717,#101010);
    border:1px solid var(--line);border-radius:32px;padding:70px 80px;
    box-shadow:0 60px 150px rgba(0,0,0,.72);transform-style:preserve-3d}
  .lrow{display:flex;align-items:center;gap:18px;margin-bottom:24px}
  .lg{width:68px;height:68px;object-fit:contain}
  .lgdot{width:68px;height:68px;border-radius:50%;background:linear-gradient(140deg,var(--primary),var(--gold))}
  .prov{font-size:20px;letter-spacing:.30em;text-transform:uppercase;color:var(--primary);font-weight:600}
  .rank{margin-left:auto;font-size:62px;font-weight:700;letter-spacing:-.05em;color:rgba(255,255,255,.38)}
  .name{font-size:118px;font-weight:700;letter-spacing:-.045em;line-height:.94}
  .mid{font-family:'ArMono',monospace;font-size:30px;color:var(--gold);margin-top:18px}
  .stats{display:flex;gap:60px;margin-top:44px}
  .stat b{display:block;font-family:'ArMono',monospace;font-size:78px;font-weight:700;
    letter-spacing:-.05em}
  .stat i{display:block;font-style:normal;font-size:16px;letter-spacing:.22em;
    text-transform:uppercase;color:var(--muted);margin-top:10px}
  .ex{font-size:25px;line-height:1.45;color:var(--muted);margin-top:36px;max-width:62ch}
  .row3{display:flex;gap:36px;margin-top:24px;font-family:'ArMono',monospace;font-size:27px;color:var(--muted)}
  .row3 .free{color:var(--free)}
  .card.compact{width:min(1320px,86vw);padding:58px 68px}
  .card.compact .name{font-size:86px}
  .card.compact .mid{font-size:26px;margin-top:16px}
  .card.compact .rank{font-size:56px}
  .card.compact .stats{gap:56px;margin-top:34px}
  .card.compact .stat b{font-size:58px}
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

const sceneFile = (id, dur, body, inner) => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>${id}</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>${CSS}</style></head>
<body>
<div id="root" data-composition-id="${id}" data-width="1920" data-height="1080"
     data-duration="${dur}" data-fps="30">
  <div class="stage" id="stage">
    <div class="field" data-layout-allow-overflow></div><div class="mesh"></div>
    <div id="content">${body}</div>
  </div>
</div>
<script>
  // Animate #content, never the clip host — the framework owns clip visibility.
  const tl = gsap.timeline({ paused: true });
  tl.set("#content", { transformOrigin: "50% 50%" });
  ${inner}
  window.__timelines["${id}"] = tl;
</script>
</body></html>`;

// ── build the scenes ───────────────────────────────────────────────────
const scenes = [];
const push = (id, start, dur, body, inner) => scenes.push({ id, start, dur, body, inner });

// ignite
push('s00-ignite', 0, 1.88, `<div class="flare" id="flare"></div>`,
  `tl.fromTo("#content",{scale:.2,opacity:0},{scale:1.5,opacity:1,duration:1.5,ease:"expo.out"},0);
   tl.to("#content",{scale:2.6,opacity:0,duration:.34,ease:"power2.in"},1.5);`);

if (LAYOUT === 'hero') {
  const m = models[0];
  push('s01-hero', 1.88, DURATION - 1.88, `<div class="card">
    <div class="lrow">${logo(m)}<span class="prov">${esc(m.provider)}</span></div>
    <h1 class="name">${esc(m.name)}</h1>
    <div class="mid">${esc(m.id)}</div>
    <div class="stats">
      <div class="stat"><b>${price(m)}</b><i>in / 1M</i></div>
      <div class="stat"><b>${ctx(m)}</b><i>context</i></div>
      <div class="stat"><b>${rel.totals.listed}</b><i>in catalog</i></div>
    </div>
    ${m.excerpt ? `<p class="ex">${esc(m.excerpt)}</p>` : ''}
  </div>`,
    `tl.from("#content > .card",{scale:.84,rotateY:-32,z:-460,duration:.44,ease:"expo.out"},0);
     tl.from("#content .name",{y:56,duration:.38,ease:"power3.out"},.10);
     tl.from("#content .lrow,#content .mid,#content .stats .stat,#content .ex",
        {opacity:0,y:30,stagger:.05,duration:.32,ease:"power3.out"},.18);`);
} else {
  const CARD_FROM = 1.88, CTA_AT = +(DURATION - 2.2).toFixed(3);
  const slot = +((CTA_AT - CARD_FROM) / models.length).toFixed(3);
  models.forEach((m, i) => {
    const start = +(CARD_FROM + i * slot).toFixed(3);
    const dur = slot;                       // back-to-back: end == next start
    const nm = esc(m.id).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    push(`s${String(i + 1).padStart(2, '0')}-${nm}`, start, dur, `<div class="card compact">
      <div class="lrow">${logo(m)}<span class="prov">${esc(m.provider)}</span>
        <span class="rank">${String(i + 1).padStart(2, '0')}</span></div>
      <h2 class="name">${esc(m.name)}</h2>
      <div class="mid">${esc(m.id)}</div>
      <div class="row3"><span>${price(m)} in</span><span>${ctx(m)} ctx</span>
        ${m.free ? '<span class="free">$0 out</span>' : `<span>$${m.outPrice.toFixed(2)} out</span>`}</div>
    </div>`,
      `tl.from("#content > .card",{scale:.82,rotateY:-34,z:-440,duration:.40,ease:"expo.out"},0);
       tl.from("#content .name,#content .mid,#content .row3 span,#content .lrow",
          {opacity:0,y:26,stagger:.045,duration:.30,ease:"power3.out"},.12);
       tl.to("#content > .card",{scale:1.10,rotateY:22,duration:.16,ease:"power2.in"},
          ${Math.max(0, dur - 0.16).toFixed(3)});`);
  });
}

push('s99-cta', DURATION - 2.2, 2.2, `<div class="cta">
  <div class="k">${models.length === 1 ? 'New on AnyRouter' : `${models.length} new models`}</div>
  <div class="big">${models.length === 1 ? esc(models[0].id) : 'on one key'}</div>
  <div class="sub"><b>${rel.totals.listed}</b> models · <b>${rel.totals.providers}+</b> providers ·
    <b>${rel.totals.free}</b> at $0</div>
  <div class="cmd"><span class="c1">curl</span>
    <span class="c2">-fsSL https://anyrouter.dev/setup.sh</span>
    <span class="c3">|</span> <span class="c3">bash</span></div>
</div>`,
  `tl.from("#content > .cta > *",{opacity:0,y:44,stagger:.07,duration:.36,ease:"expo.out"},0);
   tl.from("#content .cmd",{scale:.9,opacity:0,duration:.30,ease:"back.out(1.6)"},.22);`);

// HARD GUARD: clamp every scene so it ends at or before the next one begins.
// Overlapping scenes are what produced "content_overlap ... may render
// unreadable" — two full layouts on screen at once.
scenes.sort((a, b) => a.start - b.start);
for (let i = 0; i < scenes.length; i++) {
  const next = i + 1 < scenes.length ? scenes[i + 1].start : DURATION;
  if (scenes[i].start + scenes[i].dur > next - 1e-6) {
    scenes[i].warn = `clamped ${scenes[i].dur.toFixed(3)}s → ${(next - scenes[i].start).toFixed(3)}s (would overlap ${scenes[i + 1]?.id ?? 'the end'})`;
    scenes[i].dur = +(next - scenes[i].start).toFixed(3);
  }
}

for (const s of scenes) {
  if (s.warn) console.log(`  clamped  ${s.id}: ${s.warn}`);
  fs.writeFileSync(path.join(COMPS, `${s.id}.html`), sceneFile(s.id, s.dur, s.body, s.inner));
}

// ── the root: mounts the sub-compositions and owns the camera ──────────
const camPunches = scenes.map(s =>
  `tl.fromTo("#root",{scale:1.052},{scale:1,duration:.5,ease:"expo.out",overwrite:"auto"},${s.start});`).join('\n  ');

const index = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>AnyRouter — model drop</title>
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
     data-duration="${DURATION}" data-fps="30">
  <div class="field" data-layout-allow-overflow></div>
  <div class="mesh"></div>
${scenes.map(s => `  <div id="clip-${s.id}" class="clip" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html"
       data-start="${s.start}" data-duration="${s.dur}"></div>`).join('\n')}
  <audio id="music" data-start="0" data-duration="${DURATION}" data-track-index="9"
         src="${music}" data-volume="1"></audio>
</div>
<script>
  // The camera lives on #root: a continuous slow push plus a punch on every
  // scene, and a slow 3D orbit so the frame is never fully static.
  const tl = gsap.timeline({ paused: true });
  tl.set("#root", { scale: 1.17, rotateY: -6.5, rotateX: 2.2 }, 0);
  tl.to("#root", { scale: 1.05, duration: ${(DURATION * 0.55).toFixed(2)}, ease: "sine.inOut", overwrite: false }, 0);
  tl.to("#root", { rotateY: 3.4, rotateX: -1.6, duration: ${(DURATION / 2).toFixed(2)}, ease: "sine.inOut", overwrite: false }, 0);
  tl.to("#root", { rotateY: -3.4, rotateX: 1.6, duration: ${(DURATION / 2).toFixed(2)}, ease: "sine.inOut", overwrite: false }, ${(DURATION / 2).toFixed(2)});
  ${camPunches}
  window.__timelines["main"] = tl;
</script>
</body></html>
`;

fs.writeFileSync(path.join(ROOT, 'index.html'), index);

console.log(`layout      ${LAYOUT}  (${models.length} model${models.length === 1 ? '' : 's'})`);
console.log(`duration    ${DURATION}s @30fps = ${Math.round(DURATION * 30)} frames`);
console.log(`scenes      ${scenes.length} sub-compositions`);
console.log(`models      ${models.map(m => m.id).join(', ')}`);
console.log(`\nnext:  npm run check   →   npm run render`);
