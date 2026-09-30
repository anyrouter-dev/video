/**
 * model-drop — a short film for models added to the AnyRouter catalog, in the
 * print look: a spec sheet that moves.
 *
 * The model count picks the story; the plan's `picks` pick which models and in
 * what order (lead first). With no plan the order is the catalog diff's —
 * freshest first — so the default lead is the newest model in the drop.
 *
 *   N = 1        hero      the model is the whole film: its name with a deep
 *                          push, then its spec sheet of stamped numbers
 *   N = 2..4     cards     one scene each, a giant dotted rank numeral on one
 *                          side and the facts on the other, sides alternating
 *   N >= 5       list      the lead in a spotlight, then a ranked ledger that
 *                          prints row by row, then the drop in numbers
 *
 * Everything that is shown is capped by what can be READ in the film's length;
 * whatever did not fit is counted honestly ("+N more in this drop").
 *
 *   --limit=N     cap the model count (and so force a layout)
 *   --seconds=N   film length (default 20; the plan's `seconds` otherwise)
 *   --all         ignore the baseline      --first=N   newest N on a first run
 *   --from=FILE   build from a saved catalog response instead of the live API
 *   --baseline=FILE   diff against this baseline instead of the committed one
 */
import fs from 'node:fs';
import path from 'node:path';
import { esc, words, chars, fit, openScene, endScene, OPEN, END, BEAT } from '../../lib/film.mjs';
import { copyProblem, factNumbers } from '../../lib/plan.mjs';
import { markFor, monogram } from '../../lib/marks.mjs';
import { API, POOL_API, buildRelease, baselineOf, fingerprintParts, report } from './catalog.mjs';

const readJson = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const r3 = v => +v.toFixed(3);
const onGrid = v => Math.round(v / BEAT) * BEAT;
const pad = n => String(n).padStart(2, '0');

// ── formatting: every figure on screen goes through one of these ───────────
// Below 1M, "0.0M" throws away the number entirely (a 32k window read as 0.0M).
export const fmtCtx = n => {
  if (!n) return '—';
  if (n >= 1e6) return `${+(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(0)}K`;
  return String(n);
};
/** $0 is a price, not a missing one. Sub-dime prices keep their third digit ($0.074). */
export const fmtPrice = v => (!v ? '$0' : v < 0.1 ? `$${+v.toFixed(3)}` : `$${v.toFixed(2)}`);
const day = m => (m.created ? new Date(m.created * 1000).toISOString().slice(0, 10) : null);

// ── timing (seconds) ────────────────────────────────────────────────────────
const PAGE_HOLD = 2.0;     // a ledger page holds this long after its last row lands
const ROW_AT = 0.5;        // the first row lands after the header
const ROW_EVERY = 0.25;    // then one row every half beat
const PER_PAGE = 6;
const SPOT_MIN = 3.5;      // the lead's spotlight (≥5)
const SUM_MIN = 3.5;       // the drop in numbers (≥5)
const WALL_MIN = 3.0;      // who shipped (≥5, more than one maker)
const BOOKEND_MAX = 6;     // neither of those grows past this; spare time goes to the ledger
const CARD_MIN = 3.0;      // one card (2..4)
const NAME_MIN = 2.5;      // the hero's name scene
const pageMin = rows => ROW_AT + rows * ROW_EVERY + PAGE_HOLD;

/** Which layout a model count gets. */
export const layoutOf = n => (n === 1 ? 'hero' : n <= 4 ? 'cards' : 'list');

// ── pieces ─────────────────────────────────────────────────────────────────
/** A model's mark file: the catalog's, else whatever its provider or id resolves to. Null when none is vendored. */
export const markOf = m => m.logo || markFor(m.provider) || markFor(m.id);
// A mark is a background, not an <img>: the same provider twice on a page would
// otherwise be two identical media nodes, which the checker flags. With no
// vendored mark the provider gets a monogram — never a borrowed or faked logo.
const markFile = (f, cls = 'mark') => `<span class="${cls}" style="background:url('assets/providers/${esc(f)}') center/contain no-repeat"></span>`;
const mark = m => (markOf(m) ? markFile(markOf(m)) : monogram(m.provider));
const tile = (m, cls = '') => `<div class="tile box ${cls}"><div class="face">${mark(m)}</div></div>`;
const freePill = '<span class="pill free">$0 · FREE</span>';
// Multi-model films carry no prices at all: a $0 model is marked as a status, not a figure.
const freeTag = '<span class="pill free">FREE</span>';

/** The size class a model name gets, by its length. */
const nameSize = (name, steps, fallback) => fit(name, steps, fallback);

/**
 * The lede under a model: the plan's line, else the catalog's own first
 * sentence — held to the same bar as the plan's copy (no hype, no number the
 * model's facts do not carry), because a vendor's "best" is still not a fact.
 */
const DOLLARS = /\$\s?\d/;
const ledeOf = (m, plan, max, { prices = true } = {}) => {
  const ok = t => prices || !DOLLARS.test(t);
  const line = plan.lines?.[m.id];
  if (line && ok(line)) return line;
  if (m.excerpt && !ok(m.excerpt)) return null;
  // The excerpt is left out of the facts it is checked against, or it would vouch for itself.
  return m.excerpt && !copyProblem(m.excerpt, factNumbers({ ...m, excerpt: null }), max) ? m.excerpt : null;
};

/** in / out / context as stamped boxes. */
const specBoxes = m => `<div class="specs">
    <div class="box spec"><div class="face"><div class="num">${fmtPrice(m.inPrice)}</div><div class="label">in / 1M tokens</div></div></div>
    <div class="box spec"><div class="face"><div class="num">${fmtPrice(m.outPrice)}</div><div class="label">out / 1M tokens</div></div></div>
    <div class="box tone spec"><div class="face"><div class="num">${fmtCtx(m.context)}</div><div class="label">context</div></div></div>
    ${m.free ? freePill : ''}
  </div>`;

