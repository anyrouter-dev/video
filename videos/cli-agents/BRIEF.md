---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Install anyr once and sign in. Then start Claude Code, Codex or OpenCode on any model you name, with one AnyRouter key."
destination: youtube
aspect: 1920x1080
language: en
audience: "a developer who uses a coding agent in the terminal"
length: 32s
angle: benefit-first
voice: elevenlabs "Eric - Smooth, Trustworthy" (cjVigY5qzO86Huf0OWal)
---

## Intent

A short narrated guide to the `anyr` CLI for people who already use a coding agent. It shows
how little it takes: one install, one sign-in, then the agent they like on the model they name.
A named model comes first (`deepseek/deepseek-v4-flash`), so no viewer leaves thinking only
`anyrouter/*` presets work. No setup internals: the env the CLI sets is named once, as the
reason nothing else changes.

## Customizations

- Shares the explainer's design truth (`frame.md` links `../explainer/frame.md`, v3 Monolith)
  and its kit (`tools/kit` links the explainer's; `node ../explainer/tools/kit.mjs .`).
- Ships landscape (1920x1080) and portrait (1080x1920) from the same frames.
- The terminal is the kit's ink card. Every command and output line on it is real `anyr`
  0.1.20 input or output, captured 2026-10-20 into the session scratchpad (`cli-caps/`); keys
  are redacted to `sk-ar-••••••••`.
- No anyrouter.dev screenshot. No agent UI is drawn: the film shows the command and what it
  starts, never a mock of Claude Code's screen.

## Claims ledger

Sources read 2026-10-20. `anyrouter` = `/Users/duet/project/anyrouter-dev/anyrouter` (read-only).

| # | Claim | Source |
|---|---|---|
| A1 | Install: `curl -fsSL https://anyrouter.dev/setup.sh \| bash`, then sign in with `anyr auth login`. | `anyr --help` ("Start"), `anyrouter/packages/cli/README.md` ("Install", "Login"); `https://anyrouter.dev/setup.sh` answers 200 `application/x-sh` (2026-10-20) |
| A2 | Sign-in opens the browser; only a masked `sk-ar-v1-…` hint is shown in the terminal. | `anyrouter/packages/cli/README.md` ("Login") |
| A3 | `anyr claude --model <id>` launches Claude Code with that session model; `--model` takes any id that `anyr models` lists; most catalog ids are BYOK-only and run on the viewer's own provider key (`anyr byok`), so the film says "the model you name", never "any model". | `anyr claude --help` ("--model auto\|<id> Session model"), `anyr models --help` ("Lists every model id usable with --model") |
| A4 | `anyr claude --model deepseek/deepseek-v4-flash` sets Claude Code's model to `deepseek/deepseek-v4-flash` and its base URL to `https://anyrouter.dev/api`. | `anyr claude --model deepseek/deepseek-v4-flash --dry-run` (real output: `ANTHROPIC_MODEL=deepseek/deepseek-v4-flash`, `ANTHROPIC_BASE_URL=https://anyrouter.dev/api`) |
| A5 | `deepseek/deepseek-v4-flash` ("DeepSeek-V4-Flash"), `moonshotai/kimi-k3` ("Kimi K3") and `minimax/minimax-m3.1-flash` ("MiniMax M3.1 Flash") are not BYOK-only: none has `pricing.billing` `byok`. | `GET https://anyrouter.dev/api/v1/models?all=1` (2026-10-20) |
| A6 | `anyr codex --model moonshotai/kimi-k3` and `anyr opencode --model minimax/minimax-m3.1-flash` start Codex and OpenCode on those models, with the same saved key. | `--dry-run` of both (real output: `OPENAI_MODEL=moonshotai/kimi-k3`; OpenCode config `"model":"anyrouter/minimax/minimax-m3.1-flash"`; both `OPENAI_API_KEY=sk-ar-…` with the same suffix as Claude Code's) |
| A7 | Six coding agents launch from anyr: Claude Code, Codex, Grok Build, OpenCode, Pi, Poolside. | `anyr help commands` ("LAUNCH": claude, codex, grok, opencode, pi, pool) |
| A8 | The CLI never edits an agent's own config files (`anyr` keeps its own settings in `~/.anyrouter/config.yaml`, so the film says "agent config", not "your setup"). It sets the gateway base URL and token only in the environment of the agent it launches, for that session; quit, and your global setup is unchanged. | `anyrouter/packages/cli/README.md` ("How it routes your tools") + every `--dry-run` above (env only, `args: []` for Claude Code) |
| A9 | Model id shown first is a named model, not a preset; presets (`anyrouter/auto`) also work but are not shown. | owner direction (bias rule) |

## Notes

- Never show a real key: `sk-ar-••••••••` only.
- Never "unlimited". No price, no count beyond "six agents".
- Voice: ElevenLabs "Eric" (`cjVigY5qzO86Huf0OWal`), `eleven_multilingual_v2`, stability 0.5,
  similarity 0.8, style 0.15, speaker boost, voiced by `shared/authoring/eleven-voice.mjs`.
- Music bed: `assets/bgm/track.mp3` (120 bpm, first beat 0.059s); lines padded to the beat.
