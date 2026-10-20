/**
 * scene: the free-roundup film is one shot of a split-flap departures board hung on a light
 * wall (see STYLE.md). The board drops in on its rods, flips page after page of free models,
 * then how to use one, then anyrouter.dev/models.
 *
 * Each cell draws its settled character as real text. The four halves that fold while a cell
 * flips are drawn from a data attribute, so a half cut by its hinge is never read as text.
 */
import { esc } from '../../shared/authoring/film-project.mjs';
import { GRID, FLIP } from './board.mjs';

export const C = { wall: '#ECE8DF', ink: '#17171A', muted: '#55524B', frame: '#141416', flap: '#26262A', glyph: '#F3EFE4', accent: '#F2C230', rod: '#9C978C' };

// Board width each grid may take, in px.
const ROOM = { landscape: 1720, portrait: 850 };

/** Cell pitch and type for each grid. */
export function metrics(cols) {
  return Object.fromEntries(['landscape', 'portrait'].map(o => {
    const pitch = Math.floor(ROOM[o] / cols[o]);
    return [o, { pitch, w: pitch - 3, h: o === 'portrait' ? 50 : 60, font: Math.max(32, Math.min(46, Math.floor((pitch - 3) * 1.5))) }];
  }));
}

export function css(cols) {
  const m = metrics(cols);
  const grid = o => `width:${m[o].pitch * cols[o]}px;grid-template-columns:repeat(${cols[o]},${m[o].w}px);grid-auto-rows:${m[o].h}px;column-gap:3px;row-gap:${o === 'landscape' ? 10 : 5}px`;
  const cell = o => `font-size:${m[o].font}px;line-height:${m[o].h}px`;
  return `
  .stage{position:absolute;inset:0;overflow:hidden;background:${C.wall};color:${C.ink};font-family:'Barlow Condensed',sans-serif;
    -webkit-font-smoothing:antialiased}
  .stage *{margin:0;padding:0;box-sizing:border-box}
  .cam{position:absolute;inset:0;transform-origin:50% 40%}
  .head{position:absolute;left:100px;right:100px;top:56px}
  .head h1{font:700 100px/1 'Barlow Condensed';letter-spacing:.01em;white-space:nowrap}
  .head h1 span{display:inline}
  .head h1 b{color:${C.ink};background:${C.accent};padding:0 14px;border-radius:8px}
  .head .sub{margin-top:10px;font:500 36px 'Barlow Condensed';color:${C.muted};letter-spacing:.06em;white-space:nowrap}
  .rods{position:absolute;left:0;right:0;top:226px;height:80px}
  .rods i{position:absolute;top:0;width:8px;height:80px;background:${C.rod}}
  .rods i::before{content:"";position:absolute;left:-8px;top:-6px;width:24px;height:10px;border-radius:3px;background:${C.rod}}
  .mount{position:absolute;left:0;right:0;top:304px;display:flex;justify-content:center}
  .board{position:relative;padding:26px 30px 22px;background:${C.frame};border-radius:18px}
  .board .screw{position:absolute;width:12px;height:12px;border-radius:50%;background:#3A3A3F}
  .labels{display:grid;margin-bottom:10px;column-gap:3px}
  .labels.l{width:${m.landscape.pitch * cols.landscape}px;grid-template-columns:repeat(${cols.landscape},${m.landscape.w}px)}
  .labels span{font:600 32px 'Barlow Condensed';color:#BDB8AC;letter-spacing:.12em;white-space:nowrap}
  .grid{display:grid}
  .grid.p,.labels.p{display:none}
  .cell{position:relative;background:${C.flap};border-radius:5px;text-align:center;color:${C.glyph};font-weight:600}
  .cell .g{position:absolute;inset:0;opacity:0}
  .cell .h{position:absolute;left:0;right:0;height:50%;overflow:hidden;background:${C.flap};opacity:0}
  .cell .h::after{content:attr(data-c);position:absolute;left:0;right:0;height:200%;color:${C.glyph}}
  .cell .t,.cell .ft{top:0;border-radius:5px 5px 0 0;transform-origin:50% 100%}
  .cell .b,.cell .fb{bottom:0;border-radius:0 0 5px 5px;transform-origin:50% 0}
  .cell .t::after,.cell .ft::after{top:0}
  .cell .b::after,.cell .fb::after{bottom:0}
  .cell::before{content:"";position:absolute;left:0;right:0;top:calc(50% - 1px);height:2px;background:#101012;z-index:3}
  .grid.l .cell{${cell('landscape')}}
  .grid.p .cell{${cell('portrait')}}
  .grid.l{${grid('landscape')}}
  .grid.p{${grid('portrait')}}
  .foot{display:flex;justify-content:space-between;margin-top:14px}
  .foot span{font:600 32px 'Barlow Condensed';color:#BDB8AC;letter-spacing:.12em;white-space:nowrap}
  .foot .pg{position:relative;min-width:200px;text-align:right}
  .foot .pg em{position:absolute;right:0;top:0;font-style:normal;opacity:0}
  .logo{position:absolute;right:100px;top:70px;width:190px;opacity:0}
  .cap{position:absolute;left:100px;right:100px;top:950px;height:100px}
  .cap span{position:absolute;left:0;right:0;top:0;text-align:center;font:600 44px/1.3 'Barlow Condensed';letter-spacing:.02em;color:${C.ink};opacity:0}
  @media (orientation: portrait){
    .head{left:60px;right:120px;top:206px}
    .head h1{font-size:96px;line-height:1.05}
    .head h1 span{display:block}
    .head .sub{margin-top:12px;font-size:34px}
    .rods{display:none}
    .mount{top:460px}
    .board{padding:22px 22px 18px}
    .grid.l,.labels.l{display:none}
    .grid.p,.labels.p{display:grid}
    .logo{right:60px;top:210px;width:170px}
    .cap{left:60px;right:60px;top:1336px;height:170px}
    .cap span{font-size:44px}
  }`;
}

