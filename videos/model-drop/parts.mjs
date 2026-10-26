/**
 * model-drop :: parts — what every model-drop scene is built from: the figures
 * as they are printed, alias handling, marks, pills, spec blocks and the CSS.
 */
import { esc, fit, BEAT } from '../../lib/film.mjs';
import { copyProblem, factNumbers } from '../../lib/plan.mjs';
import { markFor, monogram } from '../../lib/marks.mjs';

export const r3 = v => +v.toFixed(3);
export const onGrid = v => Math.round(v / BEAT) * BEAT;
export const pad = n => String(n).padStart(2, '0');

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
export const day = m => (m.created ? new Date(m.created * 1000).toISOString().slice(0, 10) : null);

// ── aliases: a name that follows the newest model of a family is not a new model ──
// The catalog has no alias field; its description is the most explicit signal
// ("Alias for the newest live claude-sonnet model; currently anthropic/claude-sonnet-5-5."),
// and the id's model part ending in -latest is the fallback.
export const isAlias = m => /^alias for\b/i.test(m.excerpt ?? '') || /-latest$/.test(String(m.id).split('/').pop());
/** The model an alias points at today, as the catalog names it, or null. */
export const followsOf = m => /\bcurrently ([\w./:-]+?)\.?$/i.exec(m.excerpt ?? '')?.[1] ?? null;
/** How many of a list are models and how many are aliases. */
export const tally = list => { const aliases = list.filter(isAlias).length; return { models: list.length - aliases, aliases }; };
export const aliasWord = (list, n) => `${list.filter(isAlias).every(m => /-latest$/.test(m.id)) ? '-latest ' : ''}alias${n === 1 ? '' : 'es'}`;
/** "5 new models · 18 -latest aliases" — either part left out when it is zero. */
export const countLine = list => {
  const { models, aliases } = tally(list);
  return [models && `${models} new model${models === 1 ? '' : 's'}`, aliases && `${aliases} ${aliasWord(list, aliases)}`]
    .filter(Boolean).join(' · ');
};
/** What the film left out, counted by kind: "+2 more models · +10 more aliases in this drop", or null. */
export const moreLine = hidden => {
  const { models, aliases } = tally(hidden);
  const parts = [models && `+${models} more model${models === 1 ? '' : 's'}`, aliases && `+${aliases} more ${aliasWord(hidden, aliases)}`];
  return hidden.length ? `${parts.filter(Boolean).join(' · ')} in this drop` : null;
};

/** Which layout a model count gets. */
export const layoutOf = n => (n === 1 ? 'hero' : n <= 4 ? 'cards' : 'list');

// ── what moved: a catalog change is "in/out@context", and any of the three can move ──
const AXES = ['in', 'out', 'context'];
const parseKey = s => {
  const [price, context] = String(s).split('@');
  const [inP, outP] = price.split('/').map(Number);
  return { in: inP, out: outP, context: context === 'x' ? null : Number(context) };
};
/** Only the axes that actually moved, in in / out / context order. */
export const changeAxes = c => {
  const [a, b] = [parseKey(c.from), parseKey(c.to)];
  return AXES.filter(k => a[k] !== b[k]).map(axis => ({ axis, from: a[axis], to: b[axis] }));
};
const axisText = (axis, v) => (axis === 'context' ? `${fmtCtx(v)} context` : `${fmtPrice(v)} ${axis}`);
/** "was $0.15 in · $0.60 out", "was 1M context": the old value of each axis that moved. */
export const wasLine = axes => axes.map(a => axisText(a.axis, a.from)).join(' · ');
export const nowLine = axes => axes.map(a => axisText(a.axis, a.to)).join(' · ');

// ── how a model is called: by what it is, never by a guess ─────────────────
// `anyr` has chat and embed commands and no rerank; the OpenAI SDK has no rerank either.
export const APIS = {
  chat: {
    name: 'chat completions', path: '/api/v1/chat/completions',
    cli: id => ['anyr login', `git diff | anyr chat --model ${id} "Review this" -`],
    body: id => `{"model": "${id}",\n      "messages": [{"role": "user", "content": "Hello"}]}`,
    sdk: id => `client.chat.completions.create({\n  model: "${id}",\n  messages: [{ role: "user", content: "Hello" }],\n});`,
  },
  embedding: {
    name: 'embeddings', path: '/api/v1/embeddings',
    cli: id => ['anyr login', `anyr embed --model ${id} "hello world"`],
    body: id => `{"model": "${id}",\n      "input": "hello world"}`,
    sdk: id => `client.embeddings.create({\n  model: "${id}",\n  input: "hello world",\n});`,
  },
  rerank: {
    name: 'rerank', path: '/api/v1/rerank', cli: null, sdk: null,
    body: id => `{"model": "${id}",\n      "query": "What is the capital of France?",\n      "documents": ["Paris is the capital of France.", "Berlin is the capital of Germany."]}`,
  },
};
export const apiOf = m => APIS[m.category === 'embedding' ? 'embedding' : m.category === 'rerank' ? 'rerank' : 'chat'];

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

