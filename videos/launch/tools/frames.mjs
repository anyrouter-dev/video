// Writes compositions/frames/NN-*.html and sfx-cues.json from the choreography. Every frame is
// generated: the card, its figure (a landscape and a portrait build of the same machine), the
// type, and the live code that poses the machine as a pure function of frame time.
//
//   node tools/frames.mjs
import fs from "node:fs";
import path from "node:path";
import { frames } from "./choreo.mjs";
import { kitSource, FILM_CSS } from "./figures/shop.mjs";
import * as traverser from "./figures/traverser.mjs";

const FILM = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(FILM, "compositions/frames");
const ISO_CSS = fs.readFileSync(path.join(FILM, "tools/anatomy/iso.css"), "utf8");
const GSAP = `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js" integrity="sha384-sG0Hv1tP1lZCk9KQmrIbY/XNwi+OY84GQqhMscbnsoBFqAz8KNCil1kvfL3Hbbk2" crossorigin="anonymous"></script>`;

const FIGS = {
  traverser: { no: "Fig. 1", title: "The exchange", mod: traverser, live: "TRAVERSER" },
};

const figCache = {};
function figureOf(name) {
  if (figCache[name]) return figCache[name];
  const { mod } = FIGS[name];
  const land = mod.figure("landscape"), port = mod.figure("portrait");
  return (figCache[name] = { land, port, live: mod.liveSource() });
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
${R} .lf-art { position: absolute; left: 50%; top: 8px; width: 1420px; margin-left: -710px; }
${R} .lf-art .lf-port { display: none; }
${R} .lf-statement { position: absolute; left: 36px; bottom: 30px; font-size: 52px; font-weight: 600; line-height: 1.05; letter-spacing: -0.035em; white-space: nowrap; }
${R} .lf-readout { position: absolute; right: 36px; bottom: 36px; font-family: "Geist Mono", ui-monospace, monospace; font-size: 34px; line-height: 1; letter-spacing: -0.01em; color: var(--ink-2); white-space: nowrap; font-variant-numeric: tabular-nums; }
@media (orientation: portrait) {
  ${R} .lf-cam { transform-origin: 50% 40%; }
  ${R} .lf-card { left: 60px; right: 60px; top: 190px; bottom: 640px; }
  ${R} .lf-art { top: 24px; width: 920px; margin-left: -460px; }
  ${R} .lf-art .lf-land { display: none; }
  ${R} .lf-art .lf-port { display: block; }
  ${R} .lf-statement { left: 36px; right: 36px; bottom: 110px; font-size: 52px; white-space: normal; }
  ${R} .lf-readout { left: 36px; right: auto; bottom: 40px; font-size: 32px; }
  ${R} .lf-no { bottom: 232px; }
  ${R} .lf-statement { bottom: 100px; }
}
${ISO_CSS}
${FILM_CSS}`;
}

function html(f, i, all) {
  const id = f.id;
  const fig = f.fig ? figureOf(f.fig) : null;
  const meta = f.fig ? FIGS[f.fig] : null;
  const prev = all[i - 1];
  const next = all[i + 1];
  const statementIn = !prev || prev.statement !== f.statement || prev.fig !== f.fig;
  const cardOut = !next || next.fig !== f.fig;
  const data = {
    dur: f.dur,
    tracks: f.tracks,
    readout: f.readout,
    P: fig ? [fig.land.P, fig.port.P] : [],
    cardIn: Boolean(f.cardIn),
    cardOut,
    statementIn,
    push: f.push ?? [1, 1.03],
  };
  const art = fig
    ? `<div class="lf-art iso lf-fig" data-theme="light"><div class="lf-land">${fig.land.svg}</div><div class="lf-port">${fig.port.svg}</div></div>`
    : "";
  return `<template>
  <style>${css(id)}
  </style>
  <div id="root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${f.dur}">
    <div id="lf${id}-bg" class="lf-bg clip" data-start="0" data-duration="${f.dur}" data-track-index="0"></div>
    <div id="lf${id}-stage" class="lf-stage clip" data-start="0" data-duration="${f.dur}" data-track-index="1">
      <div id="lf${id}-cam" class="lf-cam">
        <div id="lf${id}-card" class="lf-card">
          ${meta ? `<div class="lf-corner lf-no">${meta.no}<span class="lf-title">${esc(meta.title)}</span></div>` : ""}
          ${art}
          <div id="lf${id}-st" class="lf-statement">${esc(f.statement ?? "")}</div>
          <div id="lf${id}-ro" class="lf-readout">${esc(f.readout[0]?.[1] ?? "")}</div>
        </div>
      </div>
    </div>
  </div>
  ${GSAP}
  <script>
    (function () {
${kitSource()}
${fig ? fig.live : ""}
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
      const card = $("card");
      const machines = ${fig ? `[...card.querySelectorAll(".lf-art svg")].map((svg, i) => ${meta.live}.mount(svg, DATA.P[i]))` : "[]"};
      const ro = $("ro");
      function drawAt(t) {
        const s = {};
        for (const key in DATA.tracks) s[key] = value(DATA.tracks[key], t);
        for (const m of machines) m.pose(s);
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
        if (DATA.cardIn) tl.fromTo(card, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out" }, 0);
        if (DATA.cardOut) tl.to(card, { y: -70, opacity: 0, duration: 0.5, ease: "power3.in" }, DATA.dur - 0.5);
        if (DATA.statementIn) tl.fromTo($("st"), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out" }, DATA.cardIn ? 0.35 : 0.1);
        window.__timelines = window.__timelines || {};
        window.__timelines[ID] = tl;
      });
    })();
  </script>
</template>
`;
}

const list = frames();
// the camera drifts across each act, so frames inside an act join without a jump
let actStart = 0;
list.forEach((f, i) => {
  if (i === 0 || list[i - 1].fig !== f.fig) {
    actStart = i;
  }
  f.actStart = actStart;
});
for (const [i, f] of list.entries()) {
  const members = list.filter((g) => g.actStart === f.actStart);
  const total = members.reduce((s, g) => s + g.dur, 0);
  const before = members.slice(0, members.indexOf(f)).reduce((s, g) => s + g.dur, 0);
  f.push = [1 + 0.03 * (before / total), 1 + 0.03 * ((before + f.dur) / total)].map((v) => +v.toFixed(5));
  void i;
}
fs.mkdirSync(OUT, { recursive: true });
list.forEach((f, i) => {
  const file = path.join(OUT, `${f.id}.html`);
  fs.writeFileSync(file, html(f, i, list));
  console.log(`${f.id}: ${f.dur}s, ${f.events.length} sounds, ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
});
const cues = list.flatMap((f) => f.events.map((e) => ({ frame: f.n, sound: e.sound, at: e.t, volume: e.volume, ...(e.pitch ? { pitch: e.pitch } : {}) })));
fs.writeFileSync(path.join(FILM, "sfx-cues.json"), JSON.stringify(cues, null, 1) + "\n");
console.log(`${cues.length} sound cues`);
