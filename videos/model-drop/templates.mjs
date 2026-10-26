/**
 * model-drop :: templates — the scenes a model-drop film is cut from.
 */
import { esc, words, chars, fit, logo, openScene, endScene, OPEN, END, BEAT } from '../../lib/film.mjs';
import { markFor, monogram } from '../../lib/marks.mjs';
import {
  r3, onGrid, pad, fmtCtx, fmtPrice, day, isAlias, followsOf, tally, aliasWord, countLine, moreLine, dropPct, apiOf, aModel,
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

/**
 * The spec sheet — the numbers stamp, the lede rises, the catalog it joins. A
 * film of five or more shows no prices, so its sheet is context and category.
 */
export function heroSpec(m, ctx, start, dur) {
  const prices = ctx.layout !== 'list';
  const lede = ledeOf(m, ctx.plan, 220, { prices });
  const t = ctx.rel.totals;
  return {
    id: 'sc-spec', start, dur, chapter: `${m.name} · spec`, cls: 'hspec',
    body: `<div class="head"><div><div class="kicker"><i>01</i>${esc(ctx.what)} · spec</div>
       <div class="h3" style="margin-top:14px">${words(m.name)}</div><div class="idcode">${chars(m.id)}</div></div>${tile(m)}</div>
      <div class="rule"></div>
      ${prices ? specBoxes(m) : specPlain(m)}
      ${ctx.change && prices ? `<div class="label" style="margin-top:26px">was ${esc(ctx.change)}</div>` : ''}
      ${lede ? `<div class="lede${lede.length > 120 ? ' sm' : ''}">${words(lede)}</div>` : ''}
      <div class="foot label"><span><b>${t.listed}</b> models listed</span><span><b>${t.free}</b> free</span><span><b>${t.providers}+</b> providers</span>
        ${ctx.more ? `<span class="more dotted">${esc(ctx.more)}</span>` : ''}</div>`,
    inner: `
      slide(".kicker", 0.05, { x: -40 });
      rise(".head .h3", 0.1);
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


/** How many models a list's news slot of `seconds` can show and still be read. */
export const listCapacity = (seconds, count = Infinity, makers = 0) => {
  const t = listTiming(seconds, count, makers);
  return t.rows + (t.spot ? 1 : 0);
};

// ── news, classic: the hero's name, the cards, or the list, as they always were ──
// A list keeps its whole story: the lead, who shipped, a page of the ledger, the drop in numbers.
const listMin = ctx => SPOT_MIN + (makersOf(ctx.everyone).length > 1 ? WALL_MIN : 0) + pageMin(PER_PAGE) + SUM_MIN;

function newsClassic(ctx, { start, dur }) {
  const { chosen, everyone, layout, plan, pool } = ctx;
  const hidden = shown => everyone.filter(m => !shown.includes(m));
  if (layout === 'hero') return [heroName(ctx.lead, ctx, start, dur)];
  if (layout === 'cards') {
    const k = Math.max(1, Math.min(chosen.length, Math.floor(dur / CARD_MIN)));
    const shown = chosen.slice(0, k);
    const lens = slots(dur, k);
    let at = start;
    return shown.map((m, i) => {
      const s = card(m, {
        rank: i + 1, of: shown.length, side: i % 2 ? 'b' : 'a',
        id: `s${pad(i + 1)}-${i ? 'model' : 'lead'}`, start: r3(at), dur: lens[i],
        chapter: `${pad(i + 1)} / ${pad(shown.length)} · ${m.name}`,
        kicker: `${isAlias(m) ? 'alias · ' : ''}${m.provider}${day(m) ? ` · ${day(m)}` : ''}`,
        more: i === k - 1 ? moreLine(hidden(shown)) : null, ctx,
      });
      at += lens[i];
      return s;
    });
  }
  const tm = listTiming(dur, chosen.length, makersOf(everyone).length);
  const lead = tm.spot ? chosen[0] : null;
  const rows = chosen.slice(tm.spot ? 1 : 0, (tm.spot ? 1 : 0) + tm.rows);
  const more = moreLine(hidden([...(lead ? [lead] : []), ...rows]));
  // Models and aliases are numbered apart, so a rank never counts an alias as a model.
  const rankOf = new Map();
  let nm = 0, na = 0;
  for (const m of chosen) rankOf.set(m, isAlias(m) ? `A${pad(++na)}` : pad(++nm));
  const nScenes = (tm.spot ? 1 : 0) + (tm.wall ? 1 : 0) + tm.pages + (tm.sum ? 1 : 0);
  const out = [];
  let at = start;
  const next = d => { const s = r3(at); at += d; return s; };
  const chap = label => `${pad(out.length + 1)} / ${pad(nScenes)} · ${label}`;
  if (lead) {
    const newest = !plan.picks?.length && !isAlias(lead) && lead.created
      && pool.filter(m => !isAlias(m)).every(m => (m.created || 0) <= lead.created);
    const kin = tally(everyone);
    out.push(card(lead, {
      rank: 1, of: (isAlias(lead) ? kin.aliases : kin.models) || 1, side: 'a', id: 's01-lead', chapter: chap(lead.name),
      kicker: `${newest ? 'newest in this drop' : isAlias(lead) ? 'alias' : 'lead'} · ${lead.provider}`,
      start: next(tm.spotDur), dur: tm.spotDur, more: null, ctx, rise: true, prices: false,
    }));
  }
  if (tm.wall) {
    out.push(wallScene(everyone, { id: `s${pad(out.length + 1)}-makers`, chapter: chap('who shipped'), start: next(tm.wallDur), dur: tm.wallDur }));
  }
  const pageLens = slots(tm.pagesDur, tm.pages);
  for (let p = 0; p < tm.pages; p++) {
    out.push(ledgerPage(rows.slice(p * tm.perPage, (p + 1) * tm.perPage), {
      id: `s${pad(out.length + 1)}-ledger-${p + 1}`, chapter: chap(`the ledger ${p + 1}/${tm.pages}`),
      rank: m => rankOf.get(m), heading: countLine(everyone), page: p + 1, pages: tm.pages,
      more: p === tm.pages - 1 ? more : null, lines: plan.lines ?? {},
      start: next(pageLens[p]), dur: pageLens[p],
    }));
  }
  if (tm.sum) {
    out.push(summaryScene(everyone, { id: `s${pad(out.length + 1)}-numbers`, chapter: chap('the drop in numbers'), start: next(tm.sumDur), dur: tm.sumDur, wall: tm.wall }));
  }
  return out;
}

// ── the slots: hook · news · compare · howto · cta ─────────────────────────
// A template's `line` is its voice-over, written from the facts the voice may
// quote (kind.mjs `facts`); a list of lines is a preference order, and the first
// that passes the voice gate is spoken. Films of five or more quote no prices.
const always = () => true;
const priced = ctx => ctx.layout !== 'list';
const upTo3 = (rel, ctx) => ctx.chosen.length <= 3;
const andList = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const countWords = f => [f.count.models && plural(f.count.models, 'new model'),
  f.count.aliases && `${f.count.aliases} new alias${f.count.aliases === 1 ? '' : 'es'}`].filter(Boolean).join(' and ');
const priceWords = m => `${fmtPrice(m.inPrice)} in and ${fmtPrice(m.outPrice)} out per 1M tokens`;
// The hook and the news name the lead; after them a one-model film says "it".
const subject = (f, ctx) => (ctx.one ? 'It' : f.lead.name);

/** The one figure the count hook can stand on: a price cut, the drop's size, or the lead's context. */
function figureOf(ctx) {
  const pct = ctx.moved && dropPct(ctx.moved.from, ctx.moved.to);
  if (pct) return { to: pct, digits: 0, suffix: '%', label: `price cut · ${ctx.lead.name}` };
  if (!ctx.one) {
    const n = ctx.kinds.models || ctx.kinds.aliases;
    return { to: n, digits: 0, suffix: '', label: countLine(ctx.everyone).split(' · ')[0].replace(/^\d+ /, '') };
  }
  const shown = /^([\d.]+)([KM]?)$/.exec(fmtCtx(ctx.lead.context));
  return shown && { to: +shown[1], digits: (shown[1].split('.')[1] ?? '').length, suffix: shown[2], label: 'token context window' };
}

/**
 * A shell or a code card: ink face, paper type. Lines print left to right, one
 * after another. The type shrinks so the longest line fits the stage (mono is 0.6em a glyph).
 */
const codeCard = (head, rows, { prompt = false } = {}) => `<div class="box tone code"><div class="face">
    <div class="ch label">${esc(head)}</div>
    <div class="src" style="font-size:${Math.min(30, Math.floor(1530 / (0.6 * Math.max(...rows.map(r => r.length + (prompt ? 2 : 0))))))}px">${rows.map((r, i) => `<div class="ln l${i}">${prompt && !r.startsWith(' ') ? '<span class="p">$</span> ' : ''}${esc(r)}</div>`).join('')}</div>
  </div></div>`;
const codeInner = (n, at = 0.45) => `
      slide(".kicker", 0.05, { x: -40 });
      rise(".h3", 0.1);
      stamp(".code", 0.3);
      tl.fromTo(Q(".src .ln"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.32, ease: "steps(14)", stagger: 0.26 }, ${at});`;
const codeCues = (n, at = 0.45) => [{ at: 0.3, kind: 'hit' }, ...Array.from({ length: n }, (_, i) => ({ at: r3(at + i * 0.26), kind: 'tick' }))];
const howHead = (ctx, what) => `<div class="kicker"><i>›_</i>how to call it · ${esc(what)}</div>
      <div class="h3" style="margin-top:14px">${words(ctx.lead.name)}</div>`;

const ctaLock = `<div class="lock">${logo()}<b>AnyRouter</b></div>`;
const ctaCues = [{ at: 0.8, kind: 'hit' }, { at: 1.2, kind: 'end' }];

export const TEMPLATES = [
  // ── hook ──
  {
    id: 'print', slot: 'hook', fits: always, minDur: OPEN,
    scene: (ctx, { dur }) => openScene({ kicker: ctx.kicker, meta: ctx.openMeta, dur }),
    line: (f, ctx) => (!ctx.one ? `${countWords(f)} just landed on AnyRouter.`
      : f.change ? `${f.lead.name}: a ${ctx.what} on AnyRouter.`
      : f.lead.alias ? `A new alias on AnyRouter: ${f.lead.name}.` : `New on AnyRouter: ${f.lead.name}, from ${f.lead.provider}.`),
  },
  {
    id: 'headline', slot: 'hook', fits: always, minDur: 3,
    scene: (ctx, { start, dur }) => ({
      id: 's00-headline', start, dur, chapter: 'OPEN', cls: 'hline', cam: { from: { scale: 1.05 }, to: { scale: 1 } },
      body: `<div class="kicker"><i>00</i>${esc(ctx.kicker)}</div>
        <div class="big ${fit(ctx.bigText, [[20, 'hb-l'], [34, 'hb-m']], 'hb-s')}">${words(ctx.bigText)}</div>
        <div class="band dots"></div>
        <div class="meta label">${chars(ctx.openMeta)}</div>`,
      inner: `
        slide(".kicker", 0.05, { x: -40 });
        rise(".big", 0.2, 0.09, 0.7);
        grow(".band", 0.85, 0, 0.5);
        type(".meta .c", 1.1, 0.012);`,
      cues: [{ at: 0.2, kind: 'rise', dur: 0.6 }, { at: 0.8, kind: 'hit' }, { at: 1.1, kind: 'type', dur: 0.5 }],
    }),
    line: (f, ctx) => (!ctx.one ? `${countWords(f)}, all on a single AnyRouter key.`
      : f.change ? `${f.lead.name} has a ${ctx.what} on AnyRouter.` : `${f.lead.name} is live on AnyRouter.`),
  },
  {
    id: 'terminal', slot: 'hook', fits: always, minDur: 3.5,
    scene: (ctx, { start, dur }) => {
      const m = ctx.lead;
      const cmd = `anyr models show ${m.id}`;
      // What `anyr models show` prints, in the film's own figures; its provider list is left out.
      const rows = [['id', m.id], ['name', m.name], ['context', fmtCtx(m.context)],
        ...(priced(ctx) ? [['price', `${fmtPrice(m.inPrice)} in / ${fmtPrice(m.outPrice)} out per 1M tokens`]] : [])];
      const typed = r3(0.4 + cmd.length * 0.02);
      return {
        id: 's00-terminal', start, dur, chapter: 'OPEN', cls: 'term',
        body: `<div class="kicker"><i>$_</i>${esc(ctx.kicker)}</div>
          <div class="box tone code shell"><div class="face">
            <div class="cmd ${fit(cmd, [[46, 'cm-l'], [60, 'cm-m']], 'cm-s')}"><span class="p">$</span> ${chars(cmd)}</div>
            ${rows.map(([k, v], i) => `<div class="out o${i}"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join('')}
          </div></div>`,
        inner: `
          slide(".kicker", 0.05, { x: -40 });
          stamp(".shell", 0.15);
          type(".cmd .c", 0.4, 0.02);
          slide(".out", ${r3(typed + 0.15)}, { x: -24 }, 0.12, 0.3);`,
        cues: [{ at: 0.15, kind: 'hit' }, { at: 0.4, kind: 'type', dur: r3(typed - 0.4) },
          ...rows.map((_, i) => ({ at: r3(typed + 0.15 + i * 0.12), kind: 'tick' }))],
      };
    },
    line: (f, ctx) => (ctx.one ? `${f.lead.name} is in the AnyRouter catalog. Look it up from your terminal.`
      : `${countWords(f)} in the AnyRouter catalog, starting with ${f.lead.name}.`),
  },
  {
    id: 'count', slot: 'hook', fits: (rel, ctx) => !!figureOf(ctx), minDur: 3,
    scene: (ctx, { start, dur }) => {
      const g = figureOf(ctx);
      const shown = `${g.to.toFixed(g.digits)}${g.suffix}`;
      return {
        id: 's00-count', start, dur, chapter: 'OPEN', cls: 'cnt', cam: { from: { scale: 1.06 }, to: { scale: 1 } },
        body: `<div class="kicker"><i>#</i>${esc(ctx.kicker)}</div>
          <div class="num big hl">${shown}</div>
          <div class="h3">${words(g.label)}</div>
          <div class="who">${tile(ctx.lead)}<div class="h4">${esc(ctx.one ? ctx.lead.name : `led by ${ctx.lead.name}`)}</div></div>`,
        inner: `
          slide(".kicker", 0.05, { x: -40 });
          count(".big", ${g.to}, 0.15, 0.9, v => v.toFixed(${g.digits}) + ${JSON.stringify(g.suffix)});
          rise(".h3", 0.6);
          stamp(".who .tile", 0.9);
          slide(".who .h4", 1.0, { x: -30 });`,
        cues: [{ at: 0.15, kind: 'rise', dur: 0.9 }, { at: 1.05, kind: 'hit' }],
      };
    },
    line: (f, ctx) => {
      const g = figureOf(ctx);
      if (g.suffix === '%') return g.to === 100 ? `${f.lead.name} is now free on AnyRouter: a 100% price cut.` : `${f.lead.name} is now ${g.to}% cheaper on AnyRouter.`;
      if (!ctx.one) return `${countWords(f)} on AnyRouter, from ${plural(f.makers, 'maker')}.`;
      return `${f.lead.name} reads up to ${fmtCtx(f.lead.context)} tokens of context, and it is new on AnyRouter.`;
    },
  },

  // ── news ──
  {
    id: 'classic', slot: 'news', fits: always,
    minDur: ctx => (ctx.layout === 'hero' ? NAME_MIN : ctx.layout === 'cards' ? CARD_MIN * ctx.chosen.length : listMin(ctx)),
    scene: newsClassic,
    line: (f, ctx) => {
      if (ctx.layout === 'hero') {
        if (f.lead.alias) return `${f.lead.name} is a new alias on AnyRouter.`;
        return [f.excerpt, `${f.lead.name} is ${aModel(f.lead.category)} from ${f.lead.provider}.`].filter(Boolean);
      }
      if (ctx.layout === 'cards') return `Leading this drop: ${andList(f.models.map(m => m.name))}.`;
      return f.count.models ? `${plural(f.count.models, 'new model')} from ${plural(f.makers, 'maker')}, led by ${f.lead.name}.`
        : `${countWords(f)}, led by ${f.lead.name}.`;
    },
  },
  {
    id: 'spotlight', slot: 'news', fits: upTo3, minDur: 3.5,
    scene: (ctx, { start, dur }) => {
      const ms = ctx.chosen;
      const one = ms.length === 1;
      return {
        id: 's01-spotlight', start, dur, chapter: one ? ctx.lead.name : `${ms.length} models`, cls: 'spot-s',
        body: `<div class="kicker"><i>01</i>${esc(ctx.what)}${one ? ` · ${esc(ctx.lead.provider)}` : ''}</div>
          <div class="spot n${ms.length}">${ms.map(m => `<div class="sp">${tile(m, 'tone')}<div>
            <div class="nm ${one ? nameSize(m.name, [[14, 'n-l'], [22, 'n-m']], 'n-s') : fit(m.name, [[12, 'sp-m']], 'sp-s')}">${words(m.name)}</div>
            <div class="chips"><span class="pill">${esc(m.provider)}</span>${m.category ? `<span class="pill">${esc(m.category)}</span>` : ''}<span class="pill">${fmtCtx(m.context)} context</span>${isAlias(m) ? aliasTag : ''}${m.free ? freeTag : ''}</div>
          </div></div>`).join('')}</div>`,
        inner: `
          slide(".kicker", 0.05, { x: -40 });
          stamp(".sp .tile", 0.15, 0.15);
          rise(".nm", 0.35, 0.06, 0.65);
          stamp(".chips .pill", 0.9, 0.08);`,
        cues: [{ at: 0.15, kind: 'hit' }, { at: 0.4, kind: 'rise', dur: 0.5 }, { at: 0.9, kind: 'tick' }, { at: 1.05, kind: 'tick' }],
      };
    },
    line: (f, ctx) => (ctx.one ? `Meet ${f.lead.name}, ${aModel(f.lead.category)} from ${f.lead.provider}.`
      : `Meet ${andList(f.models.map(m => m.name))}.`),
  },
  {
    id: 'dossier', slot: 'news', fits: upTo3, minDur: 3.5,
    scene: (ctx, { start, dur }) => {
      const ms = ctx.chosen;
      const fields = [['model', m => m.name], ['id', m => m.id], ['maker', m => m.provider],
        ['category', m => m.category ?? '—'], ['context', m => fmtCtx(m.context)], ['listed', m => day(m) ?? '—']];
      // A value never wraps or clips: the type shrinks to fit the longest id in its column (mono is 0.6em a glyph).
      const col = (1620 - 200 - 34 * ms.length) / ms.length;
      const vs = Math.min(ms.length === 1 ? 36 : 28, Math.floor(col / (0.6 * Math.max(...ms.map(m => m.id.length)))));
      return {
        id: 's01-dossier', start, dur, chapter: `on file · ${ctx.lead.name}`, cls: 'dossier',
        body: `<div class="kicker"><i>01</i>on file · ${esc(ctx.what)}</div>
          <div class="dos" style="--n:${ms.length};--vs:${vs}px">${fields.map(([k, v], r) => `<div class="row r${r}${k === 'model' ? ' name' : ''}"><span class="label">${k}</span>${ms
            .map(m => `<span class="v">${chars(v(m))}</span>`).join('')}</div>`).join('')}</div>`,
        inner: `
          slide(".kicker", 0.05, { x: -40 });
          tl.fromTo(Q(".dos .row"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.3, ease: "steps(10)", stagger: 0.2 }, 0.2);
          ${fields.map((_, r) => `type(".r${r} .v .c", ${r3(0.35 + r * 0.2)}, 0.008);`).join('\n          ')}`,
        cues: [{ at: 0.2, kind: 'type', dur: r3(fields.length * 0.2 + 0.2) }],
      };
    },
    line: (f, ctx) => (ctx.one ? `On file: ${f.lead.name}, by ${f.lead.provider}, with a ${fmtCtx(f.lead.context)} token context window.`
      : `On file: ${andList(f.models.map(m => m.name))}, each with its maker and context window.`),
  },

  // ── compare ──
  {
    id: 'specsheet', slot: 'compare', fits: always, minDur: 3.5,
    scene: (ctx, { start, dur }) => heroSpec(ctx.lead, ctx, start, dur),
    line: (f, ctx) => (priced(ctx) ? `${subject(f, ctx)} costs ${priceWords(f.lead)}, with a ${fmtCtx(f.lead.context)} context window.`
      : `${f.lead.name} reads up to ${fmtCtx(f.lead.context)} tokens of context.`),
  },
  {
    id: 'table', slot: 'compare', fits: always, minDur: 3,
    scene: (ctx, { start, dur }) => {
      const m = ctx.lead;
      const cells = priced(ctx) ? null : [['context', fmtCtx(m.context)], ['category', m.category ?? '—'], ['status', m.free ? 'free' : isAlias(m) ? 'alias' : 'listed']];
      return {
        id: 'sc-table', start, dur, chapter: `${m.name} · spec`, cls: 'hspec',
        body: `<div class="head"><div><div class="kicker"><i>01</i>${esc(ctx.what)} · the numbers</div>
            <div class="h3" style="margin-top:14px">${words(m.name)}</div><div class="idcode">${chars(m.id)}</div></div>${tile(m)}</div>
          ${cells ? `<div class="stab">${cells.map(([k, v]) => `<div class="sc"><div class="label">${k}</div><div class="num">${esc(v)}</div></div>`).join('')}</div>` : specTable(m)}
          ${ctx.change && priced(ctx) ? `<div class="label" style="margin-top:26px">was ${esc(ctx.change)}</div>` : ''}`,
        inner: `
          slide(".kicker", 0.05, { x: -40 });
          rise(".head .h3", 0.1);
          type(".idcode .c", 0.3, 0.01);
          stamp(".head .tile", 0.2);
          tl.fromTo(Q(".stab"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.6, ease: "steps(14)" }, 0.6);
          stamp(".stab .pill", 1.3);`,
        cues: [{ at: 0.2, kind: 'tick' }, { at: 0.6, kind: 'type', dur: 0.6 }, ...(m.free ? [{ at: 1.3, kind: 'hit' }] : [])],
      };
    },
    line: (f, ctx) => (priced(ctx) ? `Per 1M tokens: ${fmtPrice(f.lead.inPrice)} in, ${fmtPrice(f.lead.outPrice)} out. Context: ${fmtCtx(f.lead.context)} tokens.`
      : `Context for ${f.lead.name}: ${fmtCtx(f.lead.context)} tokens.`),
  },
  {
    id: 'beforeafter', slot: 'compare', fits: (rel, ctx) => !!ctx.moved && ctx.axes.length > 0 && priced(ctx), minDur: 3.5,
    scene: (ctx, { start, dur }) => {
      const m = ctx.lead;
      const pct = dropPct(ctx.moved.from, ctx.moved.to);
      const show = (axis, v) => (axis === 'context' ? fmtCtx(v) : fmtPrice(v));
      return {
        id: 'sc-beforeafter', start, dur, chapter: `${m.name} · what changed`, cls: 'ba',
        body: `<div class="head"><div><div class="kicker"><i>Δ</i>${esc(ctx.what)} · what changed</div>
            <div class="h3" style="margin-top:14px">${words(m.name)}</div></div>${tile(m)}</div>
          <div class="rows">${ctx.axes.map((a, i) => `<div class="row a${i}"><span class="label">${a.axis === 'context' ? 'context' : `${a.axis} / 1M tokens`}</span>
            <span class="num old">${show(a.axis, a.from)}</span><span class="arrow">→</span><span class="num new">${show(a.axis, a.to)}</span></div>`).join('')}</div>
          ${pct ? `<div class="pct"><span class="pill hot">price down ${pct}%</span></div>` : ''}`,
        inner: `
          slide(".kicker", 0.05, { x: -40 });
          rise(".h3", 0.1);
          stamp(".head .tile", 0.2);
          ${ctx.axes.map((_, i) => `slide(".a${i} .label, .a${i} .old", ${r3(0.45 + i * 0.35)}, { x: -30 });
          slide(".a${i} .arrow", ${r3(0.6 + i * 0.35)}, { x: -20 });
          stamp(".a${i} .new", ${r3(0.75 + i * 0.35)});`).join('\n          ')}
          stamp(".pct .pill", ${r3(0.95 + ctx.axes.length * 0.35)});`,
        cues: [...ctx.axes.map((_, i) => ({ at: r3(0.75 + i * 0.35), kind: 'hit' })), ...(pct ? [{ at: r3(0.95 + ctx.axes.length * 0.35), kind: 'tick' }] : [])],
      };
    },
    line: (f, ctx) => {
      const price = ctx.axes.filter(a => a.axis !== 'context');
      const c = ctx.axes.find(a => a.axis === 'context');
      return [
        price.length && `${subject(f, ctx)} goes from ${price.map(a => `${fmtPrice(a.from)} ${a.axis}`).join(' and ')} to ${price.map(a => `${fmtPrice(a.to)} ${a.axis}`).join(' and ')}.`,
        c && `${price.length ? 'Context' : `${subject(f, ctx) === 'It' ? 'Its' : `The ${f.lead.name}`} context window`} goes from ${fmtCtx(c.from)} to ${fmtCtx(c.to)}.`,
      ].filter(Boolean).join(' ');
    },
  },
  {
    id: 'free-stamp', slot: 'compare', fits: (rel, ctx) => !!ctx.lead.free && priced(ctx), minDur: 3,
    scene: (ctx, { start, dur }) => ({
      id: 'sc-free', start, dur, chapter: `${ctx.lead.name} · free`, cls: 'fstamp',
      body: `<div class="fs"><div class="num zero hl">$0</div>
          <div><div class="kicker"><i>$</i>${esc(ctx.lead.name)}</div>
            <div class="io"><div class="box spec"><div class="face"><div class="num">$0</div><div class="label">in / 1M tokens</div></div></div>
              <div class="box spec"><div class="face"><div class="num">$0</div><div class="label">out / 1M tokens</div></div></div></div>
            <div class="seal"><span class="pill free">FREE ON ANYROUTER</span></div></div></div>`,
      inner: `
        stamp(".zero", 0.1);
        slide(".kicker", 0.3, { x: -40 });
        stamp(".io .spec", 0.5, 0.2);
        stamp(".seal", 1.05);`,
      cues: [{ at: 0.1, kind: 'hit' }, { at: 0.5, kind: 'tick' }, { at: 0.7, kind: 'tick' }, { at: 1.05, kind: 'hit' }],
    }),
    line: (f, ctx) => `${subject(f, ctx)} is free on AnyRouter: $0 in and $0 out.`,
  },

  // ── howto: commands only, never an answer ──
  {
    id: 'anyr', slot: 'howto', fits: (rel, ctx) => !!apiOf(ctx.lead).cli, minDur: 3.5,
    scene: (ctx, { start, dur }) => {
      const rows = apiOf(ctx.lead).cli(ctx.lead.id);
      return {
        id: 'sh-anyr', start, dur, chapter: 'how to call it · anyr', cls: 'how',
        body: `${howHead(ctx, 'the anyr CLI')}${codeCard('terminal', rows, { prompt: true })}`,
        inner: codeInner(rows.length), cues: codeCues(rows.length),
      };
    },
    line: (f, ctx) => (ctx.lead.category === 'embedding'
      ? 'From a terminal: sign in with anyr, then run anyr embed with its id.'
      : 'From a terminal: sign in with anyr, then pipe your work into anyr chat.'),
  },
  {
    id: 'curl', slot: 'howto', fits: always, minDur: 4.5,
    scene: (ctx, { start, dur }) => {
      const api = apiOf(ctx.lead);
      const rows = [`curl https://anyrouter.dev${api.path} \\`, '  -H "Authorization: Bearer $ANYROUTER_API_KEY" \\',
        '  -H "Content-Type: application/json" \\', ...`  -d '${api.body(ctx.lead.id)}'`.split('\n')];
      return {
        id: 'sh-curl', start, dur, chapter: 'how to call it · http', cls: 'how',
        body: `${howHead(ctx, `POST ${api.path}`)}${codeCard('curl', rows, { prompt: true })}`,
        inner: codeInner(rows.length), cues: codeCues(rows.length),
      };
    },
    line: (f, ctx) => `Any HTTP client works: send your AnyRouter key to the ${apiOf(ctx.lead).name} endpoint.`,
  },
  {
    id: 'sdk', slot: 'howto', fits: (rel, ctx) => !!apiOf(ctx.lead).sdk, minDur: 4.5,
    scene: (ctx, { start, dur }) => {
      const rows = ['import OpenAI from "openai";', 'const client = new OpenAI({', '  baseURL: "https://anyrouter.dev/api/v1",',
        '  apiKey: process.env.ANYROUTER_API_KEY,', '});', ...`await ${apiOf(ctx.lead).sdk(ctx.lead.id)}`.split('\n')];
      return {
        id: 'sh-sdk', start, dur, chapter: 'how to call it · openai sdk', cls: 'how',
        body: `${howHead(ctx, 'the OpenAI SDK')}${codeCard('javascript', rows)}`,
        inner: codeInner(rows.length, 0.4), cues: codeCues(rows.length, 0.4),
      };
    },
    line: () => 'On the OpenAI SDK? Point its base URL at AnyRouter, and keep your code.',
  },

  // ── cta: the film ends here ──
  {
    id: 'classic', slot: 'cta', fits: always, minDur: END,
    scene: (ctx, { start, dur }) => endScene(r3(start + dur), {
      kicker: ctx.endKicker,
      big: `<span class="${fit(ctx.bigText, [[28, 'e-l'], [56, 'e-m']], 'e-s')}">${esc(ctx.bigText)}</span>`,
      sub: `<b>${ctx.rel.totals.listed}</b> models · <b>${ctx.rel.totals.providers}+</b> providers · <b>${ctx.rel.totals.free}</b> free`,
      marks: ctx.endMarks,
    }, dur),
    line: f => `Get started with the setup script: ${f.totals.listed} models from ${f.totals.providers}+ providers.`,
  },
  {
    id: 'model-page', slot: 'cta', fits: always, minDur: 3,
    scene: (ctx, { start, dur }) => {
      const url = ctx.one ? `anyrouter.dev/model/${ctx.lead.id}` : 'anyrouter.dev/models';
      return {
        id: 's99-page', start, dur, chapter: 'ANYROUTER.DEV', cls: 'end page', cam: { from: { scale: 1.06 }, to: { scale: 1 } },
        body: `${ctaLock}
          <div class="kicker">${esc(ctx.endKicker)}</div>
          <div class="who">${ctx.one ? `${tile(ctx.lead)}<span class="h4">${esc(ctx.lead.name)}</span>` : ctx.endMarks.slice(0, 8).map(f => `<div class="tile box"><div class="face">${markFile(f)}</div></div>`).join('')}</div>
          <div class="url box tone"><div class="face ${fit(url, [[40, 'u-l'], [56, 'u-m']], 'u-s')}"><span class="go">→</span><span>${chars(url)}</span></div></div>`,
        inner: `
          tl.fromTo(Q(".lock"), { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, 0.1);
          slide(".kicker", 0.3, { x: -24 });
          stamp(".who .tile", 0.4, 0.05);
          slide(".who .h4", 0.5, { x: -24 });
          stamp(".url", 0.7);
          type(".url .c", 0.85, 0.014);`,
        cues: ctaCues,
      };
    },
    line: (f, ctx) => (ctx.one ? 'Prices and details are on its AnyRouter model page.'
      : 'Every model in this drop is on the AnyRouter models page.'),
  },
  {
    id: 'one-key', slot: 'cta', fits: always, minDur: 3.5,
    scene: (ctx, { start, dur }) => {
      const t = ctx.rel.totals;
      const stats = [[t.listed, '', 'models listed'], [t.free, '', 'free models'], [t.providers, '+', 'providers']];
      return {
        id: 's99-onekey', start, dur, chapter: 'ANYROUTER.DEV', cls: 'end onekey', cam: { from: { scale: 1.06 }, to: { scale: 1 } },
        body: `${ctaLock}
          <div class="big">${words('Every model. One key.')}</div>
          <div class="keys">${stats.map(([n, s, what], i) => `<div class="box stat${i === 1 ? ' tone' : ''}"><div class="face"><div class="num n${i}">${n}${s}</div><div class="label">${what}</div></div></div>`).join('')}</div>`,
        inner: `
          tl.fromTo(Q(".lock"), { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, 0.1);
          rise(".big", 0.3, 0.07);
          stamp(".stat", 0.7, 0.15);
          ${stats.map(([n, s], i) => `count(".n${i}", ${n}, ${r3(0.7 + i * 0.15)}, 0.7, v => Math.round(v) + ${JSON.stringify(s)});`).join('\n          ')}`,
        cues: ctaCues,
      };
    },
    line: f => `${f.totals.listed} models, ${f.totals.free} of them free, from ${f.totals.providers}+ providers, on a single AnyRouter key.`,
  },
];

export const SLOT_CSS = `
  /* hook · headline */
  .hline .big{font-weight:800;letter-spacing:-.058em;line-height:.98;margin-top:30px;max-width:1560px;text-wrap:balance}
  .hb-l{font-size:176px}.hb-m{font-size:132px}.hb-s{font-size:100px}
  .hline .band{height:14px;width:560px;margin-top:46px;transform-origin:0 50%}
  .hline .meta{margin-top:28px}

  /* a shell or a code card */
  .code{margin-top:40px;max-width:1620px;width:max-content}
  .code .face{background:var(--ink);border-color:var(--ink);color:var(--paper);padding:26px 44px 32px}
  .code .ch{color:#A3A3A3;margin-bottom:14px}
  .code .src{font-family:'ArMono',monospace;font-size:30px;font-weight:500;line-height:1.5;white-space:pre}
  .code .p{color:var(--tone);font-weight:800}
  .shell .cmd{font-family:'ArMono',monospace;font-weight:700;white-space:nowrap}
  .cm-l{font-size:42px}.cm-m{font-size:34px}.cm-s{font-size:27px}
  .shell .out{display:grid;grid-template-columns:170px auto;font-family:'ArMono',monospace;font-size:30px;font-weight:500;margin-top:14px;white-space:nowrap}
  .shell .out:first-of-type{margin-top:26px}
  .shell .out .k{color:#A3A3A3}
  .how .h3{max-width:1500px}

  /* hook · count */
  .cnt .big{font-size:300px;line-height:.86;margin-top:24px}
  .cnt .h3{margin-top:14px}
  .cnt .who{display:flex;align-items:center;gap:26px;margin-top:40px}
  .cnt .who .tile{width:96px;height:96px}.cnt .who .tile .mark{width:58px;height:58px}

  /* news · spotlight */
  .spot{display:grid;column-gap:56px;margin-top:40px}
  .spot.n1{grid-template-columns:1fr}
  .spot.n1 .sp{display:grid;grid-template-columns:240px 1fr;column-gap:56px;align-items:center}
  .spot.n1 .tile{width:240px;height:240px}.spot.n1 .tile .mark{width:146px;height:146px}
  .spot.n2{grid-template-columns:repeat(2,minmax(0,1fr))}.spot.n3{grid-template-columns:repeat(3,minmax(0,1fr))}
  .spot.n2 .tile,.spot.n3 .tile{width:150px;height:150px;margin-bottom:30px}
  .spot.n2 .tile .mark,.spot.n3 .tile .mark{width:90px;height:90px}
  .sp-m{font-size:72px;font-weight:800;letter-spacing:-.05em;line-height:1.02}
  .sp-s{font-size:52px;font-weight:800;letter-spacing:-.04em;line-height:1.06}
  .spot .chips{display:flex;flex-wrap:wrap;gap:14px;margin-top:30px}

  /* news · dossier */
  .dos{margin-top:34px;border-top:2px solid var(--rule)}
  .dos .row{display:grid;grid-template-columns:200px repeat(var(--n),minmax(0,1fr));column-gap:34px;align-items:baseline;
    border-bottom:2px solid var(--rule);padding:16px 0 14px}
  .dos .v{font-family:'ArMono',monospace;font-size:var(--vs);font-weight:700;white-space:nowrap;overflow:hidden}
  .dos .row.name .v{font-family:'ArInter',sans-serif;font-size:calc(var(--vs) * 1.5);font-weight:800;letter-spacing:-.03em}

  /* compare · before and after */
  .ba .head{display:flex;align-items:flex-end;justify-content:space-between;gap:40px}
  .ba .head .tile{width:150px;height:150px}.ba .head .tile .mark{width:92px;height:92px}
  .ba .rows{margin-top:40px;display:flex;flex-direction:column}
  .ba .row{display:grid;grid-template-columns:300px 420px 110px 1fr;align-items:center;border-top:2px solid var(--rule);padding:22px 0}
  .ba .old{font-size:80px;color:var(--ink2);text-decoration:line-through;text-decoration-thickness:6px;text-decoration-color:var(--tone)}
  .ba .arrow{font-family:'ArMono',monospace;font-size:64px;font-weight:700}
  .ba .new{font-size:104px;color:var(--tone-ink)}
  .ba .pct{margin-top:26px}.ba .pct .pill{height:56px;font-size:24px;padding:0 24px}

  /* compare · free */
  .fs{display:grid;grid-template-columns:auto 1fr;align-items:center;column-gap:100px}
  .fs .zero{font-size:340px;line-height:.82}
  .fs .io{display:flex;gap:34px;margin-top:34px}
  .fs .seal{margin-top:40px;transform:rotate(-4deg);transform-origin:0 50%}
  .fs .seal .pill{height:68px;font-size:28px;padding:0 30px;border-width:3px}

  /* cta · model page and one key (on the closing card's .end) */
  .end .who{display:flex;align-items:center;justify-content:center;gap:22px;margin-top:40px}
  .end .who .tile{width:96px;height:96px}.end .who .tile .mark{width:58px;height:58px}
  .end .url{margin-top:44px}
  .end .url .face{display:flex;align-items:center;gap:20px;padding:24px 40px;font-family:'ArMono',monospace;font-weight:700}
  .end .url .go{color:var(--tone-ink)}
  .u-l{font-size:44px}.u-m{font-size:34px}.u-s{font-size:27px}
  .end .keys{display:flex;gap:34px;margin-top:48px}
  .end .stat .face{padding:24px 38px 22px;min-width:300px}
  .end .stat .num{font-size:96px}.end .stat .label{margin-top:12px}`;
