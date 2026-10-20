# AnyRouter for AI coding agents

AnyRouter is an OpenAI- and Anthropic-compatible LLM gateway on Cloudflare. One API key reaches hundreds of models, with automatic failover, free models, bring-your-own-key at $0 markup, and a shared key Pool.

## Connect

- Base URL: `https://anyrouter.dev/api/v1`
- Auth: `Authorization: Bearer sk-ar-v1-...` (Anthropic clients may send `x-api-key` instead)
- Get a key at https://anyrouter.dev/dashboard/keys (no card required). Keep it in `ANYROUTER_API_KEY`, never in source.

```bash
export ANYROUTER_API_KEY="sk-ar-v1-your-key"
curl https://anyrouter.dev/api/v1/chat/completions \
  -H "Authorization: Bearer $ANYROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"anyrouter/free","messages":[{"role":"user","content":"Hello"}]}'
```

## Endpoints

All paths are relative to the base URL.

| Endpoint | Compatible with |
|---|---|
| `POST /chat/completions` | OpenAI Chat Completions |
| `POST /messages` | Anthropic Messages |
| `POST /responses` | OpenAI Responses |
| `POST /embeddings` | OpenAI Embeddings |
| `GET /models` | Model list (JSON) |

For an OpenAI SDK set `base_url` / `baseURL` to `https://anyrouter.dev/api/v1`. For an Anthropic SDK or Claude Code set `ANTHROPIC_BASE_URL` to `https://anyrouter.dev/api`, because the SDK appends `/v1/messages`.

## Models

- Ids look like `owner/model`. Copy exact ids from the catalog, do not guess.
- `anyrouter/auto` routes to a suitable model for you. Add a context floor with `anyrouter/auto[500k]` or `anyrouter/auto[1m]`.
- `anyrouter/free` routes to the best free model available right now, with fallback. It uses no credits.
- List models as JSON with `GET https://anyrouter.dev/api/v1/models`, or as markdown at https://anyrouter.dev/models.md. Per-model pages are at `https://anyrouter.dev/model/<owner>/<model>.md`.

## Free models

`anyrouter/free` and `:free` model variants cost no credits. They work on every plan, Free included, with no daily cap. The limit is 2400 requests per minute per API key. Paid models need credits and return `402 insufficient_balance` without them. See https://docs.anyrouter.dev/features/free-tier.

## The `anyr` CLI

```bash
curl -fsSL https://anyrouter.dev/setup.sh | bash
anyr auth login     # browser, device code, or paste a key
anyr claude         # launch Claude Code through AnyRouter
anyr claude --model anyrouter/auto
```

`anyr` sets the right environment variables for each tool before launching it. Add `--dry-run` to see them.

## Links

- Docs: https://docs.anyrouter.dev
- Quickstart: https://docs.anyrouter.dev/getting-started/quickstart
- Agent integration guide: https://docs.anyrouter.dev/guides/ai-agent-integration
- Site overview for LLMs: https://anyrouter.dev/llms.txt
- Full docs for LLMs: https://anyrouter.dev/llms-full.txt