/** Context and status only — the spotlight of a many-model film, which shows no prices. */
const specPlain = m => `<div class="specs">
    <div class="box tone spec"><div class="face"><div class="num">${fmtCtx(m.context)}</div><div class="label">context</div></div></div>
    ${m.category ? `<div class="box spec cat"><div class="face"><div class="num">${esc(m.category)}</div><div class="label">category</div></div></div>` : ''}
    ${m.free ? freeTag : ''}
  </div>`;

/** in / out / context as a ruled table — the other card's spec, so two cards never read the same. */
const specTable = m => `<div class="stab">
    <div class="sc"><div class="label">in / 1M</div><div class="num">${fmtPrice(m.inPrice)}</div></div>
    <div class="sc"><div class="label">out / 1M</div><div class="num">${fmtPrice(m.outPrice)}</div></div>
    <div class="sc"><div class="label">context</div><div class="num">${fmtCtx(m.context)}</div></div>
    ${m.free ? `<div class="sc pc">${freePill}</div>` : ''}
  </div>`;

const CSS = `
  /* the dotted numeral: halftone ink inside a hard ink outline */
  /* padding-right: the tracking pulls the last glyph past its box, and the print reveal clips to the box */
  .idx{display:inline-block;padding:0 .09em 0 .02em;font-family:'ArInter',sans-serif;font-weight:800;letter-spacing:-.075em;line-height:.8;
    color:transparent;-webkit-text-stroke:3px var(--ink);
    background-image:radial-gradient(circle,var(--tone) 3.2px,transparent 3.8px);background-size:10px 10px;
    -webkit-background-clip:text;background-clip:text}
  .idx-of{font-family:'ArMono',monospace;font-size:26px;font-weight:700;letter-spacing:.14em;color:var(--ink2);margin-top:26px}
  .idcode{font-family:'ArMono',monospace;font-size:30px;font-weight:600;color:var(--ink2);margin-top:22px;white-space:nowrap}
  .who{display:flex;align-items:center;gap:26px}
  .n-xl{font-size:250px;font-weight:800;letter-spacing:-.064em;line-height:.92}
  .n-l{font-size:176px;font-weight:800;letter-spacing:-.06em;line-height:.96}
  .n-m{font-size:132px;font-weight:800;letter-spacing:-.055em;line-height:1}
  .n-s{font-size:104px;font-weight:800;letter-spacing:-.05em;line-height:1.02}
  .c-l{font-size:112px;font-weight:800;letter-spacing:-.055em;line-height:.98}
  .c-m{font-size:88px;font-weight:800;letter-spacing:-.05em;line-height:1.02}
  .c-s{font-size:68px;font-weight:800;letter-spacing:-.04em;line-height:1.06}
  .more{font-family:'ArMono',monospace;font-size:24px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
    display:inline-flex;align-items:center;gap:14px}
  .more::before{content:"";width:44px;height:14px}
  .more.dotted::before{background-image:radial-gradient(circle,var(--ink) 1.15px,transparent 1.45px);background-size:5px 5px}

  /* hero · the name */
  .hname .top{display:flex;align-items:center;gap:30px}
  .tile .mono-mark{width:100%;height:100%}
  .hname .tile{width:210px;height:210px}
  .hname .tile .mark{width:128px;height:128px}
  .hname .tile .mono-mark{font-size:64px}
  .hname .nm{margin-top:40px;max-width:1500px}
  .hname .idcode{font-size:38px;margin-top:30px}
  .hname .band{height:14px;width:560px;margin-top:56px;transform-origin:0 50%}
  .cam.push{transform-origin:14% 52%}

  /* hero · the spec sheet */
  .hspec .head{display:flex;align-items:flex-end;justify-content:space-between;gap:40px}
  .hspec .head .h3{max-width:1180px}
  .hspec .head .idcode{margin-top:10px;font-size:26px}
  .hspec .head .tile{width:150px;height:150px}
  .hspec .head .tile .mark{width:92px;height:92px}
  .hspec .head .tile .mono-mark{font-size:44px}
  .hspec .rule{margin-top:34px}
  .hspec .spec{flex:1;width:auto}
  .specs{display:flex;align-items:center;gap:40px;margin-top:52px}
  .spec{width:400px}
  .spec .face{padding:30px 34px 26px}
  .spec .num{font-size:92px}
  .spec .label{margin-top:14px}
  .specs .pill{height:64px;font-size:26px;padding:0 26px}
  .hspec .lede{margin-top:52px;max-width:60ch}
  .hspec .lede.sm{font-size:30px}
  .hspec .foot{display:flex;gap:44px;margin-top:44px}
  .hspec .foot b{color:var(--ink);font-weight:800}
  .hspec .more{margin-top:0}

  /* cards: numeral on one side, facts on the other */
  .card{display:grid;align-items:center;column-gap:90px}
  .card.a{grid-template-columns:560px 1fr}
  .card.b{grid-template-columns:1fr 560px}
  .card.b .rank{order:2;text-align:right}
  .card .rank .idx{font-size:480px}
  .card .who .tile{width:124px;height:124px}
  .card .who .tile .mark{width:76px;height:76px}
  .card .who .tile .mono-mark{font-size:40px}
  .card .nm{margin-top:30px}
  .card .idcode{font-size:28px;margin-top:18px}
  .card .specs{margin-top:44px;gap:30px}
  .card .spec{width:300px}
  .card .spec .face{padding:22px 26px 20px}
  .card .spec .num{font-size:66px}
  .card .spec.cat{width:auto}
  .card .spec.cat .num{font-size:52px;line-height:66px;letter-spacing:-.03em}
  .card .lede{margin-top:40px;font-size:32px;max-width:52ch}
  .card .lede.sm{font-size:28px;max-width:58ch}
  .card .more{margin-top:34px}
  .stab{display:flex;width:max-content;margin-top:44px;border-top:2px solid var(--rule);border-bottom:2px solid var(--rule)}
  .stab .sc{padding:22px 44px 24px 0;margin-right:44px;border-right:2px solid var(--rule)}
  .stab .sc:last-child{border-right:0;margin-right:0}
  .stab .sc.pc{display:flex;align-items:center}
  .stab .num{font-size:72px;margin-top:12px}

  /* the ledger */
  .ledger .head{display:flex;align-items:baseline;justify-content:space-between}
  .ledger .h4{margin-top:10px}
  .lt{margin-top:26px}
  .lr{position:relative;display:grid;grid-template-columns:70px 92px minmax(0,1.15fr) minmax(0,1fr) 170px 150px;align-items:center;
    column-gap:26px;height:96px}
  .lr.hd{height:44px}
  .lr .rl{position:absolute;left:0;right:0;top:0;height:2px;background:var(--rule);transform-origin:0 50%}
  .lr .rk{font-family:'ArMono',monospace;font-size:28px;font-weight:700;color:var(--ink2)}
  .lr .tile{width:80px;height:80px}
  .lr .tile .mark{width:50px;height:50px}
  .lr .tile .mono-mark{font-size:28px}
  .lr .nmc{min-width:0}
  .lr .nm{font-size:40px;font-weight:750;letter-spacing:-.03em;line-height:1.1;white-space:nowrap}
  .lr .nm.s{font-size:33px}
  .lr .id{font-family:'ArMono',monospace;font-size:20px;font-weight:600;color:var(--ink2);margin-top:6px;white-space:nowrap}
  .lr .fig{font-family:'ArMono',monospace;font-size:34px;font-weight:800;letter-spacing:-.03em;text-align:right}
  .lr .note{font-size:26px;font-weight:500;line-height:1.3;color:var(--ink2);text-wrap:pretty}
  .lr .note.org{font-family:'ArMono',monospace;font-size:24px;font-weight:700;letter-spacing:.06em;color:var(--ink)}
  .lr .st{text-align:right}
  .lr .st .pill{height:40px;font-size:18px;padding:0 14px}
  .lr .label{text-align:right}
  .ledger .tail{display:flex;justify-content:space-between;align-items:center;margin-top:24px;border-top:2px solid var(--rule);padding-top:22px}

  /* the wall: who shipped this drop */
  .wall .head{display:flex;align-items:baseline;justify-content:space-between}
  .wall .grid{display:grid;gap:26px;margin-top:34px}
  .wall .maker .face{display:flex;flex-direction:column;align-items:flex-start;padding:22px 24px 20px}
  .wall .maker .mark,.wall .maker .mono-mark{width:var(--mk);height:var(--mk)}
  .wall .maker .mono-mark{font-size:calc(var(--mk) * .42)}
  .wall .maker .who{display:block;font-size:26px;font-weight:750;letter-spacing:-.02em;line-height:1.15;margin-top:16px;white-space:nowrap}
  .wall .maker .label{margin-top:6px}
  .wall .maker.rest .face{justify-content:center;height:100%}

  /* the drop in numbers */
  .sum{display:grid;grid-template-columns:560px 1fr;column-gap:90px;align-items:center}
  .sum .big{font-size:340px;line-height:.8;margin-top:30px}
  .sum .h3{margin-top:18px}
  .sum .facts{display:flex;flex-direction:column;gap:28px}
  .sum .fact .face{display:grid;grid-template-columns:260px 1fr;align-items:center;column-gap:34px;padding:24px 34px}
  .sum .fact .num{font-size:76px}
  .sum .fact .what{font-size:34px;font-weight:750;letter-spacing:-.025em;line-height:1.15;margin-top:8px}
  .sum .fact .label{font-size:18px}`;

