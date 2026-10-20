---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Add your own provider keys once, then call their models through one AnyRouter endpoint, billed on your own provider accounts with no AnyRouter markup."
destination: youtube
aspect: 1920x1080
language: en
audience: "a developer who already pays one or more model providers"
length: 31s
angle: benefit-first
voice: elevenlabs "Eric - Smooth, Trustworthy" (cjVigY5qzO86Huf0OWal)
---

## Intent

A short narrated film on bring your own key (BYOK). It leads with the benefit (your own
provider keys, one endpoint), shows that adding a key is once per provider, that one AnyRouter
key then calls their models by name, where the bill goes (your provider account, its price)
and what AnyRouter takes (nothing, on every plan). No setup clicks. White, calm, the Monolith
look of the explainer (`frame.md` v3).

## Customizations

- Shares the explainer's design truth (`frame.md` symlink), kit (`tools/kit` symlink, pasted
  with `node ../explainer/tools/kit.mjs .`) and caption skin.
- Ships landscape (1920x1080) and portrait (1080x1920) from the same frames.
- No anyrouter.dev screenshot. The key fields in Frame 2 carry the real placeholders of the
  add-key form (`packages/lib/src/byok-providers.ts`); keys are always redacted.
- The model ids in Frame 3 are BYOK-only on the live catalog, so each carries a comment that it
  runs on your own key. `model-ids.test.mjs` asserts every id shown is BYOK-only and labelled.

## Claims ledger

Every word on screen or in the voice is one of these. Product repo paths are in
`/Users/duet/project/anyrouter-dev/anyrouter` (read 2026-10-20).

| # | Claim | Source |
|---|---|---|
| B1 | BYOK attaches your own upstream provider keys; a request for a model a configured provider serves runs on your key. You keep the unified API. | `src/content/docs/features/byok.md` (intro, "How it works") |
| B2 | The BYOK registry holds OpenAI (key placeholder `sk-...`), Anthropic (`sk-ant-...`), Google AI Studio ("Enter your Google AI Studio API key"), OpenRouter (`sk-or-...`) and about a hundred more providers ("many more"). A key is added once per provider, checked with a live call, and encrypted at rest. | `packages/lib/src/byok-providers.ts` (`BYOK_PROVIDERS`, 108 entries; `openai` :629, `anthropic` :103, `google-ai-studio` :356, `openrouter` :646), byok.md ("Configure", "Security"). Google AI Studio keys start `AIza` (`packages/lib/src/byok-help-content.ts:113-117`, "usually starts with `AIzaSy...`"). |
| B3 | Calls go to `https://anyrouter.dev/api/v1` with one AnyRouter key (`process.env.ANYROUTER_API_KEY`, a `sk-ar-v1-…` key). | `src/content/docs/getting-started/quickstart.md` (table) |
| B4 | Ids shown are BYOK-only in the live catalog (2026-10-20, billing `byok`) and served by that provider's BYOK backend: `openai/gpt-5.5` (`openai-byok`), `anthropic/claude-sonnet-5-5` (`anthropic-byok`), `google/gemini-3.5-flash` (`google-aistudio-byok`). Shown only as running on your key. | live `GET https://anyrouter.dev/api/v1/models?all=1` (`providers`, `pricing.billing`), `model-billing.json` |
| B5 | BYOK requests run on your provider account; you pay the provider directly, at your account's list price. | byok.md "Costs" ("You pay the upstream provider directly, on their billing cycle, at your account's list price") and the billing-mode table |
| B6 | AnyRouter charges $0 on a BYOK request: no markup, no per-request fee, no minimum. | code `packages/server-core/src/utils/inference-finalize-debit.ts:25-26` (`chargedCostUsd` returns 0 when `isByok`), `packages/server-core/src/utils/responses/cost.ts:5` ("0 for free and BYOK"); byok.md "Costs" ("AnyRouter charges nothing for BYOK traffic — no markup, no per-request fee, no minimum") |
| B7 | If every regular BYOK key fails, the request can fall through to managed capacity, billed in credits (unless a Strict pin applies). That is why the voice says "requests run on your provider account", not "every request". | byok.md "Routing precedence" step 3 and 4 |
| B8 | BYOK is on every plan: Free, Go, Pro, Pro+, Max. On Free, BYOK requests never deduct credits. | `src/content/docs/features/pricing.md` (plan table row "BYOK — bring your own keys", and "BYOK requests never deduct credits") |

## Notes

- Never "unlimited" (the pricing table's word for BYOK); the film says "every plan".
- Keys are always redacted: `sk-•••`, `sk-ant-•••`, `AIza•••`, `sk-or-v1-•••`.
- Voice and music as the OpenRouter film: Eric, `eleven_multilingual_v2`, stability 0.5,
  similarity 0.8, style 0.15, speaker boost; the explainer's 120 bpm bed, lines padded to the
  beat (`pad-voices.mjs --beat=0.5 --phase=0.059`).
