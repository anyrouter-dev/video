/**
 * model-drop :: catalog
 *
 * Pulls the live AnyRouter catalog and works out what actually shipped since
 * the baseline. The point is that nobody maintains a model list by hand: add a
 * model to the catalog and the next film is about THAT model.
 *
 * The functions here are pure — kind.mjs does the network and the disk.
 */
import { markFor } from '../../lib/marks.mjs';

export const API = 'https://anyrouter.dev/api/v1/models?all=1';
export const POOL_API = 'https://anyrouter.dev/api/v1/pool/analytics';

// anyrouter.dev/models renders the literal string "192+ AI models across 17+
// providers". NOT derived from the API on purpose: distinct model-id prefixes
// give 41, and upstream backends a third number again. Only the site's own claim
// is a marketing number, so it is carried as a constant. Re-check it when the
// site changes.
export const PROVIDER_CLAIM = 17;

const num = v => (typeof v === 'number' ? v : parseFloat(v));

export function normalize(m) {
  const provider = m.provider || m.owned_by || (m.top_provider && m.top_provider.id) || m.id.split('/')[0];
  const pin = m.pricing || {};
  const inPrice = num(pin.input_per_1m ?? pin.prompt ?? 0);
  const outPrice = num(pin.output_per_1m ?? pin.completion ?? 0);
  return {
    id: m.id,
    name: m.display_name || m.name || m.id.split('/').pop(),
    provider: String(provider),
    logo: markFor(provider) || markFor(m.id),
    context: m.context_length || null,
    inPrice,
    outPrice,
    free: inPrice === 0 && outPrice === 0,
    created: m.created || null,
    category: m.category || null,
    excerpt: (m.description || '').split(/(?<=\.)\s+/)[0] || null,
  };
}

const priceKey = m => `${m.inPrice}/${m.outPrice}@${m.context ?? 'x'}`;

/** What the next diff is taken against: ids AND prices, or a price cut on an
 *  existing model could never be seen. */
export const baselineOf = listed => ({
  acceptedAt: new Date().toISOString(),
  ids: listed.map(m => m.id),
  models: listed.map(m => ({ id: m.id, inPrice: m.inPrice, outPrice: m.outPrice, context: m.context })),
});

/**
 * Diff the listed catalog against a baseline.
 *   baseline null/empty → 'first-run': a first run is not a 192-model drop, so
 *   take the newest `first` and let the caller accept the baseline.
 */
export function diffCatalog(listed, baseline, { all = false, first = 5 } = {}) {
  let added = [], removed = [];
  const changed = [];
  let mode = 'all';

  if (!all) {
    const baseIds = new Set(baseline?.ids || []);
    if (baseIds.size) {
      const prior = Array.isArray(baseline.models) ? new Map(baseline.models.map(m => [m.id, m])) : new Map();
      const nowIds = new Set(listed.map(m => m.id));
      added = listed.filter(m => !baseIds.has(m.id));
      removed = [...baseIds].filter(id => !nowIds.has(id));
      for (const m of listed) {
        const was = prior.get(m.id);
        if (!was || priceKey(m) === priceKey(was)) continue;
        // Classify the ACTUAL axis that moved. A wider context window is not a
        // "price rise" — conflating them would put the wrong film out.
        const priceDown = m.inPrice < was.inPrice || m.outPrice < was.outPrice;
        const priceUp = m.inPrice > was.inPrice || m.outPrice > was.outPrice;
        changed.push({
          id: m.id, from: priceKey(was), to: priceKey(m),
          kind: priceDown ? 'price-cut' : priceUp ? 'price-rise' : 'context',
        });
      }
      mode = 'diff';
    } else {
      added = [...listed].sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, first);
      mode = 'first-run';
    }
  }

  // Freshest first.
  added.sort((a, b) => (b.created || 0) - (a.created || 0));
  return { mode, added, changed, removed, kind: mode === 'first-run' ? 'first-run' : classify(added, changed, removed) };
}