// ── the scenes ─────────────────────────────────────────────────────────────

/** Hero, part one: the name. Tile stamps, the name rises, the id types, the camera pushes in. */
function heroName(m, ctx, start, dur) {
  const size = nameSize(m.name, [[12, 'n-xl'], [18, 'n-l'], [26, 'n-m']], 'n-s');
  const typeEnd = 0.95 + m.id.length * 0.018;
  return {
    id: 's01-name', start, dur, chapter: `01 / 01 · ${m.name}`, cls: 'hname push', cam: false,
    body: `<div class="top">${tile(m, 'tone')}<div>
        <div class="kicker"><i>01</i>${esc(ctx.what)} · ${esc(m.provider)}</div>
        ${day(m) ? `<div class="label" style="margin-top:14px">listed ${esc(day(m))}</div>` : ''}</div></div>
      <div class="nm ${size}">${words(m.name)}</div>
      <div class="idcode">${chars(m.id)}</div>
      <div class="band dots"></div>`,
    inner: `
      stamp(".tile", 0.1);
      slide(".kicker, .top .label", 0.2, { x: -40 });
      rise(".nm", 0.4, 0.07, 0.7);
      type(".idcode .c", 0.95, 0.018);
      grow(".band", ${r3(typeEnd)}, 0, 0.5);
      // The deep push: once the name has landed, the camera leans into it.
      tl.fromTo(Q(".cam"), { scale: 1 }, { scale: 1.1, duration: ${r3(Math.max(0.5, dur - 0.9))}, ease: "power1.inOut" }, 0.9);`,
    cues: [{ at: 0.1, kind: 'tick' }, { at: 0.6, kind: 'hit' }, { at: 0.95, kind: 'type', dur: r3(typeEnd - 0.95) }],
  };
}

