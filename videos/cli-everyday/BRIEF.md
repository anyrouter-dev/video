---
workflow: product-launch-video
flow: automation
storyboard: no
message: "The anyr CLI does the daily dashboard work from the terminal: list models, check credits, see and create API keys."
destination: youtube
aspect: 1920x1080
language: en
audience: "a developer who already has an AnyRouter account and lives in the terminal"
length: 30s
angle: benefit-first
voice: elevenlabs "Eric - Smooth, Trustworthy" (cjVigY5qzO86Huf0OWal)
---

## Intent

A short narrated guide to the everyday `anyr` commands: one command per beat, its real output
redrawn on the kit's terminal card, and nothing else on stage. The point is how little it takes
to do dashboard work without leaving the terminal.

## Customizations

- Shares the explainer's design truth (`frame.md` links `../explainer/frame.md`, v3 Monolith)
  and its kit (`tools/kit` links the explainer's; `node ../explainer/tools/kit.mjs .`).
- Ships landscape (1920x1080) and portrait (1080x1920) from the same frames.
- Every command and output line is real `anyr` 0.1.20 output, captured 2026-10-20 from the
  owner's signed-in profile (session scratchpad `cli-caps/`), except the `keys create` output,
  which is not run (it would create a key): its two lines come from the CLI's own source and
  binary strings (E6). Key masks are redacted further, to `sk-ar-v1-••••••••`; no email,
  account id or workspace id is shown.
- Rows are a subset of the real output, in its real order; nothing is reworded.

## Claims ledger

Sources read 2026-10-20. `anyrouter` = `/Users/duet/project/anyrouter-dev/anyrouter` (read-only).

| # | Claim | Source |
|---|---|---|
| E1 | The CLI has a "Dashboard from the terminal" (`anyr api …`) and top-level `models`, `usage` and `keys` commands. | `anyr --help` ("Dashboard from the terminal"), `anyr help commands` ("CORE COMMANDS"), `anyr api --help` ("the AnyRouter dashboard from your terminal") |
| E2 | `anyr models` lists every model id usable with `--model`, one per line: id, provider, context length. | `anyr models --help` ("Lists every model id usable with --model"), real `anyr models` output |
| E3 | Rows shown, in their real order from `anyr models`: `deepseek/deepseek-v4-flash deepseek 1050000`, `google/gemini-3-flash google 1048576`, `z-ai/glm-4.7-flash zhipu ai 200000`, `z-ai/glm-5.2 zhipu ai 1050000`, `anyrouter/free anyrouter 1048576`. The trailing `false` column is dropped (its meaning is not stated by the CLI). | `anyr models` (2026-10-20), also `video-pace/shared/captures/2026-10-19/terminal/anyr-models.txt` |
| E4 | `anyr usage` prints `Credits remaining  $134.49` and `Lifetime used       $19.47` for the owner's account. | real `anyr usage` output (2026-10-20); format in `anyrouter/crates/anyr-cli/src/http.rs` `format_usage_report` |
| E5 | `anyr keys list` prints each key's name, its masked value and when it was last used; `*` marks the key this profile uses. Rows shown: `* AnyRouter CLI  sk-ar-v1-…  2026-10-19T19:52:11Z`, `  chatbot-template  sk-ar-v1-…  2026-10-17T16:32:32Z`, `  prod  sk-ar-v1-…  never used`. | real `anyr keys list` output (2026-10-20); `anyrouter/packages/cli/bin/cli.mjs` `runKeysList` |
| E6 | `anyr keys create ci-bot` prints `Created "ci-bot":` then the new key, which is shown once. | `anyr --help` (`anyr api keys create ci-bot`), `anyr keys --help` (`anyr keys create [name]`), `anyrouter/packages/cli/bin/cli.mjs` `runKeysCreate` (`Created "${name}":`, `Shown once`), and the same strings in the installed binary (`strings ~/.local/bin/anyr`) |

## Notes

- Never show a real key: `sk-ar-v1-••••••••` only.
- The balance is the owner's real account value on 2026-10-20; it is an example, not a promise.
- Voice: ElevenLabs "Eric" (`cjVigY5qzO86Huf0OWal`), `eleven_multilingual_v2`, stability 0.5,
  similarity 0.8, style 0.15, speaker boost, voiced by `shared/authoring/eleven-voice.mjs`.
- Music bed: `assets/bgm/track.mp3` (120 bpm, first beat 0.059s); lines padded to the beat.
