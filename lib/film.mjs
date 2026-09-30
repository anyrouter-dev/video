/**
 * film — turn a list of scenes into a HyperFrames project on disk, in the
 * AnyRouter print look.
 *
 * THE LOOK is anyrouter.dev's: warm paper, ink, one signal colour, and texture
 * made of dots — never a glow or a gradient. Everything that makes it a *film*
 * rather than a web page is ordered dither (Bayer 8×8): the backdrop breathes
 * in dithered ink, every cut is a dither wipe, the brand mark prints itself in
 * dots. Hard dotted shadows, 2px ink rules, mono labels, big tight type.
 *
 * THE PROJECT this writes:
 *
 *   index.html                 root — mounts layers, nothing else
 *   compositions/bg.html       the dithered backdrop          (track 0, whole film)
 *   compositions/<scene>.html  one sub-composition per scene  (track 1, back-to-back)
 *   compositions/fx.html       cut wipes + the frame chrome   (track 2, whole film)
 *   audio/mix.wav              the score + effects, made for this film (lib/sound.mjs)
 *
 * Rules the checker enforces, obeyed here once instead of once per kind:
 *   • the framework OWNS clip visibility — nothing tweens autoAlpha/opacity on a
 *     host carrying data-start. Scenes animate their own children.
 *   • the root is built only from sub-compositions.
 *   • every font family has an @font-face, and every asset path is
 *     project-root-relative — fonts and marks are COPIED into the project.
 *   • no scene outlives the next one (clampScenes).
 *
 * A kind supplies:
 *   { title, duration, tone?, palette?, label?, css?, assets?: [{ from, to }],   (provider marks
 *     a scene references are copied in automatically — see lib/marks.mjs)
 *     scenes: [{ id, start, dur, body, inner, chapter?, cam?, cues? }] }
 *
 *   tone     'org' | 'indigo' | 'teal' | 'green' — the film's one signal colour
 *   palette  which score lib/sound.mjs plays ('drop', 'release', 'changelog')
 *   label    the kind name in the frame chrome, e.g. "MODEL DROP"
 *   chapter  what the frame chrome calls this scene, e.g. "02 / 05 · GPT-6.1 SOL"
 *   cam      { from, to } — the slow camera on this scene's `.cam`; false = none
 *   cues     [{ at, kind }] — sound effects, `at` relative to the scene start
 *
 * A scene's `inner` is GSAP code run inside the scene with these in scope:
 *   tl, D (scene seconds), Q(sel) (scope a selector to this scene), $, $$,
 *   rise(sel, t)   word masks (`words()`) rise into place
 *   stamp(sel, t)  boxes land with their dotted shadow growing under them
 *   slide(sel, t, from)   enter from an offset
 *   grow(sel, t)   halftone bars print left→right in steps
 *   type(sel, t)   characters (`chars()`) appear one by one
 *   count(sel, to, t, d, fmt)   a number counts up
 *   zoom(sel, t, d, vars)       any camera move on an element
 */
import fs from 'node:fs';
import path from 'node:path';
import { SHARED } from './paths.mjs';
import { writeSound } from './sound.mjs';
import { MARKS_DIR, marksUsed, markImg } from './marks.mjs';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Scene ids double as file names and DOM ids. */
export const slug = s => String(s).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

/** Each word in its own mask, so `rise` can lift it into place. The text is escaped here. */
export const words = s => String(s ?? '').split(/\s+/).filter(Boolean)
  .map(w => `<span class="w"><span>${esc(w)}</span></span>`).join(' ');

