/**
 * model-drop — a short launch film for models added to the AnyRouter catalog.
 *
 * The film is PARAMETRIC: "1 model" and "7 models" are one template choosing a
 * different layout and scene count.
 *
 *   N = 1        hero      one model, full frame, deep push-in
 *   N = 2..4     cards     that many cards, swapped on the beat
 *   N >= 5       list      ranked rows, six to a page
 *
 *   --limit=N     force a layout by capping the model count
 *   --seconds=N   film length (default 20)
 *   --all         ignore the baseline      --first=N   newest N on a first run
 *   --from=FILE   build from a saved catalog response instead of the live API
 */
import fs from 'node:fs';
import path from 'node:path';
import { esc, slug, igniteScene, ctaScene, IGNITE, CTA } from '../../lib/film.mjs';
import { API, POOL_API, LOGO_DIR, buildRelease, baselineOf, fingerprintParts, report } from './catalog.mjs';

const ROWS_PER_PAGE = 6;
const MIN_PAGE_SECONDS = 2.2;   // below this a page of six rows cannot be read

const readJson = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);

const logo = m => (m.logo ? `<img class="lg" src="assets/providers/${m.logo}" alt="">` : `<span class="lgdot"></span>`);
const price = m => (m.free ? '$0' : `$${m.inPrice.toFixed(2)}`);
// Below 1M, "0.0M" throws away the number entirely (a 32k window read as 0.0M).
export const fmtCtx = n => {
  if (!n) return '—';
  if (n >= 1e6) return `${+(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(0)}K`;
  return String(n);
};

const CSS = `
  .card{width:min(1440px,90vw);background:linear-gradient(180deg,#171717,#101010);
    border:1px solid var(--line);border-radius:32px;padding:70px 80px;
    box-shadow:0 60px 150px rgba(0,0,0,.72);transform-style:preserve-3d}
  .lrow{display:flex;align-items:center;gap:18px;margin-bottom:24px}
  .lg{width:68px;height:68px;object-fit:contain}
  .lgdot{width:68px;height:68px;border-radius:50%;background:linear-gradient(140deg,var(--primary),var(--gold))}
  .prov{font-size:20px;letter-spacing:.30em;text-transform:uppercase;color:var(--primary);font-weight:600}
  .rank{margin-left:auto;font-size:62px;font-weight:700;letter-spacing:-.05em;color:rgba(255,255,255,.38)}
  .name{font-size:118px;font-weight:700;letter-spacing:-.045em;line-height:.94}
  .mid{font-family:'ArMono',monospace;font-size:30px;color:var(--gold);margin-top:18px}
  .stats{display:flex;gap:60px;margin-top:44px}
  .stat b{display:block;font-family:'ArMono',monospace;font-size:78px;font-weight:700;
    letter-spacing:-.05em}
  .stat i{display:block;font-style:normal;font-size:16px;letter-spacing:.22em;
    text-transform:uppercase;color:var(--muted);margin-top:10px}
  .ex{font-size:25px;line-height:1.45;color:var(--muted);margin-top:36px;max-width:62ch}
  .row3{display:flex;gap:36px;margin-top:24px;font-family:'ArMono',monospace;font-size:27px;color:var(--muted)}
  .row3 .free{color:var(--free)}
  .card.compact{width:min(1320px,86vw);padding:58px 68px}
  .card.compact .name{font-size:86px}
  .card.compact .mid{font-size:26px;margin-top:16px}
  .card.compact .rank{font-size:56px}
  .card.compact .stats{gap:56px;margin-top:34px}
  .card.compact .stat b{font-size:58px}
  .card.rows{width:1500px;padding:34px 56px}
  .mrow{display:flex;align-items:center;gap:26px;height:128px;border-top:1px solid var(--line)}
  .mrow:first-child{border-top:0}
  .mrow .n{width:64px;font-family:'ArMono',monospace;font-size:30px;color:var(--muted)}
  .mrow .lg,.mrow .lgdot{width:54px;height:54px;flex:none}
  .mrow .who{flex:1;min-width:0}
  .mrow .nm{font-size:42px;font-weight:700;letter-spacing:-.03em;line-height:1.3;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mrow .id{font-family:'ArMono',monospace;font-size:21px;color:var(--gold);margin-top:6px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mrow .fig{width:190px;text-align:right;font-family:'ArMono',monospace;font-size:34px;font-weight:700}
  .mrow .fig i{display:block;font-style:normal;font-weight:400;font-size:15px;letter-spacing:.2em;
    text-transform:uppercase;color:var(--muted);margin-top:4px}
  .mrow .fig.free{color:var(--free)}`;

/** Which layout a model count gets. */
export const layoutOf = n => (n === 1 ? 'hero' : n <= 4 ? 'cards' : 'list');

const heroScene = (m, rel, duration) => ({
  id: 's01-hero', start: IGNITE, dur: duration - IGNITE,
  body: `<div class="card">
    <div class="lrow">${logo(m)}<span class="prov">${esc(m.provider)}</span></div>
    <h1 class="name">${esc(m.name)}</h1>
    <div class="mid">${esc(m.id)}</div>
    <div class="stats">
      <div class="stat"><b>${price(m)}</b><i>in / 1M</i></div>
      <div class="stat"><b>${fmtCtx(m.context)}</b><i>context</i></div>
      <div class="stat"><b>${rel.totals.listed}</b><i>in catalog</i></div>
    </div>
    ${m.excerpt ? `<p class="ex">${esc(m.excerpt)}</p>` : ''}
  </div>`,
  inner: `tl.from("#content > .card",{scale:.84,rotateY:-32,z:-460,duration:.44,ease:"expo.out"},0);
     tl.from("#content .name",{y:56,duration:.38,ease:"power3.out"},.10);
     tl.from("#content .lrow,#content .mid,#content .stats .stat,#content .ex",
        {opacity:0,y:30,stagger:.05,duration:.32,ease:"power3.out"},.18);`,
});

