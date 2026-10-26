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
import { copyProblem, factNumbers } from '../../lib/plan.mjs';
import { SLOTS, classicPicks, timeSlots, VO_LEAD } from '../../lib/scenes.mjs';
import { API, POOL_API, buildRelease, baselineOf, fingerprintParts, report } from './catalog.mjs';
import {
  r3, fmtPrice, fmtCtx, isAlias, followsOf, tally, aliasWord, countLine, moreLine, layoutOf, markOf, changeAxes, wasLine, dropPct, CSS,
} from './parts.mjs';
import { makersOf, TEMPLATES, SLOT_CSS } from './templates.mjs';

export { fmtCtx, fmtPrice, isAlias, followsOf, tally, countLine, layoutOf, markOf, dropPct } from './parts.mjs';
export { dropFacts, makersOf, listTiming, listCapacity, TEMPLATES } from './templates.mjs';

const readJson = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);

// ── choosing and timing ────────────────────────────────────────────────────

/** Every model in the drop, in the plan's order (picks first), capped by limit. */
export function chooseModels(rel, plan = {}, flags = {}) {
  const pool = rel.added.length ? rel.added : rel.spotlight ? [rel.spotlight] : [];
  const byId = new Map(pool.map(m => [m.id, m]));
  const picked = (plan.picks ?? []).map(id => byId.get(id)).filter(Boolean);
  // Unpicked: the drop's models first, then its aliases, each in the diff's order.
  const rest = pool.filter(m => !picked.includes(m));
  const order = [...picked, ...rest.filter(m => !isAlias(m)), ...rest.filter(isAlias)];
  // An explicit limit wins; otherwise the picks ARE the selection; otherwise everything.
  const limit = parseInt(flags.limit ?? plan.limit ?? 0, 10);
  const count = limit > 0 ? limit : picked.length || order.length;
  return { pool, models: order.slice(0, count) };
}

/**
 * What every template sees: the models chosen and how they are laid out, the
 * lead, what moved on it, and the copy the bookends share. Pure.
 */
export function context(rel, { plan = {}, flags = {} } = {}) {
  const { pool, models: chosen } = chooseModels(rel, plan, flags);
  if (!chosen.length) throw new Error('no models to film');
  const layout = layoutOf(chosen.length);
  const lead = chosen[0];
  const one = layout === 'hero';
  const everyone = rel.added.length ? rel.added : chosen;
  const kinds = tally(everyone);
  const moved = rel.changed.find(c => c.id === lead.id) ?? null;
  // A spotlight that is a price move, not a new model, says so.
  const what = !rel.added.length && moved ? { 'price-cut': 'price cut', 'price-rise': 'price update', context: 'context update' }[moved.kind]
    : isAlias(lead) ? 'new alias' : 'new model';
  const axes = moved ? changeAxes(moved) : [];
  const date = String(rel.generatedAt ?? '').slice(0, 10);
  // A hero film is about one model, so its bookends are too, even when the drop was bigger.
  const bigText = plan.headline
    ?? (one ? (moved && !rel.added.length ? `${lead.name}: ${what}` : isAlias(lead) ? `${lead.name}: a new alias` : `${lead.name} is live`)
      : kinds.models ? `${kinds.models} new model${kinds.models === 1 ? '' : 's'} on one key`
      : `${kinds.aliases} new ${aliasWord(everyone, kinds.aliases)} on one key`);
  return {
    rel, plan, pool, chosen, everyone, kinds, layout, lead, one, moved, axes, what, date, bigText,
    change: axes.length ? wasLine(axes) : null,
    more: one ? moreLine(everyone.filter(m => m !== lead)) : null,
    kicker: plan.kicker ?? (one ? what : 'model drop'),
    openMeta: [date, one ? lead.id : countLine(everyone)].filter(Boolean).join(' · '),
    endKicker: plan.kicker ?? (one ? `${what} · ${lead.provider}` : `model drop${date ? ` · ${date}` : ''}`),
    // The marks of the drop's makers (a hero's: its own). Only real marks — a monogram is not a logo.
    endMarks: [...new Set((one ? [lead] : rel.added.length ? rel.added : chosen).map(markOf).filter(Boolean))].slice(0, 12),
  };
}

/**
 * The only facts the voice-over may quote, and the gate checks every line
 * against: names, makers, categories, context, prices (none in a film of five
 * or more), what moved on the lead, and the totals the site claims. Nothing
 * else from the catalog: an upstream count or a pool figure would vouch for a
 * number the film never shows.
 */
export function facts(rel, ctx) {
  const prices = ctx.layout !== 'list';
  const model = m => ({
    name: m.name, provider: m.provider, category: m.category, context: m.context, free: m.free, alias: isAlias(m),
    ...(prices && { inPrice: m.inPrice, outPrice: m.outPrice }),
  });
  const quotable = m => !isAlias(m) && m.excerpt && !copyProblem(m.excerpt, factNumbers({ ...m, excerpt: null }), 160);
  return {
    prices,
    unit: prices ? 1e6 : null,
    lead: model(ctx.lead),
    models: ctx.chosen.slice(0, 4).map(model),
    count: ctx.kinds,
    // Makers of the drop's models; an org that shipped only aliases is not one (the wall counts them apart too).
    makers: makersOf(ctx.everyone).filter(k => k.models).length || makersOf(ctx.everyone).length,
    change: ctx.moved && prices ? {
      kind: ctx.moved.kind, pct: dropPct(ctx.moved.from, ctx.moved.to),
      axes: ctx.axes.map(a => ({ axis: a.axis, from: a.from, to: a.to })),
    } : null,
    totals: { listed: rel.totals.listed, free: rel.totals.free, providers: rel.totals.providers },
    // What the catalog says of the lead. Never a fact itself: it may be spoken only when it passes the gate without vouching for itself.
    excerpt: quotable(ctx.lead) ? ctx.lead.excerpt : null,
    names: Object.fromEntries(ctx.chosen.map(m => [m.id, m.name])),
  };
}

