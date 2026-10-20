/**
 * models — what the live catalog says about one model, read the same way by every
 * kind that films models (model-launch, free-roundup, weekly).
 *
 * The catalog is GET https://anyrouter.dev/api/v1/models?all=1. Two words reach the
 * screen from it, and each has one definition here:
 *
 *   free  the model runs on AnyRouter's own routes at $0 in and $0 out. A model whose
 *         `pricing.billing` is "byok" runs only on the caller's own provider key, so it
 *         is never free on AnyRouter, whatever its price says.
 *   new   its `created` falls inside a window that ends now (30 days for the roundup,
 *         45 for a launch film) or inside one ISO week (the weekly film).
 *
 * Node builtins only: CI imports this before `npm ci` to decide what to film.
 */

export const MODELS_API = 'https://anyrouter.dev/api/v1/models?all=1';
export const DAY = 86400;

const fail = (where, what) => { throw new Error(`models: ${where}: ${what}`); };
const num = v => (v === null || v === undefined || v === '' ? NaN : Number(v));

/** The models of a /api/v1/models?all=1 response, each checked for the fields a film reads. */
export function parseCatalog(doc) {
  const data = doc?.data;
  if (!Array.isArray(data) || !data.length) fail('data', 'expected a non-empty array: the catalog came back empty');
  return data.map((m, i) => {
    if (typeof m?.id !== 'string' || !/^[a-z0-9][\w.-]*\/[\w.:[\]-]+$/i.test(m.id)) fail(`data[${i}].id`, `"${m?.id}" is not a model id`);
    if (typeof m.pricing !== 'object' || !m.pricing) fail(m.id, 'no pricing');
    if (!Number.isFinite(m.created)) fail(m.id, 'no created time');
    return m;
  });
}

export const isByok = m => m?.pricing?.billing === 'byok';

/** Price per 1M tokens in and out, as the catalog lists it. NaN when it lists none. */
export const pricesOf = m => ({
  in: num(m.pricing?.input_per_1m ?? m.pricing?.prompt),
  out: num(m.pricing?.output_per_1m ?? m.pricing?.completion),
});

/** Free on AnyRouter: not BYOK, and $0 in and $0 out. A missing price is not a zero. */
export function isFree(m) {
  if (isByok(m)) return false;
  const p = pricesOf(m);
  return p.in === 0 && p.out === 0;
}

/** How a call to the model is paid for: free, the caller's own provider key, or AnyRouter credits. */
export const billingOf = m => (isByok(m) ? 'byok' : isFree(m) ? 'free' : 'credits');

/** Created in the `days` before `now` (ms). A model dated after now is not new yet. */
export function isNew(m, { now, days }) {
  const at = m.created * 1000;
  return at <= now && at > now - days * DAY * 1000;
}

/** Created inside [from, to) (ms). */
export const createdIn = (m, { from, to }) => m.created * 1000 >= from && m.created * 1000 < to;

/**
 * A listing of its own: not an anyrouter/* preset and not a -latest alias, which
 * names whichever model of a family is newest and so is never itself "added".
 */
export const isListing = m => !m.id.startsWith('anyrouter/') && !/-latest$/.test(m.id);

/** A decision model answers typed questions on /api/v1/decisions; it is not a chat model. */
export const isDecision = m => (m.capabilities ?? []).includes('systemone') && !(m.capabilities ?? []).includes('chat');
export const isChat = m => (m.capabilities ?? []).includes('chat');

// How a maker is named on screen, where the catalog's provider field is a lowercase slug.
const MAKERS = {
  deepseek: 'DeepSeek', minimax: 'MiniMax', nvidia: 'NVIDIA', inclusionai: 'inclusionAI', moonshotai: 'Moonshot AI',
  scira: 'Scira', 'hal-x': 'HAL-X', microsoft: 'Microsoft', upstage: 'Upstage', stealth: 'Stealth', perplexity: 'Perplexity',
  reflection: 'Reflection', inception: 'Inception', liquid: 'Liquid AI', respan: 'Respan', jaredpalmer: 'Jared Palmer',
  meituan: 'Meituan', meta: 'Meta', anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', qwen: 'Qwen',
  'x-ai': 'xAI', 'z-ai': 'Z.ai', mistralai: 'Mistral AI', xiaomi: 'Xiaomi', tencent: 'Tencent', 'ibm-granite': 'IBM',
  'nace-ai': 'Nace AI', 'xingchen-agi': 'TeleAI', subquadratic: 'Subquadratic', 'nex-agi': 'Nex AGI', typesafe: 'Typesafe',
};
export const makerOf = m => MAKERS[m.id.split('/')[0]] ?? (/[A-Z]/.test(m.provider ?? '') ? m.provider : m.id.split('/')[0]);

/** A day as YYYY-MM-DD, in UTC: the catalog's dates are midnights UTC. */
export const dayOf = epochS => new Date(epochS * 1000).toISOString().slice(0, 10);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "October 19" for 2026-10-19, and "OCT 19" with short. */
export function dateWords(day, { short = false } = {}) {
  const [, m, d] = day.split('-').map(Number);
  return short ? `${MONTHS[m - 1].slice(0, 3).toUpperCase()} ${String(d).padStart(2, '0')}` : `${MONTHS[m - 1]} ${d}`;
}

/** Context length as people say it: 1M, 1.05M, 262K, 32K. Null when the catalog lists none. */
export function contextLabel(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(2)}M`;
  return `${Math.round(n / 1000)}K`;
}

/** What goes in and out, from the architecture: "Text, image, video in · text out". */
export function modalitiesOf(m) {
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const ins = m.architecture?.input_modalities ?? ['text'];
  const outs = m.architecture?.output_modalities ?? ['text'];
  return { in: ins, out: outs, label: `${cap(ins.join(', '))} in, ${outs.join(', ')} out` };
}

/** The providers whose own key runs a BYOK model, from its `-byok` routes. */
export const keyProvidersOf = m => (m.providers ?? []).filter(p => p.endsWith('-byok')).map(p => p.slice(0, -5));

// ── ISO weeks ───────────────────────────────────────────────────────────────
/** The ISO week a moment (ms) falls in, as "2026-W42". Weeks start Monday, UTC. */
export function isoWeekOf(ms) {
  const d = new Date(ms);
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - dow);           // the Thursday of its week names the year
  const jan1 = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((day - jan1) / 864e5 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** [from, to) of an ISO week in ms, Monday 00:00 UTC to the next Monday. */
export function weekSpan(week) {
  const m = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!m) fail('week', `"${week}" is not an ISO week like 2026-W42`);
  const [year, n] = [Number(m[1]), Number(m[2])];
  const jan4 = Date.UTC(year, 0, 4);
  const monday1 = jan4 - ((new Date(jan4).getUTCDay() || 7) - 1) * 864e5;
  const from = monday1 + (n - 1) * 7 * 864e5;
  if (isoWeekOf(from) !== week) fail('week', `${week} does not exist`);
  return { from, to: from + 7 * 864e5 };
}

/** The last ISO week that has ended by `now` (ms): the week a weekly film is about. */
export const lastFullWeek = now => isoWeekOf(weekSpan(isoWeekOf(now)).from - 1);
