/**
 * release — one film per AnyRouter product release ("AnyRouter 1.6").
 *
 * Facts come from the public changelog feed; every word on screen is the
 * feed's (or the plan's validated copy), escaped. The film is a printed launch
 * sheet: the version number set enormous in ink over its own dotted shadow,
 * one scene per picked highlight in three alternating compositions, an
 * optional "at a glance" checklist when there is time to read it, then the
 * shared closing card.
 *
 *   --from=FILE      read a saved feed instead of the network
 *   --version=1.6.0  film that release instead of the newest
 *   --limit=N        cap the highlights (default 5)
 *   --seconds=N      film length (default 30)
 *
 * Plan: picks (h1…hN, feed order ids) choose and order the highlights, lines
 * replace a highlight's statement, kicker and headline go to the opening slate
 * and the end card, seconds and limit as the flags.
 */
import fs from 'node:fs';
import path from 'node:path';
import { esc, words, chars, fit, openScene, endScene, OPEN, END, BEAT } from '../../lib/film.mjs';
import { marksIn, markImg } from '../../lib/marks.mjs';
import { parseFeed } from './feed.mjs';

export const FEED = 'https://anyrouter.dev/changelog/rss.xml';
const DEFAULT_SECONDS = 30;
const DEFAULT_LIMIT = 5;
const HOLD = 1.5;        // a statement stays still at least this long after its last word lands
const LIST_HOLD = 2;     // a list page holds this long after its last row lands

/** First sentence: a sentence ends at . ! ? followed by a space and anything ("GPT-6.1 Sol" has no space after its dot). */
export const firstSentence = s => String(s).split(/(?<=[.!?])\s+(?=\S)/)[0].trim();

const count = s => String(s).split(/\s+/).filter(Boolean).length;
/** Seconds a reader needs: about 0.3s a word plus a second to land. */
export const readTime = text => 1 + 0.3 * count(text);

/** "AnyRouter 1.6: name a model…" → { name: "AnyRouter 1.6", tail: "name a model…" } */
export function splitHeadline(rel) {
  const i = rel.headline.indexOf(':');
  if (i < 0) return { name: rel.headline, tail: '' };
  return { name: rel.headline.slice(0, i).trim(), tail: rel.headline.slice(i + 1).trim() };
}

/** "AnyRouter 1.6" → { pre: "AnyRouter", num: "1.6" }; a name with no trailing number sets the version instead. */
export function versionMark(name, version) {
  const m = /^(.*?)\s*v?(\d+(?:\.\d+)*)$/.exec(name);
  return m ? { pre: m[1], num: m[2] } : { pre: name, num: version };
}

/** Every highlight, pickable by a stable id: its position in the feed. The detail is the whole entry, when it says more. */
export const items = rel => rel.highlights.map((h, i) => ({
  id: `h${i + 1}`,
  label: `${h.theme ? `${h.theme}: ` : ''}${firstSentence(h.line)}`,
  ...(h.line !== firstSentence(h.line) ? { detail: h.line } : {}),
}));

