---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Add AnyRouter's MCP server to Claude, Cursor or any MCP client once, then ask for models, usage, credits or a new key in plain words."
destination: youtube
aspect: 1920x1080
language: en
audience: "someone who already works in Claude, Cursor or another MCP client"
length: 33s
angle: benefit-first
voice: elevenlabs "Eric - Smooth, Trustworthy" (cjVigY5qzO86Huf0OWal)
---

## Intent

A short guide film to the AnyRouter MCP server. It shows the benefit and how little setup it
takes: one config entry, one authorization, then two real asks with their results redrawn in
the kit. No internals and no setup walkthrough per client. White, calm, Monolith (frame.md v3).

## Customizations

- Shares the explainer's design (`frame.md` and `tools/kit` link the explainer's).
- Ships landscape (1920x1080) and portrait (1080x1920) from the same frames.
- No anyrouter.dev screenshot. The chat window is drawn in the kit with no client's branding,
  so it reads as any MCP client. Tool results are redrawn from real tool output.
- Keys are always redacted (`sk-ar-v1-••••••••`).

## Claims ledger

Product repo: `/Users/duet/project/anyrouter-dev/anyrouter` (read 2026-10-20, HEAD 5771cebb6).

| # | Claim | Source |
|---|---|---|
| M1 | The AnyRouter MCP server works with Claude (Desktop and Code), Cursor and any MCP-aware client over remote HTTP. Its tools browse the catalog, manage API keys, and check credits and usage. | `public/docs/mcp.md` (client cards: Claude Desktop, Claude Code, Cursor, Windsurf, Cline, GitHub Copilot, OpenCode, Other clients) + `packages/server-core/src/mcp/tools.ts` (tools `list_models`, `recommend_model`, `get_usage`, `get_credits`, `list_keys`, `create_key`, `revoke_key`) |
| M2 | Setup is one config entry: `"mcpServers": { "anyrouter": { "url": "https://anyrouter.dev/api/v1/mcp" } }` in Cursor's `~/.cursor/mcp.json` (Claude Code: the same entry in `.mcp.json`, or one `claude mcp add` command). | `public/docs/mcp/cursor.md` (Manual config), `public/docs/mcp/claude-code.md` |
| M3 | The first tool call opens AnyRouter's consent page in the browser. It lists the permissions the client asks for, all checked; you uncheck any you do not want and press "Authorize". | `src/app/oauth/consent.tsx` ("Everything starts checked... let the user hand over less", `authorizeLabel="Authorize"`, bundle `standard`) + `packages/lib/src/auth/management-scopes.ts` (`MCP_BUNDLE_STANDARD` includes `write:llm-keys`) |
| M4 | `recommend_model` takes a task (`translation`, `coding`, `reasoning`, `vision`, `cheap`) and an optional `free_only`, and returns models this caller can use, best fit first, each with why, price and context. | `packages/server-core/src/mcp/tools.ts:106-157`, `model-pick.ts` (`MODEL_TASKS`) |
| M5 | Real result, `recommend_model { task: "coding", free_only: true, limit: 3 }`, called 2026-10-20 through the AnyRouter MCP server: `moonshotai/kimi-k3` ($0, 1,048,576 context), `openai/gpt-oss-20b` ($0, 131,072), `minimax/minimax-m3.1-flash` ($0, 1,000,000). All three have `pricing.billing` unset (not `byok`) and price 0 in `GET https://anyrouter.dev/api/v1/models?all=1`, so they run on AnyRouter without your own key. | the live MCP call; the live models API, checked 2026-10-20 |
| M6 | `create_key { name }` makes an AnyRouter API key (`sk-ar-v1-…`) and returns `{ id, key, prefix, name }`; the full key is returned only once. Needs the `write:llm-keys` permission (checked by default at consent). | `tools.ts:337-391` ("The full key is returned only once — store it immediately"), `packages/lib/src/api/auth.ts:508` (`API_KEY_PREFIX = "sk-ar-v1-"`) |
| M7 | `get_usage` (requests, tokens and dollars for a recent window) and `get_credits` (balance and lifetime usage) are tools too; `list_models` browses the catalog. | `tools.ts` (`get_usage` 169-230, `get_credits` 285-297, `list_models` 48-104) |

Not claimed: no tool is shown running a model (there is no chat tool, `mcp.md`); no price or
balance of the owner's account is shown. `create_key` was not called for the film (it would
make a real key); its result is drawn from the tool's return shape with the key redacted.

## Notes

- Never show a real key. Never "unlimited". Say "OpenRouter", never the domain.
- Voice: ElevenLabs Eric, `eleven_multilingual_v2`, stability 0.5, similarity 0.8, style 0.15,
  speaker boost. 385 characters voiced, one take each.
- Music: the explainer's bed (`assets/bgm/track.mp3`, 120 bpm, first beat 0.059s); each line
  padded to the beat (`pad-voices.mjs --beat=0.5 --phase=0.059`).