export default {
  id: 'model-drop',
  title: 'Model drop',
  scheduled: true,
  // lib/film.mjs has no portrait layout yet: its backdrop and frame chrome are drawn at 1920x1080.
  renditions: ['landscape'],

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
      label: `${m.name} · ${m.provider}${isAlias(m) ? ` · ALIAS${followsOf(m) ? ` → ${followsOf(m)}` : ''} (not a new model)` : ''} · ${fmtPrice(m.inPrice)}/${fmtPrice(m.outPrice)} · ${fmtCtx(m.context)}`,
      // Quotable in a plan's copy. No date: its digits would vouch for any "30" or "2026" in a line.
      // Films of five or more show no prices, and drop any line that quotes one.
      detail: [isAlias(m) && 'alias', m.category, m.free && 'free', dropOf(rel, m.id)].filter(Boolean).join(' · '),
    }));
  },

  slots: SLOTS,
  templates: TEMPLATES,
  context,
  facts,

  /**
   * One scene (or a run of them) per slot, from the template `picks` names for
   * it — the first that fits each slot when there are none. `voice` lines set
   * how long their slots run, and become the film's captions and mix.
   */
  film(rel, { plan = {}, flags = {}, picks, voice = [] }) {
    const ctx = context(rel, { plan, flags });
    const chosen = picks ?? classicPicks({ slots: SLOTS, templates: TEMPLATES, rel, ctx });
    const { slots, duration } = timeSlots({
      slots: SLOTS, picks: chosen, templates: TEMPLATES, ctx, voice,
      seconds: parseFloat(flags.seconds ?? plan.seconds ?? 20), stretch: ['news', 'compare'],
    });
    const scenes = slots.flatMap(s => [s.template.scene(ctx, s)].flat().map(scene => ({ ...scene, slot: s.slot })));
    const shown = ctx.layout === 'list'
      ? scenes.filter(s => s.slot === 'news').reduce((a, s) => a + (s.body.match(/class="lr r\d/g) || []).length + (s.id === 's01-lead'), 0)
      : ctx.chosen.length;
    return {
      title: 'AnyRouter — model drop',
      duration,
      tone: 'org',
      palette: 'drop',
      label: 'MODEL DROP',
      layout: ctx.layout,
      picks: chosen,
      css: CSS + SLOT_CSS + `
  .e-l{font-size:88px}.e-m{font-size:68px}.e-s{font-size:54px;letter-spacing:-.035em}`,
      scenes,
      voice: slots.filter(s => s.line?.wav).map(s => ({ at: r3(s.start + VO_LEAD), seconds: s.line.seconds, text: s.line.text, wav: s.line.wav })),
      // Marks need no listing: writeFilm copies every assets/providers/*.svg a scene references.
      summary: `${ctx.layout}  (${shown} of ${ctx.everyone.length} shown: ${countLine(ctx.everyone)})  ${SLOTS.map(k => `${k}:${chosen[k]}`).join(' ')}`,
    };
  },

  /** The page a film is about: its model's, when one model leads it. */
  link(rel) {
    const { models } = chooseModels(rel);
    return models.length === 1 ? `https://anyrouter.dev/model/${models[0].id}` : 'https://anyrouter.dev/models';
  },

  // A changelog is read as a list, so the headline is the whole job. It leads
  // with what shipped, never with the internal release id.
  headline(rel, plan = {}) {
    if (plan.headline) return plan.headline;
    const short = id => id.split('/').pop();
    const { changed, removed } = rel;
    // Models lead; aliases are counted after them, never as models.
    const added = rel.added.filter(m => !isAlias(m));
    const aliases = rel.added.filter(isAlias);
    const plus = aliases.length ? `, plus ${aliases.length} ${aliasWord(aliases, aliases.length)}` : '';
    if (added.length === 1) {
      return (added[0].free ? `${added[0].id} is now free on AnyRouter` : `${added[0].id} is live on AnyRouter`) + plus;
    }
    if (added.length > 1) {
      return `${added.length} new models: ${added.slice(0, 3).map(m => short(m.id)).join(', ')}${added.length > 3 ? ` +${added.length - 3} more` : ''}${plus}`;
    }
    if (aliases.length) return `${aliases.length} new ${aliasWord(aliases, aliases.length)} on AnyRouter`;
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
      `**New models:** ${rel.added.filter(m => !isAlias(m)).map(m => `\`${m.id}\`${m.free ? ' (free)' : ''}`).join(', ') || '—'}`,
      rel.added.some(isAlias) && `**New aliases:** ${rel.added.filter(isAlias).map(m => `\`${m.id}\`${followsOf(m) ? ` → \`${followsOf(m)}\`` : ''}`).join(', ')}`,
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