const pad = n => String(n).padStart(2, '0');
const host = href => String(href ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
const MAX_MARKS = 6;
const HOME_MARK = 'anyrouter-color.svg';
const ceilBeat = s => Math.ceil(s / BEAT - 1e-9) * BEAT;

// When each scene's words have landed — the `inner` code below starts them at these times.
const HERO_TAIL_AT = 1.5, HL_TEXT_AT = 0.45, WORD_STAGGER = 0.05, RISE = 0.6;
const landed = (at, text) => at + WORD_STAGGER * Math.max(0, count(text) - 1) + RISE;
const ROW_AT = 0.45, ROW_GAP = 0.35;

const heroNeed = tail => ceilBeat(Math.max(1 + readTime(tail), landed(HERO_TAIL_AT, tail) + HOLD, 3));
// The marks (or the resource card) stamp in as the statement finishes; they hold a second after the last lands.
const ASSET_GAP = 0.12;
const assetAt = say => +(landed(HL_TEXT_AT, say) - 0.15).toFixed(2);
const hlNeed = h => ceilBeat(Math.max(readTime(h.say), landed(HL_TEXT_AT, h.say) + HOLD,
  assetAt(h.say) + ASSET_GAP * Math.max(0, h.marks.length - 1) + 0.4 + 1));
// Lines already read once are re-read faster; the page still holds ≥ 2s after its last row.
const glanceNeed = lines => ceilBeat(ROW_AT + ROW_GAP * (lines.length - 1) + 0.5
  + Math.max(LIST_HOLD, 0.15 * lines.reduce((a, l) => a + count(l), 0)));

/**
 * Lengths on the beat grid that fill the window exactly: each gets what it
 * needs, then the spare beats go out in proportion to need (largest remainder
 * first, ties to the earlier scene). The last absorbs any off-grid remainder.
 */
export function slots(needs, window) {
  const spare = Math.floor((window - needs.reduce((a, b) => a + b, 0)) / BEAT + 1e-9);
  const total = needs.reduce((a, b) => a + b, 0);
  const share = needs.map(n => (spare * n) / total);
  const beats = share.map(Math.floor);
  const order = share.map((s, i) => [s - beats[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; k < spare - beats.reduce((a, b) => a + b, 0); k++) beats[order[k][1]]++;
  const durs = needs.map((n, i) => n + beats[i] * BEAT);
  durs[durs.length - 1] = +(window - durs.slice(0, -1).reduce((a, b) => a + b, 0)).toFixed(3);
  return durs;
}

// ── scenes ────────────────────────────────────────────────────────────────

const CSS = `
  /* hero: the version is the graphic — ink over its own dotted shadow */
  .rv-top{display:flex;align-items:center;gap:28px}
  .rv-top .rule{flex:1}
  .rv-mid{display:flex;align-items:flex-end;gap:72px;margin-top:30px}
  .rv-side{flex:1;display:flex;flex-direction:column;align-items:flex-start;gap:56px;padding-bottom:40px}
  .rv-pre{font-size:64px;font-weight:800;letter-spacing:-.045em;line-height:1;margin-bottom:6px}
  .rv-ver{position:relative;font-weight:800;letter-spacing:-.065em;line-height:.8;padding:0 24px 24px 0}
  .rv-ver.x{font-size:560px}.rv-ver.l{font-size:470px}.rv-ver.m{font-size:400px}.rv-ver.s{font-size:310px}
  .rv-shade{position:absolute;left:24px;top:24px;color:transparent;
    background-image:radial-gradient(circle,var(--tone) 2.3px,transparent 2.8px);background-size:8px 8px;
    -webkit-background-clip:text;background-clip:text}
  .rv-ink{position:relative;display:block;color:var(--ink)}
  .rv-stamp{transform:rotate(-5deg);transform-origin:0 100%}
  .rv-stamp .in{border:4px solid var(--tone-ink);border-radius:6px;padding:18px 26px;color:var(--tone-ink);
    font-family:'ArMono',monospace;font-weight:800;background:var(--paper)}
  .rv-stamp .v{font-size:44px;letter-spacing:-.02em;line-height:1}
  .rv-stamp .d{font-size:24px;letter-spacing:.14em;margin-top:10px}
  .rv-tail{max-width:13ch;text-wrap:balance}

  /* a highlight: kicker row, one big statement, where to read more */
  .hl-top{display:flex;align-items:center;gap:28px}
  .hl-top .rule{flex:1}
  .hl-say{font-weight:800;letter-spacing:-.045em;line-height:1.04;text-wrap:balance}
  .hl-say.x{font-size:112px}.hl-say.l{font-size:92px}.hl-say.m{font-size:74px}.hl-say.s{font-size:60px}
  .hl-src{font-family:'ArMono',monospace;font-size:24px;font-weight:600;color:var(--ink2);letter-spacing:.02em}
  .hl-src b{color:var(--tone-ink);font-weight:800;margin-right:14px}

  .lead .hl-say{margin-top:56px;max-width:19ch}
  .lead .hl-say.x{font-size:136px}.lead .hl-say.l{font-size:116px}.lead .hl-say.m{font-size:96px}.lead .hl-say.s{font-size:78px}
  .lead .hl-say.m,.lead .hl-say.s{max-width:24ch}
  .lead .hl-src{margin-top:60px}

  .split{flex-direction:row;align-items:center;gap:0}
  .split .col-n{width:600px;flex:none;display:flex;flex-direction:column;gap:34px}
  .split .big-n{position:relative;font-weight:800;font-size:330px;letter-spacing:-.07em;line-height:.8;padding:0 20px 20px 0}
  .split .vr{width:2px;align-self:stretch;background:var(--rule);transform-origin:50% 0;margin:0 72px 0 24px}
  .split .col-s{flex:1;display:flex;flex-direction:column;gap:48px}
  .split .hl-say{font-size:calc(var(--k) * 1px)}
  .split .hl-say.x{--k:112}.split .hl-say.l{--k:94}.split .hl-say.m{--k:78}.split .hl-say.s{--k:62}

  .right{flex-direction:row;align-items:center;gap:72px}
  .right .col-m{width:440px;height:640px;flex:none;display:flex;flex-direction:column;justify-content:space-between;padding:12px 0}
  .right .col-m .num{font-size:120px;color:var(--ink)}
  .right .col-m .num span{font-size:56px;color:var(--ink2)}
  .right .col-m .hl-src{overflow-wrap:anywhere;line-height:1.5}
  .right .card{flex:1;height:640px}
  .right .card > .face{height:100%;padding:72px 80px;display:flex;flex-direction:column;justify-content:center}
  .right .hl-say{color:var(--paper)}
  .right .hl-say.x{font-size:108px}.right .hl-say.l{font-size:90px}.right .hl-say.m{font-size:76px}.right .hl-say.s{font-size:60px}

  /* what a highlight is about: the providers it names, stamped as tiles… */
  .hl-marks{display:flex;gap:22px}
  .hl-marks .tile{width:132px;height:132px}
  .hl-marks .tile .mark{width:76px;height:76px}
  .hl-foot{display:flex;align-items:center;gap:44px;margin-top:60px}
  .lead .hl-foot .hl-src{margin-top:0}
  .right .card .hl-marks{margin-top:52px}
  .right .card .hl-marks .tile{width:108px;height:108px}
  .right .card .hl-marks .tile .mark{width:62px;height:62px}
  .right .card .tile .face{background:var(--face);border-color:var(--paper)}
  /* …or, when it names none, the page it links to, as a resource card */
  .res{align-self:flex-start;max-width:1000px}
  .res .face{display:flex;align-items:stretch}
  .res .res-m{display:grid;place-items:center;padding:0 32px;border-right:2px solid var(--rule)}
  .res .res-m .mark{width:84px;height:84px}
  .res .res-t{padding:24px 36px 26px;display:flex;flex-direction:column;gap:10px;min-width:0}
  .res .res-h{font-family:'ArMono',monospace;font-size:40px;font-weight:800;letter-spacing:-.01em}
  .res .res-p{font-family:'ArMono',monospace;font-size:26px;font-weight:600;color:var(--ink2);line-height:1.35}
  .res .seg{display:inline-block;white-space:nowrap}
  .lead .res{margin-top:64px}
  .right .col-m .res{max-width:440px}
  .right .col-m .res .res-m{padding:0 18px}
  .right .col-m .res .res-m .mark{width:52px;height:52px}
  .right .col-m .res .res-t{padding:18px 22px 20px}
  .right .col-m .res .res-h{font-size:28px}
  .right .col-m .res .res-p{font-size:20px}

  /* at a glance: a numbered checklist */
  .gl-rows{margin-top:44px}
  .gl-rows .rule{margin-top:-2px}
  .gl-row{display:flex;align-items:center;gap:34px;min-height:118px;padding:18px 0;border-top:2px solid var(--rule)}
  .gl-row .num{font-size:30px;width:56px;color:var(--ink2)}
  .gl-row .tick{width:64px;height:64px;flex:none}
  .gl-row .tick .face{width:100%;height:100%;position:relative}
  .gl-row .tick i{position:absolute;left:19px;top:8px;width:20px;height:36px;
    border:solid var(--tone-ink);border-width:0 7px 7px 0;transform:rotate(42deg);transform-origin:50% 100%}
  .gl-row .label{width:230px;flex:none;color:var(--tone-ink)}
  .gl-rows.x .gl-row{min-height:150px}
  .gl-rows.x .label{font-size:22px}
  .gl-row .say{flex:1;font-weight:700;letter-spacing:-.03em;line-height:1.14;text-wrap:pretty}
  .gl-rows.x .say{font-size:54px}.gl-rows.l .say{font-size:44px}.gl-rows.m .say{font-size:38px}.gl-rows.s .say{font-size:32px}`;

// Numerals set at line-height .8: the empty em-box above the digits reaches into
// the line over them, the ink does not. The layout audit measures the em-box.
const GLYPH = 'data-layout-allow-overlap';

function heroScene(rel, { name, tail }, at) {
  const { pre, num } = versionMark(name, rel.version);
  const numSize = fit(num, [[3, 'x'], [4, 'l'], [5, 'm']], 's');
  return {
    id: 's01-version', ...at, chapter: `${name} · v${rel.version}`,
    cam: { from: { scale: 1 }, to: { scale: 1.045 } },
    body: `<div class="rv-top"><div class="kicker"><i>v${esc(rel.version)}</i>New release</div><div class="rule"></div></div>
  <div class="rv-mid">
    <div>
      ${pre ? `<div class="rv-pre">${esc(pre)}</div>` : ''}
      <div class="rv-ver ${numSize}"><span class="rv-shade" aria-hidden="true">${esc(num)}</span><span class="rv-ink" ${GLYPH}>${esc(num)}</span></div>
    </div>
    <div class="rv-side">
      ${rel.date ? `<div class="rv-stamp"><div class="in"><div class="v">v${esc(rel.version)}</div><div class="d">${esc(rel.date)}</div></div></div>` : ''}
      ${tail ? `<div class="h3 rv-tail">${words(tail)}</div>` : ''}
    </div>
  </div>`,
    inner: `
    tl.fromTo(Q(".rv-top .rule"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "expo.out" }, 0.05);
    slide(".rv-top .kicker", 0.1);
    slide(".rv-pre", 0.2, { y: 30 });
    // the dotted shadow prints in rows, then the ink lands on it
    tl.fromTo(Q(".rv-shade"), { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6, ease: "steps(10)" }, 0.3);
    tl.fromTo(Q(".rv-ink"), { scale: 1.14, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" }, 1.0);
    tl.fromTo(Q(".rv-stamp"), { scale: 1.6, opacity: 0, rotate: -14 }, { scale: 1, opacity: 1, rotate: -5, duration: 0.3, ease: "back.out(2.6)" }, 1.25);
    rise(".rv-tail", ${HERO_TAIL_AT}, ${WORD_STAGGER});`,
    cues: [{ at: 1.0, kind: 'rise' }, { at: 1.0, kind: 'hit' }, ...(rel.date ? [{ at: 1.25, kind: 'tick' }] : [])],
  };
}

// Three compositions, alternated so consecutive highlights never share one.
const LAYOUTS = ['lead', 'split', 'right'];

function highlightScene(rel, h, i, n, at) {
  const layout = LAYOUTS[i % LAYOUTS.length];
  const theme = h.theme ?? `v${rel.version}`;
  const size = fit(h.say, [[45, 'x'], [80, 'l'], [120, 'm']], 's');
  const say = `<div class="hl-say ${size}">${words(h.say)}</div>`;
  const href = h.href ?? rel.link;
  const src = `<div class="hl-src"><b>→</b>${chars(host(href))}</div>`;
  const tiles = `<div class="hl-marks">${h.marks.map(f => `<div class="tile box"><div class="face">${markImg(f)}</div></div>`).join('')}</div>`;
  const [site, ...rest] = host(href).split('/');
  const card = `<div class="res box tone"><div class="face">
      <div class="res-m">${markImg(HOME_MARK)}</div>
      <div class="res-t"><div class="label">Read more</div><div class="res-h">${esc(site)}</div>
        ${rest.length ? `<div class="res-p">${rest.map(seg => `<span class="seg">${chars(`/${seg}`)}</span>`).join('')}</div>` : ''}</div></div></div>`;
  const index = `${pad(i + 1)} / ${pad(n)}`;
  const t = assetAt(h.say);
  // The providers stamp in one by one, each with a tick; with none, the resource card lands and its path types.
  const asset = h.marks.length
    ? `stamp(".hl-marks .tile", ${t}, ${ASSET_GAP}); type(".hl-src .c", ${(t + 0.3).toFixed(2)}, 0.012);`
    : `stamp(".res", ${t}); type(".res-p .c", ${(t + 0.25).toFixed(2)}, 0.014); type(".hl-src .c", ${(t + 0.25).toFixed(2)}, 0.012);`;
  const cues = [{ at: HL_TEXT_AT + RISE, kind: 'rise' },
    ...(h.marks.length ? h.marks.map((_, k) => ({ at: +(t + ASSET_GAP * k).toFixed(2), kind: 'tick' }))
      : [{ at: t, kind: 'tick' }]),
    { at: +(t + 0.25).toFixed(2), kind: 'type', dur: 0.6 }];
  const common = { id: `s${pad(i + 2)}-${h.id}`, ...at, chapter: `${index} · ${theme}`, cls: layout, cues };
  const foot = h.marks.length ? `<div class="hl-foot">${tiles}${src}</div>` : card;
  if (layout === 'lead') return {
    ...common,
    body: `<div class="hl-top"><div class="kicker"><i>${index}</i>${esc(theme)}</div><div class="rule"></div></div>
  ${say}
  ${foot}`,
    inner: `
    tl.fromTo(Q(".hl-top .rule"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "expo.out" }, 0.05);
    slide(".hl-top .kicker", 0.1);
    rise(".hl-say", ${HL_TEXT_AT}, ${WORD_STAGGER});
    ${asset}`,
  };
  if (layout === 'split') return {
    ...common,
    body: `<div class="col-n">
    <div class="big-n"><span class="rv-shade" aria-hidden="true">${pad(i + 1)}</span><span class="rv-ink" ${GLYPH}>${pad(i + 1)}</span></div>
    <div class="kicker"><i>${index}</i>${esc(theme)}</div>
  </div>
  <div class="vr"></div>
  <div class="col-s">${say}${h.marks.length ? `${tiles}${src}` : card}</div>`,
    inner: `
    tl.fromTo(Q(".rv-shade"), { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.4, ease: "steps(8)" }, 0.05);
    tl.fromTo(Q(".rv-ink"), { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" }, 0.3);
    tl.fromTo(Q(".vr"), { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: "expo.out" }, 0.2);
    slide(".col-n .kicker", 0.3);
    rise(".hl-say", ${HL_TEXT_AT}, ${WORD_STAGGER});
    ${asset}`,
  };
  return {
    ...common,
    body: `<div class="col-m">
    <div class="kicker">${esc(theme)}</div>
    <div class="num">${pad(i + 1)}<span> / ${pad(n)}</span></div>
    ${h.marks.length ? src : card}
  </div>
  <div class="card box tone inv"><div class="face">${say}${h.marks.length ? tiles : ''}</div></div>`,
    inner: `
    stamp(".card", 0.05);
    slide(".col-m .kicker, .col-m .num", 0.15, { x: -50 }, 0.08);
    rise(".hl-say", ${HL_TEXT_AT}, ${WORD_STAGGER});
    ${asset}`,
  };
}

function glanceScene(rel, picked, at) {
  // Few short rows print large; many or long ones step down so each stays one or two lines.
  const longest = Math.max(...picked.map(h => h.say.length));
  const size = picked.length <= 3 && longest <= 60 ? 'x' : fit('x'.repeat(longest), [[60, 'l'], [95, 'm']], 's');
  return {
    id: `s${pad(picked.length + 2)}-glance`, ...at, chapter: `v${rel.version} · highlights`,
    body: `<div class="kicker"><i>v${esc(rel.version)}</i>Highlights</div>
  <div class="gl-rows ${size}">${picked.map((h, i) => `
    <div class="gl-row"><span class="num">${pad(i + 1)}</span>
      <div class="tick box"><div class="face"><i></i></div></div>
      <span class="label">${esc(h.theme ?? `v${rel.version}`)}</span>
      <span class="say">${esc(h.say)}</span></div>`).join('')}
    <div class="rule"></div>
  </div>`,
    inner: `
    slide(".kicker", 0.05);
    slide(".gl-row", ${ROW_AT}, { x: -80 }, ${ROW_GAP});
    grow(".gl-rows > .rule", ${(ROW_AT + ROW_GAP * (picked.length - 1)).toFixed(2)});
    stamp(".tick", ${ROW_AT + 0.1}, ${ROW_GAP});
    tl.fromTo(Q(".tick i"), { scale: 0 }, { scale: 1, duration: 0.2, stagger: ${ROW_GAP}, ease: "steps(4)" }, ${ROW_AT + 0.2});`,
    cues: picked.map((_, i) => ({ at: +(ROW_AT + 0.2 + ROW_GAP * i).toFixed(3), kind: 'tick' })),
  };
}

// ── the kind ────────────────────────────────────────────────────────────

/**
 * The highlights this film shows, in order: the plan's picks, else feed order;
 * capped at the limit; each with its on-screen statement.
 */
function chosen(rel, plan, limit) {
  const ids = items(rel).map(i => i.id);
  const order = plan.picks?.length ? plan.picks.filter(id => ids.includes(id)) : ids;
  return order.slice(0, limit).map(id => {
    const h = rel.highlights[ids.indexOf(id)];
    const say = plan.lines?.[id] ?? firstSentence(h.line);
    // Marks come from the feed's words (and the plan's, which were checked against them).
    return { ...h, id, say, marks: marksIn(`${say} ${h.line}`).slice(0, MAX_MARKS) };
  });
}

function report(rel) {
  return [
    `version         ${rel.version}   (${rel.date ?? 'undated'})`,
    `headline        ${rel.headline}`,
    `link            ${rel.link}`,
    `highlights      ${rel.highlights.length}`,
    ...items(rel).map(i => `  ${i.id.padEnd(4)} ${i.label}`),
  ].join('\n');
}

export default {
  id: 'release',
  title: 'Release',
  scheduled: true,

  async collect({ flags }) {
    let xml;
    if (flags.from) {
      xml = fs.readFileSync(path.resolve(flags.from), 'utf8');
    } else {
      const r = await fetch(FEED);
      if (!r.ok) throw new Error(`${FEED} → HTTP ${r.status}`);
      xml = await r.text();
    }
    const releases = parseFeed(xml);
    if (!releases.length) {
      if (/<item[\s>]/i.test(xml)) throw new Error('changelog feed has items but none could be parsed');
      return { notable: false, label: 'none', parts: [] };
    }
    const want = flags.version ? String(flags.version) : null;
    const rel = want ? releases.find(i => i.version === want) : releases[0];
    if (!rel) throw new Error(`no release "${want}" in the feed — have ${releases.map(i => i.version).join(', ')}`);
    console.log(report(rel));
    // Identity is the version alone: editing a release's copy later must not re-film it.
    return { notable: true, label: `v${rel.version}`, parts: [`release:${rel.version}`], ...rel };
  },

  items,

  film(rel, { plan = {}, flags = {} }) {
    const duration = parseFloat(flags.seconds ?? plan.seconds ?? DEFAULT_SECONDS);
    const limit = parseInt(flags.limit ?? plan.limit ?? DEFAULT_LIMIT, 10);
    const { name, tail: feedTail } = splitHeadline(rel);
    const tail = feedTail || firstSentence(rel.summary);
    const window = duration - OPEN - END;

    // Highlights that can be read in time: drop from the end, never squeeze.
    const picked = chosen(rel, plan, limit);
    const needs = [heroNeed(tail), ...picked.map(hlNeed)];
    while (needs.length > 1 && needs.reduce((a, b) => a + b, 0) > window) { needs.pop(); picked.pop(); }
    // The checklist only when every row can still be read.
    const glance = picked.length >= 2
      && needs.reduce((a, b) => a + b, 0) + glanceNeed(picked.map(h => h.say)) <= window;
    if (glance) needs.push(glanceNeed(picked.map(h => h.say)));

    const durs = slots(needs, window);
    let t = OPEN;
    const place = i => { const start = +t.toFixed(3); t += durs[i]; return { start, dur: durs[i] }; };

    const scenes = [
      openScene({ kicker: plan.kicker ?? name, meta: [`v${rel.version}`, rel.date].filter(Boolean).join(' · ') }),
      heroScene(rel, { name, tail }, place(0)),
      ...picked.map((h, i) => highlightScene(rel, h, i, picked.length, place(i + 1))),
      ...(glance ? [glanceScene(rel, picked, place(picked.length + 1))] : []),
      endScene(duration, {
        kicker: plan.kicker ?? 'Out now',
        big: esc(plan.headline ?? name),
        sub: `<b>${esc(rel.date ?? `v${rel.version}`)}</b> · anyrouter.dev/changelog/${esc(rel.version)}`,
        marks: [...new Set(picked.flatMap(h => h.marks))],
      }),
    ];

    return {
      title: `AnyRouter — ${name}`,
      duration,
      tone: 'indigo',
      palette: 'release',
      label: 'RELEASE',
      css: CSS,
      scenes,
      summary: `${name} · version + ${picked.length} of ${rel.highlights.length} highlight${rel.highlights.length === 1 ? '' : 's'}`
        + ` (${picked.map(h => h.id).join(' ')})${glance ? ' + at a glance' : ''}`,
    };
  },

  headline(rel, plan = {}) {
    return plan.headline ?? rel.headline;
  },

  notes(rel, plan = {}) {
    return [
      plan.share,
      rel.summary,
      rel.highlights.length && rel.highlights
        .map(h => `- ${h.theme ? `**${h.theme}:** ` : ''}${h.href ? `[${h.line}](${h.href})` : h.line}`).join('\n'),
      `Full changelog: ${rel.link}`,
    ].filter(Boolean);
  },
};
