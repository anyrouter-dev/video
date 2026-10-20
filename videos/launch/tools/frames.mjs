// Writes compositions/frames/NN-*.html and sfx-cues.json from the choreography. Every frame is
// generated: the card, its figure (a landscape and a portrait build of the same machine), the
// type, any capture or terminal laid over it, and the live code that poses the machine as a pure
// function of frame time.
//
//   node tools/frames.mjs
import fs from "node:fs";
import path from "node:path";
import { frames } from "./choreo.mjs";
import { kitSource, FILM_CSS } from "./figures/shop.mjs";
import * as traverser from "./figures/traverser.mjs";
import * as carousel from "./figures/carousel.mjs";
import * as turret from "./figures/turret.mjs";

const FILM = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(FILM, "compositions/frames");
const ISO_CSS = fs.readFileSync(path.join(FILM, "tools/anatomy/iso.css"), "utf8").replace("filter:blur(9px);", "");
const GSAP = `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js" integrity="sha384-sG0Hv1tP1lZCk9KQmrIbY/XNwi+OY84GQqhMscbnsoBFqAz8KNCil1kvfL3Hbbk2" crossorigin="anonymous"></script>`;

const FIGS = {
  traverser: { no: "Fig. 1", title: "The exchange", mod: traverser, live: "TRAVERSER" },
  carousel: { no: "Fig. 2", title: "The pool", mod: carousel, live: "CAROUSEL" },
  turret: { no: "Fig. 3", title: "The anyr turret", mod: turret, live: "TURRET" },
};

