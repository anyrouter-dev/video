// The model ids the explainer's frames show, and whether one AnyRouter key runs them.
// An id runs on AnyRouter's own routes when its catalog entry's pricing.billing is not "byok";
// a byok id needs the viewer's own provider key, so a frame must not show it as just working.
// A free id is one of those that also costs $0 in and out.
// model-billing.json saves the catalog; refresh it from videos/explainer, from the live API or
// from a saved response:
//   node tools/model-ids.mjs --refresh [--from=models.json]
// The live catalog moves: on 2026-10-19 two fetches minutes apart counted 266 and 244 byok ids,
// as pool-routed models came and went. Frames show only ids that stay off byok.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = path.dirname(new URL(import.meta.url).pathname);
export const CATALOG = path.join(HERE, '../model-billing.json');
export const SOURCE = 'https://anyrouter.dev/api/v1/models?all=1';

/**
 * Every `org/model` id in a frame's visible text. Scripts, styles and attributes are dropped,
 * and a match inside a URL or path (anyrouter.dev/api/v1, /model/openai/gpt-5.5) or an npm scope
 * (@anthropic-ai/sdk) is not an id.
 * Sibling elements (the values of a roll) are separate words; an id split across nested
 * spans (`<span>org/</span>model`) is one.
 */
export function shownIds(html) {
  const text = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/(<\/[a-z0-9]+>)(?=<[a-z])/gi, '$1 ')
    .replace(/<[^>]*>/g, '');
  return [...text.matchAll(/(?<![\w./~@-])[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9.:-]*[a-z0-9](?![\w/.-])/g)].map(m => m[0]);
}

/** The billing rule for each id: unknown (not in the catalog), byok, or runnable. */
export function judgeIds(ids, billing) {
  return ids.map(id => ({ id, status: !(id in billing) ? 'unknown' : billing[id] === 'byok' ? 'byok' : 'runnable' }));
}

async function refresh(from) {
  let body;
  if (from) body = JSON.parse(fs.readFileSync(from, 'utf8'));
  else {
    const res = await fetch(SOURCE);
    if (!res.ok) throw new Error(`${SOURCE}: ${res.status}`);
    body = await res.json();
  }
  const { data } = body;
  const sorted = [...data].sort((a, b) => a.id.localeCompare(b.id));
  const billing = Object.fromEntries(sorted.map(m => [m.id, m.pricing?.billing ?? null]));
  const free = sorted.filter(m => m.pricing?.billing !== 'byok' && Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0).map(m => m.id);
  fs.writeFileSync(CATALOG, JSON.stringify({ source: SOURCE, fetched: new Date().toISOString().slice(0, 10), billing, free }, null, 1) + '\n');
  const byok = Object.values(billing).filter(b => b === 'byok').length;
  console.log(`${data.length} models, ${byok} byok, ${data.length - byok} routed by AnyRouter → ${CATALOG}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv.includes('--refresh')) {
  await refresh(process.argv.find(a => a.startsWith('--from='))?.slice('--from='.length));
}
