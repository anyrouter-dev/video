# SCRIPT: the AnyRouter launch film

**Voice:** ElevenLabs "Eric - Smooth, Trustworthy" (`cjVigY5qzO86Huf0OWal`), `eleven_multilingual_v2`, stability 0.5, similarity 0.8, style 0.15, speaker boost on. Voiced by `shared/authoring/eleven-voice.mjs`, which sends `anyr` as "any R" and `anyrouter.dev` as "any router dot dev".
**Voice direction:** Calm and plain. Someone showing a well-made tool to a colleague. No sell.

Every line below carries its claims in the ledger at the end. Truth snapshots are in `truth/`
(fetched 2026-10-21).

---

## Line 1: What it is (Frame 1)

    AnyRouter puts hundreds of AI models behind one key and one endpoint.

## Line 2: Switch models (Frame 2)

    It works with OpenAI and Anthropic clients. To switch models, you change the model ID.

## Line 3: Proof (Frame 3)

    Here is one prompt, answered by three models.

## Line 4: Failover (Frame 4)

    If one provider fails, it tries the next. You are billed once.

## Line 5: Why a pool (Frame 5)

    Some free models run on donated keys. The AnyRouter pool spreads that load.

## Line 6: How the pool works (Frame 6)

    Members donate spare provider keys. Each request takes the key that has rested longest.

## Line 7: Why it is fair (Frame 7)

    Your own requests come first, and you can take your key back any time. Only donors and paid plans draw from the pool.

## Line 8: What donors get (Frame 8)

    Donors get Go free, four dollars of credit a month, and five percent back.

## Line 9: Your own keys (Frame 9)

    Or keep your own keys private, at zero markup.

## Line 10: Install (Frame 10)

    For coding agents, install the anyr CLI with one command.

## Line 11: Swap agents (Frame 11)

    Sign in once. Then run Claude Code, Pi or OpenCode on the same key and model.

## Line 12: And more (Frame 12)

    Codex and Grok Build work too.

## Line 13: Close (Frame 13)

    One key, many models. Start at anyrouter.dev.

---

## Claims ledger

One row per claim, spoken (S) or shown (W). Sources are live pages and APIs fetched on
2026-10-21 into `truth/`, the AnyRouter repo (read-only), or a real capture.

| # | Line | Claim | S/W | Source |
|---|---|---|---|---|
| C1 | 1 | Hundreds of AI models behind one API key | S | `truth/llms.txt` line 3: "One API key reaches hundreds of models" |
| C2 | 1 | One endpoint: `https://anyrouter.dev/api/v1`, `POST /api/v1/chat/completions` | S, W | `truth/llms.txt` key facts (OpenAI SDK base URL); home page code sample (`truth/page_home.txt`) |
| C3 | 1 | 271 models, 17 providers | W | `truth/stats.json` from `GET /api/v1/stats` (`models: 271, providers: 17`), the same numbers the home page prints ("271 models, 17 providers"). `/api/v1/models?all=1` lists 299 ids (244 BYOK-only, plus 22 `-latest` aliases and 9 `anyrouter/*` presets), so it is not used as the count. The BYOK dialog's "68 providers" (BYOK upstreams) is cropped out of the capture so the film shows one provider count |
| C4 | 2 | Works with OpenAI and Anthropic clients | S | `truth/llms.txt`: OpenAI Chat Completions, Responses and Embeddings, and Anthropic Messages; home: "OpenAI- and Anthropic-compatible. Switch models, keep your code." |
| C5 | 2 | Switch models by changing the model ID | S | `truth/llms.txt` "When to use": "swap providers or models by changing a model id, not your client code" |
| C6 | 2 | Model ids shown run on AnyRouter credits | W | each id shown has `pricing.billing !== "byok"` in `truth/models-all.json`; checked by `kind.test.mjs` |
| C7 | 3 | One prompt answered by three models through `/api/v1/chat/completions` | S, W | capture `shared/captures/2026-10-19/screens/signed-in/playground-three-models.png` (deepseek/deepseek-v4-flash, nvidia/nemotron-3-super-120b-a12b, minimax/minimax-m3.1-flash, `$0 cost` each) |
| C8 | 4 | If an upstream fails, the next one is tried | S, W | home page Fig. 1: "if an upstream fails, falls back to the next one"; `truth/llms.txt`: "a 401, 429, or 5xx from one upstream retries on the next upstream for that model" |
| C9 | 4 | Billed once | S | home page Fig. 1: "You are billed once"; "429 → fallback · 200 · billed once" |
| C10 | 5 | Some free models run on donated keys; the pool spreads that load | S, W | `truth/blog_anyrouter-pool.md`: "Models marked Free via Pool in the catalog are served by donated keys" and "The AnyRouter Pool spreads that load."; other free models stay open to every plan (`truth/llms.txt` key facts: `anyrouter/free` and `:free` models work on every plan, Free included) |
| C11 | 6 | Members donate spare provider keys | S | `truth/blog_anyrouter-pool.md`: "Members donate spare provider keys" |
| C12 | 6 | Each request takes the key idle longest | S, W | `truth/blog_anyrouter-pool.md`: "It picks the key that has been idle the longest, with some randomness among the less recently used keys" |
| C13 | 7 | Your own requests come first | S | `truth/shared-pool.md`: "Your account comes first. You always keep first call on your own key" |
| C14 | 7 | Take your key back any time | S | `truth/shared-pool.md`: "Withdraw instantly"; blog: "Turn off Donate to pool on the key. It leaves the pool right away" |
| C15 | 7 | Only donors and paid plans draw from the pool | S, W | `truth/blog_anyrouter-pool.md`: "A member can use it with at least one active donated key, or on a paid plan: Go, Pro, Pro+, Max or Enterprise" |
| C16 | 8 | Donors get Go free, $4 credit a month, 5% back (8% on Pro and Max) | S, W | `truth/page_pool.txt`: "You get Go free, $4 credit a month and 5% back (8% on Pro and Max)" |
| C17 | 8 | Up to $1 per key per day | W | `truth/shared-pool.md`: "Credits are capped at $1 per key per UTC day" |
| C18 | 9 | Your own keys, private, at $0 markup | S, W | `truth/anyr-byok-help.txt`: "Keep the key private to your account"; home FAQ: "Route through your own provider keys and the markup is $0" |
| C19 | 9 | The BYOK provider list | W | capture `shared/captures/2026-10-19/screens/signed-in/byok-add-provider-list.png` |
| C20 | 10 | Install with `curl -fsSL https://anyrouter.dev/setup.sh \| bash` | S, W | `truth/anyr-help.txt` "Start"; `/cli` page (`truth/page_cli.txt`) |
| C21 | 11 | Sign in once: `anyr login` | S, W | `/cli` page: "anyr login opens your browser"; `anyrouter/crates/anyr-cli/src/commands.rs` (`"login" \| "setup" => run_login`); `anyr --help` lists `anyr auth login` |
| C22 | 11 | `anyr claude`, `anyr pi`, `anyr opencode` launch Claude Code, Pi, OpenCode | S, W | `truth/anyr-help-commands.txt` LAUNCH: claude Claude Code, pi Pi, opencode OpenCode |
| C23 | 11 | Same key and model across agents | S | `truth/anyr-help.txt`: "Same key, other agents"; `/cli`: "Same key, same presets"; `anyr models`: "List catalog and set the default" |
| C24 | 12 | Codex and Grok Build | S, W | `truth/anyr-help-commands.txt` LAUNCH: codex Codex, grok Grok Build |
| C25 | 13 | Start at anyrouter.dev | S, W | the site |
