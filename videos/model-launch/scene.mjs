/**
 * scene: the one shot a model-launch film is (see STYLE.md for the look).
 *
 * A dark stage in the maker's accent. The left column (top in portrait) holds the model's
 * identity: its maker's mark, the kicker, the name set huge, a rule and, once the price is
 * said, a FREE or BYOK pill. The right column (below in portrait) is a card whose pane
 * changes with each beat: the spec sheet stamps in row by row, the price lands as a stamp,
 * the playground reply is typed where a capture exists, then the request and the command.
 * The film ends on the AnyRouter mark and the model's page. Captions run in a band below.
 *
 * Every size has a landscape value and a portrait value under `@media (orientation:
 * portrait)`; one timeline drives both renditions.
 */
import { esc } from '../../shared/authoring/film-project.mjs';
import { markImg } from '../../lib/marks.mjs';

export const C = { bg: '#0B0B0D', ink: '#F4F4F1', muted: '#A1A19C', line: '#2A2A2F', card: '#131316', bubble: '#BB4D00' };

// Characters of 32px Geist Mono a pane holds on one row, in either frame.
export const CODE_COLS = 43;

/** The name in lines of at most `max` characters, broken at spaces, then after hyphens. */
export function nameLines(name, max) {
  // a name of one token up to 18 characters stays whole and is set smaller: a row ending in a hyphen reads as a broken word
  const tokens = name.split(' ').flatMap(t => (t.length <= Math.max(max, 18) ? [t] : t.split(/(?<=-)/)));
  const lines = [];
  for (const t of tokens) {
    const last = lines.at(-1);
    if (last != null && (last.endsWith('-') ? last + t : `${last} ${t}`).length <= max) lines[lines.length - 1] = last.endsWith('-') ? last + t : `${last} ${t}`;
    else lines.push(t);
  }
  return lines;
}

/** The request and the command, each line within CODE_COLS, as [{ text, cls }]. */
export function codeOf(id) {
  if (id.length + 4 > CODE_COLS) throw new Error(`${id} is too long to show whole on one row of the code card`);
  const one = `  "model": "${id}",`;
  const request = [
    { text: '{', cls: 'p' },
    // an id on a row of its own leaves no room in the portrait card for the messages line
    ...(one.length <= CODE_COLS ? [{ text: one, cls: 'kv' }, { text: '  "messages": [ … ]', cls: 'k' }] : [{ text: '  "model":', cls: 'k' }, { text: `  "${id}"`, cls: 's' }]),
    { text: '}', cls: 'p' },
  ];
  const cmd = `$ anyr claude --model ${id}`;
  const term = cmd.length <= CODE_COLS ? [cmd]
    : `    --model ${id}`.length <= CODE_COLS ? ['$ anyr claude \\', `    --model ${id}`]
      : ['$ anyr claude \\', '    --model \\', `    ${id}`];
  return { request, term };
}

const chars = s => [...s].map(ch => `<span class="c">${ch === ' ' ? ' ' : esc(ch)}</span>`).join('');
/** A line of JSON with its key and its string coloured. */
const codeLine = l => {
  const m = /^(\s*)("[^"]+")(:)?(\s*)("[^"]*")?(,?)$/.exec(l.text);
  if (!m) return `<div class="ln" data-one-row>${chars(l.text)}</div>`;
  const [, ind, a, colon = '', sp = '', b = '', comma] = m;
  const aCls = colon ? 'key' : 'str';
  return `<div class="ln" data-one-row>${chars(ind)}<span class="${aCls}">${chars(a)}</span>${chars(colon + sp)}${b ? `<span class="str">${chars(b)}</span>` : ''}${chars(comma)}</div>`;
};