const cardScenes = (models, duration) => {
  const ctaAt = +(duration - CTA).toFixed(3);
  const slot = +((ctaAt - IGNITE) / models.length).toFixed(3);
  return models.map((m, i) => ({
    id: `s${String(i + 1).padStart(2, '0')}-${slug(m.id)}`,
    start: +(IGNITE + i * slot).toFixed(3),
    dur: slot,                       // back-to-back: end == next start
    body: `<div class="card compact">
      <div class="lrow">${logo(m)}<span class="prov">${esc(m.provider)}</span>
        <span class="rank">${String(i + 1).padStart(2, '0')}</span></div>
      <h2 class="name">${esc(m.name)}</h2>
      <div class="mid">${esc(m.id)}</div>
      <div class="row3"><span>${price(m)} in</span><span>${fmtCtx(m.context)} ctx</span>
        ${m.free ? '<span class="free">$0 out</span>' : `<span>$${m.outPrice.toFixed(2)} out</span>`}</div>
    </div>`,
    inner: `tl.from("#content > .card",{scale:.82,rotateY:-34,z:-440,duration:.40,ease:"expo.out"},0);
       tl.from("#content .name,#content .mid,#content .row3 span,#content .lrow",
          {opacity:0,y:26,stagger:.045,duration:.30,ease:"power3.out"},.12);
       tl.to("#content > .card",{scale:1.10,rotateY:22,duration:.16,ease:"power2.in"},
          ${Math.max(0, slot - 0.16).toFixed(3)});`,
  }));
};

/** How many models a list film of this length can show and still be read. */
export const listCapacity = duration =>
  Math.max(1, Math.floor((duration - CTA - IGNITE) / MIN_PAGE_SECONDS)) * ROWS_PER_PAGE;

const listScenes = (models, duration) => {
  const pages = [];
  for (let i = 0; i < models.length; i += ROWS_PER_PAGE) pages.push(models.slice(i, i + ROWS_PER_PAGE));
  const slot = +((duration - CTA - IGNITE) / pages.length).toFixed(3);
  return pages.map((page, p) => ({
    id: `s${String(p + 1).padStart(2, '0')}-page`,
    start: +(IGNITE + p * slot).toFixed(3),
    dur: slot,
    body: `<div class="card rows">${page.map((m, i) => `
      <div class="mrow"><span class="n">${String(p * ROWS_PER_PAGE + i + 1).padStart(2, '0')}</span>${logo(m)}
        <div class="who"><div class="nm">${esc(m.name)}</div><div class="id">${esc(m.id)}</div></div>
        <div class="fig${m.free ? ' free' : ''}">${price(m)}<i>in / 1M</i></div>
        <div class="fig">${fmtCtx(m.context)}<i>context</i></div>
      </div>`).join('')}
    </div>`,
    inner: `tl.from("#content > .card",{scale:.9,rotateX:14,z:-260,duration:.40,ease:"expo.out"},0);
       tl.from("#content .mrow",{opacity:0,x:-40,stagger:.06,duration:.30,ease:"power3.out"},.10);
       tl.to("#content > .card",{scale:1.06,rotateX:-10,duration:.16,ease:"power2.in"},
          ${Math.max(0, slot - 0.16).toFixed(3)});`,
  }));
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
    const { release, listed } = buildRelease(raw, pool, readJson(path.join(dir, 'baseline.json')), {
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

  film(rel, { plan = {}, flags = {} }) {
    const duration = parseFloat(flags.seconds ?? plan.seconds ?? 20);
    const limit = parseInt(flags.limit ?? plan.limit ?? 0, 10);
    let models = rel.added.length ? rel.added : rel.spotlight ? [rel.spotlight] : [];
    if (limit > 0) models = models.slice(0, limit);
    if (!models.length) throw new Error('no models to film');

    const total = models.length;
    const layout = layoutOf(total);
    if (layout === 'list') models = models.slice(0, listCapacity(duration));

    const content = layout === 'hero' ? [heroScene(models[0], rel, duration)]
      : layout === 'cards' ? cardScenes(models, duration)
      : listScenes(models, duration);

    const t = rel.totals;
    const cta = ctaScene(duration, {
      kicker: total === 1 ? 'New on AnyRouter' : `${total} new models`,
      big: total === 1 ? esc(models[0].id) : 'on one key',
      sub: `<b>${t.listed}</b> models · <b>${t.providers}+</b> providers ·
    <b>${t.free}</b> at $0`,
    });

    return {
      title: 'AnyRouter — model drop',
      duration,
      layout,
      css: CSS,
      scenes: [igniteScene(), ...content, cta],
      // Marks are copied INTO the project: an asset path may not climb above it.
      assets: [...new Set(models.map(m => m.logo).filter(Boolean))]
        .map(f => ({ from: path.join(LOGO_DIR, f), to: `assets/providers/${f}` })),
      summary: `${layout}  (${models.length} of ${total} model${total === 1 ? '' : 's'})`,
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
