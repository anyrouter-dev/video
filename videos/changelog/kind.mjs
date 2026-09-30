/**
 * changelog — one film per day of AnyRouter changelog entries.
 *
 * Facts come from the hand-written "Model releases" section of
 * anyrouter.dev/llms.txt (see entries.mjs). Unlike model-drop this is not a
 * mechanical catalog diff: each entry is a note somebody wrote.
 *
 * The film is a LOG, set like a receipt off a teletype:
 *
 *   open        the brand mark prints; slate = the date and the day's counts
 *   log         the whole day prints line by line on a receipt — a +/− sign,
 *               the index, the title typed, the release path, a NEW / RETIRED
 *               pill — while the date and the running tally sit beside it
 *   spotlight   one per picked entry: the title big, its line as the lede,
 *               the type as a pill and a +/− badge, the provider's mark large
 *               (a retired provider's mark in grey)
 *   end         the shared closing card
 *
 * A retirement must never read as a launch: it is a − not a +, a dashed grey
 * pill that says RETIRED, grey dots instead of the tone, and it is counted
 * apart from the new entries everywhere a count appears.
 *
 * Plan: picks choose and order the spotlights (the log always lists the whole
 * day); lines replace an entry's lede (default: its summary's first sentence);
 * kicker and headline go to the opening slate and the end card; seconds sets the
 * length (default: what the day needs, at most 30s); limit caps the spotlights.
 *
 *   --from=FILE   read a saved llms.txt instead of the network
 *   --date=DAY    film that day (YYYY-MM-DD); default is the newest day
 *   --limit=N     cap the spotlights          --seconds=N   film length
 */
import fs from 'node:fs';
import path from 'node:path';
import { esc, words, chars, fit, openScene, endScene, OPEN, END, BEAT } from '../../lib/film.mjs';
import { marksIn, markImg } from '../../lib/marks.mjs';
import { sectionOf, parseEntries, latestBatch } from './entries.mjs';

const LLMS = 'https://anyrouter.dev/llms.txt';
const DEFAULT_SECONDS = 30;  // the most a day gets unless the plan asks for more
const DEFAULT_LIMIT = 4;     // spotlights, before time caps them
const HOLD = 1.5;            // a spotlight stands still at least this long after its lede lands
const LIST_HOLD = 2;         // the log holds this long after its last line prints
const READ = 0.18;           // seconds of reading per on-screen word
const LEDE_MAX = 140;        // characters of a default lede
const MAX_ROWS = 8;          // log lines on the receipt; more becomes "+N more"
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** First sentence of a summary, cut at a word boundary if it still runs long. */
export function firstSentence(text, max = 240) {
  const s = String(text).trim();
  const m = /[.!?](?=\s|$)/.exec(s);
  const one = m ? s.slice(0, m.index + 1) : s;
  if (one.length <= max) return one;
  const cut = one.slice(0, max).replace(/\s+\S*$/, '').replace(/[,;:\s—–-]+$/, '');
  return `${cut}…`;
}