export function css(accent) {
  return `
  .stage{position:absolute;inset:0;overflow:hidden;background:${C.bg};color:${C.ink};font-family:'Geist',ui-sans-serif,sans-serif;
    -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
  .stage *{margin:0;padding:0;box-sizing:border-box}
  .mono{font-family:'Geist Mono',ui-monospace,monospace}
  .cam{position:absolute;inset:0;transform-origin:40% 45%}
  .rings{position:absolute;left:-240px;top:-300px;width:1260px;height:1260px}
  .rings circle{fill:none;stroke:${accent};stroke-width:2}
  .id{position:absolute;left:110px;top:170px;width:720px}
  .mk{display:block;width:104px;height:104px;object-fit:contain}
  .mk.inv{filter:brightness(0) invert(1)}
  .mono-mark{display:flex;width:104px;height:104px;border:3px solid ${accent};border-radius:24px;align-items:center;justify-content:center;
    font:700 44px 'Geist';color:${accent}}
  .kicker{margin-top:34px;font:500 32px 'Geist Mono';letter-spacing:.16em;color:${accent};white-space:nowrap}
  .name{margin-top:22px}
  .name .nl{display:block;font:800 136px/1.02 'Geist';letter-spacing:-.045em;white-space:nowrap;overflow:hidden;padding-bottom:.1em;margin-bottom:-.1em}
  .name .nl>span{display:inline-block}
  .name.p{display:none}
  .name.long .nl{font-size:104px}
  .rule{margin-top:30px;width:260px;height:8px;background:${accent};transform-origin:0 50%}
  .pill{display:inline-flex;align-items:center;height:64px;margin-top:30px;padding:0 26px;border-radius:999px;font:600 34px 'Geist';white-space:nowrap}
  .pill.free{background:${accent};color:${C.bg}}
  .pill.byok{border:3px dashed ${accent};color:${C.ink}}
  .pill.credits{border:3px solid ${C.line};color:${C.ink}}
  .panel{position:absolute;left:860px;top:150px;width:960px;height:740px;perspective:1600px}
  .card{position:absolute;inset:0;background:${C.card};border:2px solid ${C.line};border-radius:32px}
  .pane{position:absolute;left:30px;right:30px;top:40px;bottom:36px}
  .lbl{font:500 32px 'Geist Mono';letter-spacing:.12em;color:${C.muted};white-space:nowrap}
  .row{display:flex;justify-content:space-between;align-items:baseline;gap:24px;padding:18px 0;border-bottom:2px solid ${C.line}}
  .row:last-child{border-bottom:0}
  .row .k{font:500 32px 'Geist Mono';letter-spacing:.1em;color:${C.muted};white-space:nowrap}
  .row .v{font:600 44px 'Geist';white-space:nowrap;text-align:right}
  .row.idrow{display:block}
  .row.idrow .v{display:block;text-align:left;margin-top:12px;font:500 32px 'Geist Mono';letter-spacing:0;color:${accent}}
  .stamp{display:inline-block;margin-left:8px;border:8px solid ${accent};border-radius:22px;padding:6px 34px 0;transform:rotate(-4deg);transform-origin:30% 60%}
  .stamp .big{font:800 168px/1 'Geist';letter-spacing:-.04em;color:${accent};white-space:nowrap}
  .stamp.byok{border-style:dashed}
  .sub{margin-top:30px;font:600 48px 'Geist';white-space:nowrap}
  .facts{margin-top:22px}
  .facts .f{font:500 40px 'Geist';color:${C.ink};padding:10px 0;white-space:nowrap}
  .facts .f b{color:${accent};font-weight:700}
  .chips{display:flex;flex-wrap:wrap;gap:14px;margin-top:18px}
  .chip{display:inline-block;padding:8px 20px;border:2px solid ${C.line};border-radius:999px;font:500 32px 'Geist';white-space:nowrap}
  .pg-head{display:flex;justify-content:space-between;padding-bottom:22px;border-bottom:2px solid ${C.line}}
  .pg-head span{font:500 32px 'Geist Mono';color:${C.muted};white-space:nowrap}
  .bubble{margin:56px 0 0 auto;width:max-content;max-width:100%;padding:18px 30px;border-radius:40px;background:${C.bubble};color:#FFFFFF;font:500 40px 'Geist';white-space:nowrap}
  .who{margin-top:44px;font:500 32px 'Geist';color:${C.muted};white-space:nowrap}
  .reply{margin-top:14px;font:600 52px 'Geist';white-space:nowrap}
  .meta{margin-top:40px;font:500 32px 'Geist Mono';color:${C.muted};white-space:nowrap}
  .code{margin-top:18px;padding:22px 18px;border-radius:20px;background:#0E0E11;border:2px solid ${C.line}}
  .term{margin-top:18px;padding:22px 18px;border-radius:20px;background:${C.ink};color:${C.bg}}
  .ln{font:500 32px/1.5 'Geist Mono';white-space:pre}
  .code .key{color:#C9C9C4}
  .code .str{color:${accent}}
  .c{opacity:0}
  .close{position:absolute;left:0;right:0;top:0;bottom:150px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .close .logo{width:440px;height:auto}
  .close .url{margin-top:56px;text-align:center}
  .close .url div{font:500 44px/1.4 'Geist Mono';white-space:nowrap}
  .close .url .id2{color:${accent}}
  .close .pill{margin-top:44px}
  .cap{position:absolute;left:110px;right:110px;top:928px;height:110px}
  .cap span{position:absolute;left:0;right:0;top:0;text-align:center;font:500 40px/1.35 'Geist';color:${C.ink};opacity:0}
  .hero{display:none}
  @media (orientation: portrait){
    .rings{left:-330px;top:-260px;width:1300px;height:1300px}
    .hero{display:flex;position:absolute;left:0;top:0;width:260px;height:260px;align-items:center;justify-content:center;opacity:0}
    .hero .hmk,.hero .mono-mark{width:260px;height:260px}
    .hero .hmk{background:center/contain no-repeat}
    .hero .hmk.inv{filter:brightness(0) invert(1)}
    .hero .mono-mark{border-width:6px;border-radius:56px;font-size:110px}
    .id{left:60px;top:200px;width:900px}
    .mk,.mono-mark{width:84px;height:84px}
    .kicker{margin-top:24px;font-size:36px}
    .name.l{display:none}
    .name.p{display:block;margin-top:14px}
    .name .nl{font-size:112px}
    .name.long .nl{font-size:84px}
    .rule{margin-top:22px;height:6px}
    .pill{height:60px;margin-top:22px;font-size:34px}
    .panel{left:60px;top:690px;width:900px;height:710px}
    .pane{left:30px;right:30px;top:36px;bottom:30px}
    .pane.spec{display:flex;flex-direction:column;justify-content:space-between}
    .row{padding:12px 0}
    .row .k{font-size:34px}
    .row .v{font-size:50px}
    .row.idrow .v{margin-top:14px;font-size:36px}
    .stamp .big{font-size:170px}
    .stamp{border-width:8px}
    .stamp.byok .big{font-size:136px}
    .stamp.byok~.facts .f{padding:6px 0}
    .stamp.byok~.facts{margin-top:14px}
    .sub{margin-top:22px;font-size:52px}
    .facts{margin-top:26px}
    .facts .f{font-size:44px;padding:14px 0}
    .chips{gap:12px;margin-top:14px}
    .chip{padding:6px 18px}
    .pg-head span{font-size:34px}
    .bubble{margin-top:64px;font-size:46px;padding:22px 34px}
    .who{margin-top:64px;font-size:38px}
    .reply{margin-top:18px;font-size:66px}
    .meta{margin-top:48px;font-size:34px}
    .lbl{font-size:34px}
    .ln{line-height:1.6}
    .code,.term{padding:22px 22px;margin-top:20px}
    .use .lbl+.code+.lbl{margin-top:56px !important}
    .use.tight .code,.use.tight .term{padding:14px 14px;margin-top:14px}
    .use.tight .ln{line-height:1.4}
    .close{left:60px;right:120px;top:360px;bottom:520px;justify-content:flex-start}
    .close .logo{width:520px;height:520px}
    .close .url{margin-top:190px}
    .close .url div{font-size:38px}
    .close .pill{margin-top:44px;height:72px;font-size:40px;padding:0 34px}
    .cap{left:60px;right:60px;top:1420px;height:120px}
    .cap span{font-size:40px}
  }`;
}

