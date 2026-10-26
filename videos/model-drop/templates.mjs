/**
 * model-drop :: templates — the scenes a model-drop film is cut from.
 */
import { esc, words, chars, OPEN, END, BEAT } from '../../lib/film.mjs';
import { markFor, monogram } from '../../lib/marks.mjs';
import {
  r3, onGrid, pad, fmtCtx, day, isAlias, followsOf, tally, aliasWord, countLine,
  markOf, markFile, tile, freeTag, aliasTag, nameSize, DOLLARS, ledeOf, specBoxes, specPlain, specTable,
} from './parts.mjs';

// ── timing (seconds) ────────────────────────────────────────────────────────
const PAGE_HOLD = 2.0;     // a ledger page holds this long after its last row lands
const ROW_AT = 0.5;        // the first row lands after the header
const ROW_EVERY = 0.25;    // then one row every half beat
export const PER_PAGE = 6;
const SPOT_MIN = 3.5;      // the lead's spotlight (≥5)
const SUM_MIN = 3.5;       // the drop in numbers (≥5)
const WALL_MIN = 3.0;      // who shipped (≥5, more than one maker)
const BOOKEND_MAX = 6;     // neither of those grows past this; spare time goes to the ledger
export const CARD_MIN = 3.0;      // one card (2..4)
export const NAME_MIN = 2.5;      // the hero's name scene
const pageMin = rows => ROW_AT + rows * ROW_EVERY + PAGE_HOLD;

// ── the scenes ─────────────────────────────────────────────────────────────

