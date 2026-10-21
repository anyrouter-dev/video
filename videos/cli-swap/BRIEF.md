---
workflow: authored, one Anatomy figure
message: "One anyr sign-in serves every coding agent. Change one word and the same key and model run Claude Code, Pi or OpenCode."
destination: youtube + anyrouter.dev/cli
aspect: 1920x1080 and 1080x1920
language: en
audience: "a developer who uses a coding agent in the terminal"
length: 34s
voice: elevenlabs "Eric - Smooth, Trustworthy" (cjVigY5qzO86Huf0OWal)
---

## Intent

The owner asked (2026-10-20/21) for a film like the Claude Code free-models one that demos swapping
`anyr claude` → `anyr pi` → `anyr opencode`, with `anyr login` before the install line, the install
shown fast, the close on anyrouter.dev/cli, more motion, a voice, and the look built from the
Anatomy skill's components.

## The object

A microscope on a bench console (`tools/figure.mjs`, 83 solids). The lamp in the foot is the
AnyRouter key (`anyr login` switches it on; it stays on). The slide is the model (the same
`--model` throughout; it never moves). The objectives on the revolving nosepiece are the agents;
`codex` and `grok` are engraved on two empty ports for "and more". The console's screen is the
terminal; its command line changes one word in place while the turret clicks the next objective
into the light path. Why this object: a nosepiece is a real mechanism whose whole job is to swap
one part in the optical path while the light and the specimen stay put, which is exactly what
`anyr <agent>` does with the key and the model.

## Claims ledger

Sources read 2026-10-21. `anyr` is `/Users/duet/.local/bin/anyr` 0.1.20 (built 2026-10-03), read with `--help` only. The lead's terminal captures of the same build are copied into `sources/` with their rows from `captures-v3/2026-10-21/manifest.json` (`sources/manifest.json`); the `--dry-run` captures there were made by the lead, not in this session.

| # | Line (spoken or shown) | Source |
|---|---|---|
| C1 | "Every coding agent wants its own provider, key and setup." | Claude Code, Codex, OpenCode and Pi each ship their own provider/key configuration; `anyr` exists to point them at one gateway (`anyr --help`: "point any coding agent at AnyRouter") |
| C2 | "With anyr, one sign-in serves them all." | `anyr --help` ("Same key, other agents"); anyrouter.dev/cli ("Launch Claude Code, opencode or Codex through AnyRouter with one key") |
| C3 | Screen: `$ curl -fsSL https://anyrouter.dev/setup.sh \| bash` (wrapped at its spaces on three rows) and `Installed ~/.local/bin/anyr` | `anyr --help` ("Start"); the installer's own message `echo "Installed ${BIN_DIR}/${BIN_NAME}"` with `BIN_DIR=${HOME}/.local/bin` in https://anyrouter.dev/setup.sh (read, not run); `~` stands for `$HOME` |
| C4 | "Sign in once with anyr login." Screen: `$ anyr login` | `anyr auth login --help` ("Also available as `anyr login`"); anyrouter.dev/cli ("Log in and run: anyr login") |
| C5 | "anyr claude starts Claude Code on the model you pick." Screen: `$ anyr claude` / `--model anyrouter/free` | `anyr claude --help` ("launch Claude Code through AnyRouter", "--model auto\|<id> Session model"; `sources/anyr-claude-help.txt`); `sources/anyr-claude-free-dry-run.txt`: `anyr claude --model anyrouter/free` hands Claude Code `ANTHROPIC_MODEL=anyrouter/free` and `ANTHROPIC_BASE_URL=https://anyrouter.dev/api` |
| C6 | Model shown: `anyrouter/free` | `GET https://anyrouter.dev/api/v1/models?all=1` (2026-10-21): `anyrouter/free` "AnyRouter Free", pricing 0/0, no `pricing.billing` (so not `byok`); anyrouter.dev/cli shows `anyr opencode --model anyrouter/free`. The film never says "unlimited" or "no daily cap". |
| C7 | "Change one word. anyr pi starts Pi." Screen: `claude` replaced by `pi`, then `# launch Pi` / `# through AnyRouter` | `anyr pi --help` ("anyr pi — launch Pi through AnyRouter"; same `--model` option). Not observed: a Pi handoff with `--model anyrouter/free` (no `--dry-run` capture for Pi exists; this session ran `--help` only). The `#` lines are the help text redrawn as a shell comment, not program output. |
| C8 | "anyr opencode starts OpenCode. Same key, same model." Screen: `# launch opencode` / `# through AnyRouter` | `anyr opencode --help` ("launch opencode through AnyRouter"; `sources/anyr-opencode-help.txt`); `sources/anyr-opencode-dry-run.txt` shows the handoff carries the AnyRouter key and `baseURL https://anyrouter.dev/api/v1`; one saved key serves every launch (`anyr --help` "Same key, other agents"); the command keeps `--model anyrouter/free` |
| C9 | "Three agents on one key, and more, like Codex and Grok." Readout: "and more · codex, grok"; end card "One key, six coding agents." | `anyr help commands` LAUNCH: claude, codex, grok, opencode, pi, pool (six) |
| C10 | "Get it at anyrouter.dev/cli." | https://anyrouter.dev/cli answers 200 (2026-10-21) |

## Notes

- No key, balance or account is shown. `anyr` was never run beyond `--help`.
- Music: "Cherry Blossom", Kevin MacLeod, CC BY 4.0. The credit must appear with the film (YouTube description, site); `kind.mjs` notes carry it. Ledger in `audio/LICENSES.md`.
- Sound: `sfx-cues.json` is the event → sound table; `tools/events.json` holds when each event happens.