/** Hero, part two: the spec sheet — the numbers stamp, the lede rises, the catalog it joins. */
function heroSpec(m, ctx, start, dur, { solo }) {
  const lede = ledeOf(m, ctx.plan, 220);
  const t = ctx.rel.totals;
  // Alone (a very short film), this scene also has to carry the name.
  const head = solo
    ? `<div class="kicker"><i>01</i>${esc(ctx.what)} · ${esc(m.provider)}</div>
       <div class="h2" style="margin-top:18px">${words(m.name)}</div>`
    : `<div class="kicker"><i>01</i>${esc(ctx.what)} · spec</div>
       <div class="h3" style="margin-top:14px">${words(m.name)}</div>`;
  return {
    id: 's02-spec', start, dur, chapter: `01 / 01 · ${m.name} · spec`, cls: 'hspec',
    body: `<div class="head"><div>${head}<div class="idcode">${chars(m.id)}</div></div>${tile(m)}</div>
      <div class="rule"></div>
      ${specBoxes(m)}
      ${ctx.change ? `<div class="label" style="margin-top:26px">was ${esc(ctx.change)}</div>` : ''}
      ${lede ? `<div class="lede${lede.length > 120 ? ' sm' : ''}">${words(lede)}</div>` : ''}
      <div class="foot label"><span><b>${t.listed}</b> models listed</span><span><b>${t.free}</b> free</span><span><b>${t.providers}+</b> providers</span>
        ${ctx.more ? `<span class="more dotted">${esc(ctx.more)}</span>` : ''}</div>`,
    inner: `
      slide(".kicker", 0.05, { x: -40 });
      rise(".head .h3, .head .h2", 0.1);
      type(".idcode .c", 0.3, 0.01);
      stamp(".tile", 0.2);
      grow(".rule", 0.3, 0, 0.4);
      stamp(".spec", 0.5, 0.25);
      stamp(".specs .pill", 1.25);
      rise(".lede", 1.35, 0.025);
      slide(".foot span", 1.7, { y: 20 }, 0.08);`,
    cues: [{ at: 0.5, kind: 'hit' }, { at: 0.75, kind: 'tick' }, { at: 1.0, kind: 'tick' },
      ...(m.free ? [{ at: 1.25, kind: 'hit' }] : []), { at: 1.7, kind: 'tick' }],
  };
}

/**
 * One model, editorial: a giant dotted rank numeral on one side, the facts on
 * the other. `side` 'a' puts the numeral left with stamped boxes; 'b' puts it
 * right with a ruled table — consecutive cards never share a composition.
 */
function card(m, { rank, of, side, id, start, dur, chapter, kicker, more, ctx, rise: into, prices = true }) {
  const size = nameSize(m.name, [[13, 'c-l'], [22, 'c-m']], 'c-s');
  const lede = ledeOf(m, ctx.plan, 200, { prices });
  const mirror = side === 'b';
  return {
    id, start, dur, chapter, cls: '',
    cam: mirror ? { from: { scale: 1.035, rotateY: 2.2, rotateX: 1.2 }, to: { scale: 1, rotateY: -1.6, rotateX: -0.8 } } : undefined,
    body: `<div class="card ${side}">
      <div class="rank"><div class="idx">${pad(rank)}</div><div class="idx-of">OF ${pad(of)}</div></div>
      <div class="facts">
        <div class="who">${tile(m)}<div class="kicker">${esc(kicker)}</div></div>
        <div class="nm ${size}">${words(m.name)}</div>
        <div class="idcode">${chars(m.id)}</div>
        ${!prices ? specPlain(m) : mirror ? specTable(m) : specBoxes(m)}
        ${lede ? `<div class="lede${lede.length > 120 ? ' sm' : ''}">${words(lede)}</div>` : ''}
        ${more ? `<div class="more dotted">${esc(more)}</div>` : ''}
      </div></div>`,
    inner: `
      tl.fromTo(Q(".idx"), { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: 0.6, ease: "steps(10)" }, 0.05);
      type(".idx-of", 0.55);
      stamp(".who .tile", 0.15);
      slide(".who .kicker", 0.2, { x: ${mirror ? 40 : -40} });
      rise(".nm", 0.3, 0.06, 0.65);
      type(".idcode .c", 0.7, 0.012);
      ${mirror
        ? `tl.fromTo(Q(".stab"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "steps(12)" }, 0.95);
      stamp(".stab .pill", 1.4);`
        : `stamp(".spec", 0.95, 0.12);
      stamp(".specs .pill", 1.35);`}
      rise(".lede", 1.3, 0.02);
      slide(".more", 1.5, { x: -30 });`,
    cues: [
      ...(into ? [{ at: 0, kind: 'rise', dur: 0.55 }] : []),
      { at: 0.05, kind: 'tick' }, { at: 0.55, kind: 'hit' },
      { at: 0.95, kind: mirror ? 'type' : 'hit', ...(mirror ? { dur: 0.5 } : {}) },
      ...(m.free ? [{ at: mirror ? 1.4 : 1.35, kind: 'tick' }] : []),
    ],
  };
}

/**
 * One page of the ranked ledger: rows print one at a time, a tick each. No
 * prices: a row is what identifies the model — mark, name, id, who makes it
 * (or the plan's line for it), its context window, and FREE as a status.
 */