/** The scene's HTML. `t` is the timing from kind.mjs's storyOf. */
export function body(f, t) {
  const nameL = nameLines(f.name, 13), nameP = nameLines(f.name, 15);
  const name = (lines, cls) => `<div class="name ${cls}${lines.length > 2 ? ' long' : ''}">${lines.map(l => `<div class="nl"><span>${esc(l)}</span></div>`).join('')}</div>`;
  const pill = { free: 'Free on AnyRouter', byok: 'Bring your own key', credits: 'AnyRouter credits' }[f.billing];
  // a one-colour mark is drawn in ink, so it reads on the dark stage; a colour mark keeps its colours
  const mark = f.mark ? markImg(f.mark, /-color\.svg$/.test(f.mark) ? 'mk' : 'mk inv') : `<span class="mono-mark">${esc(f.maker.slice(0, 2).toUpperCase())}</span>`;
  // the portrait opening's big mark: drawn as a background, so the film loads each mark once
  const hero = f.mark ? `<span class="hmk${/-color\.svg$/.test(f.mark) ? '' : ' inv'}" style="background-image:url(assets/providers/${esc(f.mark)})"></span>` : mark;
  const rings = [170, 250, 340, 440, 560].map((r, k) => `<circle cx="630" cy="630" r="${r}" stroke-dasharray="${k % 2 ? '6 14' : '180 50'}" opacity="${(0.6 - k * 0.07).toFixed(2)}"/>`).join('');

  const spec = [
    ['MAKER', f.maker], ['CONTEXT', f.contextLabel ? `${f.contextLabel} tokens` : 'not listed'], ['INPUT', f.inputsLabel],
    ['OUTPUT', f.outputsLabel], ['CREATED', f.dateLabel],
  ];
  const specPane = `<div class="pane spec">${spec.map(([k, v]) => `<div class="row"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>`).join('')}
    <div class="row idrow"><span class="k">MODEL ID</span><span class="v" data-one-row>${esc(f.id)}</span></div></div>`;

  const named = f.keyNames.filter(k => k.named).map(k => k.name);
  const keys = named.slice(0, named.length > 7 ? 6 : 7);
  const more = f.keyNames.length - keys.length;
  const pricePane = f.billing === 'free'
    ? `<div class="pane price"><div class="stamp" data-layout-allow-overlap><div class="big">FREE</div></div><div class="sub">on AnyRouter</div>
        <div class="facts"><div class="f"><b>$0</b> per 1M input tokens</div><div class="f"><b>$0</b> per 1M output tokens</div><div class="f">No daily cap</div></div></div>`
    : f.billing === 'byok'
      ? `<div class="pane price"><div class="stamp byok" data-layout-allow-overlap><div class="big">BYOK</div></div><div class="sub">Bring your own provider key</div>
        <div class="facts"><div class="f">You pay your provider's price</div><div class="f">AnyRouter adds no markup</div></div><div class="lbl" style="margin-top:18px">KEYS THAT RUN IT</div>
        <div class="chips">${keys.map(k => `<span class="chip">${esc(k)}</span>`).join('')}${more ? `<span class="chip">+${more} more</span>` : ''}</div></div>`
      : `<div class="pane price"><div class="sub">Runs on AnyRouter credits</div></div>`;

  const replyPane = f.capture ? `<div class="pane reply-pane"><div class="pg-head"><span>AnyRouter playground</span><span>${esc(f.capture.dateLabel)}</span></div>
      <div class="bubble">${esc(f.capture.prompt)}</div><div class="who">${esc(f.capture.model)}</div>
      <div class="reply" data-one-row>${chars(f.capture.reply)}</div><div class="meta">${esc(f.capture.meta)}</div></div>` : '';

  const code = codeOf(f.id);
  const usePane = `<div class="pane use${code.request.some(l => l.cls === 's') ? ' tight' : ''}"><div class="lbl">IN ANY REQUEST</div><div class="code">${code.request.map(codeLine).join('')}</div>
      <div class="lbl" style="margin-top:28px">IN CLAUDE CODE</div><div class="term">${code.term.map(l => `<div class="ln" data-one-row>${chars(l)}</div>`).join('')}</div></div>`;

  const caps = t.captions.map((c, k) => `<span data-k="${k}">${esc(c.text)}</span>`).join('');
  return `<div class="cam" data-layout-allow-overflow>
    <svg class="rings" viewBox="0 0 1260 1260">${rings}</svg>
    <div class="hero">${hero}</div>
    <div class="id">${mark}<div class="kicker">${f.isNew ? 'NEW MODEL' : 'ON ANYROUTER'}</div>${name(nameL, 'l')}${name(nameP, 'p')}
      <div class="rule"></div><div><span class="pill ${f.billing}">${pill}</span></div></div>
    <div class="panel"><div class="card"></div>${specPane}${pricePane}${replyPane}${usePane}</div>
    <div class="close"><img class="logo" src="assets/brand/anyrouter-logo-white.svg" alt="AnyRouter">
      <div class="url"><div>anyrouter.dev/model/</div><div class="id2">${esc(f.id)}</div></div><div><span class="pill ${f.billing}">${pill}</span></div></div>
  </div>
  <div class="cap" data-outside-safe-area>${caps}</div>`;
}

