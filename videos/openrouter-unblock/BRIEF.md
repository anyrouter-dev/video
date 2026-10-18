---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Your OpenRouter free models stop at OpenRouter's limit. Add the same key to AnyRouter and turn on the pool, and your requests keep going."
destination: youtube
aspect: 1920x1080
language: en
audience: "someone already using OpenRouter's free models, technical or not"
length: 60s
angle: tutorial-walkthrough
voice: kokoro af_heart
---

## Intent

A short narrated tutorial for someone who already uses OpenRouter's free models
and keeps hitting OpenRouter's rate limit. It shows the wall, the reason (one key,
one limit), the fix in three steps, how a request moves once the fix is on, and a
close. White, calm, the same look as the sibling explainer film.

The user's words: "I have OpenRouter but free. OpenRouter has :free models but with
rate limit. By adding the OpenRouter key as a BYOK key and enabling the pool, the
user can unblock the rate limit by using the keys pool."

## Customizations

- Shares the explainer's design truth (`frame.md` is a symlink to
  `../explainer/frame.md`) and its components (browser frame, cursor, key pill,
  terminal, step rail; `../explainer/tools/shared-components.md`). The step rail
  carries this film's own labels: `Create a key`, `Add it to AnyRouter`,
  `Share with the pool`.
- Dashboard screens are rebuilt in HTML from the product's UI source, labels
  exact (`tools/ui-labels.md`). Keys are always redacted.
- Does not reuse or open the repo's older films (intro, teaser, `lib/film.mjs`).

## Claims ledger

Every number or claim on screen is one of these. Sources were read 2026-10-18.

| # | Claim | Source |
|---|---|---|
| C1 | OpenRouter free models: 20 requests per minute; 50 requests per day without $10 of credits; 1000 per day with at least $10. Over it, a request gets `429 Too Many Requests`. | openrouter.ai/docs/api-reference/limits (constants) |
| C2 | Your own BYOK key is always tried first. | anyrouter.dev/docs/features/credential-selection.md ("Your own keys come first") |
| C3 | A rate limited (429) key is set aside for a short cooldown and automatically returns to rotation. | credential-selection.md, line 77 of the live doc |
| C4 | If you are eligible for the shared pool (you donated a key, or you hold a paid plan), the request can go through a donated key from another member. | credential-selection.md |
| C5 | Credits are the last fallback; BYOK requests are never charged to credits. | credential-selection.md |
| C6 | A `:free` model whose routes all fail answers through `anyrouter/free` (`x-anyrouter-fallback: anyrouter/free`). | anyrouter.dev/docs/features/free-tier.md |
| C7 | AnyRouter free models: no daily cap on any plan; 2400 requests per minute per API key. Say "no daily cap", never "unlimited". | free-tier.md (live: "There is no per-account daily cap, on any plan") |
| C8 | Create the key: openrouter.ai → Keys → Create Key → copy. Keys start `sk-or-`. | docs/guides/unblock-free-model-rate-limits-openrouter-key.md |
| C9 | Add it: Dashboard → BYOK → OpenRouter → paste into "API key". AnyRouter makes one live call to OpenRouter before it stores the key; encrypted at rest, never shown again. Base URL `https://openrouter.ai/api/v1` is the default. | same guide + docs/features/byok-providers/openrouter.md |
| C10 | Donating: per-key switch; AnyRouter verifies the key ("Key verified"); your own requests always come first; turn it off any time; earn 5% (Go or no plan) / 8% (Pro, Max) of the token cost of requests it serves, capped at $1 per key per UTC day. On the Free plan, donating an eligible key unlocks the shared pool's free models. | docs/features/shared-pool.md + the guide |
| C11 | Live pool (anyrouter.dev/pool, captured 2026-10-18): OpenRouter, Free, 74 keys, 1.2B tokens; NVIDIA NIM, 33 keys. | `assets/anyrouter-pool.png` (real screenshot) |
| C13 | The limit belongs to the account: more keys on one account do not raise it ("One account. One limit."). | openrouter.ai/docs/api-reference/limits.md (live 2026-10-19: "Making additional accounts or API keys will not affect your rate limits") |
| C12 | Model ids on screen exist in `GET https://anyrouter.dev/api/v1/models?all=1` (checked 2026-10-18): `anyrouter/free`, `openrouter/free`. The live list has no `:free`-suffixed id, so none is shown. | live API |

## UI label source

Live dashboard code (`apps/dashboard/src/app/byok/` in the product repo), traced
in `tools/ui-labels.md`. The public docs still describe an older dashboard
("Available" grid, "Save", "Donate to pool"). The screens follow the code; the
narration uses plain words true for both ("pick OpenRouter", "paste your key",
"share it with the pool").

## Notes

- Do not show anyone's real API key. Keys on screen are `sk-or-v1-••••••••••••`.
- Never "unlimited". Never a number outside the ledger.
