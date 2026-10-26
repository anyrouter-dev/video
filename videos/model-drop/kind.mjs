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
import { esc, fit, openScene, endScene, OPEN, END } from '../../lib/film.mjs';
import { API, POOL_API, buildRelease, baselineOf, fingerprintParts, report } from './catalog.mjs';
import {
  r3, onGrid, pad, fmtPrice, fmtCtx, day, isAlias, followsOf, tally, aliasWord, countLine, moreLine, layoutOf, markOf, CSS,
} from './parts.mjs';
import {
  heroName, heroSpec, card, ledgerPage, wallScene, summaryScene, makersOf, listTiming, slots, CARD_MIN, NAME_MIN,
} from './templates.mjs';

export { fmtCtx, fmtPrice, isAlias, followsOf, tally, countLine, layoutOf, markOf } from './parts.mjs';
export { dropFacts, makersOf, listTiming, listCapacity } from './templates.mjs';

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

  film(rel, { plan = {}, flags = {} }) {
    const duration = parseFloat(flags.seconds ?? plan.seconds ?? 20);
    const { pool, models: chosen } = chooseModels(rel, plan, flags);
    if (!chosen.length) throw new Error('no models to film');
    const layout = layoutOf(chosen.length);
    const content = r3(duration - OPEN - END);
    const everyone = rel.added.length ? rel.added : chosen;
    const hidden = shownList => everyone.filter(m => !shownList.includes(m));
    const t = rel.totals;

    // A spotlight that is a price move, not a new model, says so.
    const moved = !rel.added.length && rel.changed.find(c => c.id === chosen[0].id);
    const ctx = {
      rel, plan,
      what: moved ? { 'price-cut': 'price cut', 'price-rise': 'price update', context: 'context update' }[moved.kind]
        : isAlias(chosen[0]) ? 'new alias' : 'new model',
      change: moved && (() => {
        const [a, b] = moved.from.split('@')[0].split('/').map(Number);
        return `${fmtPrice(a)} in · ${fmtPrice(b)} out`;
      })(),
    };

    let content_ = [], shown = [];
    if (layout === 'hero') {
      const m = chosen[0];
      shown = [m];
      ctx.more = moreLine(hidden([m]));
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
          kicker: `${isAlias(m) ? 'alias · ' : ''}${m.provider}${day(m) ? ` · ${day(m)}` : ''}`,
          more: i === k - 1 ? moreLine(hidden(shown)) : null, ctx,
        });
        at += lens[i];
        return s;
      });
    } else {
      const tm = listTiming(content, chosen.length, makersOf(everyone).length);
      const lead = tm.spot ? chosen[0] : null;
      const rows = chosen.slice(tm.spot ? 1 : 0, (tm.spot ? 1 : 0) + tm.rows);
      shown = [...(lead ? [lead] : []), ...rows];
      const more = moreLine(hidden(shown));
      // Models and aliases are numbered apart, so a rank never counts an alias as a model.
      const rankOf = new Map();
      let nm = 0, na = 0;
      for (const m of chosen) rankOf.set(m, isAlias(m) ? `A${pad(++na)}` : pad(++nm));
      const nScenes = (tm.spot ? 1 : 0) + (tm.wall ? 1 : 0) + tm.pages + (tm.sum ? 1 : 0);
      let at = OPEN, n = 0;
      const next = (dur) => { const s = r3(at); at += dur; n += 1; return s; };
      const chap = label => `${pad(n + 1)} / ${pad(nScenes)} · ${label}`;
      if (lead) {
        const newest = !plan.picks?.length && !isAlias(lead) && lead.created
          && pool.filter(m => !isAlias(m)).every(m => (m.created || 0) <= lead.created);
        const kin = tally(everyone);
        content_.push(card(lead, {
          rank: 1, of: (isAlias(lead) ? kin.aliases : kin.models) || 1, side: 'a', id: 's01-lead', chapter: chap(lead.name),
          kicker: `${newest ? 'newest in this drop' : isAlias(lead) ? 'alias' : 'lead'} · ${lead.provider}`,
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
        content_.push(ledgerPage(slice, {
          id: `s${pad(n + 1)}-ledger-${p + 1}`, chapter: chap(`the ledger ${p + 1}/${tm.pages}`),
          rank: m => rankOf.get(m), heading: countLine(everyone), page: p + 1, pages: tm.pages,
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
    const kinds = tally(everyone);
    const count = kinds.models || kinds.aliases;
    // A hero film is about one model, so its bookends are too, even when the drop was bigger.
    const one = layout === 'hero';
    const lead = chosen[0];
    const open = openScene({
      kicker: plan.kicker ?? (one ? ctx.what : 'model drop'),
      meta: [date, one ? lead.id : countLine(everyone)].filter(Boolean).join(' · '),
    });
    const bigText = plan.headline
      ?? (one ? (moved ? `${lead.name}: ${ctx.what}` : isAlias(lead) ? `${lead.name}: a new alias` : `${lead.name} is live`)
        : kinds.models ? `${kinds.models} new model${kinds.models === 1 ? '' : 's'} on one key`
        : `${kinds.aliases} new ${aliasWord(everyone, kinds.aliases)} on one key`);
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
      summary: `${layout}  (${shown.length} of ${everyone.length} shown: ${countLine(everyone)})`,
    };
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