/** Each character in its own span, so `type` can print it. The text is escaped here. */
export const chars = s => [...String(s ?? '')]
  .map(c => `<span class="c">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');

/** First class whose length limit fits the text: fit(name, [[14,'xl'],[24,'l']], 'm'). */
export const fit = (text, steps, fallback) =>
  (steps.find(([n]) => String(text).length <= n) ?? [0, fallback])[1];

export const BEAT = 0.5;      // 120 BPM — cuts sit on this grid
export const OPEN = 2.0;      // the opening print: one bar
export const END = 3.0;       // the closing card

// ── tokens: anyrouter.dev's palette, taken from its stylesheet ─────────────
// paper oklch(97% .012 85) · ink oklch(14.5% 0 0) · primary oklch(55.5% .163 49)
// dither-2/3/4 oklch(52% .09 195) / (50% .13 275) / (52% .1 140)
export const TONES = {
  org: { dot: '#C2560F', ink: '#A84600', rgb: [194, 86, 15] },
  indigo: { dot: '#4F5BB5', ink: '#3F4AA0', rgb: [79, 91, 181] },
  teal: { dot: '#1B7479', ink: '#15656A', rgb: [27, 116, 121] },
  green: { dot: '#3D7A33', ink: '#33692B', rgb: [61, 122, 51] },
};
const PAPER = [247, 244, 236], INK = [10, 10, 10];

const baseCss = tone => `
  @font-face{font-family:'ArInter';src:url('fonts/inter.woff2') format('woff2-variations');
    font-weight:100 900;font-display:block}
  @font-face{font-family:'ArMono';src:url('fonts/mono.woff2') format('woff2-variations');
    font-weight:100 800;font-display:block}
  :root{--paper:#F7F4EC;--face:#FFFFFF;--ink:#0A0A0A;--ink2:#545454;--rule:#0A0A0A;
    --tone:${TONES[tone].dot};--tone-ink:${TONES[tone].ink};--free:${TONES.green.ink}}
  *{margin:0;padding:0;box-sizing:border-box}
  .stage{position:absolute;inset:0;overflow:hidden;color:var(--ink);
    font-family:'ArInter',Inter,system-ui,sans-serif;font-weight:500;-webkit-font-smoothing:antialiased}
  .cam{position:absolute;inset:0;padding:150px 150px 140px;display:flex;flex-direction:column;
    justify-content:center;transform-style:preserve-3d;transform-origin:50% 50%}
  .mono{font-family:'ArMono',ui-monospace,Menlo,monospace}

  /* type */
  .kicker{font-family:'ArMono',monospace;font-size:24px;font-weight:700;letter-spacing:.14em;
    text-transform:uppercase;color:var(--tone-ink)}
  .kicker i{font-style:normal;color:var(--ink);margin-right:16px}
  .h1{font-size:156px;font-weight:800;letter-spacing:-.058em;line-height:.98}
  .h2{font-size:104px;font-weight:800;letter-spacing:-.052em;line-height:1.0}
  .h3{font-size:68px;font-weight:750;letter-spacing:-.04em;line-height:1.08}
  .h4{font-size:50px;font-weight:700;letter-spacing:-.03em;line-height:1.16}
  .lede{font-size:36px;font-weight:500;line-height:1.36;color:var(--ink2);max-width:46ch;text-wrap:pretty}
  .hl{color:var(--tone-ink)}
  .w{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.12em;margin-bottom:-.12em}
  .w>span{display:inline-block}
  .c{display:inline-block}
  .num{font-family:'ArMono',monospace;font-weight:800;letter-spacing:-.04em;line-height:1}
  .label{font-family:'ArMono',monospace;font-size:18px;font-weight:700;letter-spacing:.16em;
    text-transform:uppercase;color:var(--ink2)}

  /* surfaces: a white face, a 2px ink rule, a hard shadow made of dots */
  .box{position:relative;isolation:isolate;--sh:1}
  .box::before{content:"";position:absolute;inset:0;z-index:0;
    transform:translate(calc(var(--sh) * 14px),calc(var(--sh) * 14px));
    background-image:radial-gradient(circle,var(--ink) 1.2px,transparent 1.5px);background-size:5px 5px}
  .face{position:relative;z-index:1;background:var(--face);border:2px solid var(--rule);border-radius:6px}
  .box.inv .face{background:var(--ink);color:var(--paper)}
  .box.tone::before{background-image:radial-gradient(circle,var(--tone) 1.3px,transparent 1.6px)}
  .rule{height:2px;background:var(--rule);transform-origin:0 50%}
  .dots{background-image:radial-gradient(circle,var(--tone) 1.3px,transparent 1.6px);background-size:5px 5px}
  .dots-ink{background-image:radial-gradient(circle,var(--ink) 1.15px,transparent 1.45px);background-size:5px 5px}
  .dots-grey{background-image:radial-gradient(circle,#8A8A8A 1.1px,transparent 1.4px);background-size:4px 4px}
  .track{position:relative;height:28px;border:2px solid var(--rule);background:var(--face)}
  .bar{position:absolute;left:0;top:0;bottom:0;transform-origin:0 50%;border-right:3px solid var(--tone)}
  .pill{display:inline-flex;align-items:center;gap:10px;height:48px;padding:0 18px;border:2px solid var(--rule);
    border-radius:999px;background:var(--face);font-family:'ArMono',monospace;font-size:21px;font-weight:700}
  .pill.free{border-color:var(--free);color:var(--free)}
  .pill.hot{background:var(--ink);color:var(--paper)}
  .mark{display:block;object-fit:contain}
  .tile{width:112px;height:112px;flex:none}
  .tile .face{width:100%;height:100%;display:grid;place-items:center}
  .tile .mark{width:64px;height:64px}
  .mono-mark{display:grid;place-items:center;width:64px;height:64px;font-family:'ArMono',monospace;font-size:26px;
    font-weight:800;letter-spacing:-.02em;color:var(--ink);border:2px solid var(--rule);background-color:var(--face);
    background-image:radial-gradient(circle,var(--tone) 1px,transparent 1.3px);background-size:5px 5px}
  .end .marks{display:flex;gap:14px;margin-top:40px;justify-content:center}
  .end .marks .tile{width:74px;height:74px}
  .end .marks .tile .mark{width:40px;height:40px}
  .ldot{width:64px;height:64px;border-radius:50%;background-image:radial-gradient(circle,var(--tone) 2px,transparent 2.4px);
    background-size:6px 6px;border:2px solid var(--rule)}

  /* the bookends */
  .open{align-items:center;text-align:center}
  .open canvas{pointer-events:none;position:absolute;left:0;top:0;width:1920px;height:1080px;image-rendering:pixelated}
  .open .slate{position:absolute;left:0;right:0;top:720px;display:flex;flex-direction:column;align-items:center;gap:22px}
  .open .slate .rule{width:520px}
  .open .slate .kicker{font-size:28px}
  .open .slate .meta{font-family:'ArMono',monospace;font-size:22px;font-weight:600;color:var(--ink2);letter-spacing:.08em}
  .end{align-items:center;text-align:center;gap:0}
  .end .lock{display:flex;align-items:center;gap:22px}
  .end .lock svg{width:92px;height:92px;display:block}
  .end .lock b{font-size:84px;font-weight:800;letter-spacing:-.05em}
  .end .kicker{margin-top:54px}
  .end .big{font-size:88px;font-weight:800;letter-spacing:-.05em;line-height:1.02;margin-top:18px;max-width:22ch;text-wrap:balance}
  .end .sub{font-family:'ArMono',monospace;font-size:26px;font-weight:600;color:var(--ink2);margin-top:26px}
  .end .sub b{color:var(--ink)}
  .end .cmd{margin-top:54px}
  .end .cmd .face{padding:24px 40px;font-family:'ArMono',monospace;font-size:30px;font-weight:600;border-radius:6px}
  .end .cmd .p{color:var(--tone)}.end .cmd .u{color:#FFFFFF}.end .cmd .o{color:#A3A3A3}`;

// ── the brand mark, inlined so it can be drawn as DOM and as a dither mask ──
const LOGO_SVG = fs.readFileSync(path.join(SHARED, 'assets/brand/anyrouter-logo-currentcolor.svg'), 'utf8');
const LOGO_PATHS = [...LOGO_SVG.matchAll(/ d="([^"]+)"/g)].map(m => m[1]);
const logo = () => LOGO_SVG.replace(/<\?xml[^>]*>/, '').trim();

/**
 * The opening: the brand mark prints itself in dither, a rule draws, the slate
 * types. Always scene 0. `kicker` and `meta` are plain text.
 */
export const openScene = ({ kicker, meta }) => ({
  id: 's00-open', start: 0, dur: OPEN, cam: false, chapter: 'OPEN',
  body: `<div class="open-host"><canvas class="lg" width="480" height="270"></canvas></div>
  <div class="slate"><div class="rule"></div>
    <div class="kicker">${chars(kicker)}</div>
    ${meta ? `<div class="meta">${chars(meta)}</div>` : ''}</div>`,
  cls: 'open',
  inner: `
    // Bayer 8×8 ordered dither: the mark appears as its dots cross a rising threshold.
    const cv = $(".lg"), g = cv.getContext("2d"), W = cv.width, H = cv.height;
    let m = [[0]];
    for (let n = 1; n < 8; n *= 2) { const r = [];
      for (let y = 0; y < n * 2; y++) { r.push([]); for (let x = 0; x < n * 2; x++)
        r[y][x] = 4 * m[y % n][x % n] + [0, 2, 3, 1][(y < n ? 0 : 2) + (x < n ? 0 : 1)]; }
      m = r; }
    const mk = document.createElement("canvas"); mk.width = W; mk.height = H;
    const mx = mk.getContext("2d"), S = 118, K = S / 801.34;
    mx.translate(W / 2 - S / 2 - 203.66 * K, H * 0.40 - S / 2 - 206.57 * K); mx.scale(K, K);
    mx.translate(0, 1254); mx.scale(0.1, -0.1); mx.fillStyle = "#000";
    ${JSON.stringify(LOGO_PATHS)}.forEach(d => mx.fill(new Path2D(d)));
    const M = mx.getImageData(0, 0, W, H).data, img = g.createImageData(W, H), P = img.data;
    const T = [${TONE_PLACEHOLDER}];
    const draw = (on, grain) => { P.fill(0);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, o = i * 4, th = (m[y & 7][x & 7] + 0.5) / 64;
        const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453, n = h - Math.floor(h);
        if (M[o + 3] > 128 && on > th) { P[o] = 10; P[o + 1] = 10; P[o + 2] = 10; P[o + 3] = 255; }
        else if (M[o + 3] > 128 && on * 1.6 > th) { P[o] = T[0]; P[o + 1] = T[1]; P[o + 2] = T[2]; P[o + 3] = 255; }
        else if (n < grain * 0.16) { P[o] = T[0]; P[o + 1] = T[1]; P[o + 2] = T[2]; P[o + 3] = 150; } }
      g.putImageData(img, 0, 0); };
    const st = { on: 0, grain: 1 };
    tl.fromTo(st, { on: 0, grain: 1 }, { on: 1.02, grain: 0, duration: 1.0, ease: "power2.inOut",
      onUpdate: () => draw(st.on, st.grain) }, 0.05);
    tl.fromTo(Q(".slate .rule"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "expo.out" }, 0.55);
    type(".slate .kicker .c", 0.7, 0.012);
    type(".slate .meta .c", 0.95, 0.01);
    tl.fromTo(Q(".lg"), { scale: 1 }, { scale: 1.08, duration: ${OPEN}, ease: "none" }, 0);`,
  cues: [{ at: 0.05, kind: 'rise' }, { at: 1.05, kind: 'hit' }],
});
const TONE_PLACEHOLDER = '__TONE_RGB__';

/**
 * The closing card: the lockup, the claim, the facts under it, a row of the
 * providers' marks (`marks`: files from lib/marks.mjs), the install line.
 * `kicker` is plain text; `big` and `sub` are HTML — escape facts before passing them.
 */
export const endScene = (duration, { kicker, big, sub, marks = [] }) => ({
  id: 's99-end', start: +(duration - END).toFixed(3), dur: END, chapter: 'ANYROUTER.DEV', cls: 'end',
  cam: { from: { scale: 1.06 }, to: { scale: 1 } },
  body: `<div class="lock">${logo()}<b>AnyRouter</b></div>
  <div class="kicker">${esc(kicker)}</div>
  <div class="big">${big}</div>
  ${sub ? `<div class="sub">${sub}</div>` : ''}
  ${marks.length ? `<div class="marks">${marks.slice(0, 12).map(f => `<div class="tile box"><div class="face">${markImg(f)}</div></div>`).join('')}</div>` : ''}
  <div class="cmd box tone"><div class="face" style="background:var(--ink);border-color:var(--ink)"><span class="p">$</span>
    <span class="u">curl -fsSL https://anyrouter.dev/setup.sh</span> <span class="o">|</span> <span class="u">bash</span></div></div>`,
  inner: `
    tl.fromTo(Q(".lock"), { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, 0.1);
    tl.fromTo(Q(".kicker"), { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.4 }, 0.3);
    tl.fromTo(Q(".big, .sub"), { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: "expo.out" }, 0.4);
    stamp(".marks .tile", 0.55, 0.04);
    stamp(".cmd", 0.8);`,
  cues: [{ at: 0.8, kind: 'hit' }, { at: 1.2, kind: 'end' }],
});

// ── the scene file ──────────────────────────────────────────────────────
// A sub-composition travels in a <template>: the runtime clones only its
// contents, so the style and the script must be inside it.
const HELPERS = `
    const Q = s => s.split(",").map(x => '[data-composition-id="' + ID + '"] ' + x.trim()).join(",");
    const $ = s => document.querySelector(Q(s));
    const $$ = s => Array.from(document.querySelectorAll(Q(s)));
    const has = s => $$(s).length > 0;
    const rise = (s, t = 0, st = 0.06, d = 0.6) => has(s) &&
      tl.fromTo(Q(s + " .w > span"), { yPercent: 118 }, { yPercent: 0, duration: d, stagger: st, ease: "expo.out" }, t);
    const stamp = (s, t = 0, st = 0.07) => has(s) &&
      tl.fromTo(Q(s), { scale: 1.12, opacity: 0, "--sh": 0 },
        { scale: 1, opacity: 1, "--sh": 1, duration: 0.36, stagger: st, ease: "back.out(2.2)" }, t);
    const slide = (s, t = 0, from = { x: -70 }, st = 0.06, d = 0.5) => has(s) &&
      tl.fromTo(Q(s), { ...from, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: d, stagger: st, ease: "expo.out" }, t);
    const grow = (s, t = 0, st = 0.06, d = 0.7) => has(s) &&
      tl.fromTo(Q(s), { scaleX: 0 }, { scaleX: 1, duration: d, stagger: st, ease: "steps(14)" }, t);
    const type = (s, t = 0, each = 0.02) => has(s) &&
      tl.fromTo(Q(s), { opacity: 0 }, { opacity: 1, duration: 0.001, stagger: each, ease: "none" }, t);
    const count = (s, to, t = 0, d = 0.8, fmt = v => Math.round(v)) => $$(s).forEach(el => {
      const o = { v: 0 };
      tl.fromTo(o, { v: 0 }, { v: to, duration: d, ease: "power2.out", onUpdate: () => { el.textContent = fmt(o.v); } }, t);
    });
    const zoom = (s, t, d, vars) => tl.to(Q(s), { duration: d, ease: "expo.inOut", ...vars }, t);`;

const sceneFile = (s, css, tone) => {
  const cam = s.cam === false ? ''
    : `tl.fromTo(Q(".cam"), { transformPerspective: 1800, ...${JSON.stringify(s.cam?.from ?? { scale: 1.035, rotateY: -2.2, rotateX: 1.2 })} },
      { ...${JSON.stringify(s.cam?.to ?? { scale: 1, rotateY: 1.6, rotateX: -0.8 })}, duration: D, ease: "none" }, 0);`;
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><title>${s.id}</title></head>
<body><template>
<style>${css}</style>
<div id="root" data-composition-id="${s.id}" data-width="1920" data-height="1080" data-duration="${s.dur}">
  <div class="stage"><div class="cam ${s.cls ?? ''}">${s.body}</div></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
  (() => {
    const ID = "${s.id}", D = ${s.dur};
    // Animate children, never the clip host — the framework owns clip visibility.
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    ${HELPERS}
    ${cam}
    ${s.inner.replace(TONE_PLACEHOLDER, TONES[tone].rgb.join(','))}
    window.__timelines[ID] = tl;
  })();
</script>
</template></body></html>
`;
};

// ── the backdrop: paper, and ink that breathes in dither at the edges ──────
const bgFile = (film, cuts) => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><title>bg</title></head>
<body><template>
<style>
  .bgp{position:absolute;inset:0;background:#F7F4EC}
  .bgp canvas{position:absolute;left:0;top:0;width:1920px;height:1080px;image-rendering:pixelated}
</style>
<div id="root" data-composition-id="bg" data-width="1920" data-height="1080" data-duration="${film.duration}">
  <div class="bgp"><canvas class="bgc" width="480" height="270"></canvas></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
  (() => {
    const W = 480, H = 270, CUTS = ${JSON.stringify(cuts)}, TONE = [${TONES[film.tone].rgb}], INK = [${INK}];
    const cv = document.querySelector('[data-composition-id="bg"] .bgc'), g = cv.getContext("2d");
    let m = [[0]];
    for (let n = 1; n < 8; n *= 2) { const r = [];
      for (let y = 0; y < n * 2; y++) { r.push([]); for (let x = 0; x < n * 2; x++)
        r[y][x] = 4 * m[y % n][x % n] + [0, 2, 3, 1][(y < n ? 0 : 2) + (x < n ? 0 : 1)]; }
      m = r; }
    const THR = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) THR[y * W + x] = (m[y & 7][x & 7] + 0.5) / 64;
    const img = g.createImageData(W, H), P = img.data;
    const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
    function render(t) {
      P.fill(0);
      // The beat: a small swell every half second, a big one on each cut.
      const beat = Math.exp(-((t % 0.5) * 9)) * 0.10;
      for (let y = 0; y < H; y++) {
        const ny = y / H;
        for (let x = 0; x < W; x++) {
          const i = y * W + x, o = i * 4, th = THR[i], nx = x / W;
          // The centre stays clean paper: that is where the words are.
          const q = ((nx - 0.5) / 0.47) ** 2 + ((ny - 0.5) / 0.42) ** 2;
          if (q < 1) continue;
          const e = clamp((q - 1) / 1.6);
          const flow = 0.5 + 0.5 * Math.sin(x * 0.045 + y * 0.03 + t * 0.8 + 2 * Math.sin(y * 0.021 - t * 0.45 + x * 0.008));
          const band = Math.max(0, Math.sin((x * 0.7 + y * 1.3) * 0.018 - t * 0.9)) ** 8;
          let col = null, a = 0;
          if (e * (0.25 + 0.6 * flow) + e * beat > th) { col = INK; a = 38; }
          if (band * e * 0.9 > th) { col = TONE; a = 150; }
          for (const c of CUTS) {
            const p = (t - c) / 0.8;
            if (p < 0 || p > 1) continue;
            const d = Math.hypot(x - W / 2, (y - H / 2) * 1.25), r = 60 + p * 300;
            const ring = 1 - Math.abs(d - r) / (10 + 16 * p);
            if (ring * (1 - p) * 1.3 > th) { col = TONE; a = 255; }
          }
          if (col) { P[o] = col[0]; P[o + 1] = col[1]; P[o + 2] = col[2]; P[o + 3] = a; }
        }
      }
      g.putImageData(img, 0, 0);
    }
    const tl = gsap.timeline({ paused: true });
    const clock = { t: 0 };
    tl.fromTo(clock, { t: 0 }, { t: ${film.duration}, duration: ${film.duration}, ease: "none", onUpdate: () => render(clock.t) }, 0);
    window.__timelines["bg"] = tl;
  })();
</script>
</template></body></html>
`;

// ── the top layer: dither wipes on every cut, and the frame chrome ─────────
const fxFile = (film, scenes) => {
  const cuts = scenes.slice(1).map((s, i) => [s.start, i % 2 ? 'tone' : 'ink', ['h', 'r', 'v'][i % 3]]);
  const chapters = scenes.map(s => [s.start, s.chapter ?? '']);
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><title>fx</title></head>
<body><template>
<style>
  @font-face{font-family:'ArInter';src:url('fonts/inter.woff2') format('woff2-variations');
    font-weight:100 900;font-display:block}
  @font-face{font-family:'ArMono';src:url('fonts/mono.woff2') format('woff2-variations');
    font-weight:100 800;font-display:block}
  .fxp{position:absolute;inset:0;color:#0A0A0A;font-family:'ArMono',ui-monospace,monospace}
  .fxp canvas{pointer-events:none;position:absolute;left:0;top:0;width:1920px;height:1080px;image-rendering:pixelated}
  .fxp .crop{position:absolute;width:28px;height:28px;border:0 solid #0A0A0A}
  .fxp .brand,.fxp .tc,.fxp .ch{background:#F7F4EC;padding:4px 10px;margin:-4px -10px}
  .fxp .brand{position:absolute;left:64px;top:48px;display:flex;align-items:center;gap:10px;
    font-family:'ArInter',Inter,sans-serif;font-size:26px;font-weight:800;letter-spacing:-.045em}
  .fxp .brand svg{width:36px;height:36px;display:block}
  .fxp .tc{position:absolute;right:64px;top:54px;display:flex;gap:22px;font-size:19px;font-weight:700}
  .fxp .tc b{color:${TONES[film.tone].ink}}
  .fxp .ch{position:absolute;left:64px;bottom:46px;font-size:19px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
  .fxp .cells{position:absolute;right:64px;bottom:48px;display:flex;gap:6px}
  .fxp .cells div{width:16px;height:16px;border:2px solid #0A0A0A}
</style>
<div id="root" data-composition-id="fx" data-width="1920" data-height="1080" data-duration="${film.duration}">
  <div class="fxp">
    <canvas class="fxc" width="480" height="270"></canvas>
    <div class="crop" style="left:36px;top:24px;border-left-width:2px;border-top-width:2px"></div>
    <div class="crop" style="right:36px;top:24px;border-right-width:2px;border-top-width:2px"></div>
    <div class="crop" style="left:36px;bottom:24px;border-left-width:2px;border-bottom-width:2px"></div>
    <div class="crop" style="right:36px;bottom:24px;border-right-width:2px;border-bottom-width:2px"></div>
    <div class="brand">${logo()}<span>AnyRouter</span></div>
    <div class="tc"><b>${esc(film.label)}</b><span class="time">00:00:00:00</span></div>
    <div class="ch"></div>
    <div class="cells">${scenes.map(() => '<div></div>').join('')}</div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
  (() => {
    const W = 480, H = 270, CUTS = ${JSON.stringify(cuts)}, CH = ${JSON.stringify(chapters)};
    const COL = { ink: [${INK}], tone: [${TONES[film.tone].rgb}] }, WIN = 0.22;
    const R = '[data-composition-id="fx"] ';
    const cv = document.querySelector(R + ".fxc"), g = cv.getContext("2d");
    const time = document.querySelector(R + ".time"), ch = document.querySelector(R + ".ch");
    const cells = Array.from(document.querySelectorAll(R + ".cells div"));
    let m = [[0]];
    for (let n = 1; n < 8; n *= 2) { const r = [];
      for (let y = 0; y < n * 2; y++) { r.push([]); for (let x = 0; x < n * 2; x++)
        r[y][x] = 4 * m[y % n][x % n] + [0, 2, 3, 1][(y < n ? 0 : 2) + (x < n ? 0 : 1)]; }
      m = r; }
    const img = g.createImageData(W, H), P = img.data;
    const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
    function render(t) {
      P.fill(0);
      // Between cuts the layer is hidden, so it never sits over the words.
      cv.style.visibility = CUTS.some(([c]) => Math.abs(t - c) < WIN) ? "visible" : "hidden";
      // A cut is a wipe of dots: coverage peaks on the cut, so the old scene
      // dissolves into ink and the new one prints out of it.
      for (const [c, k, mode] of CUTS) {
        const dt = t - c;
        if (Math.abs(dt) >= WIN) continue;
        const cov = 1.3 * (1 - Math.abs(dt) / WIN), col = COL[k];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          let gr = mode === "h" ? x / W : mode === "v" ? y / H : clamp(Math.hypot(x - W / 2, (y - H / 2) * 1.6) / 260);
          if (dt > 0) gr = 1 - gr;
          if (((m[y & 7][x & 7] + 0.5) / 64) * 0.55 + gr * 0.45 < cov) {
            const o = (y * W + x) * 4; P[o] = col[0]; P[o + 1] = col[1]; P[o + 2] = col[2]; P[o + 3] = 255;
          }
        }
      }
      g.putImageData(img, 0, 0);
      const f = Math.floor((t % 1) * 30), s = Math.floor(t), p = n => String(n).padStart(2, "0");
      time.textContent = "00:" + p(Math.floor(s / 60)) + ":" + p(s % 60) + ":" + p(f);
      let k = 0; for (let i = 0; i < CH.length; i++) if (t >= CH[i][0]) k = i;
      ch.textContent = CH[k][1];
      cells.forEach((el, i) => { el.style.background = i < k ? "#0A0A0A" : i === k ? "${TONES[film.tone].dot}" : "transparent"; });
    }
    const tl = gsap.timeline({ paused: true });
    const clock = { t: 0 };
    tl.fromTo(clock, { t: 0 }, { t: ${film.duration}, duration: ${film.duration}, ease: "none", onUpdate: () => render(clock.t) }, 0);
    window.__timelines["fx"] = tl;
  })();
</script>
</template></body></html>
`;
};

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

const host = (id, start, dur, track) => `  <div id="clip-${id}" class="clip" data-composition-id="${id}" data-composition-src="compositions/${id}.html"
       data-start="${start}" data-duration="${dur}" data-track-index="${track}" data-width="1920" data-height="1080"></div>`;

const rootFile = (film, scenes) => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>${esc(film.title)}</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1920px;height:1080px;overflow:hidden;background:#F7F4EC}
  #root{position:relative;width:1920px;height:1080px;overflow:hidden;background:#F7F4EC}
  .clip{position:absolute;inset:0}
  #clip-bg{z-index:0}#clip-fx{z-index:3}
${scenes.map(s => `  #clip-${s.id}{z-index:1}`).join('\n')}
</style></head>
<body>
<div id="root" data-composition-id="main" data-width="1920" data-height="1080"
     data-duration="${film.duration}" data-fps="30">
${host('bg', 0, film.duration, 0)}
${scenes.map(s => host(s.id, s.start, s.dur, 1)).join('\n')}
${host('fx', 0, film.duration, 2)}
  <audio id="sound" data-start="0" data-duration="${film.duration}" data-track-index="9"
         src="audio/mix.wav" data-volume="1"></audio>
</div>
<script>
  // The root only mounts layers; every layer drives its own timeline.
  window.__timelines["main"] = gsap.timeline({ paused: true });
</script>
</body></html>
`;

/** Every sound cue in the film: a cut on each scene change, plus what each scene asks for. */
export function cuesOf(scenes, duration) {
  const cues = [];
  scenes.forEach((s, i) => {
    if (i > 0) cues.push({ at: s.start, kind: 'cut' });
    for (const c of s.cues ?? []) cues.push({ ...c, at: +(s.start + c.at).toFixed(3) });
  });
  return cues.filter(c => c.at >= 0 && c.at < duration).sort((a, b) => a.at - b.at);
}

/**
 * Write the project. `dir` is wiped first: a build is a freeze, not a merge, so
 * no scene from a previous film can survive into this one.
 */
export function writeFilm(dir, id, spec) {
  const film = { tone: 'org', palette: 'drop', label: id, css: '', assets: [], ...spec };
  if (!TONES[film.tone]) throw new Error(`unknown tone "${film.tone}" — have ${Object.keys(TONES).join(', ')}`);
  const scenes = clampScenes(film.scenes, film.duration);
  const css = baseCss(film.tone) + film.css;

  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'compositions'), { recursive: true });
  for (const s of scenes) fs.writeFileSync(path.join(dir, 'compositions', `${s.id}.html`), sceneFile(s, css, film.tone));
  fs.writeFileSync(path.join(dir, 'compositions', 'bg.html'), bgFile(film, scenes.slice(1).map(s => s.start)));
  fs.writeFileSync(path.join(dir, 'compositions', 'fx.html'), fxFile(film, scenes));
  fs.writeFileSync(path.join(dir, 'index.html'), rootFile(film, scenes));

  fs.cpSync(path.join(SHARED, 'fonts'), path.join(dir, 'fonts'), { recursive: true });
  // Every provider mark a scene shows is copied in, so a kind never lists them by hand.
  const used = marksUsed(scenes.map(s => s.body).join('\n'))
    .map(f => ({ from: path.join(MARKS_DIR, f), to: `assets/providers/${f}` }));
  const assets = [...new Map([...used, ...film.assets].map(a => [a.to, a])).values()];
  for (const a of assets) {
    fs.mkdirSync(path.dirname(path.join(dir, a.to)), { recursive: true });
    fs.copyFileSync(a.from, path.join(dir, a.to));
  }
  const cues = cuesOf(scenes, film.duration);
  const sound = writeSound(path.join(dir, 'audio', 'mix.wav'), { duration: film.duration, palette: film.palette, cues });

  fs.writeFileSync(path.join(dir, 'hyperframes.json'), JSON.stringify({
    $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
    paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
    media: { autoProxy: true },
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id, name: id }, null, 2) + '\n');

  return { ...film, scenes, cues, sound };
}
