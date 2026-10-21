/**
 * scene: the weekly film is one shot of a news page (see STYLE.md). The nameplate stays at the
 * top; below it the page turns, section by section: the week on a calendar strip, the number
 * of the week on an odometer, the models created that week, the week's changelog, the close.
 */
import { esc } from '../../shared/authoring/film-project.mjs';
import { titleLines } from './week.mjs';

export const C = { paper: '#F3EEE2', ink: '#1B1916', muted: '#5C564C', rule: '#1B1916', red: '#A8261B', tile: '#E8E1D1' };
export const MAX_MODELS = 7, MAX_ENTRIES = 5;

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const short = day => `${MON[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8))}`;
const TAG = { free: 'FREE', byok: 'BYOK', credits: 'CREDITS', added: 'ADDED', retired: 'RETIRED', changed: 'CHANGED' };

export function css() {
  return `
  .stage{position:absolute;inset:0;overflow:hidden;background:${C.paper};color:${C.ink};font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}
  .stage *{margin:0;padding:0;box-sizing:border-box}
  .serif{font-family:'Newsreader',serif}
  .cam{position:absolute;inset:0;transform-origin:50% 30%}
  .mast{position:absolute;left:100px;right:100px;top:56px;text-align:center}
  .mast .rule2{height:8px;border-top:3px solid ${C.rule};border-bottom:1px solid ${C.rule}}
  .mast h1{font:700 104px/1.12 'Newsreader';letter-spacing:-.01em;white-space:nowrap;padding:6px 0}
  .mast h1 span{display:inline}
  .mast .line{display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid ${C.rule};border-bottom:3px solid ${C.rule}}
  .mast .line span{font:600 32px 'Inter';letter-spacing:.08em;white-space:nowrap}
  .mast .line .red{color:${C.red}}
  .sec{position:absolute;left:100px;right:100px;top:330px;bottom:170px;transform-origin:0% 50%}
  .kick{font:600 32px 'Inter';letter-spacing:.12em;color:${C.red};white-space:nowrap}
  .hed{margin-top:6px;font:600 64px/1.1 'Newsreader';white-space:nowrap}
  .cal{display:flex;gap:22px;margin-top:40px}
  .tile{flex:1;height:250px;background:${C.tile};border-top:6px solid ${C.ink};padding:18px 0 0;text-align:center;position:relative}
  .tile .wd{font:600 32px 'Inter';letter-spacing:.1em;color:${C.muted}}
  .tile .dn{font:500 104px/1.1 'Newsreader'}
  .tile .dots{position:absolute;left:0;right:0;bottom:22px;display:flex;justify-content:center;gap:8px}
  .tile .dots i{width:14px;height:14px;border-radius:50%;background:${C.red}}
  .tile .dots i.e{background:transparent;border:3px solid ${C.ink}}
  .legend{margin-top:22px;display:flex;gap:40px}
  .legend span{font:500 32px 'Inter';color:${C.muted};white-space:nowrap;display:flex;align-items:center;gap:12px}
  .legend i{display:inline-block;width:16px;height:16px;border-radius:50%;background:${C.red}}
  .legend i.e{background:transparent;border:3px solid ${C.ink}}
  .numrow{display:flex;align-items:center;gap:60px;margin-top:10px}
  .odo{display:flex;align-items:flex-start;height:330px;overflow:hidden}
  .odo .col{display:flex;flex-direction:column}
  .odo .col span{display:block;flex:none;height:330px;font:700 330px/330px 'Newsreader';text-align:center}
  .odo .col .past::after{content:attr(data-d)}
  .numtext .what{font:600 56px/1.15 'Newsreader';white-space:nowrap}
  .numtext .split{margin-top:24px}
  .numtext .split div{font:500 40px/1.5 'Inter';white-space:nowrap}
  .numtext .split b{display:inline-block;min-width:150px;font-weight:700}
  .rows{margin-top:18px}
  .mrow{display:flex;align-items:baseline;gap:22px;padding:7px 0;border-bottom:1px solid #C9C0AE}
  .tag{display:inline-block;min-width:150px;padding:2px 12px;font:700 32px 'Inter';letter-spacing:.06em;text-align:center;white-space:nowrap}
  .tag.free{background:${C.red};color:#FFFFFF}
  .tag.byok{border:3px dashed ${C.ink}}
  .tag.credits,.tag.retired,.tag.changed{border:3px solid ${C.muted};color:${C.muted}}
  .tag.added{border:3px solid ${C.ink}}
  .mname{font:600 42px 'Newsreader';white-space:nowrap}
  .mby{font:500 32px 'Inter';color:${C.muted};white-space:nowrap;margin-left:auto}
  .mrow .two{display:none}
  .erow{display:flex;align-items:baseline;gap:22px;padding:12px 0;border-bottom:1px solid #C9C0AE}
  .edate{font:600 32px 'Inter';letter-spacing:.06em;min-width:120px;white-space:nowrap}
  .etitle .tl{font:500 40px/1.25 'Newsreader';white-space:nowrap}
  .etitle.p{display:none}
  .more.po{display:none}
  .more{padding-top:12px;font:500 32px 'Inter';color:${C.muted};white-space:nowrap}
  .end{position:absolute;left:100px;right:100px;top:330px;bottom:170px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .end .logo{width:300px}
  .end .url{margin-top:44px;font:600 64px 'Newsreader';white-space:nowrap}
  .end .sub{margin-top:16px;font:500 32px 'Inter';color:${C.muted};letter-spacing:.08em;white-space:nowrap}
  .cap{position:absolute;left:100px;right:100px;top:946px;height:100px}
  .cap span{position:absolute;left:0;right:0;top:0;text-align:center;font:500 40px/1.3 'Inter';color:${C.ink};opacity:0}
  @media (orientation: portrait){
    .mast{left:60px;right:120px;top:206px}
    .mast h1{font-size:96px;line-height:1.05;padding:10px 0}
    .mast h1 span{display:block}
    .mast .line{flex-direction:column;align-items:center}
    .sec,.end{left:60px;right:120px;top:580px;bottom:520px}
    .kick{font-size:34px}
    .hed{font-size:60px}
    .cal{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:34px}
    .tile{height:250px;padding-top:16px}
    .tile .wd{font-size:34px}
    .tile .dn{font-size:120px}
    .tile .dots{bottom:20px;gap:8px;flex-wrap:wrap;padding:0 10px}
    .tile .dots i{width:18px;height:18px}
    .legend{flex-direction:column;gap:14px;margin-top:30px}
    .legend span{font-size:38px}
    .legend i{width:20px;height:20px}
    .numrow{flex-direction:column;align-items:flex-start;gap:24px}
    .odo{height:400px}
    .odo .col span{height:400px;font-size:400px;line-height:400px}
    .numtext .what{font-size:64px}
    .numtext .split{margin-top:30px}
    .numtext .split div{font-size:46px}
    .rows{margin-top:26px}
    .mrow{flex-wrap:wrap;gap:6px 18px;padding:14px 0}
    .mrow .one{display:none}
    .mrow.lo,.more.lo{display:none}
    .more.po{display:block}
    .mrow .two{display:block;width:100%;font-size:36px;margin:0}
    .mname{font-size:50px}
    .tag{min-width:130px;font-size:34px}
    .erow{flex-wrap:wrap;gap:6px 18px;padding:14px 0}
    .edate{font-size:36px}
    .etitle{width:100%}
    .etitle.l{display:none}
    .etitle.p{display:block}
    .etitle .tl{font-size:46px}
    .more{font-size:36px;padding-top:18px}
    .end .logo{width:440px}
    .end .url{font-size:66px}
    .end .sub{font-size:36px}
    .cap{left:60px;right:60px;top:1420px;height:120px}
  }`;
}

