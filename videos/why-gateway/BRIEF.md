---
workflow: product-launch-video
flow: automation
storyboard: no
message: "One address and one key reach models from many providers. Switching models is a name, and a backup model answers when a provider fails."
destination: youtube
aspect: 1920x1080
language: en
audience: "a developer calling LLMs from an app, technical, who has not used a gateway"
length: 33s
angle: benefit-first
voice: elevenlabs "Eric - Smooth, Trustworthy" (cjVigY5qzO86Huf0OWal)
---

## Intent

A short narrated film on why to call models through one gateway. It leads with the benefit
(one address, one key, models from many providers), names the pain fairly (a key, a bill and
often an SDK per provider, and an outage that can take your app down), then shows how little
it takes: your SDK stays, a model switch is the model name, and a backup model answers when a
provider fails. No competitor is named. White, calm, the Monolith look of the explainer
(`frame.md` v3).

## Customizations

- Shares the explainer's design truth (`frame.md` symlink), kit (`tools/kit` symlink, pasted
  with `node ../explainer/tools/kit.mjs .`) and caption skin.
- Ships landscape (1920x1080) and portrait (1080x1920) from the same frames.
- No anyrouter.dev screenshot. Code cards are typed code. Provider marks are the vendored ones
  in `shared/assets/providers/`, drawn as black silhouettes.
- Every model id on screen runs on AnyRouter's own routes (`pricing.billing !== "byok"`),
  asserted by `model-ids.test.mjs` against `model-billing.json` (the live catalog, 2026-10-20).
- The provider in Frame 3 is unnamed on purpose: the film does not pin an outage on anyone.

## Claims ledger

Every word on screen or in the voice is one of these. Product repo paths are in
`/Users/duet/project/anyrouter-dev/anyrouter` (read 2026-10-20).

| # | Claim | Source |
|---|---|---|
| G1 | One base URL: `https://anyrouter.dev/api/v1` for OpenAI-compatible clients. The Anthropic SDK takes `https://anyrouter.dev/api` and reaches `/api/v1/messages`. | `src/content/docs/getting-started/quickstart.md` (table "Base URL"), `src/content/docs/api-reference/messages.md`, `src/content/docs/guides/claude-code.md:58` |
| G2 | One AnyRouter key (`sk-ar-v1-…`) for every endpoint. On screen it is redacted `sk-ar-v1-••••••••`. | quickstart.md ("API key: your `sk-ar-v1-…` inference key"), messages.md note |
| G3 | A model is named in the request as `provider/model`. Ids shown run on AnyRouter's routes (billing not `byok`, live `GET /api/v1/models?all=1`, 2026-10-20): `deepseek/deepseek-v4-flash`, `moonshotai/kimi-k2.6`, `google/gemma-4-31b`. "Many providers": the six marks in Frame 1 each have a model on AnyRouter's routes the same day: DeepSeek (`deepseek/deepseek-v4-flash`), Moonshot AI (`moonshotai/kimi-k2.6`), Google (`google/gemma-4-31b`), OpenAI (`openai/gpt-oss-20b`), NVIDIA (`nvidia/nemotron-3-super-120b-a12b`), MiniMax (`minimax/minimax-m3.1-flash`). | quickstart.md ("Model id: `provider/model`"), live API, `model-billing.json` |
| G4 | AnyRouter is OpenAI- and Anthropic-compatible: the OpenAI SDK and `@anthropic-ai/sdk` work by changing the base URL and key. | quickstart.md line 17 ("an OpenAI- and Anthropic-compatible LLM gateway"), quickstart.md ("drop-in replacement for the OpenAI API"), messages.md ("the official `@anthropic-ai/sdk` works against AnyRouter by changing the base URL") |
| G5 | A `models` list on `/api/v1/chat/completions` names backup models; if the primary model's providers are down, rate limited or return a retryable error, AnyRouter tries the next model. Separately, it fails over between upstreams of the same model. | `src/content/docs/guides/model-fallbacks.md` (intro and "How it works"), `src/content/docs/features/routing.md:36`, `:91`; code `packages/server-core/src/utils/upstream/pool-routing.ts` (`allow_fallbacks`) |
| G6 | Pinning an app to one provider means one outage can take it down. Said as "can". | `src/content/docs/features/routing.md:18` ("one outage or rate-limit spike takes you down with it") |
| G7 | Without a gateway, each provider has its own key and its own bill, and often its own SDK and request format (OpenAI's `openai`, Anthropic's `@anthropic-ai/sdk`, Google's `@google/genai`). Said as "often", since many providers speak the OpenAI format. | `packages/lib/src/byok-providers.ts` (each provider its own key format and console, `OFFICIAL_BYOK_BASE_URLS`: distinct endpoints per provider), `src/content/docs/features/byok.md:28` (credits: "single invoice") |

## Notes

- Never "unlimited". No price or count on screen.
- Keys are always redacted.
- Voice and music as the OpenRouter film: Eric, `eleven_multilingual_v2`, stability 0.5,
  similarity 0.8, style 0.15, speaker boost; the explainer's 120 bpm bed, lines padded to the
  beat (`pad-voices.mjs --beat=0.5 --phase=0.059`).