function ledgerPage(rows, { id, start, dur, first, total, page, pages, more, chapter, lines = {} }) {
  const row = (m, i) => {
    const t = ROW_AT + i * ROW_EVERY;
    return { t, html: `<div class="lr r${i}"><div class="rl"></div>
      <span class="rk">${pad(first + i)}</span>${tile(m)}
      <div class="nmc"><div class="nm${m.name.length > 22 ? ' s' : ''}">${esc(m.name)}</div><div class="id">${esc(m.id)}</div></div>
      ${lines[m.id] && !DOLLARS.test(lines[m.id]) ? `<div class="note">${esc(lines[m.id])}</div>` : `<div class="note org">${esc(m.provider)}</div>`}
      <div class="fig">${fmtCtx(m.context)}</div>
      <div class="st">${m.free ? freeTag : ''}</div></div>` };
  };
  const printed = rows.map(row);
  const last = first + rows.length - 1;
  return {
    id, start, dur, chapter, cls: 'ledger',
    cam: { from: { scale: 1.02, rotateX: 1 }, to: { scale: 1, rotateX: -0.6 } },
    body: `<div class="head"><div>
        <div class="kicker"><i>${pad(first)}–${pad(last)}</i>of ${total} in this drop</div>
        <div class="h4">${words('The ledger')}</div></div>
        <div class="label">page ${page} / ${pages}</div></div>
      <div class="lt">
        <div class="lr hd"><span></span><span></span><span class="label" style="text-align:left">model · id</span>
          <span class="label" style="text-align:left">${Object.keys(lines).length ? 'provider · note' : 'provider'}</span><span class="label">context</span><span></span></div>
        ${printed.map(p => p.html).join('')}
      </div>
      ${more ? `<div class="tail"><span class="more dotted">${esc(more)}</span><span class="label">anyrouter.dev/models</span></div>` : ''}`,
    inner: `
      slide(".head .kicker", 0.05, { x: -40 });
      rise(".head .h4", 0.1);
      type(".head > .label", 0.2);
      type(".lr.hd .label", 0.3, 0.04);
      ${printed.map((p, i) => `grow(".r${i} .rl", ${r3(p.t - 0.1)}, 0, 0.2);
      tl.fromTo(Q(".r${i} > :not(.rl)"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.2, ease: "steps(6)", stagger: 0.02 }, ${r3(p.t - 0.05)});`).join('\n      ')}
      slide(".tail", ${r3(ROW_AT + rows.length * ROW_EVERY)}, { y: 16 });`,
    cues: [...printed.map(p => ({ at: r3(p.t), kind: 'tick' })),
      ...(more ? [{ at: r3(ROW_AT + rows.length * ROW_EVERY), kind: 'tick' }] : [])],
  };
}

/**
 * Facts derived from the whole drop, deterministically, each labelled with
 * exactly what it is. Nothing here ranks quality: no "best", no "fastest".
 */
export function dropFacts(added, { wall = false } = {}) {
  const facts = [];
  const tie = (list, pick) => {
    const top = list.filter(m => pick(m) === pick(list[0]));
    return top.length > 1 ? `${list[0].name} +${top.length - 1} tied` : list[0].name;
  };
  const free = added.filter(m => m.free);
  if (free.length) {
    facts.push({ key: 'free', label: 'free in this drop', value: String(free.length),
      what: free.length === 1 ? free[0].name : `${free[0].name} +${free.length - 1} more` });
  }
  const ctxs = added.filter(m => m.context).sort((a, b) => b.context - a.context);
  if (ctxs.length) {
    facts.push({ key: 'context', label: 'largest context in this drop', value: fmtCtx(ctxs[0].context), what: tie(ctxs, m => m.context) });
  }
  // No prices here: a many-model film is about which models, not what they cost.
  const cats = Object.entries(added.reduce((o, m) => (m.category ? { ...o, [m.category]: (o[m.category] ?? 0) + 1 } : o), {}))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (cats.length > 1) {
    facts.push({ key: 'categories', label: 'categories in this drop', value: String(cats.length),
      what: cats.map(([c, n]) => `${n} ${c}`).join(' · ') });
  }
  // Model makers: the part of the id before the "/". Not the site's provider
  // claim (PROVIDER_CLAIM) — a different number, so a different label.
  const orgs = [...new Set(added.map(m => m.id.split('/')[0]))];
  if (orgs.length > 1 && !wall) {
    facts.push({ key: 'orgs', label: 'model makers in this drop', value: String(orgs.length),
      what: orgs.slice(0, 3).join(', ') + (orgs.length > 3 ? ` +${orgs.length - 3}` : '') });
  }
  return facts;
}

/**
 * Who shipped this drop: one entry per model maker (the id's org), most models
 * first, with the maker's mark (or monogram), its name as the catalog gives it,
 * and how many of the drop's models are its.
 */
export function makersOf(added) {
  const by = new Map();
  for (const m of added) {
    const org = m.id.split('/')[0];
    if (!by.has(org)) by.set(org, { org, name: m.provider, file: markFor(org) || markOf(m), count: 0 });
    by.get(org).count += 1;
  }
  return [...by.values()].sort((a, b) => b.count - a.count);
}

const WALL_MAX = 18;
function wallScene(added, { id, start, dur, chapter }) {
  const makers = makersOf(added);
  const shown = makers.length > WALL_MAX ? makers.slice(0, WALL_MAX - 1) : makers;
  const rest = makers.length - shown.length;
  const cells = shown.length + (rest ? 1 : 0);
  const cols = cells <= 4 ? cells : cells <= 8 ? 4 : 6;
  const mk = cells <= 4 ? 120 : cells <= 8 ? 96 : cells <= 12 ? 80 : 64;
  return {
    id, start, dur, chapter, cls: 'wall',
    cam: { from: { scale: 1.03 }, to: { scale: 1 } },
    body: `<div class="head"><div>
        <div class="kicker"><i>${pad(makers.length)}</i>model makers in this drop</div>
        <div class="h4">${words('Who shipped')}</div></div>
        <div class="label">${added.length} models</div></div>
      <div class="grid" style="grid-template-columns:repeat(${cols},1fr);--mk:${mk}px">
        ${shown.map(k => `<div class="box maker"><div class="face">
          ${k.file ? markFile(k.file) : monogram(k.name)}
          <span class="who"${k.name.length > 13 ? ' style="font-size:20px"' : ''}>${esc(k.name)}</span>
          <span class="label">${k.count === 1 ? '1 model' : `${k.count} models`}</span></div></div>`).join('')}
        ${rest ? `<div class="box maker rest"><div class="face"><span class="more dotted">+${rest} more</span></div></div>` : ''}
      </div>`,
    inner: `
      slide(".head .kicker", 0.05, { x: -40 });
      rise(".head .h4", 0.1);
      type(".head > .label", 0.2);
      stamp(".maker", 0.35, ${r3(Math.min(0.08, 1.1 / cells))});`,
    // A tick for the first few stamps and a hit when the wall is complete — not a tick per tile.
    cues: [{ at: 0.35, kind: 'tick' }, { at: 0.5, kind: 'tick' }, { at: 0.65, kind: 'tick' },
      { at: r3(0.35 + Math.min(0.08, 1.1 / cells) * (cells - 1)), kind: 'hit' }],
  };
}

