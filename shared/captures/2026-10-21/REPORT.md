# Use-case film captures, v3 (2026-10-21)

Real pages, terminal output, dashboard screens and marks for the 33 use-case films. Nothing here was drawn or typed by hand.
`manifest.json` lists every file (url or command, `shows`, `redacted`, `slug`, `source`, `usedBy`). `steps.json` maps every slug and step to its captures.
Captures that already existed in `video-usecase-v3/shared/captures/2026-10-19/` were not retaken; `steps.json` points at them with `video-usecase-v3/shared/captures/...` paths.

## Counts

- 924 manifest rows, all files present (validated by `tools/build.mjs`, 0 problems).
- Row 1: 66 full pages (33 slugs x 2 viewports), 600 section crops (hero, problem, flow, diagram, steps, each step, each snippet, ready), 66 first-screen shots. 1920x1080 and 1080x1920 at deviceScaleFactor 2.
- Row 2: 90 step surfaces in `shared/surfaces/` (73 anyrouter.dev and docs.anyrouter.dev, 17 third-party docs), 1920x1080 at 2x, scrolled to the step's section where a focus text is set.
- Row 3: 21 terminal records (`.txt` + `.json` with per-chunk timing) and 21 PNG renders in `shared/terminal/`, plus `models-api-named.rows.json`.
- Row 5: 8 signed-in dashboard screens in `shared/dashboard/`.
- Row 6: 30 marks in `shared/marks/` (23 from anyrouter.dev's provider registry, 2 AnyRouter wordmarks, 5 official files from owner brand pages in `shared/marks/official/`).
- 33 contact sheets in `contact/`. I looked at every one.

## Coverage (rows 1 to 6 of the brief)

| slug | 1 page | 2 steps | 3 terminal/API | 4 real response | 5 dashboard | 6 marks |
|---|---|---|---|---|---|---|
| claude-code | ok | ok (3/3) | ok (7: anyr-auth-login-help, anyr-claude-auto-dry-run, anyr-claude-help, anyr-help, anyr-login-help, models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | n/a (no dashboard step) | ok (anthropic, anyrouter) |
| grokbot | ok | ok (3/3) | ok (5: anyr-claude-help, anyr-claude-laguna-yolo-dry-run, anyr-grok-help, models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | n/a (no dashboard step) | ok (anyrouter, xai) |
| opencode | ok | ok (3/3) | ok (4: anyr-opencode-dry-run, anyr-opencode-help, models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | ok keys, ok logs | ok (anyrouter, opencode) |
| coding-agents | ok | ok (3/3) | ok (5: anyr-claude-auto-dry-run, anyr-codex-dry-run, anyr-codex-help, models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | ok keys | ok (anthropic, anyrouter, cursor, cursor-brand-logo-1, opencode) |
| hermes-agent | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | n/a (no dashboard step) | ok (anyrouter, hermes) |
| claude-agent-sdk | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | n/a (no dashboard step) | ok (anthropic, anyrouter) |
| claude-code-free-models | ok | ok (3/3) | ok (5: anyr-auth-login-help, anyr-claude-free-dry-run, anyr-claude-help, models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | n/a (no dashboard step) | ok (anthropic, anyrouter) |
| openrouter-free-fallback | ok | ok (2/2) | ok (2: models-api-named, status-pages) | ok (logs.png) | n/a (no dashboard step) | ok (anyrouter, openrouter-glyph-ink, openrouter-horizontal-ink, openrouter) |
| openrouter-free-in-your-tools | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | ok keys | ok (anyrouter, openrouter-glyph-ink, openrouter-horizontal-ink, opencode, openrouter) |
| nvidia-nim-models | ok | ok (3/3) | ok (2: models-api-named, status-pages) | ok (playground-nemotron-3-super.png) | ok byok | ok (anyrouter, nvidia) |
| gemini-in-claude-code | ok | ok (3/3) | ok (4: anyr-claude-gemini-dry-run, anyr-claude-help, models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | ok byok | ok (anthropic, anyrouter, google) |
| claude-code-multiple-keys | ok | ok (3/3) | ok (4: anyr-claude-coding-dry-run, anyr-claude-help, models-api-named, status-pages) | ok (logs.png) | ok byok | ok (anthropic, anyrouter, openrouter-glyph-ink, openrouter-horizontal-ink, openrouter) |
| virtual-presets | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | ok keys, ok presets | ok (anyrouter) |
| nvidia-free-key | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | ok byok | ok (anyrouter, nvidia) |
| go-plan | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | ok credits | ok (anyrouter) |
| free-llm-api | ok | ok (3/3) | ok (2: models-api-named, status-pages) | ok (playground-three-models.png) | ok keys | ok (anyrouter) |
| free-chatbot | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | ok logs | ok (anyrouter, ai-sdk-light, vercel-logo-light, vercel) |
| cheapest-llm-api | ok | ok (3/3) | ok (3: anyr-models-help, models-api-named, status-pages) | ok (playground-three-models.png) | n/a (no dashboard step) | ok (anyrouter) |
| ai-sdk | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | n/a (no dashboard step) | ok (anyrouter, ai-sdk-light, vercel-logo-light, vercel) |
| openai-sdk | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | n/a (no dashboard step) | ok (anyrouter, openai) |
| unify-api | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | n/a (no dashboard step) | ok (anyrouter) |
| model-evals | ok | ok (3/3) | ok (3: anyr-models-help, models-api-named, status-pages) | ok (playground-three-models.png, playground-deepseek-v4-flash.png) | ok logs | ok (anyrouter, deepseek, google, z-ai) |
| agent-fallback | ok | ok (3/3) | ok (2: models-api-named, status-pages) | ok (logs.png, playground-deepseek-v4-flash.png) | n/a (no dashboard step) | ok (anyrouter, deepseek, z-ai) |
| donate-keys | ok | ok (3/3) | ok (1: status-pages) | gap: no real model response captured for this film; none fabricated | ok byok, ok pool | ok (anyrouter, nvidia, openrouter-glyph-ink, openrouter-horizontal-ink, openrouter) |
| byok | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | ok byok | ok (anyrouter) |
| byok-anthropic | ok | ok (5/5) | ok (4: anyr-claude-help, anyr-claude-sonnet-4-6-dry-run, models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | ok byok | ok (anthropic, anyrouter) |
| sign-in | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | gap apps | ok (anyrouter) |
| mcp-gateway | ok | ok (3/3) | ok (1: status-pages) | gap: no real model response captured for this film; none fabricated | ok mcp | ok (anyrouter) |
| mcp-for-agents | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | n/a (no dashboard step) | ok (anyrouter) |
| free-coding-agent | ok | ok (4/4) | ok (6: anyr-auth-login-help, anyr-claude-help, anyr-claude-minimax-free-dry-run, anyr-help, models-api-named, status-pages) | ok (playground-minimax-m3-1-flash.png) | n/a (no dashboard step) | ok (anyrouter, minimax) |
| codex | ok | ok (3/3) | ok (7: anyr-auth-login-help, anyr-codex-dry-run, anyr-codex-effort-dry-run, anyr-codex-help, anyr-help, anyr-login-help, status-pages) | gap: no real model response captured for this film; none fabricated | n/a (no dashboard step) | ok (anyrouter, openai) |
| embeddings-search | ok | ok (3/3) | ok (2: models-api-named, status-pages) | gap: no real model response captured for this film; none fabricated | n/a (no dashboard step) | ok (anyrouter, nvidia) |
| decisions | ok | ok (3/3) | ok (3: anyr-decision-help, models-api-named, status-pages) | ok (logs.png) | n/a (no dashboard step) | ok (anyrouter) |

## Gaps

- **Row 4, real responses, 24 films.** No key was read or created, so no new completions exist. The 2026-10-19 playground shots and the signed-in Logs screen cover 9 films. These have no real model response: claude-code, grokbot, opencode, coding-agents, hermes-agent, claude-agent-sdk, claude-code-free-models, openrouter-free-in-your-tools, gemini-in-claude-code, virtual-presets, nvidia-free-key, go-plan, free-chatbot, ai-sdk, openai-sdk, unify-api, donate-keys, byok, byok-anthropic, sign-in, mcp-gateway, mcp-for-agents, codex, embeddings-search. Nothing was fabricated. A keyed run of the 2026-10-19 `terminal.mjs curl` mode, by someone allowed to hold a key, would close most of them.
- **sign-in, dashboard.** There is no Sign-in-with-AnyRouter app settings page in the dashboard (routes are keys, usage, logs, byok, byok/pool, presets, credits, mcp, hubs, managed-access, prompts, devices, settings). The public `/sign-in-with-anyrouter` page and the OAuth docs cover the step instead.
- **byok-anthropic steps 3 and 4 (Test key, Save).** Only the docs page shows them. Pressing Test key or Save needs a real key, which the rules forbid. The 2026-10-19 Add key dialog shots are the closest real surface.
- **`/u/<slug>` returns 404 for all 33 slugs** (`shared/terminal/status-pages.txt`). `/use-cases/<slug>` is 200 for all 33.
- **`pricing.billing` exists only on some models.** Of the named models, it is `byok` for anthropic/claude-sonnet-4-6, anyrouter/coding, google/gemini-2.5-pro and z-ai/glm-4.7-flash, and absent on the rest.
- **`:free` ids are not in `/api/v1/models?all=1`.** google/gemma-4-31b:free and minimax/minimax-m3.1-flash:free are listed in `models-api-named.rows.json` with `inCatalog: false`; their `/model/...:free` pages 301 to the base model, and the surfaces show the redirected page.
- **Brand terms not reviewed.** Every mark row names its brand page where one answered 200 (Anthropic, Cursor, Google, MiniMax, NVIDIA, OpenCode, OpenRouter, Vercel, AnyRouter). No page was found for DeepSeek, Hermes, OpenAI (403 to curl), xAI (403) or Z.ai (404). The `brandTerms` field says "Not reviewed" rather than guessing.
- **Step surfaces are landscape only.** The brief asks for both viewports on the use-case pages (done); step surfaces are 1920x1080.
- **`anyr <agent> --help` is the same option list for claude, codex, opencode and grok.** That is the real CLI output, not a capture error.

## Redactions

Pages and docs: text is rewritten in the DOM before any pixel (`tools/lib.mjs` `redact`). Hits were placeholder keys in docs (`sk-ar-...` examples rewritten to `sk-ar-••••••••`) and public contact emails on three pages (`ar-decisions-app`, `tp-herdr`, `tp-openrouter-free`). Each row's `redacted` field says which.

Terminal: `--dry-run` output already masks keys; the masked key tail it prints (last four characters) is replaced again with `sk-ar-••••••••` in all 10 dry-run records. No email, token or account id appears.

Dashboard, owner's signed-in Chrome, via `tools/dash-redact.js` run in the page before each screenshot (a MutationObserver keeps it applied while React re-renders):
- `shared/dashboard/byok.png` (https://anyrouter.dev/dashboard/byok). Pool earnings and the account balance replaced with $•.••; a domain-named BYOK key label replaced with ••••.dev; account name replaced with 'owner'; avatar blurred. No provider key text is shown on this page. Left visible: pool counts (197 keys, 198 donors, 13/18 shared, 846 requests today), provider names, key statuses and error summaries (credential labels like anthropic-byok, no secrets).
- `shared/dashboard/credits.png` (https://anyrouter.dev/dashboard/credits). Balance, spent-this-period, subscription and top-up credit amounts, run rate, top-up preset amounts, fee/tax/total lines and the credits count replaced with $•.•• / •• credits; account name replaced with 'owner'; avatar blurred. Left visible: plan name (Go), 'No billing cycle', 'runway >1y', and the unlabeled daily-spend line shape.
- `shared/dashboard/keys.png` (https://anyrouter.dev/dashboard/keys). Every key replaced with sk-ar-••••••••; every spend, limit and balance replaced with $•.••; account and workspace name replaced with 'owner'; domain-named keys replaced with ••••.dev; avatar blurred.
- `shared/dashboard/logs.png` (https://anyrouter.dev/dashboard/logs). Every per-request cost, spend today, page spend and account balance replaced with $•.••; account name replaced with 'owner'; avatar blurred. Left visible: request counts, error rate, latencies, token counts, model names, app names (AI;DR, Hermes Agent), POOL/BYOK badges and fallback counts.
- `shared/dashboard/mcp.png` (https://anyrouter.dev/dashboard/mcp). The account-specific MCP endpoint host (a per-account subdomain) replaced with ••••.dev, so the endpoint reads https://••••.dev/api/v1/mcp; account balance replaced with $•.••; account name replaced with 'owner'; avatar blurred.
- `shared/dashboard/pool.png` (https://anyrouter.dev/dashboard/byok/pool). Credits rewarded, credits earned, per-key 'earned' amounts and the account balance replaced with $•.••; an email-named pooled key label replaced with ••••@••••; account name replaced with 'owner'; avatar blurred. Left visible: pool counts (198 donors, 846 requests today, 65 providers, 10 pooled keys, 3,937 requests served) and provider key labels.
- `shared/dashboard/presets.png` (https://anyrouter.dev/dashboard/presets). Account balance replaced with $•.••; account name replaced with 'owner' (so one preset slug reads @preset/owner-agent); avatar blurred. Left visible: built-in and personal preset slugs, model icons, strategies, request counts and update times.
- `shared/dashboard/usage.png` (https://anyrouter.dev/dashboard/usage). Every spend amount and the account balance replaced with $•.••; account and workspace name replaced with 'owner'; avatar blurred. Percent shares, dates and counts left as is.

I opened every stitched dashboard PNG at full size and checked it. No key, email, balance or account name is readable in any of them.

## How to rerun

`tools/` holds the scripts. Set `PW_DIR` (a dir whose node_modules has playwright-core), `CHROME` (a Chromium binary) and `SHARP_DIR` (a dir whose node_modules has sharp), then:

- `node capture.mjs pages [slug...]` for row 1, `node capture.mjs steps [surface...]` for row 2 (surfaces and the step map live in `steps.mjs`).
- `node terminal.mjs [anyr|api|status|render]` for row 3.
- `node marks.mjs` for row 6.
- Dashboard: run `dash-redact.js` in the signed-in tab, take four 2x zoom tiles, then `node dash-stitch.mjs <name> <url> <redacted> <shows> <tiles...>` and `node dash-stitch.mjs record`.
- `node build.mjs` rebuilds `steps.json`, validates the manifest, writes `tools/coverage.json` and the contact sheets.

## Not verified

- Third-party pages were captured as they rendered to a signed-out headless browser on 2026-10-21. Two npm pages showed npm's own token-policy banner across the top.
- Contact sheets show the first two captures per step; every file is in `steps.json`.
