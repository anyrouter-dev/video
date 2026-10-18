#!/usr/bin/env node
/**
 * Fact gate. Refuses to let a wrong number or a non-existent model id reach
 * the screen.
 *
 *   node tools/verify-facts.mjs           # online: checks the live API
 *   node tools/verify-facts.mjs --offline # marks + endpoints only
 *
 * The film is a brand film, not a live dashboard, so the numbers are pinned in
 * release/facts.mjs rather than fetched at generate time — a render must be
 * reproducible. This script is how you find out whether the pinned numbers have
 * drifted from production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as F from '../release/facts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MARKS = path.join(ROOT, '../../shared/assets/providers');
const offline = process.argv.includes('--offline');

let failures = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  failures++;
  console.log(`  ✗ ${m}`);
};

console.log('marks');
for (const m of [...new Set([...F.ESTAB_MARKS, ...F.DONOR_MARKS])]) {
  if (!fs.existsSync(path.join(MARKS, `${m}.svg`))) bad(`no mark for "${m}"`);
}
if (!failures) ok(`${new Set([...F.ESTAB_MARKS, ...F.DONOR_MARKS]).size} marks present`);

console.log('\npool');
ok(`${F.POOL.activeKeys} active keys · ${F.POOL.donors} donors · ${F.POOL.requestsTotal} requests_total`);

console.log('\nendpoint paths');
for (const e of F.ENDPOINTS) {
  if (!e.path.startsWith('/api/v1/')) bad(`${e.path} is not under /api/v1/`);
}
if (!failures) ok(`${F.ENDPOINTS.length} inference paths`);

if (offline) {
  console.log(`\n${failures ? `FAILED (${failures})` : 'OK'} — offline, API not consulted`);
  process.exit(failures ? 1 : 0);
}

console.log('\nlive catalog');
const res = await fetch('https://anyrouter.dev/api/v1/models?all=1');
if (!res.ok) {
  bad(`GET /models?all=1 → ${res.status}`);
} else {
  const body = await res.json();
  const arr = Array.isArray(body) ? body : (body.models ?? body.data ?? []);
  const ids = new Set(arr.map((m) => m.id));
  ok(`${arr.length} entries returned`);

  for (const id of F.BOARD_IDS) {
    if (!ids.has(id)) bad(`board id "${id}" is NOT in the catalog`);
  }
  if (!failures) ok(`all ${F.BOARD_IDS.length} board ids resolve`);

  for (const a of Object.values(F.ALIASES)) {
    if (!ids.has(a.id)) bad(`alias "${a.id}" is NOT in the catalog`);
  }
  if (!failures) ok(`aliases resolve: ${Object.values(F.ALIASES).map((a) => a.id).join(', ')}`);

  // The two traps, asserted rather than trusted.
  if (ids.has('x-ai/grok-4.5')) {
    bad('x-ai/grok-4.5 now EXISTS — the board still lists 4.7, re-check both');
  } else {
    ok('x-ai/grok-4.5 absent (board correctly uses 4.7)');
  }
  if (arr.some((m) => /grok-4\.7/.test(m.id))) ok('x-ai/grok-4.7 present');
}

console.log('\nsite claim');
const html = await (await fetch('https://anyrouter.dev/models', { headers: { accept: 'text/html' } })).text();
const claim = /(\d+)\+\s*AI models across\s*(\d+)\+\s*providers/i.exec(html);
if (!claim) bad('could not read the "N+ AI models across M+ providers" claim from /models');
else {
  const [, m, p] = claim;
  if (+m !== F.CLAIM.models) bad(`site says ${m}+ models, film says ${F.CLAIM.models}`);
  else ok(`site says "${m}+ AI models across ${p}+ providers"`);
  if (+p !== F.CLAIM.providers) bad(`site says ${p}+ providers, film says ${F.CLAIM.providers}`);
  else ok(`both numbers match the film`);
}

console.log('\npool totals');
const pool = await (await fetch('https://anyrouter.dev/api/v1/pool/analytics')).json();
for (const [k, live] of [
  ['activeKeys', pool.totals?.active_keys],
  ['donors', pool.totals?.donors],
  ['requestsTotal', pool.totals?.requests_total],
]) {
  if (live !== F.POOL[k]) bad(`pool.${k}: live ${live} ≠ pinned ${F.POOL[k]}`);
}
if (!failures) ok('all three pool totals match');
const top8 = (pool.providers ?? []).slice(0, 8).map((p) => p.provider);
if (JSON.stringify(top8) !== JSON.stringify(F.DONOR_MARKS)) {
  bad(`top-8 donors drifted:\n    live   ${top8.join(' ')}\n    film   ${F.DONOR_MARKS.join(' ')}`);
} else ok('top-8 donor brands match the film');
if ((pool.providers ?? []).some((p) => p.provider === 'bytedance')) {
  bad('bytedance now has pooled keys — re-check the donor list');
} else ok('bytedance has no donated keys (correctly excluded)');

console.log(`\n${failures ? `FAILED (${failures})` : 'OK — every on-screen fact still holds'}`);
process.exit(failures ? 1 : 0);
