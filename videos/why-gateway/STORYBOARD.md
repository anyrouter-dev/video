---
format: 1920x1080
duration: 33.006s
message: "One address and one key reach models from many providers. Switching models is a name, and a backup model answers when a provider fails."
arc: One address → The pile → The outage → Your SDK → Switch → Fallback → Close
audience: a developer calling LLMs from an app who has not used a gateway
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md` v3 "Monolith", shared with the explainer). White `bg` on every frame, `ink` and `muted` only. The `accent` burnt orange goes only on what just changed: the value that rolled in, the request on the wire. One ink card per moment. No green, no red: "Down" and "Provider error" are said in words, and the thing that stopped turns muted.
- **Type.** Geist for spoken words, Geist Mono for anything typed (URLs, keys, ids). Nothing a viewer must read below 36px. Kit: `tools/kit/` (the explainer's, linked), pasted by `node ../explainer/tools/kit.mjs .`.
- **Camera.** Every frame sits in a `.k-cam` that drifts in, so no frame holds still for more than 1.5s.
- **Cuts.** Every cut lands on a beat of the music (120 bpm, first beat 0.059s). Reveals land on the spoken word (ElevenLabs alignment in `audio_meta.json`).
- **Continuity.** The address `https://anyrouter.dev/api/v1` is the recurring object (Frames 1, 4, 7). Frames 5 and 6 share the model ids.
- **Honesty.** Only claims from BRIEF.md. Model ids on screen run on AnyRouter's own routes. No provider is named as the one that failed.
- **Negative list.** No gradients, glows, blur, noise, emoji, step-by-step setup. No `repeat` / `yoyo`, no randomness.
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait (1080x1920): content in y 200 to 1220 and x 60 to 960; captions own 1240 to 1480.
- **Two renditions.** Each frame carries its portrait layout under `@media (orientation: portrait)`; `shared/authoring/portrait.mjs` writes the 1080x1920 project.

## Frame 1 — One address
- src: compositions/frames/01-one-address.html

- scene: An ink card holds the address `https://anyrouter.dev/api/v1` and a redacted key; on "models from many providers" six provider chips rise under it
- duration: 3.559s
- transition_in: cut
- type: hook
- beat: promise
- voiceover: "One address and one key reach models from many providers."
- asset_candidates: assets/providers/deepseek.svg, assets/providers/moonshotai.svg, assets/providers/google.svg, assets/providers/openai.svg, assets/providers/nvidia.svg, assets/providers/minimax.svg
- blueprint: logo-assemble-lockup (Adapt)
- focal: the address card
- roles: chips = the providers behind it
- sfx: pop on address, click on key, whoosh on providers
- status: animated

## Frame 2 — The pile
- src: compositions/frames/02-pile.html

- scene: Three provider cards, OpenAI, Anthropic, Google; on each spoken word every card gains a pill, Key, then Bill, then SDK
- duration: 6s
- transition_in: cut
- type: problem
- beat: friction
- voiceover: "Without one, you juggle a key, a bill, and often an SDK for each provider."
- asset_candidates: assets/providers/openai.svg, assets/providers/anthropic.svg, assets/providers/google.svg
- blueprint: ui-callout (Adapt)
- focal: the three cards filling up
- roles: pills = the things you keep per provider
- sfx: click-soft on key, bill, SDK
- status: animated

## Frame 3 — The outage
- src: compositions/frames/03-outage.html

- scene: Your app joined by a wire to an unnamed provider; a request travels; on "down" the provider goes muted, "Down"; on "your app" the app goes muted too
- duration: 3.5s
- transition_in: cut
- type: problem
- beat: friction
- voiceover: "And when a provider goes down, it can take your app with it."
- asset_candidates: assets/fonts/geist.woff2
- blueprint: ui-callout (Adapt)
- focal: the app card
- roles: provider = any provider, unnamed
- sfx: error on down
- status: animated

## Frame 4 — Your SDK
- src: compositions/frames/04-your-sdk.html

- scene: Two code cards, the OpenAI SDK and the Anthropic SDK, each with its base URL on AnyRouter; each inks on its name; on "SDK stays" an ink badge "Your SDK stays"
- duration: 5s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "AnyRouter speaks the OpenAI and Anthropic formats, so your SDK stays."
- asset_candidates: assets/providers/openai.svg, assets/providers/anthropic.svg
- blueprint: ui-callout (Adapt)
- focal: the SDK card being named
- roles: base URL = the only change
- sfx: click on OpenAI and Anthropic, pop on stays
- status: animated

## Frame 5 — Switch
- src: compositions/frames/05-switch.html

- scene: The explainer's code card; the model line rolls from deepseek/deepseek-v4-flash to moonshotai/kimi-k2.6 to google/gemma-4-31b while the rest stays muted
- duration: 4s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "To switch models, change the model name. Nothing else."
- asset_candidates: assets/fonts/geist-mono.woff2
- blueprint: kinetic-type-beats (Adapt)
- focal: the model value
- roles: code card = the developer's own call
- sfx: click on each roll
- status: animated

## Frame 6 — Fallback
- src: compositions/frames/06-fallback.html

- scene: Two model cards, the model and its backup; on "fails" the first goes muted, "Provider error"; on "answers" the backup is the ink card, "200 OK"
- duration: 4.5s
- transition_in: cut
- type: key_feature
- beat: relief
- voiceover: "List a backup model, and if a provider fails, the backup answers."
- asset_candidates: assets/providers/deepseek.svg, assets/providers/moonshotai.svg
- blueprint: ui-callout (Adapt)
- focal: the backup card
- roles: first card = the model that failed
- sfx: pop on backup, error on fails, chime on answers
- status: animated

## Frame 7 — Close
- src: compositions/frames/07-close.html

- scene: "One address. One key. Many models." in headline type, line by line on the words; then the AnyRouter lockup and anyrouter.dev
- duration: 6.447s
- transition_in: cut
- type: cta
- beat: resolve
- voiceover: "One address, one key, many models. Start at anyrouter.dev."
- asset_candidates: assets/anyrouter-logo-black.svg
- blueprint: logo-assemble-lockup (Adapt)
- focal: AnyRouter lockup
- roles: mark = hero
- sfx: sparkle on Start
- status: animated