/** Hero, part one: the name. Tile stamps, the name rises, the id types, the camera pushes in. */
export function heroName(m, ctx, start, dur) {
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
export function heroSpec(m, ctx, start, dur, { solo }) {
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
export function card(m, { rank, of, side, id, start, dur, chapter, kicker, more, ctx, rise: into, prices = true }) {
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
export function ledgerPage(rows, { id, start, dur, rank, heading, page, pages, more, chapter, lines = {} }) {
  const note = m => (lines[m.id] && !DOLLARS.test(lines[m.id]) ? `<div class="note">${esc(lines[m.id])}</div>`
    : isAlias(m) && followsOf(m) ? `<div class="note">follows ${esc(followsOf(m))}</div>`
    : `<div class="note org">${esc(m.provider)}</div>`);
  const row = (m, i) => {
    const t = ROW_AT + i * ROW_EVERY;
    return { t, html: `<div class="lr r${i}${isAlias(m) ? ' al' : ''}"><div class="rl"></div>
      <span class="rk">${rank(m)}</span>${tile(m)}
      <div class="nmc"><div class="nm${m.name.length > 22 ? ' s' : ''}">${esc(m.name)}</div><div class="id">${esc(m.id)}</div></div>
      ${note(m)}
      <div class="fig">${fmtCtx(m.context)}</div>
      <div class="st">${isAlias(m) ? aliasTag : ''}${m.free ? freeTag : ''}</div></div>` };
  };
  const printed = rows.map(row);
  return {
    id, start, dur, chapter, cls: 'ledger',
    cam: { from: { scale: 1.02, rotateX: 1 }, to: { scale: 1, rotateX: -0.6 } },
    body: `<div class="head"><div>
        <div class="kicker"><i>${pad(page)}/${pad(pages)}</i>${esc(heading)}</div>
        <div class="h4">${words('The ledger')}</div></div>
        </div>
      <div class="lt">
        <div class="lr hd"><span></span><span></span><span class="label" style="text-align:left">model · id</span>
          <span class="label" style="text-align:left">${Object.keys(lines).length || rows.some(isAlias) ? 'provider · note' : 'provider'}</span><span class="label">context</span><span></span></div>
        ${printed.map(p => p.html).join('')}
      </div>
      ${more ? `<div class="tail"><span class="more dotted">${esc(more)}</span><span class="label">anyrouter.dev/models</span></div>` : ''}`,
    inner: `
      slide(".head .kicker", 0.05, { x: -40 });
      rise(".head .h4", 0.1);
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
export function dropFacts(all, { wall = false } = {}) {
  const facts = [];
  // Aliases are not new models: every fact is about the models (aliases only if there is nothing else).
  const models = all.filter(m => !isAlias(m));
  const added = models.length ? models : all;
  const of = models.length ? 'new models' : 'aliases';
  const tie = (list, pick) => {
    const top = list.filter(m => pick(m) === pick(list[0]));
    return top.length > 1 ? `${list[0].name} +${top.length - 1} tied` : list[0].name;
  };
  const free = added.filter(m => m.free);
  if (free.length) {
    facts.push({ key: 'free', label: `free · ${of}`, value: String(free.length),
      what: free.length === 1 ? free[0].name : `${free[0].name} +${free.length - 1} more` });
  }
  const ctxs = added.filter(m => m.context).sort((a, b) => b.context - a.context);
  if (ctxs.length) {
    facts.push({ key: 'context', label: `largest context · ${of}`, value: fmtCtx(ctxs[0].context), what: tie(ctxs, m => m.context) });
  }
  // No prices here: a many-model film is about which models, not what they cost.
  const cats = Object.entries(added.reduce((o, m) => (m.category ? { ...o, [m.category]: (o[m.category] ?? 0) + 1 } : o), {}))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (cats.length > 1) {
    facts.push({ key: 'categories', label: `categories · ${of}`, value: String(cats.length),
      what: cats.map(([c, n]) => `${n} ${c}`).join(' · ') });
  }
  // Model makers: the part of the id before the "/". Not the site's provider
  // claim (PROVIDER_CLAIM) — a different number, so a different label.
  const orgs = [...new Set(added.map(m => m.id.split('/')[0]))];
  if (orgs.length > 1 && !wall) {
    facts.push({ key: 'orgs', label: `makers · ${of}`, value: String(orgs.length),
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
    if (!by.has(org)) by.set(org, { org, name: m.provider, file: markFor(org) || markOf(m), count: 0, models: 0, aliases: 0 });
    const k = by.get(org);
    k.count += 1;
    k[isAlias(m) ? 'aliases' : 'models'] += 1;
  }
  return [...by.values()].sort((a, b) => b.models - a.models || b.aliases - a.aliases);
}

const WALL_MAX = 18;
export function wallScene(added, { id, start, dur, chapter }) {
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
        <div class="kicker"><i>${pad(makers.length)}</i>${makers.some(k => !k.models)
          ? `makers in this drop · ${makers.filter(k => k.models).length} with new models` : 'model makers in this drop'}</div>
        <div class="h4">${words('Who shipped')}</div></div>
        <div class="label">${esc(countLine(added))}</div></div>
      <div class="grid" style="grid-template-columns:repeat(${cols},1fr);--mk:${mk}px">
        ${shown.map(k => `<div class="box maker"><div class="face">
          ${k.file ? markFile(k.file) : monogram(k.name)}
          <span class="who"${k.name.length > 13 ? ' style="font-size:20px"' : ''}>${esc(k.name)}</span>
          <span class="label">${esc([k.models && `${k.models} model${k.models === 1 ? '' : 's'}`,
            k.aliases && `${k.aliases} alias${k.aliases === 1 ? '' : 'es'}`].filter(Boolean).join(' · '))}</span></div></div>`).join('')}
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

export function summaryScene(added, { id, start, dur, chapter, wall }) {
  const facts = dropFacts(added, { wall });
  const { models, aliases } = tally(added);
  // The numeral counts models; aliases are said beside it, never added to it.
  const n = models || aliases;
  const noun = models ? (models === 1 ? 'new model' : 'new models') : aliasWord(added, aliases);
  return {
    id, start, dur, chapter, cls: '',
    body: `<div class="sum">
      <div><div class="kicker"><i>Σ</i>the drop in numbers</div>
        <div class="num big hl">${n}</div>
        <div class="h3">${words(noun)}</div>
        ${models && aliases ? `<div class="more dotted" style="margin-top:26px">+ ${aliases} ${esc(aliasWord(added, aliases))}</div>` : ''}</div>
      <div class="facts">${facts.map(f => `<div class="box fact${f.key === 'free' ? ' tone' : ''}"><div class="face">
        <div class="num">${esc(f.value)}</div>
        <div><div class="label">${esc(f.label)}</div><div class="what">${esc(f.what)}</div></div></div></div>`).join('')}
      </div></div>`,
    inner: `
      slide(".kicker", 0.05, { x: -40 });
      count(".big", ${n}, 0.1, 0.7);
      rise(".sum .h3", 0.5);
      slide(".sum .more", 0.7, { x: -30 });
      stamp(".fact", 0.8, 0.2);`,
    cues: [{ at: 0.1, kind: 'rise', dur: 0.7 }, { at: 0.8, kind: 'hit' },
      ...facts.slice(1).map((_, i) => ({ at: r3(1.0 + i * 0.2), kind: 'tick' }))],
  };
}

/** Cut `content` seconds into `n` slots on the beat grid; the last takes the remainder, so it is never the short one. */
export function slots(content, n) {
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