/** One grid's cells, each holding a real glyph for every character it ever settles on. */
function gridHtml(o, grids, cls) {
  const rows = grids[0][o].length, cols = grids[0][o][0].length;
  let html = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seen = [...new Set(grids.map(g => g[o][r][c]).filter(ch => ch !== ' '))];
      html += `<div class="cell" data-r="${r}" data-c="${c}">${seen.map(ch => `<span class="g" data-v="${esc(ch)}">${esc(ch)}</span>`).join('')}<i class="h t"></i><i class="h b"></i><i class="h ft"></i><i class="h fb"></i></div>`;
    }
  }
  return `<div class="grid ${cls}">${html}</div>`;
}

export function body(d, t) {
  const labelsL = `<div class="labels l">${d.labels.map(([name, from, span]) => `<span style="grid-column:${from} / span ${span}">${name}</span>`).join('')}</div>`;
  const labelsP = '<div class="labels p" style="grid-template-columns:1fr"><span>DATE · MAKER · TYPE, THEN MODEL</span></div>';
  const screws = ['left:10px;top:10px', 'right:10px;top:10px', 'left:10px;bottom:10px', 'right:10px;bottom:10px'].map(s => `<i class="screw" style="${s}"></i>`).join('');
  const pages = t.pageLabels.map((p, k) => `<em data-k="${k}">${esc(p)}</em>`).join('');
  const caps = t.captions.map((c, k) => `<span data-k="${k}">${esc(c.text)}</span>`).join('');
  return `<div class="cam">
    <div class="head"><h1><span><b>FREE</b> MODELS</span> <span>ON ANYROUTER</span></h1><div class="sub">CREATED IN THE LAST ${d.days} DAYS · AS OF ${esc(d.asOf)}</div></div>
    <div class="rods"><i style="left:34%"></i><i style="left:66%"></i></div>
    <div class="mount"><div class="board">${screws}${labelsL}${labelsP}${gridHtml('landscape', d.grids, 'l')}${gridHtml('portrait', d.grids, 'p')}
      <div class="foot"><span>${d.count} FREE · ${d.chat} CHAT · ${d.decision} DECISION</span><span class="pg">${pages}</span></div></div></div>
    <img class="logo" src="assets/brand/anyrouter-logo-black.svg" alt="AnyRouter">
  </div>
  <div class="cap" data-outside-safe-area>${caps}</div>`;
}

