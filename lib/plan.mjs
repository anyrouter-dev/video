/**
 * plan — the judgment an agent (or a human) contributes to a film.
 *
 * The render stays deterministic: a plan only CHOOSES among facts a kind already
 * collected and supplies a little copy. One shape for every kind:
 *
 *   { seconds, limit, picks, lines, headline, kicker, share, rationale }
 *
 * checkPlan() never throws on bad copy. It removes whatever fails and says why,
 * so a bad plan degrades to the kind's defaults instead of failing a nightly
 * build. A film that overclaims is worse than no film, and no film is worse than
 * the default film.
 */

export const SCHEMA = `{
  "seconds": 20,                          // film length, 8-60
  "limit": 3,                             // how many items to show; 0 declines this release
  "picks": ["<item id>", "..."],          // which items are the story, in order, lead first
  "lines": { "<item id>": "short line" }, // optional copy shown with an item (<= 120 chars)
  "headline": "one true line",            // <= 90 chars
  "kicker": "2-4 words",                  // <= 32 chars
  "share": "1-3 sentences for a post",    // <= 400 chars
  "rationale": "why this story"           // for the humans and the release notes
}`;

const CAPS = { headline: 90, kicker: 32, share: 400 };
const LINE_CAP = 120;
const SECONDS = [8, 60];

// Superlatives the facts can never back: the API has no "best" field.
const HYPE = /\b(revolutionary|game[- ]?changing|game[- ]?changer|best|fastest|smartest|blazing|insane|unleash\w*|supercharge\w*|cutting[- ]edge|next[- ]gen|groundbreaking|world[- ]class|unmatched|unbeatable|incredible|amazing|ultimate|mind[- ]blowing|state[- ]of[- ]the[- ]art|most powerful)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;

const UNIT = { k: 1e3, m: 1e6, b: 1e9 };
// $0.40 · 1,050,000 · 128K · 1.6 · 37. The suffix must touch the digits, so
// "5 models" is five, not five million.
const NUMBER = /(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?([kmb](?![a-z]))?/gi;

/** Every number a piece of text states, with the precision it was written at. */
export function numbersIn(text) {
  return [...String(text).matchAll(NUMBER)].map(([, int, frac = '', unit]) => {
    const u = unit ? UNIT[unit.toLowerCase()] : 1;
    const decimals = frac ? frac.length - 1 : 0;
    return {
      token: `${int}${frac}${unit ?? ''}`,
      value: parseFloat(int.replace(/,/g, '') + frac) * u,
      // "128K" is a rounding of 131072 the same way the film prints it, and
      // "$0.16" of 0.155. A bare integer is a count and must be exact.
      tolerance: unit || decimals ? 0.5 * 10 ** -decimals * u : 0,
    };
  });
}

/**
 * The numeric facts: every number value, every number written inside a string,
 * and the length of every list — "5 new models" is true of a list of five.
 * Clock times are skipped: a timestamp is not a claim, and its digits would
 * vouch for almost any small number.
 */
export function factNumbers(facts) {
  const found = [];
  const walk = v => {
    if (typeof v === 'number') found.push(v);
    else if (typeof v === 'string') {
      const text = v.replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|[+-]\d\d:?\d\d)?/g, ' ');
      for (const n of numbersIn(text)) found.push(n.value);
    } else if (Array.isArray(v)) { found.push(v.length); v.forEach(walk); }
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(facts);
  return found;
}

/** Why a piece of copy cannot go on screen, or null when it can. */
export function copyProblem(text, facts, cap) {
  if (typeof text !== 'string' || !text.trim()) return 'is not a non-empty string';
  if (text.length > cap) return `is ${text.length} chars (max ${cap})`;
  if (text.includes('!')) return 'has an exclamation mark';
  if (EMOJI.test(text)) return 'has an emoji';
  const hype = HYPE.exec(text);
  if (hype) return `says "${hype[0]}", which no fact can back`;
  const missing = numbersIn(text).filter(n => !facts.some(f => Math.abs(f - n.value) <= n.tolerance + 1e-9));
  if (missing.length) return `states ${missing.map(n => n.token).join(', ')}, not in the facts`;
  return null;
}

/**
 * Clean a plan against what the kind actually collected.
 *   ids    the item ids the kind offers (kind.items(data)); picks and lines must use them
 *   facts  everything that may be quoted — the numbers in the copy must occur here
 */
export function checkPlan(raw, { ids = [], facts = {} } = {}) {
  const problems = [];
  if (raw == null) return { plan: {}, problems };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { plan: {}, problems: ['the plan is not a JSON object — ignored'] };
  }
  const known = new Set(ids);
  const numbers = factNumbers(facts);
  const plan = {};
  const drop = (what, why) => problems.push(`dropped ${what}: ${why}`);

  for (const key of Object.keys(raw)) {
    if (!['seconds', 'limit', 'picks', 'lines', 'headline', 'kicker', 'share', 'rationale'].includes(key)) {
      drop(`"${key}"`, 'not part of the plan schema');
    }
  }

  if (raw.seconds !== undefined) {
    const s = raw.seconds;
    if (typeof s === 'number' && s >= SECONDS[0] && s <= SECONDS[1]) plan.seconds = s;
    else drop('seconds', `${JSON.stringify(s)} is not a number from ${SECONDS[0]} to ${SECONDS[1]}`);
  }

  if (raw.limit !== undefined) {
    // 0 is not "unset": it is the agent declining the release, and must survive.
    if (Number.isInteger(raw.limit) && raw.limit >= 0) plan.limit = raw.limit;
    else drop('limit', `${JSON.stringify(raw.limit)} is not a whole number >= 0`);
  }

  if (raw.picks !== undefined) {
    if (!Array.isArray(raw.picks)) drop('picks', 'not a list');
    else {
      const picks = [];
      for (const id of raw.picks) {
        if (!known.has(id)) drop(`pick ${JSON.stringify(id)}`, 'no such item');
        else if (picks.includes(id)) drop(`pick "${id}"`, 'picked twice');
        else picks.push(id);
      }
      if (picks.length) plan.picks = picks;
    }
  }

  if (raw.lines !== undefined) {
    if (!raw.lines || typeof raw.lines !== 'object' || Array.isArray(raw.lines)) drop('lines', 'not an object');
    else {
      const lines = {};
      for (const [id, text] of Object.entries(raw.lines)) {
        const why = known.has(id) ? copyProblem(text, numbers, LINE_CAP) : 'no such item';
        if (why) drop(`line for "${id}"`, why);
        else lines[id] = text.trim();
      }
      if (Object.keys(lines).length) plan.lines = lines;
    }
  }

  for (const [key, cap] of Object.entries(CAPS)) {
    if (raw[key] === undefined) continue;
    const why = copyProblem(raw[key], numbers, cap);
    if (why) drop(key, why);
    else plan[key] = raw[key].trim();
  }

  if (raw.rationale !== undefined) {
    if (typeof raw.rationale === 'string' && raw.rationale.trim()) plan.rationale = raw.rationale.trim();
    else drop('rationale', 'is not a non-empty string');
  }

  return { plan, problems };
}