/**
 * An odometer column that rolls from 0 up to `digit`. Only the digit it lands on is text; the
 * ones it rolls past are drawn from an attribute, so a digit cut by the window is never read.
 */
const odoCol = digit => `<div class="col">${[...Array(digit + 1).keys()].map(d => (d === digit ? `<span>${d}</span>` : `<span class="past" data-d="${d}"></span>`)).join('')}</div>`;

export function body(w, t) {
  const n = w.models.length;
  const counts = ['free', 'byok', 'credits'].map(b => [b, w.models.filter(m => m.billing === b).length]).filter(([, k]) => k);
  const words = { free: 'free on AnyRouter', byok: 'bring your own key', credits: 'on AnyRouter credits' };
  // free first, as the voice names them, then BYOK, then credits; newest first within each
  const rank = { free: 0, byok: 1, credits: 2 };
  const models = [...w.models].sort((a, b) => rank[a.billing] - rank[b.billing]).slice(0, w.models.length > MAX_MODELS ? MAX_MODELS - 1 : MAX_MODELS);
  const entries = w.entries.slice(0, w.entries.length > MAX_ENTRIES ? MAX_ENTRIES - 1 : MAX_ENTRIES);
  // the portrait page holds five rows of two lines; the landscape one holds seven
  const portraitRows = w.models.length > 5 ? 4 : 5;
  const caps = t.captions.map((c, k) => `<span data-k="${k}">${esc(c.text)}</span>`).join('');
  return `<div class="cam">
    <div class="mast"><div class="rule2"></div><h1><span>This Week on</span> <span>AnyRouter</span></h1>
      <div class="line"><span class="red">WEEK ${Number(w.week.slice(6))} · ${w.week.slice(0, 4)}</span><span>${esc(t.spanLabel)}</span></div></div>

    <div class="sec s-cal"><div class="kick">THE WEEK</div><div class="hed">Seven days on the catalog</div>
      <div class="cal">${w.days.map(d => `<div class="tile"><div class="wd">${d.weekday}</div><div class="dn">${d.n}</div>
        <div class="dots">${'<i></i>'.repeat(d.models)}${'<i class="e"></i>'.repeat(d.entries)}</div></div>`).join('')}</div>
      <div class="legend"><span><i></i>a model created that day</span><span><i class="e"></i>a changelog entry</span></div></div>

    <div class="sec s-num"><div class="kick">NUMBER OF THE WEEK</div>
      <div class="numrow"><div class="odo">${String(n).split('').map(d => odoCol(Number(d))).join('')}</div>
        <div class="numtext"><div class="what">${n === 1 ? 'model' : 'models'} in the catalog</div><div class="what">created this week</div>
        <div class="split">${counts.map(([b, k]) => `<div><b>${k}</b>${words[b]}</div>`).join('')}</div></div></div></div>

    <div class="sec s-new"><div class="kick">CREATED THIS WEEK</div><div class="hed">Models in the catalog, by created date</div>
      <div class="rows">${models.map((m, k) => `<div class="mrow${k >= portraitRows ? ' lo' : ''}"><span class="tag ${m.billing}">${TAG[m.billing]}</span><span class="mname">${esc(m.name)}</span>
        <span class="mby one">${esc(m.maker)} · ${short(m.day)}</span><span class="mby two">${esc(m.maker)} · ${short(m.day)}</span></div>`).join('')}
        ${models.length < w.models.length ? `<div class="more lo">+ ${w.models.length - models.length} more on anyrouter.dev/models</div>` : ''}
        ${portraitRows < w.models.length ? `<div class="more po">+ ${w.models.length - portraitRows} more on anyrouter.dev/models</div>` : ''}</div></div>

    <div class="sec s-log"><div class="kick">FROM THE CHANGELOG</div><div class="hed">${w.entries.length} ${w.entries.length === 1 ? 'entry' : 'entries'} this week</div>
      <div class="rows">${entries.map(e => `<div class="erow"><span class="edate">${short(e.date)}</span><span class="tag ${e.type}">${TAG[e.type]}</span>
        <div class="etitle l">${titleLines(e.title, 64).map(l => `<div class="tl">${esc(l)}</div>`).join('')}</div>
        <div class="etitle p">${titleLines(e.title, 40).map(l => `<div class="tl">${esc(l)}</div>`).join('')}</div></div>`).join('')}
        ${entries.length < w.entries.length ? `<div class="more">+ ${w.entries.length - entries.length} more on anyrouter.dev/changelog</div>` : ''}</div></div>

    <div class="end"><img class="logo" src="assets/brand/anyrouter-logo-black.svg" alt="AnyRouter"><div class="url">anyrouter.dev/changelog</div>
      <div class="sub">EVERY WEEK ON ANYROUTER</div></div>
  </div>
  <div class="cap" data-outside-safe-area>${caps}</div>`;
}