/** "a text model", "an embedding model". */
export const aModel = cat => `${/^[aeiou]/i.test(cat ?? '') ? 'an' : 'a'} ${cat ? `${cat} ` : ''}model`;

// ── pieces ─────────────────────────────────────────────────────────────────
/** A model's mark file: the catalog's, else whatever its provider or id resolves to. Null when none is vendored. */
export const markOf = m => m.logo || markFor(m.provider) || markFor(m.id);
// A mark is a background, not an <img>: the same provider twice on a page would
// otherwise be two identical media nodes, which the checker flags. With no
// vendored mark the provider gets a monogram — never a borrowed or faked logo.
export const markFile = (f, cls = 'mark') => `<span class="${cls}" style="background:url('assets/providers/${esc(f)}') center/contain no-repeat"></span>`;
export const mark = m => (markOf(m) ? markFile(markOf(m)) : monogram(m.provider));
export const tile = (m, cls = '') => `<div class="tile box ${cls}"><div class="face">${mark(m)}</div></div>`;
export const freePill = '<span class="pill free">$0 · FREE</span>';
// Multi-model films carry no prices at all: a $0 model is marked as a status, not a figure.
export const freeTag = '<span class="pill free">FREE</span>';
export const aliasTag = '<span class="pill alias">ALIAS</span>';

/** The size class a model name gets, by its length. */
export const nameSize = (name, steps, fallback) => fit(name, steps, fallback);

/**
 * The lede under a model: the plan's line, else the catalog's own first
 * sentence — held to the same bar as the plan's copy (no hype, no number the
 * model's facts do not carry), because a vendor's "best" is still not a fact.
 */
export const DOLLARS = /\$\s?\d/;
export const ledeOf = (m, plan, max, { prices = true } = {}) => {
  const ok = t => prices || !DOLLARS.test(t);
  const line = plan.lines?.[m.id];
  if (line && ok(line)) return line;
  if (isAlias(m)) return followsOf(m) ? `alias · follows ${followsOf(m)}` : null;
  if (m.excerpt && !ok(m.excerpt)) return null;
  // The excerpt is left out of the facts it is checked against, or it would vouch for itself.
  return m.excerpt && !copyProblem(m.excerpt, factNumbers({ ...m, excerpt: null }), max) ? m.excerpt : null;
};

/** in / out / context as stamped boxes. */
export const specBoxes = m => `<div class="specs">
    <div class="box spec"><div class="face"><div class="num">${fmtPrice(m.inPrice)}</div><div class="label">in / 1M tokens</div></div></div>
    <div class="box spec"><div class="face"><div class="num">${fmtPrice(m.outPrice)}</div><div class="label">out / 1M tokens</div></div></div>
    <div class="box tone spec"><div class="face"><div class="num">${fmtCtx(m.context)}</div><div class="label">context</div></div></div>
    ${m.free ? freePill : ''}
  </div>`;

/** Context and status only — the spotlight of a many-model film, which shows no prices. */
export const specPlain = m => `<div class="specs">
    <div class="box tone spec"><div class="face"><div class="num">${fmtCtx(m.context)}</div><div class="label">context</div></div></div>
    ${m.category ? `<div class="box spec cat"><div class="face"><div class="num">${esc(m.category)}</div><div class="label">category</div></div></div>` : ''}
    ${m.free ? freeTag : ''}
  </div>`;

/** in / out / context as a ruled table — the other card's spec, so two cards never read the same. */
export const specTable = m => `<div class="stab">
    <div class="sc"><div class="label">in / 1M</div><div class="num">${fmtPrice(m.inPrice)}</div></div>
    <div class="sc"><div class="label">out / 1M</div><div class="num">${fmtPrice(m.outPrice)}</div></div>
    <div class="sc"><div class="label">context</div><div class="num">${fmtCtx(m.context)}</div></div>
    ${m.free ? `<div class="sc pc">${freePill}</div>` : ''}
  </div>`;

export const CSS = `
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
  .lr .st{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
  .pill.alias{border-style:dashed;color:var(--ink2)}
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
  .wall .maker .label{margin-top:6px;font-size:16px;letter-spacing:.1em}
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
