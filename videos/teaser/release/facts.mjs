/**
 * Every number and string that reaches the screen, with where it came from.
 *
 * Rule: a number on screen is either (a) quoted here with the endpoint it was
 * read from, or (b) not on screen. If you cannot add a line to this file, do not
 * put it in the film.
 *
 * Verified against production on 2026-09-26. Re-verify with:
 *
 *   curl 'https://anyrouter.dev/api/v1/models?all=1'        → 201 entries
 *   curl  https://anyrouter.dev/api/v1/pool/analytics       → pool totals
 *   curl -sH 'Accept: text/html' https://anyrouter.dev/models | grep -o '192+[^<]*'
 */

/** The site's own literal claim. These two must never disagree on screen. */
export const CLAIM = {
  /** "192+ AI models across 17+ providers" — anyrouter.dev/models */
  models: 192,
  providers: 17,
  source: 'https://anyrouter.dev/models (literal page copy)',
  // Deliberately NOT used, and why:
  //   201  = the /models?all=1 entry count (192 listed + 9 virtual aliases)
  //   41/42 = distinct model-id prefixes — a different question entirely
  //   122+ = a stale literal still present in this repo. Never use it.
  //   141  = the number of SVG marks in public/providers, which counts brands
  //          that are not catalog providers, plus "-color" duplicates. It came
  //          from a rule the product deleted (commit fd6c2f9e1) and the `Free N`
  //          UI badge is a lazy-loaded subset. NO free-model count on screen.
};

/** GET /api/v1/pool/analytics → totals. requests_total is LIFETIME. */
export const POOL = {
  activeKeys: 92,
  donors: 42,
  requestsTotal: 3052, // NOT requests_today — that is 7, and it is a bad advert
  eligibleProviders: 40,
  source: 'https://anyrouter.dev/api/v1/pool/analytics',
};

/**
 * The real top 8 donors by pooled key count, in the API's own order.
 * `bytedance` has zero donated keys and is absent from the response entirely —
 * do not add it. baseten/cohere/openai are tied at 2 keys; the first two take
 * the slots.
 */
export const DONOR_MARKS = [
  'openrouter', // 40 keys, 16 donors
  'nvidia', // 20 keys, 19 donors
  'z-ai-coding', //  5 keys,  3 donors
  'mistral', //  3 keys,  3 donors
  'poolside', //  3 keys,  1 donor
  'z-ai', //  3 keys,  3 donors
  'baseten', //  2 keys,  2 donors
  'cohere', //  2 keys,  2 donors
];

/**
 * The four chat-shaped inference endpoints, from
 * packages/lib/src/api/key-endpoints.ts (KEY_ENDPOINTS, group: inference).
 * These four are locked to one key grant — granting any one grants the others.
 */
export const ENDPOINTS = [
  { path: '/api/v1/chat/completions', note: 'OpenAI-compatible' },
  { path: '/api/v1/messages', note: 'Anthropic-compatible' },
  { path: '/api/v1/responses', note: 'OpenAI Responses' },
  { path: '/api/v1/embeddings', note: 'Vectors' },
];

/** Descriptions quoted from the live /models?all=1 payload, not written by us. */
export const ALIASES = {
  auto: {
    id: 'anyrouter/auto',
    line: 'Top usage + top stable.',
    // API description: "Top usage + top stable platform models mixing free-tier
    // and credit-billed routes, with health-aware failover."
  },
  decision: {
    id: 'anyrouter/decision',
    line: 'Probabilities, not chat.',
    // capabilities: ["systemone"]. "System One is not chat" is a whole KB doc
    // in this repo; the preset is deliberately gated off the chat routers and
    // serves POST /api/v1/decisions and /api/v1/systemone.
  },
  free: {
    id: 'anyrouter/free',
    line: '10/day free · 1000/day paid',
    // API description: "Free plan: 10 requests/day. Paid plans: 1000
    // requests/day (resets 00:00 UTC)." This is a REQUEST RATE, not a model
    // count — that distinction is the whole trap.
  },
};

/** Presets are workspace-defined, referenced as `@preset/<name>`. */
export const PRESET = {
  ref: '@preset/fast',
  line: 'Your model, its parameters, its instructions — one id.',
  // models-catalog.md: "workspace-defined virtual models that bundle a base
  // model with parameters and system instructions, referenced as
  // `@preset/<name>`". They do NOT appear in the catalog, so `@preset/fast` is
  // a name the viewer could create themselves — the copy says "your", not
  // "ours", so nothing is claimed to ship.
};

/** byok.md:123 — "AnyRouter charges nothing for BYOK traffic". */
export const BYOK = {
  line1: 'Bring your own provider keys.',
  line2: 'AnyRouter charges nothing for them.',
  markSub: 'No markup. No per-request fee. No minimum.',
  source: 'src/content/docs/features/byok.md',
};

export const KEY_PREFIX = 'sk-ar-v1-';

export const DOMAIN = 'anyrouter.dev';

export const INSTALL_CMD = 'curl -fsSL https://anyrouter.dev/setup.sh | bash';

/**
 * Model ids for the `board` beat. Every one of these is asserted to exist in
 * `GET /api/v1/models?all=1` by tools/verify-facts.mjs — the film refuses to
 * generate if one of them does not come back from the API.
 *
 * `x-ai/grok-4.5` is deliberately absent. The catalog ships 4.7. A stale
 * `grok-4.5` reference still lives in routing.md's `anyrouter/latest` fallback
 * list, which is a docs bug, not a listing.
 *
 * Anthropic ids use a DOT (`claude-opus-4.8`, not `claude-opus-4-8`); the
 * dashed form was my own typo and tools/verify-facts.mjs caught it.
 *
 * Model parts are kept to 15 characters or fewer on purpose: the `board` beat
 * sets these at 40px (the film's minimum type size) inside a 4-column grid, and
 * a 24-character id like `nemotron-3-super-120b-a12b` would either overflow its
 * chip or force the type below the floor.
 */
export const BOARD_IDS = [
  'anthropic/claude-opus-4.8',
  'openai/gpt-5.4-mini',
  'google/gemini-3-flash',
  'x-ai/grok-4.7',
  'z-ai/glm-5.2',
  'moonshotai/kimi-k3',
  'deepseek/deepseek-v3.1',
  'openrouter/fusion',
  'anyrouter/auto',
  'anyrouter/latest',
  'anyrouter/free',
  'anyrouter/decision',
  'typesafe/jev',
  'qwen/qwen3.5-plus',
  'meta/muse-spark-1.3',
  'cohere/command-a',
];

/**
 * The 22 real provider marks used by the opening `estab` streak. Note `xai`
 * and `moonshotai` — the mark filenames do not match the model-id prefixes
 * (`x-ai/`, `moonshotai/`), so neither spelling is guessable.
 */
export const ESTAB_MARKS = [
  'anthropic', 'openai', 'google', 'mistral', 'meta', 'xai', 'deepseek',
  'cohere', 'groq', 'together', 'fireworks', 'openrouter', 'nvidia', 'baseten',
  'z-ai', 'moonshotai', 'qwen', 'minimax', 'sakana', 'poolside', 'siliconflow',
  'nousresearch',
];

/**
 * No health or latency claim appears anywhere in this film.
 * GET /api/v1/health reports status `partial` at ~8s average latency, so any
 * "99.9% uptime" or "120ms TTFT" line would be a lie.
 */