/** Cut to `max` characters at a word boundary, with an ellipsis when anything was cut. */
export const clip = (text, max) => {
  const s = String(text).trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).replace(/\s+\S*$/, '').replace(/[,;:\s—–-]+$/, '')}…`;
};

const count = s => String(s).split(/\s+/).filter(Boolean).length;
const up = t => Math.ceil(t / BEAT - 1e-9) * BEAT;           // up to the next beat
const r3 = t => +t.toFixed(3);
const pad2 = n => String(n).padStart(2, '0');
const off = e => e.type === 'disabled';
const TYPE = e => (off(e) ? 'RETIRED' : 'NEW');
const HOST = /^anyrouter/;   // AnyRouter hosts every entry; its mark is not a provider

/**
 * The provider marks an entry is about: those its title names, else those its
 * summary names ("google/…, anthropic/…"). Empty when it names none.
 */
export function entryMarks(e) {
  const own = t => marksIn(t).filter(f => !HOST.test(f));
  const title = own(e.title);
  return title.length ? title : own(e.summary);
}
const leadMark = e => entryMarks(e)[0] ?? 'anyrouter.svg';

/** Every entry of the day, pickable by its slug. */
export const items = data => data.entries.map(e => ({ id: e.slug, label: `${e.type} — ${e.title}`, detail: e.summary }));

/** The on-screen line for an entry: the plan's, else the summary's first sentence. */
const lineOf = (e, plan) => plan.lines?.[e.slug] ?? firstSentence(e.summary, LEDE_MAX);

// ── the log ─────────────────────────────────────────────────────────────
const LOG_START = 0.6;       // the first line prints after the receipt header
const TYPE_EACH = 0.012;     // seconds per typed character

/** When each log line prints, and how long the scene must be to read the last one. */
export function logTiming(n, room = Infinity) {
  const rows = Math.min(n, MAX_ROWS);
  const need = step => LOG_START + (rows - 1) * step + 0.6 + LIST_HOLD;
  let step = rows > 6 ? 0.35 : 0.45;
  // A short explicit film squeezes the print, never the hold.
  if (need(step) > room && rows > 1) step = Math.max(0.15, (room - LOG_START - 0.6 - LIST_HOLD) / (rows - 1));
  return { rows, step, dur: Math.max(3, up(need(step))) };
}

const logScene = (data, start, { rows, step, dur }) => {
  const { entries, date } = data;
  const n = entries.length;
  const more = n > rows;
  const shown = more ? entries.slice(0, rows - 1) : entries;
  const added = entries.filter(e => !off(e)).length, retired = n - added;
  // A receipt is as long as its print: few lines print larger, many print tighter.
  const lineH = rows <= 2 ? 150 : Math.min(118, Math.floor(600 / rows));
  const slugs = lineH >= 84;
  const [y, m, d] = String(date).split('-');

  const row = (e, i) => {
    const t = clip(e.title, 46);
    return `<div class="row r${i}${off(e) ? ' off' : ''}" style="height:${lineH}px">
      <span class="sg mono">${off(e) ? '−' : '+'}</span><span class="ix mono">${pad2(i + 1)}</span>
      <span class="lmk">${markImg(leadMark(e))}</span>
      <div class="tx"><div class="tt ${rows <= 2 ? fit(t, [[24, 'xl'], [38, 'l']], 's') : fit(t, [[34, 'l']], 's')}">${chars(t)}</div>
        ${slugs ? `<div class="sl mono">${chars(`/blog/releases/${e.slug}`)}</div>` : ''}</div>
      <span class="pill ${off(e) ? 'off' : 'new'}">${TYPE(e)}</span></div>`;
  };
  const moreRow = more ? `<div class="row r${rows - 1} more" style="height:${lineH}px">
      <span class="sg mono">…</span><span class="ix mono"></span><span class="lmk"></span>
      <div class="tx"><div class="tt s">${chars(`+${n - shown.length} more on anyrouter.dev/blog/releases`)}</div></div></div>` : '';

  const at = i => r3(LOG_START + i * step);
  const typeDur = i => Math.min(0.55, clip(shown[i].title, 46).length * TYPE_EACH);
  const printed = r3(at(rows - 1) + 0.6);
  const bar = Math.round((added / n) * 1000) / 10;

  return {
    id: 's01-log', start, dur, chapter: `LOG · ${date} · ${n} ${n === 1 ? 'ENTRY' : 'ENTRIES'}`,
    cam: { from: { scale: 1.02, rotateY: -1.2 }, to: { scale: 1, rotateY: 0.8 } },
    body: `<div class="log">
    <div class="rcpt box"><div class="face">
      <div class="rh"><span class="label">AnyRouter · Changelog · Model releases</span><span class="label dk">${chars(date)}</span></div>
      <div class="perf"></div>
      <div class="rows"><div class="rl">${shown.map(row).join('')}${moreRow}<div class="head dots"></div></div></div>
      <div class="perf"></div>
      <div class="rf"><span class="label">Source</span><span class="label dk">anyrouter.dev/llms.txt</span></div>
    </div></div>
    <div class="side">
      <div class="label">Date</div>
      <div class="day num">${esc(d)}</div>
      <div class="mon mono">${esc(MONTHS[+m - 1] ?? m)} ${esc(y)}</div>
      <div class="rule"></div>
      <div class="tal"><span>Entries</span><i class="lead"></i><b class="num n-all">${n}</b></div>
      <div class="tal"><span>New</span><i class="lead"></i><b class="num n-add hl">${added}</b></div>
      <div class="tal${retired ? '' : ' zero'}"><span>Retired</span><i class="lead"></i><b class="num n-off">${retired}</b></div>
      <div class="track"><div class="bar dots" style="width:${bar}%"></div>${retired
        ? `<div class="bar dots-grey ret" style="left:${bar}%;width:${r3(100 - bar)}%"></div>` : ''}</div>
    </div></div>`,
    inner: `
    type(".rh .c", 0.05, 0.01);
    tl.fromTo(Q(".perf"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "steps(12)" }, 0.1);
    slide(".side > .label, .mon", 0.1, { x: 40 });
    count(".day", ${+d || 1}, 0.1, 0.5, v => String(Math.max(1, Math.round(v))).padStart(2, "0"));
    tl.fromTo(Q(".side .rule"), { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "expo.out" }, 0.3);
    slide(".tal", 0.35, { x: 40 }, 0.08);
    ${shown.map((e, i) => `
    tl.fromTo(Q(".r${i}"), { opacity: 0 }, { opacity: 1, duration: 0.001 }, ${at(i)});
    tl.fromTo(Q(".head"), { y: ${i * lineH} }, { y: ${(i + 1) * lineH - 4}, duration: ${Math.min(step, 0.3)}, ease: "steps(6)" }, ${at(i)});
    stamp(".r${i} .sg", ${at(i)});
    stamp(".r${i} .lmk", ${r3(at(i) + 0.05)});
    type(".r${i} .tt .c", ${at(i)}, ${TYPE_EACH});
    type(".r${i} .sl .c", ${r3(at(i) + 0.1)}, 0.006);
    stamp(".r${i} .pill", ${r3(at(i) + 0.3)});`).join('')}
    ${more ? `type(".r${rows - 1} .tt .c", ${at(rows - 1)}, ${TYPE_EACH});
    tl.fromTo(Q(".r${rows - 1}"), { opacity: 0 }, { opacity: 1, duration: 0.001 }, ${at(rows - 1)});` : ''}
    tl.to(Q(".head"), { opacity: 0, duration: 0.001 }, ${printed});
    count(".n-all", ${n}, ${LOG_START}, ${r3(Math.max(0.3, (rows - 1) * step))});
    count(".n-add", ${added}, ${LOG_START}, ${r3(Math.max(0.3, (rows - 1) * step))});
    count(".n-off", ${retired}, ${LOG_START}, ${r3(Math.max(0.3, (rows - 1) * step))});
    grow(".track .bar", ${printed}, 0);`,
    cues: [
      { at: 0.05, kind: 'type', dur: 0.4 },
      ...shown.flatMap((e, i) => [{ at: at(i), kind: 'tick' }, { at: at(i), kind: 'type', dur: r3(typeDur(i)) }]),
      ...(more ? [{ at: at(rows - 1), kind: 'tick' }] : []),
    ],
    summary: `log ${n} line${n === 1 ? '' : 's'}${more ? ` (${rows - 1} printed + more)` : ''}`,
  };
};

// ── the spotlights ──────────────────────────────────────────────────────
const titleClass = t => fit(t, [[13, 'h1'], [36, 'h2'], [64, 'h3']], 'h4');
const ledeClass = t => fit(t, [[90, 'll'], [150, 'lm']], 'ls');

/** Where a spotlight's parts land, and how long it must stay up to be read. */
export function spotTiming(title, line) {
  const wt = count(title), wl = count(line);
  const lede = r3(0.35 + 0.06 * wt + 0.3);
  const landed = lede + 0.02 * wl + 0.6;
  return { lede, landed: r3(landed), need: Math.max(3, up(landed + Math.max(HOLD, READ * (wt + wl)))) };
}

/** The day as a strip of log cells, at most MAX_ROWS of them, always including `pos`. */
const strip = (entries, pos) => {
  const from = Math.max(0, Math.min(pos - 3, entries.length - MAX_ROWS));
  const cells = Math.min(entries.length, MAX_ROWS);
  // 1620px of strip, 14px gaps, 32px padding, ~11.5px a character at 20px.
  const fitChars = Math.floor(((1620 - 14 * (cells - 1)) / cells - 36) / 11.5);
  return entries.slice(from, from + MAX_ROWS).map((e, j) => {
    const at = from + j;
    return `<div class="cell${at === pos ? ' cur' : ''}${off(e) ? ' off' : ''}">
      <span class="mono">${pad2(at + 1)} ${off(e) ? '−' : '+'}</span><span class="ct">${esc(clip(e.title, Math.min(28, fitChars)))}</span></div>`;
  }).join('');
};

/** The big box: one provider's mark large, the models an entry cites as a grid, else AnyRouter's. */
const glyphMarks = e => {
  const m = entryMarks(e).slice(0, 4);
  if (m.length < 2) return `<div class="gg g1">${markImg(m[0] ?? 'anyrouter.svg', 'gm')}</div>`;
  return `<div class="gg g${m.length}">${m.map(f => markImg(f, 'gm')).join('')}</div>`;
};

const spotScene = (e, i, k, entries, line, start, dur, date) => {
  const { lede } = spotTiming(e.title, line);
  const path = `/blog/releases/${e.slug}`;
  const pos = entries.indexOf(e);
  return {
    id: `s${pad2(i + 2)}-spot-${i + 1}`, start, dur,
    chapter: `${pad2(i + 1)} / ${pad2(k)} · ${TYPE(e)} · ${clip(e.title, 40)}`,
    cam: { from: { scale: 1.05, rotateY: -1.6, rotateX: 0.8 }, to: { scale: 1, rotateY: 1, rotateX: -0.4 } },
    body: `<div class="spot${off(e) ? ' off' : ''}">
    <div class="sp-main">
      <div class="sp-l">
        <div class="kicker"><i>${pad2(i + 1)} / ${pad2(k)}</i>${esc(date)}</div>
        <div class="meta"><span class="pill ${off(e) ? 'off' : 'new'}">${TYPE(e)}</span><span class="sl mono">${chars(path)}</span></div>
        <div class="ttl ${titleClass(e.title)}">${words(e.title)}</div>
        <div class="lede ${ledeClass(line)}">${words(line)}</div>
      </div>
      <div class="glyph box${off(e) ? ' off' : ' tone'}"><div class="face">${glyphMarks(e)}</div>
        <span class="badge mono">${off(e) ? '−' : '+'}</span></div>
    </div>
    ${entries.length > 1 ? `<div class="strip">${strip(entries, pos)}</div>` : ''}</div>`,
    inner: `
    slide(".kicker", 0.05);
    stamp(".meta .pill", 0.15);
    type(".meta .sl .c", 0.2, 0.008);
    rise(".ttl", 0.35);
    rise(".lede", ${lede}, 0.02);
    stamp(".glyph", 0.5);
    tl.fromTo(Q(".gm"), { scale: 0 }, { scale: 1, duration: 0.4, stagger: 0.08, ease: "steps(8)" }, 0.6);
    stamp(".badge", 0.8);
    slide(".cell", 0.1, { y: 30 }, 0.04, 0.4);
    stamp(".cell.cur", 0.9);`,
    cues: [
      { at: 0.15, kind: 'tick' },
      { at: 0.2, kind: 'type', dur: r3(Math.min(0.5, path.length * 0.008)) },
      { at: 0.45, kind: 'hit' },
      { at: 0.9, kind: 'tick' },
    ],
  };
};

const CSS = `
  /* the log: a receipt on the left, the date and the tally on the right */
  .log{display:flex;gap:64px;align-items:center;min-height:780px}
  .rcpt{flex:0 0 1140px}
  .rcpt .face{padding:0 40px;display:flex;flex-direction:column;border-radius:4px}
  .rh,.rf{display:flex;justify-content:space-between;align-items:center;height:78px}
  .rf{height:64px}
  .rh .dk,.rf .dk{color:var(--ink)}
  .perf{height:10px;transform-origin:0 50%;
    background-image:radial-gradient(circle,var(--ink) 2px,transparent 2.6px);background-size:14px 10px}
  .rows{padding:6px 0}
  .rl{position:relative}
  .head{position:absolute;left:-40px;right:-40px;top:0;height:4px;z-index:2}
  .row{display:flex;align-items:center;gap:22px;border-top:2px dotted var(--ink2)}
  .row:first-child{border-top:0}
  .sg{flex:none;width:46px;height:46px;display:grid;place-items:center;border:2px solid var(--tone);
    background:var(--tone);color:#FFFFFF;font-size:32px;font-weight:800;border-radius:4px}
  .ix{flex:none;width:36px;font-size:22px;font-weight:700;color:var(--ink2)}
  .lmk{flex:none;width:40px;height:40px;display:grid;place-items:center}
  .lmk .mark{width:36px;height:36px}
  .row.off .lmk .mark{filter:grayscale(1);opacity:.45}
  .tx{flex:1;min-width:0}
  .tt{font-weight:750;letter-spacing:-.03em;white-space:nowrap;line-height:1.15}
  .tt.xl{font-size:48px}.tt.l{font-size:36px}.tt.s{font-size:30px}
  .row .sl{font-size:18px;font-weight:600;color:var(--ink2);margin-top:6px;white-space:nowrap}
  .row .pill{flex:none;width:156px;justify-content:center}
  .pill.new{border-color:var(--tone);color:var(--tone-ink)}
  .pill.off{border-style:dashed;border-color:var(--ink2);color:var(--ink2);background:transparent}
  .row.off .sg{background:var(--face);border:2px dashed var(--ink2);color:var(--ink2)}
  .row.off .tt{color:var(--ink2)}
  .row.more .sg{background:var(--face);border-color:var(--ink);color:var(--ink)}
  .side{flex:1;display:flex;flex-direction:column;justify-content:center;gap:0}
  .side .day{font-size:300px;letter-spacing:-.06em;margin:6px 0 0 -12px}
  .side .mon{font-size:40px;font-weight:700;letter-spacing:.12em;margin-top:10px}
  .side .rule{margin:40px 0 26px}
  .tal{display:flex;align-items:baseline;gap:14px;height:54px;font-family:'ArMono',monospace;
    font-size:24px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
  .tal .lead{flex:1;height:6px;background-image:radial-gradient(circle,var(--ink) 1.3px,transparent 1.7px);background-size:10px 6px}
  .tal b{font-size:40px;min-width:1.4em;text-align:right}
  .tal.zero{color:var(--ink2)}
  .side .track{margin-top:22px}
  .side .bar.ret{border-right:0}

  /* a spotlight: the entry set big, its sign as a halftone glyph, the day as a strip of cells */
  .spot{height:790px;display:flex;flex-direction:column;justify-content:space-between}
  .spot > .sp-main:only-child{flex:1}
  .sp-main{flex:1;display:flex;gap:90px;align-items:center}
  .sp-l{flex:1;min-width:0}
  .spot .meta{display:flex;align-items:center;gap:24px;margin-top:34px}
  .spot .meta .sl{font-size:24px;font-weight:600;color:var(--ink2);white-space:nowrap}
  .spot .ttl{margin-top:30px;text-wrap:balance}
  .spot .lede{margin-top:34px;max-width:40ch}
  .lede.ll{font-size:40px}.lede.lm{font-size:36px}.lede.ls{font-size:32px}
  .glyph{flex:0 0 400px;height:400px}
  .glyph .face{width:100%;height:100%;position:relative;border-radius:4px}
  .gg{position:absolute;inset:0;display:grid;place-items:center}
  .gg.g2,.gg.g3,.gg.g4{grid-template-columns:1fr 1fr;padding:56px;gap:28px}
  .gm{display:block;object-fit:contain;width:220px;height:220px}
  .gg.g2 .gm,.gg.g3 .gm,.gg.g4 .gm{width:112px;height:112px}
  .gg.g2{grid-template-rows:1fr}
  .glyph.off .gm{filter:grayscale(1);opacity:.45}
  .badge{position:absolute;z-index:2;left:-22px;top:-22px;width:72px;height:72px;display:grid;place-items:center;
    border:2px solid var(--tone);background:var(--tone);color:#FFFFFF;font-size:46px;font-weight:800;border-radius:4px}
  .glyph.off .badge{background:var(--face);border:2px dashed var(--ink2);color:var(--ink2)}
  .strip{display:flex;gap:14px;height:84px}
  .cell{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:6px;padding:0 16px;
    border:2px solid var(--rule);border-radius:4px;background:var(--face)}
  .cell .mono{font-size:17px;font-weight:700;color:var(--tone-ink)}
  .cell .ct{font-size:20px;font-weight:700;letter-spacing:-.02em;white-space:nowrap;overflow:hidden}
  .cell.off{border-style:dashed;border-color:var(--ink2);color:var(--ink2)}
  .cell.off .mono{color:var(--ink2)}
  .cell.cur{background:var(--ink);border-color:var(--ink);color:var(--paper)}
  .cell.cur .mono{color:#FFFFFF}
  .spot.off .ttl{color:var(--ink2)}
  .spot.off .kicker{color:var(--ink2)}

  /* the end card: a long headline steps down */
  .end .big .bm{font-size:68px}.end .big .bs{font-size:54px}`;

export default {
  id: 'changelog',
  title: 'Changelog',
  scheduled: true,
  items,

  async collect({ flags }) {
    let text;
    if (flags.from) {
      text = fs.readFileSync(path.resolve(flags.from), 'utf8');
    } else {
      const r = await fetch(LLMS);
      if (!r.ok) throw new Error(`${LLMS} → HTTP ${r.status}`);
      text = await r.text();
    }
    if (sectionOf(text) === null) throw new Error('llms.txt has no "## Model releases" section — refusing to film nothing');
    if (flags.date && !/^\d{4}-\d{2}-\d{2}$/.test(flags.date)) throw new Error(`--date must be YYYY-MM-DD, got "${flags.date}"`);

    const all = parseEntries(text);
    const entries = latestBatch(all, flags.date);
    const date = entries[0]?.date ?? flags.date ?? null;
    console.log(entries.length
      ? `changelog ${date} — ${entries.length} of ${all.length} entries\n${entries.map(e => `  [${e.type}] ${e.title}`).join('\n')}`
      : `changelog — no entries${flags.date ? ` on ${flags.date}` : ''} (${all.length} in the section)`);
    return {
      notable: entries.length > 0, label: date, parts: entries.map(e => e.slug),
      date, entries, total: entries.length,
    };
  },

  film(data, { plan = {}, flags = {} }) {
    const { entries, date } = data;
    const n = entries.length;
    if (!n) throw new Error('no changelog entries to film');
    const added = entries.filter(e => !off(e)).length, retired = n - added;
    const limit = parseInt(flags.limit ?? plan.limit ?? 0, 10) || DEFAULT_LIMIT;
    const explicit = flags.seconds ?? plan.seconds;
    const seconds = explicit != null ? parseFloat(explicit) : null;
    if (seconds != null && !(seconds > 0)) throw new Error(`--seconds=${explicit} is not a length`);

    // The spotlights: the plan's picks in its order, else the day in order.
    const bySlug = new Map(entries.map(e => [e.slug, e]));
    const wanted = (plan.picks?.length ? plan.picks.map(id => bySlug.get(id)).filter(Boolean) : entries).slice(0, limit);

    const room = (seconds ?? DEFAULT_SECONDS) - OPEN - END;
    const log = logTiming(n, room);
    if (log.dur > room + 1e-9) throw new Error(`${seconds}s is too short to print a ${n}-line log (needs ${OPEN + END + log.dur}s)`);

    // Keep as many spotlights as the time honestly holds, in pick order.
    const spots = [];
    let used = log.dur;
    for (const e of wanted) {
      const line = lineOf(e, plan);
      const { need } = spotTiming(e.title, line);
      if (used + need > room + 1e-9) break;
      spots.push({ e, line, dur: need });
      used += need;
    }
    const dropped = wanted.length - spots.length;

    // Length: an explicit one is honoured; otherwise what the day needs, capped at 30s.
    const duration = seconds ?? OPEN + used + END;
    // Spare time goes to the spotlights a beat at a time, lead first, and any
    // off-grid remainder to the last scene — nothing ever sits empty.
    let spare = r3(duration - OPEN - END - used);
    if (spots.length) {
      for (let i = 0; spare >= BEAT - 1e-9; i = (i + 1) % spots.length) { spots[i].dur += BEAT; spare = r3(spare - BEAT); }
      spots.at(-1).dur = r3(spots.at(-1).dur + spare);
    } else log.dur = r3(log.dur + spare);

    const scenes = [openScene({
      kicker: plan.kicker ?? 'Changelog',
      meta: `${date} · ${added} new${retired ? ` · ${retired} retired` : ''}`,
    })];
    scenes.push(logScene(data, OPEN, log));
    let t = OPEN + log.dur;
    spots.forEach((s, i) => {
      scenes.push(spotScene(s.e, i, spots.length, entries, s.line, r3(t), r3(s.dur), date));
      t += s.dur;
    });

    const big = plan.headline ?? (n === 1 ? entries[0].title : `${added} new${retired ? `, ${retired} retired` : ''}`);
    scenes.push(endScene(duration, {
      kicker: plan.kicker ?? `Changelog · ${date}`,
      big: `<span class="${fit(big, [[26, 'bl'], [48, 'bm']], 'bs')}">${esc(big)}</span>`,
      sub: `<b>${n}</b> ${n === 1 ? 'entry' : 'entries'} · anyrouter.dev/blog/releases`,
      // Only what arrived: a retired provider's logo in this row would read as a launch.
      marks: [...new Set(entries.filter(e => !off(e)).flatMap(entryMarks))],
    }));

    return {
      title: `AnyRouter changelog — ${date}`,
      duration, tone: 'teal', palette: 'changelog', label: 'CHANGELOG',
      css: CSS, scenes,
      summary: `log ${n} (${added} new, ${retired} retired) + ${spots.length} spotlight${spots.length === 1 ? '' : 's'}`
        + `${dropped ? ` (${dropped} pick${dropped === 1 ? '' : 's'} left out: no time)` : ''}, ${duration}s`,
    };
  },

  headline(data, plan = {}) {
    if (plan.headline) return plan.headline;
    const { entries } = data;
    if (entries.length === 1) return entries[0].title;
    const rest = entries.length - 2;
    return `${entries.length} changelog updates: ${entries.slice(0, 2).map(e => e.title).join(', ')}${rest > 0 ? ` +${rest} more` : ''}`;
  },

  notes(data, plan = {}) {
    return [
      plan.share,
      ...data.entries.map(e => `- **${e.title}** — ${e.summary} ([link](${e.link}))`),
    ].filter(Boolean);
  },
};