export function inner(t) {
  return `
    const T = ${JSON.stringify({ ...t, flips: undefined })};
    const FLIPS = ${JSON.stringify(t.flips)};
    const d = ${FLIP.dur};
    // the camera eases in on the board and keeps drifting, so no frame sits dead
    tl.fromTo($(".cam"), { scale: PORTRAIT ? 1.015 : 1.06, y: PORTRAIT ? 0 : -20 }, { scale: 1, y: 0, duration: 2.2, ease: "power2.out" }, 0);
    tl.to($(".cam"), { scale: PORTRAIT ? 1.01 : 1.03, duration: D - 2.2, ease: "none" }, 2.2);
    tl.from($(".head h1"), { y: -60, opacity: 0, duration: 0.8, ease: "expo.out" }, 0.15);
    tl.from($(".head .sub"), { opacity: 0, x: 40, duration: 0.6 }, 0.5);
    // the board drops in on its rods and settles
    tl.fromTo($$(".mount, .rods"), { y: -240, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: "back.out(1.5)" }, T.drop);

    // every flip of this rendition's grid
    const grid = $(PORTRAIT ? ".grid.p" : ".grid.l");
    const cells = {};
    grid.querySelectorAll(".cell").forEach(el => {
      const g = {};
      el.querySelectorAll(".g").forEach(s => { g[s.dataset.v] = s; });
      cells[el.dataset.r + ":" + el.dataset.c] = { g, t: el.querySelector(".t"), b: el.querySelector(".b"), ft: el.querySelector(".ft"), fb: el.querySelector(".fb") };
    });
    for (const [r, c, at, from, to] of FLIPS[PORTRAIT ? "portrait" : "landscape"]) {
      const x = cells[r + ":" + c];
      if (x.g[from]) tl.set(x.g[from], { opacity: 0 }, at);
      tl.set(x.t, { attr: { "data-c": to }, opacity: 1 }, at);
      tl.set(x.b, { attr: { "data-c": from }, opacity: 1 }, at);
      tl.set(x.ft, { attr: { "data-c": from }, opacity: 1, rotationX: 0 }, at);
      tl.set(x.fb, { attr: { "data-c": to }, opacity: 1, rotationX: 90 }, at);
      tl.to(x.ft, { rotationX: -90, duration: d / 2, ease: "power1.in" }, at);
      tl.to(x.fb, { rotationX: 0, duration: d / 2, ease: "power1.out" }, at + d / 2);
      tl.set([x.t, x.b, x.ft, x.fb], { opacity: 0 }, at + d);
      if (x.g[to]) tl.set(x.g[to], { opacity: 1 }, at + d);
    }

    // the page counter, and the mark on the wall at the end
    T.pageLabels.forEach((p, k) => { const el = $('.pg em[data-k="' + k + '"]'); tl.set(el, { opacity: 1 }, T.pageAt[k]); if (k + 1 < T.pageAt.length) tl.set(el, { opacity: 0 }, T.pageAt[k + 1]); });
    tl.to($$(".labels"), { opacity: 0, duration: 0.4 }, T.pageAt[T.listPages]);
    tl.to($(".logo"), { opacity: 1, duration: 0.6 }, T.closeAt + 0.4);
    tl.from($(".logo"), { y: 30, duration: 0.8, ease: "expo.out" }, T.closeAt + 0.4);

    T.captions.forEach((c, k) => { const el = $('.cap span[data-k="' + k + '"]'); tl.set(el, { opacity: 1 }, c.at); tl.set(el, { opacity: 0 }, c.end); });
  `;
}