/** Drives which film gets made, and the label on the release id. */
export function classify(added, changed, removed) {
  if (added.length && changed.length) return 'models+pricing';
  if (added.length === 1) return 'new-model';
  if (added.length > 1) return 'new-models';
  if (changed.some(c => c.kind === 'price-cut')) return 'price-cut';
  if (changed.some(c => c.kind === 'price-rise')) return 'price-rise';
  if (changed.some(c => c.kind === 'context')) return 'context-change';
  if (removed.length) return 'delisted';
  return 'none';
}

/** The release facts: the diff plus the catalog totals that reach the screen. */
export function buildRelease(raw, pool, baseline, opts) {
  const all = raw.data || raw.models || [];
  if (!Array.isArray(all) || !all.length) {
    throw new Error('catalog came back empty — refusing to render a video about nothing');
  }
  const catalog = all.map(normalize);
  const listed = catalog.filter(m => !m.id.startsWith('anyrouter/'));
  const { mode, added, changed, removed, kind } = diffCatalog(listed, baseline, opts);

  const release = {
    generatedAt: new Date().toISOString(),
    mode,
    kind,
    source: API,
    totals: {
      catalog: catalog.length,
      listed: listed.length,
      firstParty: catalog.length - listed.length,
      providers: PROVIDER_CLAIM,
      // Provider ORGS (the part before the "/") and upstream backends, kept for
      // the record. Neither is the number the site claims — see PROVIDER_CLAIM.
      modelIdOrgs: new Set(listed.map(m => m.id.split('/')[0])).size,
      providerBackends: new Set(listed.map(m => m.provider)).size,
      free: catalog.filter(m => m.free).length,
    },
    pool: pool?.totals
      ? { keys: pool.totals.active_keys, donors: pool.totals.donors, requests: pool.totals.requests_total }
      : null,
    added,
    changed,
    removed,
    // A price change with no new model still needs a model to put on screen.
    spotlight: added[0] || (changed[0] && listed.find(m => m.id === changed[0].id)) || null,
  };
  return { release, listed };
}

/** Identity of a release: the same models at the same prices hash the same. */
export const fingerprintParts = rel => [
  ...rel.added.map(m => `+${m.id}@${m.inPrice}/${m.outPrice}@${m.context ?? 'x'}`),
  ...rel.changed.map(c => `~${c.id} ${c.from}->${c.to}`),
  ...rel.removed.map(id => `-${id}`),
];

export function report(rel) {
  const plural = n => `${n} model${n === 1 ? '' : 's'}`;
  const t = rel.totals;
  const lines = [
    `mode            ${rel.mode}`,
    `kind            ${rel.kind}${rel.kind === 'none' ? '  (nothing worth filming)' : ''}`,
    `catalog total   ${t.catalog}  (${t.listed} listed, ${t.firstParty} anyrouter/*)`,
    `providers       ${t.providers}+ (site claim, hard-coded on purpose)   ·   model-id orgs ${t.modelIdOrgs}   ·   backends ${t.providerBackends}`,
    `free ($0/$0)    ${t.free}`,
  ];
  if (rel.added.length) {
    lines.push('', `NEW — ${plural(rel.added.length)}:`);
    for (const m of rel.added) lines.push(`  + ${m.id.padEnd(34)} ${m.name}${m.free ? '  [$0]' : ''}${m.logo ? '' : '  [no logo]'}`);
  }
  if (rel.changed.length) {
    lines.push('', `PRICING — ${rel.changed.length} changed:`);
    for (const c of rel.changed) lines.push(`  ~ ${c.id.padEnd(34)} ${c.from} → ${c.to}  (${c.kind})`);
  }
  if (rel.removed.length) {
    lines.push('', `DELISTED — ${rel.removed.length}:`);
    for (const id of rel.removed) lines.push(`  - ${id}`);
  }
  return lines.join('\n');
}