function summaryScene(added, { id, start, dur, chapter, wall }) {
  const facts = dropFacts(added, { wall });
  return {
    id, start, dur, chapter, cls: '',
    body: `<div class="sum">
      <div><div class="kicker"><i>Σ</i>the drop in numbers</div>
        <div class="num big hl">${added.length}</div>
        <div class="h3">${words(added.length === 1 ? 'new model' : 'new models')}</div></div>
      <div class="facts">${facts.map(f => `<div class="box fact${f.key === 'free' ? ' tone' : ''}"><div class="face">
        <div class="num">${esc(f.value)}</div>
        <div><div class="label">${esc(f.label)}</div><div class="what">${esc(f.what)}</div></div></div></div>`).join('')}
      </div></div>`,
    inner: `
      slide(".kicker", 0.05, { x: -40 });
      count(".big", ${added.length}, 0.1, 0.7);
      rise(".sum .h3", 0.5);
      stamp(".fact", 0.8, 0.2);`,
    cues: [{ at: 0.1, kind: 'rise', dur: 0.7 }, { at: 0.8, kind: 'hit' },
      ...facts.slice(1).map((_, i) => ({ at: r3(1.0 + i * 0.2), kind: 'tick' }))],
  };
}

// ── choosing and timing ────────────────────────────────────────────────────

/** Every model in the drop, in the plan's order (picks first), capped by limit. */
export function chooseModels(rel, plan = {}, flags = {}) {
  const pool = rel.added.length ? rel.added : rel.spotlight ? [rel.spotlight] : [];
  const byId = new Map(pool.map(m => [m.id, m]));
  const picked = (plan.picks ?? []).map(id => byId.get(id)).filter(Boolean);
  const order = [...picked, ...pool.filter(m => !picked.includes(m))];
  // An explicit limit wins; otherwise the picks ARE the selection; otherwise everything.
  const limit = parseInt(flags.limit ?? plan.limit ?? 0, 10);
  const count = limit > 0 ? limit : picked.length || order.length;
  return { pool, models: order.slice(0, count) };
}

/** Cut `content` seconds into `n` slots on the beat grid; the last takes the remainder, so it is never the short one. */
function slots(content, n) {
  const each = Math.max(BEAT, Math.floor(content / n / BEAT) * BEAT);
  return Array.from({ length: n }, (_, i) => (i < n - 1 ? each : r3(content - each * (n - 1))));
}

/**
 * The list film's plan of time: which of spotlight / pages / summary fit, and
 * how many rows can be read. The ledger always gets at least one page.
 */
export function listTiming(content, count, makers = 0) {
  let budget = content;
  // The lead's spotlight comes first: it only needs half a page left behind it.
  const spot = budget - SPOT_MIN >= pageMin(PER_PAGE / 2) && count > 1;
  if (spot) budget -= SPOT_MIN;
  // Then the wall of makers, then the numbers — each only if a full page still fits after it.
  const wall = makers > 1 && budget - WALL_MIN >= pageMin(PER_PAGE);
  if (wall) budget -= WALL_MIN;
  const sum = budget - SUM_MIN >= pageMin(PER_PAGE);
  if (sum) budget -= SUM_MIN;
  const rowsWanted = count - (spot ? 1 : 0);
  const perPage = budget >= pageMin(PER_PAGE) ? PER_PAGE
    : Math.max(1, Math.floor((budget - ROW_AT - PAGE_HOLD) / ROW_EVERY));
  const pages = Math.max(1, Math.min(Math.floor(budget / pageMin(perPage)), Math.ceil(rowsWanted / perPage)));
  const rows = Math.min(rowsWanted, pages * perPage);
  // Whatever time is left over is shared out: a little to the bookends, the rest to the pages.
  const spare = budget - pages * pageMin(perPage);
  const spotDur = spot ? Math.min(BOOKEND_MAX, SPOT_MIN + onGrid(spare * 0.25)) : 0;
  const sumDur = sum ? Math.min(BOOKEND_MAX, SUM_MIN + onGrid(spare * 0.2)) : 0;
  const wallDur = wall ? Math.min(BOOKEND_MAX, WALL_MIN + onGrid(spare * 0.2)) : 0;
  return { spot, wall, sum, perPage, pages, rows, spotDur, wallDur, sumDur, pagesDur: r3(content - spotDur - wallDur - sumDur) };
}

/** How many models a list film of this length can show and still be read. */
export const listCapacity = (duration, count = Infinity, makers = 0) => {
  const t = listTiming(duration - OPEN - END, count, makers);
  return t.rows + (t.spot ? 1 : 0);
};