const figCache = {};
function figureOf(name) {
  if (figCache[name]) return figCache[name];
  const { mod } = FIGS[name];
  return (figCache[name] = { land: mod.figure("landscape"), port: mod.figure("portrait"), live: mod.liveSource() });
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function css(id) {
  const R = `[data-composition-id="${id}"]`;
  return `
@font-face { font-family: "Geist"; src: url("assets/fonts/geist.woff2") format("woff2"); font-weight: 100 900; font-display: block; }
@font-face { font-family: "Geist Mono"; src: url("assets/fonts/geist-mono.woff2") format("woff2"); font-weight: 100 900; font-display: block; }
${R} { --ink: #0A0A0A; --ink-2: #27272A; --muted: #6B6B6B; --hair: #E4E4E7; --accent: #BB4D00; font-family: "Geist", ui-sans-serif, system-ui, sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; }
${R} .lf-bg { position: absolute; inset: 0; background: #FFFFFF; }
${R} .lf-stage { position: absolute; inset: 0; overflow: hidden; }
${R} .lf-cam { position: absolute; inset: 0; transform-origin: 50% 46%; }
${R} .lf-card { position: absolute; left: 72px; right: 72px; top: 56px; bottom: 196px; border: 2px solid var(--hair); background: #FFFFFF; }
${R} .lf-corner { position: absolute; font-family: "Geist Mono", ui-monospace, monospace; font-size: 32px; line-height: 1; letter-spacing: 0.02em; color: var(--muted); white-space: nowrap; }
${R} .lf-no { left: 36px; bottom: 104px; color: var(--ink-2); }
${R} .lf-title { margin-left: 28px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); }
${R} .lf-art { position: absolute; left: 50%; top: 0; width: 1340px; margin-left: -670px; }
${R} .lf-art .lf-port { display: none; }
${R} .lf-statement { position: absolute; left: 36px; bottom: 30px; font-size: 52px; font-weight: 600; line-height: 1.05; letter-spacing: -0.035em; white-space: nowrap; }
${R} .lf-statement.lf-mono { font-family: "Geist Mono", ui-monospace, monospace; font-weight: 500; letter-spacing: -0.02em; }
${R} .lf-statement .lf-prompt { color: var(--muted); }
${R} .lf-readout { position: absolute; right: 36px; bottom: 104px; font-family: "Geist Mono", ui-monospace, monospace; font-size: 34px; line-height: 1; letter-spacing: -0.01em; color: var(--ink-2); white-space: nowrap; font-variant-numeric: tabular-nums; }
${R} .lf-shot { position: absolute; left: 50%; border: 2px solid var(--hair); background: #FFFFFF; overflow: hidden; }
${R} .lf-shot img { display: block; width: 100%; height: auto; }
${R} .lf-shot-port { display: none; }
${R} .lf-crop { position: relative; overflow: hidden; border-bottom: 2px solid var(--hair); }
${R} .lf-crop:last-child { border-bottom: 0; }
${R} .lf-crop img { position: absolute; max-width: none; }
${R} .lf-term { position: absolute; left: 50%; top: 43%; width: 1440px; margin-left: -720px; transform: translateY(-50%); background: var(--ink); border-radius: 28px; overflow: hidden; }
${R} .lf-term-bar { height: 76px; border-bottom: 2px solid var(--ink-2); display: flex; align-items: center; justify-content: center; font-family: "Geist Mono", ui-monospace, monospace; font-size: 32px; color: #A3A3A3; }
${R} .lf-term-body { padding: 56px 60px 64px; font-family: "Geist Mono", ui-monospace, monospace; font-size: 46px; line-height: 1.35; letter-spacing: -0.02em; color: #FFFFFF; white-space: pre; }
${R} .lf-term-body .lf-prompt { color: #A3A3A3; }
${R} .lf-term-body .lf-pbr { display: none; }
${R} .lf-close { position: absolute; inset: 0; }
${R} .lf-close-head { position: absolute; left: 0; right: 0; top: 110px; display: flex; flex-direction: column; align-items: center; gap: 30px; }
${R} .lf-close-line { font-size: 64px; font-weight: 600; letter-spacing: -0.04em; line-height: 1; }
${R} .lf-lockup { display: flex; align-items: center; gap: 30px; font-size: 128px; font-weight: 600; letter-spacing: -0.055em; line-height: 1; }
${R} .lf-lockup img { width: 112px; height: 112px; display: block; }
${R} .lf-plates { position: absolute; left: 72px; right: 72px; top: 470px; height: 400px; display: flex; gap: 32px; }
${R} .lf-plate { position: relative; flex: 1; border: 2px solid var(--hair); background: #FFFFFF; overflow: hidden; }
${R} .lf-plate .iso { position: absolute; left: 4%; right: 4%; top: 6px; }
${R} .lf-plate .lf-corner { left: 24px; bottom: 22px; color: var(--ink-2); }
@media (orientation: portrait) {
  ${R} .lf-cam { transform-origin: 50% 40%; }
  ${R} .lf-card { left: 60px; right: 60px; top: 190px; bottom: 640px; }
  ${R} .lf-art { top: 24px; left: 24px; width: 860px; margin-left: 0; }
  ${R} .lf-art .lf-land { display: none; }
  ${R} .lf-art .lf-port { display: block; }
  ${R} .lf-no { bottom: 232px; }
  ${R} .lf-statement { left: 36px; right: 36px; bottom: 100px; font-size: 52px; white-space: normal; }
  ${R} .lf-readout { left: 36px; right: auto; bottom: 40px; font-size: 32px; }
  ${R} .lf-shot-land { display: none; }
  ${R} .lf-shot-port { display: block; }
  ${R} .lf-term { left: 36px; top: 40%; width: 860px; margin-left: 0; transform: translateY(-50%); }
  ${R} .lf-term-body { padding: 44px 32px 52px; font-size: 33px; }
  ${R} .lf-term-body .lf-pbr { display: inline; }
  ${R} .lf-term-body .lf-lsp { display: none; }
  ${R} .lf-close-line { font-size: 60px; }
  ${R} .lf-lockup { font-size: 104px; gap: 24px; }
  ${R} .lf-lockup img { width: 92px; height: 92px; }
  ${R} .lf-close-head { top: 300px; }
  ${R} .lf-plates { left: 60px; right: 120px; top: 540px; height: 750px; flex-direction: column; gap: 18px; }
  ${R} .lf-plate .iso { left: auto; right: 1%; width: 52%; top: 4px; }
  ${R} .lf-plate .lf-corner { left: 22px; top: 26px; bottom: auto; white-space: normal; width: 300px; line-height: 1.25; }
  ${R} .lf-plate .lf-title { display: block; margin-left: 0; }
}
${ISO_CSS}
${FILM_CSS}`;
}

/** A capture laid over the card: whole in landscape; in portrait, panels stacked when it has them. */
function captureHtml(id, o) {
  // crop = [top, right, bottom, left] in capture pixels: what the frame leaves out of the screenshot
  const [ct, cr, cb, cl] = o.crop ?? [0, 0, 14, 0];
  const vw = o.w - cl - cr, vh = o.h - ct - cb;
  const shot = (w, extra) => {
    const k = w / vw;
    return `style="width: ${w}px; height: ${Math.round(vh * k)}px; ${extra}"><img src="${o.src}" alt="" style="position: absolute; max-width: none; width: ${Math.round(o.w * k)}px; left: ${-Math.round(cl * k)}px; top: ${-Math.round(ct * k)}px" />`;
  };
  const lw = o.panels ? 1500 : 780;
  const lh = Math.round((lw * vh) / vw);
  const top = Math.round(56 + (700 - lh) / 2);
  let port;
  if (o.panels) {
    const pw = o.w / o.panels, y0 = 330, y1 = 514, scale = 700 / pw;
    const crops = Array.from({ length: o.panels }, (_, i) => `<div class="lf-crop" style="height: ${Math.round((y1 - y0) * scale)}px"><img src="${o.src}" alt="" style="width: ${Math.round(o.w * scale)}px; left: ${-Math.round(i * pw * scale)}px; top: ${-Math.round(y0 * scale)}px" /></div>`).join("");
    port = `<div id="lf${id}-shotp" class="lf-shot lf-shot-port" style="width: 700px; left: 160px; top: 240px">${crops}</div>`;
  } else {
    port = `<div id="lf${id}-shotp" class="lf-shot lf-shot-port" ${shot(820, "left: 100px; top: 250px;")}</div>`;
  }
  return `<div id="lf${id}-shot" class="lf-shot lf-shot-land" ${shot(lw, `margin-left: ${-lw / 2}px; top: ${top}px;`)}</div>${port}`;
}

function termHtml(id, o) {
  const line = esc(o.lines[0]).replace(" https://", `<span class="lf-pbr"> \\\n  </span><span class="lf-lsp"> </span>https://`).replace("https://anyrouter.dev/setup.sh", '<span data-one-row>https://anyrouter.dev/setup.sh</span>');
  return `<div id="lf${id}-term" class="lf-term"><div class="lf-term-bar">${esc(o.title)}</div><div class="lf-term-body"><span class="lf-prompt">$ </span>${line}</div></div>`;
}

function closeHtml(id, f) {
  const plates = Object.entries(FIGS).map(([name, m]) => {
    const fig = figureOf(name);
    void fig;
    return `<div class="lf-plate"><div class="iso lf-fig" data-theme="light" data-fig="${name}" data-view="land"></div><div class="lf-corner">${m.no}<span class="lf-title">${esc(m.title)}</span></div></div>`;
  }).join("");
  return `<div class="lf-close"><div class="lf-close-head"><div id="lf${id}-line" class="lf-close-line">${esc(f.statement[0][1])}</div><div id="lf${id}-lockup" class="lf-lockup"><img src="assets/anyrouter-logo-black.svg" alt="" />anyrouter.dev</div></div><div id="lf${id}-plates" class="lf-plates">${plates}</div></div>`;
}

function html(f, i, all) {
  const id = f.id;
  const fig = f.fig ? figureOf(f.fig) : null;
  const meta = f.fig ? FIGS[f.fig] : null;
  const prev = all[i - 1];
  const next = all[i + 1];
  const close = f.overlay?.type === "close";
  const prevLast = prev?.statement.at(-1)?.[1];
  const sameAct = Boolean(prev && f.fig && prev.fig === f.fig);
  const data = {
    dur: f.dur,
    tracks: f.tracks,
    readout: f.readout,
    P: fig ? [fig.land.P, fig.port.P] : [],
    cardIn: !close && !sameAct,
    cardOut: !close && !(next && f.fig && next.fig === f.fig),
    statements: f.statement,
    firstIn: !(sameAct && prevLast === f.statement[0][1]),
    overlay: f.overlay?.type ?? null,
    push: f.push ?? [1, 1.03],
  };
  const art = fig ? `<div class="lf-art iso lf-fig" data-theme="light"><div class="lf-land" data-fig="${f.fig}" data-view="land"></div><div class="lf-port" data-fig="${f.fig}" data-view="port"></div></div>` : "";
  const statements = `<div id="lf${id}-st" class="lf-statement${f.mono ? " lf-mono" : ""}">${f.mono ? '<span class="lf-prompt">$ </span>' : ""}<span id="lf${id}-stt">${esc(f.statement[0][1])}</span></div>`;
  const card = close ? closeHtml(id, f) : `<div id="lf${id}-card" class="lf-card">
          ${meta ? `<div class="lf-corner lf-no">${meta.no}<span class="lf-title">${esc(f.title ?? meta.title)}</span></div>` : ""}
          ${art}
          ${f.overlay?.type === "term" ? termHtml(id, f.overlay) : ""}
          ${statements}
          <div id="lf${id}-ro" class="lf-readout">${esc(f.readout[0]?.[1] ?? "")}</div>
        </div>
        ${f.overlay?.type === "capture" ? captureHtml(id, f.overlay) : ""}`;
  return `<template>
  <style>${css(id)}
  </style>
  <div id="root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${f.dur}">
    <div id="lf${id}-bg" class="lf-bg clip" data-start="0" data-duration="${f.dur}" data-track-index="0"></div>
    <div id="lf${id}-stage" class="lf-stage clip" data-start="0" data-duration="${f.dur}" data-track-index="1">
      <div id="lf${id}-cam" class="lf-cam">
        ${card}
      </div>
    </div>
  </div>
  ${GSAP}
  ${fig || close ? '<script src="assets/lf-kit.js"></script>' : ""}
  <script>
    (function () {
      const { k, G, TRAVERSER, CAROUSEL, TURRET } = window.LF || {};
      const ID = ${JSON.stringify(id)};
      const DATA = ${JSON.stringify(data)};
      const $ = (s) => document.getElementById("lf" + ID + "-" + s);
      const ease = (x) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2;
      function value(track, t) {
        let v = track.init;
        for (const [t0, d, to] of track.segs) {
          if (t >= t0 + d) { v = to; continue; }
          if (t > t0) v = v + (to - v) * ease((t - t0) / d);
          break;
        }
        return v;
      }
      // the figures' static art lives once in lf-kit.js; each frame stamps its copy in before posing it
      for (const el of $("stage").querySelectorAll("[data-fig]")) el.innerHTML = window.LF.SVG[el.dataset.fig][el.dataset.view];
      const card = $("card");
      const machines = ${fig ? `[...card.querySelectorAll(".lf-art svg")].map((svg, i) => ${meta.live}.mount(svg, DATA.P[i]))` : "[]"};
      const ro = $("ro");
      const stt = $("stt");
      function drawAt(t) {
        if (stt) {
          let line = DATA.statements[0][1];
          for (const [t0, x] of DATA.statements) if (t >= t0) line = x;
          if (stt.textContent !== line) stt.textContent = line;
        }
        const s = {};
        for (const key in DATA.tracks) s[key] = value(DATA.tracks[key], t);
        for (const m of machines) m.pose(s);
        if (!ro) return;
        let text = DATA.readout.length ? DATA.readout[0][1] : "";
        for (const [t0, x] of DATA.readout) if (t >= t0) text = x;
        if (ro.textContent !== text) ro.textContent = text;
      }
      document.fonts.ready.then(() => {
        const tl = gsap.timeline({ paused: true });
        // a setter, not onUpdate: a seek renders the tween even when it suppresses callbacks
        let now = 0;
        const clock = { get t() { return now; }, set t(v) { now = v; drawAt(v); } };
        tl.fromTo(clock, { t: 0 }, { t: DATA.dur, duration: DATA.dur, ease: "none", immediateRender: false }, 0);
        drawAt(0);
        tl.fromTo($("cam"), { scale: DATA.push[0] }, { scale: DATA.push[1], duration: DATA.dur, ease: "none" }, 0);
        if (card && DATA.cardIn) tl.fromTo(card, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out" }, 0);
        if (card && DATA.cardOut) tl.to(card, { y: -70, opacity: 0, duration: 0.5, ease: "power3.in" }, DATA.dur - 0.5);
        // the statement swaps its text while it is out of sight: out for 0.15 s, in from below
        const st = $("st");
        if (st) {
          if (DATA.firstIn) tl.fromTo(st, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out", immediateRender: true }, DATA.cardIn ? 0.35 : 0.1);
          DATA.statements.slice(1).forEach(([t]) => {
            tl.to(st, { y: -14, opacity: 0, duration: 0.15, ease: "power2.in" }, t - 0.15);
            tl.fromTo(st, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "expo.out", immediateRender: false }, t);
          });
        }
        if (DATA.overlay === "capture") {
          for (const el of [$("shot"), $("shotp")]) {
            tl.fromTo(el, { y: 90, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out" }, 0.1);
            tl.fromTo(el, { scale: 1 }, { scale: 1.05, duration: DATA.dur, ease: "none" }, 0);
            tl.to(el, { y: -60, opacity: 0, duration: 0.45, ease: "power3.in" }, DATA.dur - 0.5);
          }
          const art = card.querySelector(".lf-art");
          tl.to(art, { opacity: 0.16, duration: 0.6, ease: "power2.out" }, 0.1);
          tl.to(art, { opacity: 1, duration: 0.45, ease: "power2.in" }, DATA.dur - 0.5);
        }
        if (DATA.overlay === "term") tl.fromTo($("term"), { y: 50 }, { y: 0, duration: 1.0, ease: "expo.out" }, 0.15);
        if (DATA.overlay === "close") {
          tl.fromTo($("line"), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out" }, 0.1);
          tl.fromTo($("plates").children, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out", stagger: 0.12 }, 0.3);
          tl.fromTo($("lockup"), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, ease: "expo.out" }, 1.45);
        }
        window.__timelines = window.__timelines || {};
        window.__timelines[ID] = tl;
      });
    })();
  </script>
</template>
`;
}

// one shared script for every frame: the anatomy kit and each machine's live code, defined once
fs.writeFileSync(path.join(FILM, "assets/lf-kit.js"), `// generated by tools/frames.mjs: the anatomy kit (MIT, tools/anatomy/LICENSE) and the machines' live code
window.LF = window.LF || (() => {
${kitSource()}
${Object.keys(FIGS).map((name) => figureOf(name).live).join("\n")}
const SVG = ${JSON.stringify(Object.fromEntries(Object.keys(FIGS).map((name) => [name, { land: figureOf(name).land.svg, port: figureOf(name).port.svg }])))};
return { k, G, TRAVERSER, CAROUSEL, TURRET, SVG };
})();
`);

const list = frames();
// the camera drifts across each act, so frames inside an act join without a jump
list.forEach((f, i) => { f.actStart = i > 0 && f.fig && list[i - 1].fig === f.fig ? list[i - 1].actStart : i; });
for (const f of list) {
  const members = list.filter((g) => g.actStart === f.actStart);
  const total = members.reduce((s, g) => s + g.dur, 0);
  const before = members.slice(0, members.indexOf(f)).reduce((s, g) => s + g.dur, 0);
  f.push = [1 + 0.03 * (before / total), 1 + 0.03 * ((before + f.dur) / total)].map((v) => +v.toFixed(5));
}
fs.mkdirSync(OUT, { recursive: true });
for (const old of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, old));
list.forEach((f, i) => {
  const file = path.join(OUT, `${f.id}.html`);
  fs.writeFileSync(file, html(f, i, list));
  console.log(`${f.id}: ${f.dur}s, ${f.events.length} sounds, ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
});
const cues = list.flatMap((f) => f.events.map((e) => ({ frame: f.n, sound: e.sound, at: e.t, volume: e.volume, ...(e.pitch ? { pitch: e.pitch } : {}) })));
fs.writeFileSync(path.join(FILM, "sfx-cues.json"), JSON.stringify(cues, null, 1) + "\n");
console.log(`${cues.length} sound cues`);