/** The scene's timeline. Everything it places comes from `t`, so the film and its sound agree. */
export function inner(t) {
  return `
    const T = ${JSON.stringify(t)};
    fit($$(".name .nl > span").map(s => s.parentElement));
    fit($$(".reply, .bubble"));
    // in portrait the card fills the height from under the identity block, however many rows the name takes
    if (PORTRAIT) {
      const idBox = $(".id"), panel = $(".panel");
      const bottom = idBox.offsetTop + idBox.offsetHeight + 28;
      panel.style.height = (panel.offsetTop + panel.offsetHeight - bottom) + "px"; panel.style.top = bottom + "px";
    }
    // in portrait the opening and the close are hero shots that fill the height: the rings,
    // centred, round the maker's mark (the AnyRouter mark at the close), the name set low
    if (PORTRAIT) {
      const rings = $(".rings"), hero = $(".hero"), idBox = $(".id"), idMark = $(".id .mk, .id .mono-mark");
      // an <svg> has no offset box: its place is read from its style
      const rs = getComputedStyle(rings), size = parseFloat(rs.width), outer = 560 / 1260 * size;
      const at = (cx, cy, r) => ({ x: cx - (parseFloat(rs.left) + size / 2), y: cy - (parseFloat(rs.top) + size / 2), scale: r / outer });
      const rule = $(".rule"), kicker = $(".kicker");
      const low = 1400 - (idBox.offsetTop + rule.offsetTop + rule.offsetHeight);
      const free = idBox.offsetTop + kicker.offsetTop + low - 60;
      const open = { cx: 510, cy: (200 + free) / 2, r: (free - 200) / 2 };
      const close = $(".close"), logo = $(".close .logo");
      const shut = { cx: close.offsetLeft + logo.offsetLeft + logo.offsetWidth / 2, cy: close.offsetTop + logo.offsetTop + logo.offsetHeight / 2, r: 410 };
      const S = T.beats.spec.at - 0.1, X = T.beats.close.at;
      tl.set(rings, { transformOrigin: "50% 50%", ...at(open.cx, open.cy, open.r) }, 0);
      tl.set(hero, { x: open.cx - hero.offsetWidth / 2, y: open.cy - hero.offsetHeight / 2 }, 0);
      tl.fromTo(hero, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2)" }, T.beats.reveal.at + T.at.mark);
      tl.set(idMark, { opacity: 0 }, 0);
      tl.fromTo(idBox, { y: low }, { y: 0, duration: 0.8, ease: "expo.inOut", immediateRender: true }, S);
      tl.to(rings, { x: 0, y: 0, scale: 1, duration: 0.8, ease: "expo.inOut" }, S);
      tl.to(hero, { opacity: 0, scale: 0.32, x: idBox.offsetLeft + idMark.offsetLeft + idMark.offsetWidth / 2 - hero.offsetWidth / 2, y: idBox.offsetTop + idMark.offsetTop + idMark.offsetHeight / 2 - hero.offsetHeight / 2, duration: 0.8, ease: "expo.inOut" }, S);
      tl.to(idMark, { opacity: 1, duration: 0.3 }, S + 0.5);
      tl.to(rings, { ...at(shut.cx, shut.cy, shut.r), duration: 0.9, ease: "expo.inOut" }, X);
    }
    // the camera never rests: a slow push and the rings turning
    tl.fromTo($(".cam"), { scale: 1 }, { scale: PORTRAIT ? 1.02 : 1.05, duration: D, ease: "none" }, 0);
    sway($(".stage"));
    $$(".rings circle").forEach((c, k) => tl.fromTo(c, { rotation: 0, svgOrigin: "630 630" }, { rotation: (k % 2 ? -1 : 1) * D * (9 + k * 2), svgOrigin: "630 630", duration: D, ease: "none" }, 0));
    tl.from($$(".rings circle"), { scale: 0.2, svgOrigin: "630 630", opacity: 0, duration: 1.4, stagger: 0.12, ease: "expo.out" }, 0.1);

    // reveal: the mark, the kicker, the name rising out of its rows, the rule
    const R = T.beats.reveal.at;
    if (!PORTRAIT) tl.from($(".id .mk, .id .mono-mark"), { scale: 0.4, opacity: 0, duration: 0.6, ease: "back.out(2)" }, R + T.at.mark);
    tl.from($(".kicker"), { opacity: 0, x: -40, duration: 0.7 }, R + T.at.kicker);
    tl.from($$(".name .nl > span"), { yPercent: 115, duration: 0.8, stagger: 0.12, ease: "expo.out" }, R + T.at.name);
    tl.from($(".rule"), { scaleX: 0, duration: 0.7, ease: "power4.inOut" }, R + T.at.rule);
    tl.set($(".id .pill"), { opacity: 0 }, 0);

    // the card comes in with the spec, and each pane turns in and out like a page on a hinge
    tl.from($(".panel .card"), { opacity: 0, x: 80, rotationY: -14, duration: 0.7, ease: "power3.out" }, T.beats.spec.at);
    for (const p of [".spec", ".price", ".reply-pane", ".use"]) tl.set($$(".pane" + p), { opacity: 0 }, 0);
    const turnIn = (sel, at) => tl.fromTo($(sel), { opacity: 0, x: 70, rotationY: -12 }, { opacity: 1, x: 0, rotationY: 0, duration: 0.6, ease: "power3.out" }, at);
    const turnOut = (sel, at) => tl.to($(sel), { opacity: 0, x: -70, rotationY: 12, duration: 0.4, ease: "power2.in" }, at);
    const panes = T.panes;
    panes.forEach((p, k) => { turnIn(".pane." + p.cls, p.at); if (k < panes.length - 1) turnOut(".pane." + p.cls, panes[k + 1].at - 0.4); });

    // spec rows press in one by one
    $$(".pane.spec .row").forEach((row, k) => tl.from(row, { opacity: 0, scale: 1.12, transformOrigin: "0% 50%", duration: 0.3, ease: "power4.out" }, T.at.rows[k]));

    // the price lands as a stamp, then its facts, and the pill joins the name
    tl.from($(".pane.price .stamp, .pane.price .sub"), { scale: 1.9, opacity: 0, rotation: -12, duration: 0.42, ease: "power4.in" }, T.at.stamp - 0.42);
    tl.from($$(".pane.price .facts .f, .pane.price .lbl, .pane.price .chip"), { opacity: 0, y: 24, duration: 0.45, stagger: 0.12 }, T.at.stamp + 0.35);
    tl.fromTo($(".id .pill"), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, T.at.stamp + 0.2);

    // the playground reply, typed as it streamed
    if (T.at.reply) {
      tl.from($(".bubble"), { opacity: 0, y: 30, scale: 0.92, transformOrigin: "100% 100%", duration: 0.5, ease: "back.out(1.6)" }, T.at.bubble);
      tl.from($(".who"), { opacity: 0, duration: 0.3 }, T.at.reply - 0.3);
      $$(".reply .c").forEach((c, k) => tl.set(c, { opacity: 1 }, T.at.reply + k * T.at.replyEach));
      tl.from($(".meta"), { opacity: 0, y: 14, duration: 0.4 }, T.at.meta);
    }

    // the request and the command, typed
    $$(".pane.use .c").forEach((c, k) => tl.set(c, { opacity: 1 }, T.at.typed[k]));

    // the close: the card and the name step back, the mark and the page come up
    tl.to($$(".id, .panel"), { opacity: 0, y: -40, scale: 0.96, duration: 0.5, ease: "power2.in", stagger: 0.06 }, T.beats.close.at);
    tl.set($(".close"), { opacity: 0 }, 0);
    tl.set($(".close"), { opacity: 1 }, T.beats.close.at + 0.45);
    tl.from($(".close .logo"), { opacity: 0, scale: 0.86, duration: 0.7, ease: "expo.out" }, T.beats.close.at + 0.5);
    tl.from($$(".close .url div"), { opacity: 0, y: 40, duration: 0.6, stagger: 0.14, ease: "expo.out" }, T.beats.close.at + 0.8);
    tl.from($(".close .pill"), { opacity: 0, scale: 0.8, duration: 0.5, ease: "back.out(2)" }, T.beats.close.at + 1.3);
    // the end card keeps coming toward the viewer until the last frame
    tl.fromTo($(".close .logo"), { y: 0 }, { y: -26, duration: T.beats.close.dur - 0.5, ease: "none" }, T.beats.close.at + 0.5);
    tl.fromTo($(".close .url"), { scale: 1 }, { scale: 1.05, duration: T.beats.close.dur - 0.8, ease: "none" }, T.beats.close.at + 0.8);

    // captions: each group while it is said
    T.captions.forEach((c, k) => { const el = $('.cap span[data-k="' + k + '"]'); tl.set(el, { opacity: 1 }, c.at); tl.set(el, { opacity: 0 }, c.end); });
  `;
}