export default {
  id: 'model-drop',
  title: 'Model drop',
  scheduled: true,

  async collect({ flags, dir, work }) {
    let raw, pool = null;
    if (flags.from) {
      raw = readJson(path.resolve(flags.from));
    } else {
      const r = await fetch(API);
      if (!r.ok) throw new Error(`${API} → HTTP ${r.status}`);
      raw = await r.json();
      try { pool = await (await fetch(POOL_API)).json(); } catch { /* optional */ }
    }
    const baseline = readJson(flags.baseline ? path.resolve(flags.baseline) : path.join(dir, 'baseline.json'));
    const { release, listed } = buildRelease(raw, pool, baseline, {
      all: !!flags.all, first: parseInt(flags.first ?? '5', 10),
    });
    // The catalog this diff was taken from becomes the next baseline — saved now
    // so `accept` promotes exactly what was filmed, not whatever is live later.
    fs.mkdirSync(work, { recursive: true });
    fs.writeFileSync(path.join(work, 'baseline.next.json'), JSON.stringify(baselineOf(listed), null, 2));
    console.log(report(release));
    return { ...release, notable: release.kind !== 'none', label: release.kind, parts: fingerprintParts(release) };
  },

  /** Promote the catalog the last `collect` saw to the baseline. */
  accept({ dir, work }) {
    const next = path.join(work, 'baseline.next.json');
    if (!fs.existsSync(next)) throw new Error('nothing collected yet — run collect first');
    fs.copyFileSync(next, path.join(dir, 'baseline.json'));
    console.log(`baseline accepted — ${readJson(next).ids.length} listed models recorded`);
  },

  /** What a plan may pick: every model in the drop. */
  items(rel) {
    const pool = rel.added.length ? rel.added : rel.spotlight ? [rel.spotlight] : [];
    return pool.map(m => ({
      id: m.id,
      label: `${m.name} · ${m.provider} · ${fmtPrice(m.inPrice)}/${fmtPrice(m.outPrice)} · ${fmtCtx(m.context)}`,
      // Quotable in a plan's copy. No date: its digits would vouch for any "30" or "2026" in a line.
      // Films of five or more show no prices, and drop any line that quotes one.
      detail: [m.category, m.free && 'free', dropOf(rel, m.id)].filter(Boolean).join(' · '),
    }));
  },

  film(rel, { plan = {}, flags = {} }) {
    const duration = parseFloat(flags.seconds ?? plan.seconds ?? 20);
    const { pool, models: chosen } = chooseModels(rel, plan, flags);
    if (!chosen.length) throw new Error('no models to film');
    const layout = layoutOf(chosen.length);
    const content = r3(duration - OPEN - END);
    const drop = rel.added.length;
    const t = rel.totals;

    // A spotlight that is a price move, not a new model, says so.
    const moved = !rel.added.length && rel.changed.find(c => c.id === chosen[0].id);
    const ctx = {
      rel, plan,
      what: moved ? { 'price-cut': 'price cut', 'price-rise': 'price update', context: 'context update' }[moved.kind] : 'new model',
      change: moved && (() => {
        const [a, b] = moved.from.split('@')[0].split('/').map(Number);
        return `${fmtPrice(a)} in · ${fmtPrice(b)} out`;
      })(),
    };

    let content_ = [], shown = [];
    if (layout === 'hero') {
      const m = chosen[0];
      shown = [m];
      if (drop > 1) ctx.more = `+${drop - 1} more in this drop`;
      if (content < NAME_MIN + 3.0) {
        content_ = [heroSpec(m, ctx, OPEN, content, { solo: true })];
      } else {
        const a = Math.min(Math.max(NAME_MIN, onGrid(content * 0.4)), 6);
        content_ = [heroName(m, ctx, OPEN, a), heroSpec(m, ctx, OPEN + a, r3(content - a), { solo: false })];
      }
    } else if (layout === 'cards') {
      const k = Math.max(1, Math.min(chosen.length, Math.floor(content / CARD_MIN)));
      shown = chosen.slice(0, k);
      const lens = slots(content, k);
      let at = OPEN;
      content_ = shown.map((m, i) => {
        const s = card(m, {
          rank: i + 1, of: shown.length, side: i % 2 ? 'b' : 'a',
          id: `s${pad(i + 1)}-${i ? 'model' : 'lead'}`, start: r3(at), dur: lens[i],
          chapter: `${pad(i + 1)} / ${pad(shown.length)} · ${m.name}`,
          kicker: `${m.provider}${day(m) ? ` · ${day(m)}` : ''}`,
          more: i === k - 1 && drop > k ? `+${drop - k} more in this drop` : null, ctx,
        });
        at += lens[i];
        return s;
      });
    } else {
      const everyone = rel.added.length ? rel.added : chosen;
      const tm = listTiming(content, chosen.length, makersOf(everyone).length);
      const lead = tm.spot ? chosen[0] : null;
      const rows = chosen.slice(tm.spot ? 1 : 0, (tm.spot ? 1 : 0) + tm.rows);
      shown = [...(lead ? [lead] : []), ...rows];
      const more = drop > shown.length ? `+${drop - shown.length} more in this drop` : null;
      const nScenes = (tm.spot ? 1 : 0) + (tm.wall ? 1 : 0) + tm.pages + (tm.sum ? 1 : 0);
      let at = OPEN, n = 0;
      const next = (dur) => { const s = r3(at); at += dur; n += 1; return s; };
      const chap = label => `${pad(n + 1)} / ${pad(nScenes)} · ${label}`;
      if (lead) {
        const newest = !plan.picks?.length && lead.created && pool.every(m => (m.created || 0) <= lead.created);
        content_.push(card(lead, {
          rank: 1, of: drop || 1, side: 'a', id: 's01-lead', chapter: chap(lead.name),
          kicker: `${newest ? 'newest in this drop' : 'lead'} · ${lead.provider}`,
          start: next(tm.spotDur), dur: tm.spotDur, more: null, ctx, rise: true, prices: false,
        }));
      }
      if (tm.wall) {
        content_.push(wallScene(everyone, {
          id: `s${pad(n + 1)}-makers`, chapter: chap('who shipped'), start: next(tm.wallDur), dur: tm.wallDur,
        }));
      }
      const pageLens = slots(tm.pagesDur, tm.pages);
      for (let p = 0; p < tm.pages; p++) {
        const slice = rows.slice(p * tm.perPage, (p + 1) * tm.perPage);
        const first = (lead ? 2 : 1) + p * tm.perPage;
        content_.push(ledgerPage(slice, {
          id: `s${pad(n + 1)}-ledger-${p + 1}`, chapter: chap(`the ledger ${p + 1}/${tm.pages}`),
          first, total: drop || chosen.length, page: p + 1, pages: tm.pages,
          more: p === tm.pages - 1 ? more : null, lines: plan.lines ?? {},
          start: next(pageLens[p]), dur: pageLens[p],
        }));
      }
      if (tm.sum) {
        content_.push(summaryScene(everyone, {
          id: `s${pad(n + 1)}-numbers`, chapter: chap('the drop in numbers'), start: next(tm.sumDur), dur: tm.sumDur, wall: tm.wall,
        }));
      }
    }

    const date = String(rel.generatedAt ?? '').slice(0, 10);
    const count = drop || chosen.length;
    // A hero film is about one model, so its bookends are too, even when the drop was bigger.
    const one = layout === 'hero';
    const lead = chosen[0];
    const open = openScene({
      kicker: plan.kicker ?? (one ? ctx.what : 'model drop'),
      meta: [date, one ? lead.id : `${count} new models`].filter(Boolean).join(' · '),
    });
    const bigText = plan.headline
      ?? (one ? (moved ? `${lead.name}: ${ctx.what}` : `${lead.name} is live`) : `${count} new models on one key`);
    const end = endScene(duration, {
      kicker: plan.kicker ?? (one ? `${ctx.what} · ${lead.provider}` : `model drop${date ? ` · ${date}` : ''}`),
      big: `<span class="${fit(bigText, [[28, 'e-l'], [56, 'e-m']], 'e-s')}">${esc(bigText)}</span>`,
      sub: `<b>${t.listed}</b> models · <b>${t.providers}+</b> providers · <b>${t.free}</b> free`,
      // The marks of the drop's makers (a hero's: its own). Only real marks — a monogram is not a logo.
      marks: [...new Set((one ? [lead] : rel.added.length ? rel.added : chosen).map(markOf).filter(Boolean))].slice(0, 12),
    });

    return {
      title: 'AnyRouter — model drop',
      duration,
      tone: 'org',
      palette: 'drop',
      label: 'MODEL DROP',
      layout,
      css: CSS + `
  .e-l{font-size:88px}.e-m{font-size:68px}.e-s{font-size:54px;letter-spacing:-.035em}`,
      scenes: [open, ...content_, end],
      // Marks need no listing: writeFilm copies every assets/providers/*.svg a scene references.
      summary: `${layout}  (${shown.length} of ${count} model${count === 1 ? '' : 's'} shown)`,
    };
  },

  // A changelog is read as a list, so the headline is the whole job. It leads
  // with what shipped, never with the internal release id.
  headline(rel, plan = {}) {
    if (plan.headline) return plan.headline;
    const short = id => id.split('/').pop();
    const { added, changed, removed } = rel;
    if (added.length === 1) {
      return added[0].free ? `${added[0].id} is now free on AnyRouter` : `${added[0].id} is live on AnyRouter`;
    }
    if (added.length > 1) {
      return `${added.length} new models: ${added.slice(0, 3).map(m => short(m.id)).join(', ')}${added.length > 3 ? ` +${added.length - 3} more` : ''}`;
    }
    const cut = changed.find(c => c.kind === 'price-cut');
    if (cut) {
      const p = dropPct(cut.from, cut.to);
      return p ? `Price drop: ${short(cut.id)} down ${p}%` : `Price drop: ${short(cut.id)}`;
    }
    const rise = changed.find(c => c.kind === 'price-rise');
    if (rise) return `Pricing update: ${short(rise.id)}`;
    if (changed.length) return `Context windows updated on ${short(changed[0].id)}`;
    return `Catalog update: ${removed.length} model(s) retired`;
  },

  notes(rel, plan = {}) {
    return [
      plan.share,
      `**New:** ${rel.added.map(m => `\`${m.id}\`${m.free ? ' (free)' : ''}`).join(', ') || '—'}`,
      rel.changed.length && `**Pricing:** ${rel.changed.map(c => `\`${c.id}\` ${c.from} → ${c.to}`).join(', ')}`,
      rel.removed.length && `**Retired:** ${rel.removed.map(id => `\`${id}\``).join(', ')}`,
      plan.rationale && `_Why this story: ${plan.rationale}_`,
    ].filter(Boolean);
  },
};

/** "price down N%" for a model whose price fell in this release, else null. */
function dropOf(rel, id) {
  const c = rel.changed?.find(x => x.id === id && x.kind === 'price-cut');
  const p = c && dropPct(c.from, c.to);
  return p ? `price down ${p}%` : null;
}

/** Largest drop across both price axes ("in/out@ctx"), or null if neither fell. */
export function dropPct(from, to) {
  const axes = s => String(s).split('@')[0].split('/').map(Number);
  const [a, b] = [axes(from), axes(to)];
  const drops = [0, 1]
    .filter(i => Number.isFinite(a[i]) && Number.isFinite(b[i]) && a[i] > 0)
    .map(i => Math.round(((a[i] - b[i]) / a[i]) * 100))
    .filter(v => v > 0);
  return drops.length ? Math.max(...drops) : null;
}
