---
format: 1920x1080
duration: 32.635s
message: "Install anyr once and sign in. Then start Claude Code, Codex or OpenCode on any model you name, with one AnyRouter key."
arc: One install → A named model → Other agents → Six agents → Nothing to undo → Close
audience: a developer who uses a coding agent in the terminal
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md` v3 "Monolith", shared with the explainer). White `bg` on every frame, `ink` and `muted` only. The accent goes only on what just changed: the typed model id, the command that just arrived, the one value that matters. One ink object per moment; the terminal is the kit's ink card.
- **Type.** Geist for spoken words, Geist Mono for anything typed (commands, ids, URLs, keys). Nothing a viewer must read below 36px.
- **Camera.** Every frame sits in a `.k-cam` that pushes in slowly, so no frame holds still for more than 1.5s.
- **Cuts.** Every cut lands on a beat of the music (120 bpm, first beat 0.059s): `pad-voices.mjs --beat=0.5 --phase=0.059`. Reveals land on the spoken word (ElevenLabs alignment in `audio_meta.json`).
- **Continuity.** The terminal is the recurring object (Frames 1, 2, 3): the same ink card, the same `~/my-project` tab. The model id is always the accent.
- **Honesty.** Only claims from BRIEF.md. Every command is real `anyr` input; no agent UI is drawn. Keys are `sk-ar-••••••••`.
- **Negative list.** No gradients, glows, blur, noise, emoji, step-by-step setup. No `repeat` / `yoyo`, no randomness.
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait (1080x1920): content in y 200 to 1220 and x 60 to 960; captions own 1240 to 1480.
- **Two renditions.** Each frame carries its portrait layout under `@media (orientation: portrait)`; `shared/authoring/portrait.mjs` writes the 1080x1920 project.

## Frame 1 — One install
- src: compositions/frames/01-install.html

- scene: "One install" headline over the terminal; `curl -fsSL https://anyrouter.dev/setup.sh | bash` types on "Install", then `anyr auth login` types on "sign in" and takes the accent
- duration: 3.559s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "Install anyr once, and sign in."
- asset_candidates: none, typed commands only
- blueprint: kinetic-type-beats (Adapt)
- focal: the terminal
- roles: terminal = the viewer's own shell
- sfx: click-soft on Install, click on sign
- status: animated

## Frame 2 — A named model
- src: compositions/frames/02-named-model.html

- scene: "Claude Code, on your model" headline over the terminal; `anyr claude --model` types, and `deepseek/deepseek-v4-flash` lands in the accent on "DeepSeek"
- duration: 6.5s
- transition_in: cut
- type: key_feature
- beat: relief
- voiceover: "Then start Claude Code on the model you name, like DeepSeek V4 Flash."
- asset_candidates: none, typed commands only
- blueprint: kinetic-type-beats (Adapt)
- focal: the model id
- roles: id = the viewer's choice
- sfx: click on start, pop on DeepSeek
- status: animated

## Frame 3 — Other agents
- src: compositions/frames/03-other-agents.html

- scene: the same terminal, the Claude Code line now muted; `anyr codex --model moonshotai/kimi-k3` lands on "Codex", `anyr opencode --model minimax/minimax-m3.1-flash` on "OpenCode"; a "Same key sk-ar-••••••••" badge rises under it on "same key"
- duration: 4.5s
- transition_in: cut
- type: how_it_works
- beat: relief
- voiceover: "Codex and OpenCode start the same way, with the same key."
- asset_candidates: none
- blueprint: kinetic-type-beats (Adapt)
- focal: the new command line
- roles: badge = one key for all
- sfx: click on Codex, click on OpenCode, pop on key
- status: animated

## Frame 4 — Six agents
- src: compositions/frames/04-six-agents.html

- scene: six cards (Claude Code, Codex, OpenCode, Grok Build, Pi, Poolside), each with its `anyr` command in mono, rise in a stagger on "six"; on "one AnyRouter key" an ink "One AnyRouter key" badge lands under them
- duration: 4.5s
- transition_in: cut
- type: key_feature
- beat: relief
- voiceover: "Pick from six coding agents, all on one AnyRouter key."
- asset_candidates: none
- blueprint: card-grid (Adapt)
- focal: the six cards
- roles: badge = the one key
- sfx: whoosh-short on six, pop on key
- status: animated

## Frame 5 — Nothing to undo
- src: compositions/frames/05-session.html

- scene: two cards. "This session" with "AnyRouter" inks on "session only"; then the ink moves to "Agent config files" with "Unchanged" on "The agent's own config"
- duration: 7s
- transition_in: cut
- type: trust
- beat: trust
- voiceover: "anyr points the agent at AnyRouter for that session only. The agent's own config stays as it was."
- asset_candidates: none
- blueprint: ui-callout (Adapt)
- focal: the card that is inked
- roles: session card = while it runs; config card = after you quit
- sfx: click-soft on session, click on Your
- status: animated

## Frame 6 — Close
- src: compositions/frames/06-close.html

- scene: "One install." then "Your agent, your model." in display type, alone; then the AnyRouter lockup and anyrouter.dev
- duration: 6.576s
- transition_in: cut
- type: cta
- beat: resolve
- voiceover: "One install. Your agent, your model. Start at anyrouter.dev."
- asset_candidates: assets/anyrouter-logo-black.svg
- blueprint: logo-assemble-lockup (Adapt)
- focal: AnyRouter lockup
- roles: mark = hero
- sfx: chime on One, sparkle on Start
- status: animated