export function inner(t) {
  return `
    const T = ${JSON.stringify(t)};
    fit($$(".mname, .etitle .tl, .hed, .numtext .what"));
    tl.fromTo($(".cam"), { scale: 1 }, { scale: PORTRAIT ? 1.006 : 1.05, duration: D, ease: "none" }, 0);
    sway($(".stage"));
    // the nameplate prints: rules draw, the title rises, the dateline slides in
    tl.from($$(".mast .rule2, .mast .line"), { scaleX: 0, transformOrigin: "50% 50%", duration: 0.8, ease: "power4.inOut" }, 0.1);
    tl.from($$(".mast h1 span"), { y: 50, opacity: 0, duration: 0.8, stagger: 0.15, ease: "expo.out" }, 0.3);
    tl.from($$(".mast .line span"), { opacity: 0, y: 12, duration: 0.5, stagger: 0.1 }, 0.9);

    // each section turns in like a page from the right, and turns away to the left
    const secs = [".s-cal", ".s-num", ".s-new", ".s-log", ".end"];
    secs.forEach(s => tl.set($(s), { opacity: 0 }, 0));
    T.sections.forEach((s, k) => {
      tl.fromTo($(s.sel), { opacity: 0, rotationY: -50, x: 160, transformPerspective: 1800 }, { opacity: 1, rotationY: 0, x: 0, duration: 0.7, ease: "power3.out" }, s.at);
      const next = T.sections[k + 1];
      if (next) tl.to($(s.sel), { opacity: 0, rotationY: 60, x: -140, transformPerspective: 1800, duration: 0.45, ease: "power2.in" }, next.at - 0.45);
    });

    // the calendar: each day presses in, its dots after it
    $$(".tile").forEach((el, k) => {
      tl.from(el, { y: 40, opacity: 0, duration: 0.35, ease: "back.out(2)" }, T.at.tiles[k]);
      tl.from(el.querySelectorAll(".dots i"), { scale: 0, duration: 0.25, stagger: 0.05, ease: "back.out(3)" }, T.at.tiles[k] + 0.2);
    });
    tl.from($$(".legend span"), { opacity: 0, duration: 0.4, stagger: 0.15 }, T.at.tiles[6] + 0.4);

    // the odometer rolls past every number up to this week's
    const digits = String(T.n).split("").map(Number);
    $$(".odo .col").forEach((c, k) => {
      const h = c.firstElementChild.offsetHeight;
      tl.fromTo(c, { y: 0 }, { y: -h * digits[k], duration: 1.0 + k * 0.2, ease: "power2.inOut" }, T.at.odo);
    });
    tl.from($(".numtext"), { opacity: 0, x: 40, duration: 0.6 }, T.at.odo + 0.6);
    tl.from($$(".numtext .split div"), { opacity: 0, y: 16, duration: 0.4, stagger: 0.25 }, T.at.odo + 1.4);

    tl.from($$(".s-new .mrow, .s-new .more"), { opacity: 0, x: 50, duration: 0.45, stagger: 0.16 }, T.at.rows);
    tl.from($$(".s-log .erow, .s-log .more"), { opacity: 0, x: 50, duration: 0.45, stagger: 0.18 }, T.at.entries);
    tl.from($(".end .logo"), { scale: 0.85, duration: 0.8, ease: "expo.out" }, T.at.end);
    tl.from($$(".end .url, .end .sub"), { y: 30, opacity: 0, duration: 0.6, stagger: 0.15, ease: "expo.out" }, T.at.end + 0.3);

    T.captions.forEach((c, k) => { const el = $('.cap span[data-k="' + k + '"]'); tl.set(el, { opacity: 1 }, c.at); tl.set(el, { opacity: 0 }, c.end); });
  `;
}
