#!/usr/bin/env node
/**
 * model-drop :: fetch + diff
 *
 * Pulls the live AnyRouter catalog and works out what actually shipped since
 * the last run. The point is that nobody has to maintain a model list by hand:
 * add a model to the catalog, run this, and the video is about THAT model.
 *
 *   node release/fetch.mjs              → diff against release/baseline.json
 *   node release/fetch.mjs --accept     → promote current catalog to baseline
 *   node release/fetch.mjs --all        → ignore the baseline, list everything
 *   node release/fetch.mjs --out=path  → write the diff somewhere else
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = 'https://anyrouter.dev/api/v1/models?all=1';
const POOL_API = 'https://anyrouter.dev/api/v1/pool/analytics';
const BASELINE = path.join(HERE, 'baseline.json');
const OUT = path.join(HERE, 'release.json');
const LOGO_DIR = path.resolve(HERE, '../assets/providers-src');   // vendored, no external repo needed

const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const val = (k, d) => (argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];

const num = v => (typeof v === 'number' ? v : parseFloat(v));
// anyrouter.dev/models renders the literal string "192+ AI models across 17+
// providers". Keep these in one place and re-check them when the site changes.
const PROVIDER_CLAIM = 17;

/** Map a provider/upstream id to a real logo file in public/providers/. */
function findLogo(id) {
  if (!id) return null;
  const base = String(id).toLowerCase().replace(/[^a-z0-9.-]/g, '-');
  for (const cand of [base, base.replace(/-color$/, ''), base.replace(/-coding$/, '')]) {
    for (const suf of ['-color.svg', '.svg']) {
      if (fs.existsSync(path.join(LOGO_DIR, cand + suf))) return cand + suf;
    }
  }
  return null;
}

const r = await fetch(API);
if (!r.ok) {
  console.error(`FAIL: ${API} → HTTP ${r.status}`);
  process.exit(1);
}
const raw = await r.json();
const all = raw.data || raw.models || [];
if (!Array.isArray(all) || !all.length) {
  console.error('FAIL: catalog came back empty — refusing to render a video about nothing');
  process.exit(1);
}

let pool = null;
try { pool = await (await fetch(POOL_API)).json(); } catch { /* optional */ }

const norm = m => {
  const provider = m.provider || m.owned_by || (m.top_provider && m.top_provider.id) || m.id.split('/')[0];
  const pin = m.pricing || {};
  return {
    id: m.id,
    name: m.display_name || m.name || m.id.split('/').pop(),
    provider: String(provider),
    logo: findLogo(provider) || findLogo(m.id.split('/')[0]),
    context: m.context_length || null,
    inPrice: num(pin.input_per_1m ?? pin.prompt ?? 0),
    outPrice: num(pin.output_per_1m ?? pin.completion ?? 0),
    free: num(pin.input_per_1m ?? pin.prompt ?? 0) === 0 && num(pin.output_per_1m ?? pin.completion ?? 0) === 0,
    created: m.created || null,
    category: m.category || null,
    excerpt: (m.description || '').split(/(?<=\.)\s+/)[0] || null,
  };
};

const catalog = all.map(norm);
const byId = new Map(catalog.map(m => [m.id, m]));
const listed = catalog.filter(m => !m.id.startsWith('anyrouter/'));

// ── diff against the baseline ───────────────────────────────────────────
// The baseline stores ids AND their prices, so a price cut on an existing model
// is a release worth filming — "we dropped the price on X" is a different film
// from "X is new", and the old id-only diff could not see it at all.
let added = [], changed = [], removed = [];
let mode = 'all';

const readBaseline = () => {
  if (!fs.existsSync(BASELINE)) return null;
  try { return JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch { return null; }
};

if (!has('--all')) {
  const base = readBaseline();
  const prior = base?.models && Array.isArray(base.models) ? new Map(base.models.map(m => [m.id, m])) : null;
  const baseIds = new Set(base?.ids || []);
  if (baseIds.size) {
    const nowIds = new Set(listed.map(m => m.id));
    added = listed.filter(m => !baseIds.has(m.id));
    removed = [...baseIds].filter(id => !nowIds.has(id));
    if (prior) {
      for (const m of listed) {
        const was = prior.get(m.id);
        if (!was) continue;
        const a = `${m.inPrice}/${m.outPrice}@${m.context ?? 'x'}`;
        const b = `${was.inPrice}/${was.outPrice}@${was.context ?? 'x'}`;
        if (a === b) continue;
        // Classify the ACTUAL axis that moved. A wider context window is not a
        // "price rise" — conflating them would put the wrong film out.
        const priceDown = m.inPrice < was.inPrice || m.outPrice < was.outPrice;
        const priceUp = m.inPrice > was.inPrice || m.outPrice > was.outPrice;
        changed.push({
          id: m.id, from: b, to: a,
          kind: priceDown ? 'price-cut' : priceUp ? 'price-rise' : 'context',
        });
      }
    }
    mode = 'diff';
  } else {
    // No baseline yet: a first run is not a 192-model drop. Take the newest few
    // so the film is a believable "what's new", then tell the user to --accept.
    const cap = parseInt(val('first', '5'), 10);
    added = [...listed].sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, cap);
    mode = 'first-run';
  }
}

