---
format: 1920x1080
duration: 33.039s
message: "Add AnyRouter's MCP server once, then ask for models, usage, credits or a new key in plain words."
arc: The promise → Setup → Pick a model → Make a key → Close
audience: someone who already works in Claude, Cursor or another MCP client
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md` v3 "Monolith", shared with the explainer). White `bg`, `ink` and `muted` only. The `accent` goes only on what just changed: the URL in the config, the top model id, the new key's name. One ink card per moment.
- **Type.** Geist for words, Geist Mono for typed things (ids, URLs, keys, tool names). Nothing a viewer must read below 36px.
- **Camera.** Every frame sits in a `.k-cam` that drifts in, so no frame holds still more than 1.5s.
- **Cuts.** Every cut lands on a beat (120 bpm, first beat 0.059s). Reveals land on the spoken word.
- **Continuity.** The chat window is the recurring object (Frames 3, 4): a hairline card, your words in a surface bubble, the tool name in mono, the answer below.
- **Honesty.** Only claims from BRIEF.md. Tool results are redrawn from real output; the key is redacted.
- **Negative list.** No gradients, glows, blur, emoji, per-client steps, no client logos.
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait: content in y 200 to 1220; captions own 1240 to 1480.

## Frame 1 — The promise
- src: compositions/frames/01-promise.html

- scene: "Ask AnyRouter in plain words" settles; three cards rise: Claude, Cursor, Any MCP client, each inked as it is named
- duration: 6.559s
- transition_in: cut
- type: hook
- beat: promise
- voiceover: "Add AnyRouter to Claude, Cursor or any MCP client, then ask in plain words."
- asset_candidates: none, type only
- blueprint: kinetic-type-beats (Adapt)
- focal: the three clients, then the headline
- roles: cards = where you already work
- sfx: pop on AnyRouter, click-soft on each client
- status: animated

## Frame 2 — Setup
- src: compositions/frames/02-setup.html

- scene: A code card `mcp.json` with the one entry; the URL line is the ink line, its value in accent. Then an "Authorize" consent card: three permissions checked, one unchecked, the Authorize button
- duration: 6.5s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "Add one entry to your config. Authorize it once, and choose what it can do."
- asset_candidates: none, typed code only
- blueprint: ui-callout (Adapt)
- focal: the URL line, then the Authorize button
- roles: code = your config; consent = you stay in control
- sfx: click on config, click-soft on Authorize
- status: animated

## Frame 3 — Pick a model
- src: compositions/frames/03-recommend.html

- scene: The chat window: "Which free model is best for coding?"; `recommend_model` runs; three ranked rows arrive (kimi-k3, gpt-oss-20b, minimax-m3.1-flash, each $0 with its context); the top row is the ink card
- duration: 6s
- transition_in: cut
- type: key_feature
- beat: proof
- voiceover: "Ask for a free model for coding. AnyRouter ranks the ones you can use."
- asset_candidates: none
- blueprint: ui-callout (Adapt)
- focal: the ranked list
- roles: rows = real tool output
- sfx: pop on the ask, whoosh-short on ranks
- status: animated

## Frame 4 — Make a key
- src: compositions/frames/04-create-key.html

- scene: The chat window: "Make a new key called staging"; `create_key` runs; a result card: name staging, key sk-ar-v1-•••• redacted, "Shown once"
- duration: 6s
- transition_in: cut
- type: key_feature
- beat: proof
- voiceover: "Ask for a new key called staging. The full key is shown once, so save it."
- asset_candidates: none
- blueprint: ui-callout (Adapt)
- focal: the new key card
- roles: key = the result, redacted
- sfx: pop on the ask, ping on shown
- status: animated

## Frame 5 — Close
- src: compositions/frames/05-close.html

- scene: Four words in a column, Models, Usage, Credits, Keys, each with its tool name; then the AnyRouter lockup and anyrouter.dev
- duration: 7.98s
- transition_in: cut
- type: cta
- beat: resolve
- voiceover: "Models, usage, credits and keys, from the chat you already use. Start at anyrouter.dev."
- asset_candidates: none, the AnyRouter mark is inline
- blueprint: logo-assemble-lockup (Adapt)
- focal: AnyRouter lockup
- roles: mark = hero
- sfx: chime on Models, sparkle on Start
- status: animated
