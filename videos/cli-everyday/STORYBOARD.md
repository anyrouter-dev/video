---
format: 1920x1080
duration: 32.064s
message: "The anyr CLI does the daily dashboard work from the terminal: list models, check credits, see and create API keys."
arc: The promise → Models → Credits → Keys → A new key → Close
audience: a developer who already has an AnyRouter account and lives in the terminal
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md` v3 "Monolith", shared with the explainer). White `bg` on every frame, `ink` and `muted` only. The accent goes only on what just changed: the value the voice names. The terminal is the kit's ink card, the one ink object per frame.
- **Type.** Geist for spoken words, Geist Mono for commands and output. Nothing a viewer must read below 36px.
- **Camera.** Every frame sits in a `.k-cam` that pushes in slowly, so no frame holds still for more than 1.5s.
- **Cuts.** Every cut lands on a beat of the music (120 bpm, first beat 0.059s): `pad-voices.mjs --beat=0.5 --phase=0.059`. Reveals land on the spoken word (ElevenLabs alignment in `audio_meta.json`).
- **Continuity.** One terminal card, the same `~/my-project` tab, in Frames 2 to 5: each frame types one command and prints its real output.
- **Honesty.** Only claims from BRIEF.md. Output rows are real, a subset in their real order; keys are `sk-ar-v1-••••••••`. No email or account id.
- **Negative list.** No gradients, glows, blur, noise, emoji. No `repeat` / `yoyo`, no randomness.
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait (1080x1920): content in y 200 to 1220 and x 60 to 960; captions own 1240 to 1480.
- **Two renditions.** Each frame carries its portrait layout under `@media (orientation: portrait)`; `shared/authoring/portrait.mjs` writes the 1080x1920 project.

## Frame 1 — The promise
- src: compositions/frames/01-promise.html

- scene: "Dashboard from the terminal" headline settles; under it a terminal prompt types `anyr` with a blinking caret
- duration: 4.559s
- transition_in: cut
- type: hook
- beat: ease
- voiceover: "anyr puts your AnyRouter dashboard in the terminal."
- asset_candidates: none
- blueprint: kinetic-type-beats (Adapt)
- focal: the headline
- roles: prompt = the viewer's shell
- sfx: click-soft on dashboard
- status: animated

## Frame 2 — Models
- src: compositions/frames/02-models.html

- scene: terminal types `anyr models`; real rows print one by one (id, provider)
- duration: 5.5s
- transition_in: cut
- type: key_feature
- beat: relief
- voiceover: "anyr models lists every model ID in the catalog."
- asset_candidates: none
- blueprint: kinetic-type-beats (Adapt)
- focal: the printed list
- roles: list = the catalog
- sfx: click on models
- status: animated

## Frame 3 — Credits
- src: compositions/frames/03-usage.html

- scene: terminal types `anyr usage`; "Credits remaining  $134.49" prints, the amount in the accent on "credits"; "Lifetime used  $19.47" under it
- duration: 4.5s
- transition_in: cut
- type: key_feature
- beat: relief
- voiceover: "anyr usage shows the credits you have left."
- asset_candidates: none
- blueprint: stat-hit (Adapt)
- focal: the balance
- roles: balance = the answer
- sfx: click on usage, pop on credits
- status: animated

## Frame 4 — Keys
- src: compositions/frames/04-keys.html

- scene: terminal types `anyr keys list`; three real rows print (name, masked key, last used); the masks take the accent on "masked"
- duration: 5.5s
- transition_in: cut
- type: key_feature
- beat: trust
- voiceover: "anyr keys list shows your API keys, each one masked."
- asset_candidates: none
- blueprint: kinetic-type-beats (Adapt)
- focal: the key rows
- roles: masks = safe on screen
- sfx: click on keys
- status: animated

## Frame 5 — A new key
- src: compositions/frames/05-create.html

- scene: terminal types `anyr keys create ci-bot`; `Created "ci-bot":` prints, then the new key `sk-ar-v1-••••••••` in the accent
- duration: 4.5s
- transition_in: cut
- type: how_it_works
- beat: relief
- voiceover: "And anyr keys create makes a new one when you need it."
- asset_candidates: none
- blueprint: kinetic-type-beats (Adapt)
- focal: the new key line
- roles: key = the result
- sfx: click on create, pop on new
- status: animated

## Frame 6 — Close
- src: compositions/frames/06-close.html

- scene: "Models, credits and keys" then "from your terminal" in display type, alone; then the AnyRouter lockup and anyrouter.dev
- duration: 7.505s
- transition_in: cut
- type: cta
- beat: resolve
- voiceover: "Models, credits and keys, from your terminal. Start at anyrouter.dev."
- asset_candidates: assets/anyrouter-logo-black.svg
- blueprint: logo-assemble-lockup (Adapt)
- focal: AnyRouter lockup
- roles: mark = hero
- sfx: chime on Models, sparkle on Start
- status: animated