// Freshest first.
added.sort((a, b) => (b.created || 0) - (a.created || 0));

// ── classify the release ────────────────────────────────────────────────
// Drives which film gets made, and the label on the source snapshot.
const cuts = changed.filter(c => c.kind === 'price-cut');
const rises = changed.filter(c => c.kind === 'price-rise');
const ctxOnly = changed.filter(c => c.kind === 'context');
const kindOf = changes => {
  if (added.length && changes.length) return 'models+pricing';
  if (added.length === 1) return 'new-model';
  if (added.length > 1) return 'new-models';
  if (cuts.length) return 'price-cut';
  if (rises.length) return 'price-rise';
  if (ctxOnly.length) return 'context-change';
  if (removed.length) return 'delisted';
  return 'none';
};
let kind = mode === 'first-run' ? 'first-run' : kindOf(changed);
const notable = added.length + changed.length + removed.length;

// Provider ORGS, not upstream backends. `m.provider` yields things like
// "z-ai-coding" and "google-ai-studio", which inflated the count to 41 — the
// catalog's own "17+ providers" claim is the distinct org before the "/".
const orgOf = id => String(id).split('/')[0];
const providerOrgs = new Set(listed.map(m => orgOf(m.id))).size;

const release = {
  generatedAt: new Date().toISOString(),
  mode,
  kind,
  notable,
  source: API,
  totals: {
    catalog: catalog.length,
    listed: listed.length,
    firstParty: catalog.length - listed.length,
    // NOT derived from the API on purpose. The site says "17+ providers"
    // (packages/config/config/providers/*.yaml); distinct model-id prefixes
    // give 41, and upstream backends a third number again. Only the site's own
    // claim is a marketing number, so the generator carries it as a constant.
    providers: PROVIDER_CLAIM,
    modelIdOrgs: providerOrgs,
    providerBackends: new Set(listed.map(m => m.provider)).size,
    free: catalog.filter(m => m.free).length,
  },
  pool: pool?.totals
    ? { keys: pool.totals.active_keys, donors: pool.totals.donors, requests: pool.totals.requests_total }
    : null,
  added,
  changed,
  removed,
  // `incoming` is kept as an alias so the generator and the CI agent keep working.
  incoming: added.length ? added : (changed.length ? [] : []),
  spotlight: added[0] || changed[0] ? (added[0] || norm(listed.find(m => m.id === changed[0].id))) : null,
};

fs.writeFileSync(OUT, JSON.stringify(release, null, 2));

if (has('--accept')) {
  fs.writeFileSync(BASELINE, JSON.stringify({
    acceptedAt: new Date().toISOString(),
    ids: listed.map(m => m.id),
    // Prices too, or the next run can never see a price change.
    models: listed.map(m => ({ id: m.id, inPrice: m.inPrice, outPrice: m.outPrice, context: m.context })),
  }, null, 2));
  console.log(`baseline accepted — ${listed.length} listed models recorded`);
}

const plural = n => `${n} model${n === 1 ? '' : 's'}`;
console.log(`mode            ${mode}`);
console.log(`kind            ${kind}${notable ? '' : '  (nothing worth filming)'}`);
console.log(`catalog total   ${release.totals.catalog}  (${release.totals.listed} listed, ${release.totals.firstParty} anyrouter/*)`);
console.log(`providers       ${PROVIDER_CLAIM}+ (site claim, hard-coded on purpose)   ·   model-id orgs ${release.totals.modelIdOrgs}   ·   backends ${release.totals.providerBackends}`);
console.log(`free ($0/$0)    ${release.totals.free}`);

if (mode === 'diff' || mode === 'first-run') {
  if (added.length) {
    console.log(`\nNEW — ${plural(added.length)}:`);
    for (const m of added) console.log(`  + ${m.id.padEnd(34)} ${m.name}${m.free ? '  [$0]' : ''}${m.logo ? '' : '  [no logo]'}`);
  }
  if (changed.length) {
    console.log(`\nPRICING — ${changed.length} changed:`);
    for (const c of changed) console.log(`  ~ ${c.id.padEnd(34)} ${c.from} → ${c.to}  (${c.kind})`);
  }
  if (removed.length) {
    console.log(`\nDELISTED — ${removed.length}:`);
    for (const id of removed) console.log(`  - ${id}`);
  }
  if (!notable) console.log('\n(nothing shipped since the last --accept)');
}
console.log(`\nwrote ${path.relative(process.cwd(), OUT)}`);
