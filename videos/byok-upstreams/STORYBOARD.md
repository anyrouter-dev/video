---
format: 1920x1080
duration: 30.542s
message: "Add your own provider keys once, then call their models through one AnyRouter endpoint, billed on your own provider accounts with no AnyRouter markup."
arc: Your keys, one endpoint → Add each key once → One key calls them → Your account → No markup → Close
audience: a developer who already pays one or more model providers
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md` v3 "Monolith", shared with the explainer). White `bg` on every frame, `ink` and `muted` only. The `accent` burnt orange goes only on what just changed: the key that fills in, the value that rolled, the request on the wire. One ink card per moment. No green, no red.
- **Type.** Geist for spoken words, Geist Mono for anything typed (URLs, keys, ids). Nothing a viewer must read below 36px. Kit: `tools/kit/` (the explainer's, linked), pasted by `node ../explainer/tools/kit.mjs .`.
- **Camera.** Every frame sits in a `.k-cam` that drifts in, so no frame holds still for more than 1.5s.
- **Cuts.** Every cut lands on a beat of the music (120 bpm, first beat 0.059s). Reveals land on the spoken word (ElevenLabs alignment in `audio_meta.json`).
- **Continuity.** The four provider marks (OpenAI, Anthropic, Google, OpenRouter) recur in Frames 1 and 2; the address `https://anyrouter.dev/api/v1` in Frames 1 and 3.
- **Honesty.** Only claims from BRIEF.md. Model ids on screen are BYOK-only and each says it runs on your key. Keys are redacted.
- **Negative list.** No gradients, glows, blur, noise, emoji, step-by-step setup. No `repeat` / `yoyo`, no randomness.
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait (1080x1920): content in y 200 to 1220 and x 60 to 960; captions own 1240 to 1480.
- **Two renditions.** Each frame carries its portrait layout under `@media (orientation: portrait)`; `shared/authoring/portrait.mjs` writes the 1080x1920 project.

## Frame 1 — Your keys, one endpoint
- src: compositions/frames/01-keys-endpoint.html

- scene: Four redacted provider keys on the left, each with its mark; on "one endpoint" wires draw from each key to one ink card holding `https://anyrouter.dev/api/v1`
- duration: 4.059s
- transition_in: cut
- type: hook
- beat: promise
- voiceover: "Bring your own provider keys, and call their models through one endpoint."
- asset_candidates: assets/providers/openai.svg, assets/providers/anthropic.svg, assets/providers/google.svg, assets/providers/openrouter.svg
- blueprint: logo-assemble-lockup (Adapt)
- focal: the endpoint card
- roles: keys = yours
- sfx: pop on keys, whoosh on endpoint
- status: animated

## Frame 2 — Add each key once
- src: compositions/frames/02-add-once.html

- scene: Four provider cards with their real API key field placeholders; as the voice names each provider its field fills with a redacted key and the card inks; "and many more" arrives as a chip
- duration: 6s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "Add each key once. OpenAI, Anthropic, Google, OpenRouter, and many more."
- asset_candidates: assets/providers/openai.svg, assets/providers/anthropic.svg, assets/providers/google.svg, assets/providers/openrouter.svg
- blueprint: ui-callout (Adapt)
- focal: the card being named
- roles: field = the key you paste once
- sfx: click-soft on each provider, pop on more
- status: animated

## Frame 3 — One key calls them
- src: compositions/frames/03-one-key.html

- scene: A code card: base URL on AnyRouter, the AnyRouter key, and the model; the model rolls openai/gpt-5.5 → anthropic/claude-sonnet-5-5 → google/gemini-3.5-flash, with a comment that rolls to the key it runs on
- duration: 5s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "Then one AnyRouter key calls them all. Change the model name to switch."
- asset_candidates: assets/fonts/geist-mono.woff2
- blueprint: kinetic-type-beats (Adapt)
- focal: the key line, then the model value
- roles: comment = which of your keys runs it
- sfx: click on key, click on each roll
- status: animated

## Frame 4 — Your account
- src: compositions/frames/04-your-account.html

- scene: Your app → AnyRouter → your Anthropic account; a request runs along the wire; the account card inks and on "price" a badge says "Billed by Anthropic"
- duration: 4s
- transition_in: cut
- type: key_feature
- beat: trust
- voiceover: "Requests run on your provider account, at that provider's price."
- asset_candidates: assets/providers/anthropic.svg, assets/anyrouter-logo-black.svg
- blueprint: ui-callout (Adapt)
- focal: your account card
- roles: AnyRouter = passes it on
- sfx: whoosh on run, pop on price
- status: animated

## Frame 5 — No markup
- src: compositions/frames/05-no-markup.html

- scene: "$0" in hero type, "AnyRouter markup and fees on BYOK"; on "every plan" a row of the five plans, Free inked on "Free"
- duration: 5.5s
- transition_in: cut
- type: key_feature
- beat: trust
- voiceover: "AnyRouter adds no markup and no fee, on every plan, Free included."
- asset_candidates: assets/fonts/geist.woff2
- blueprint: stat-hit (Adapt)
- focal: $0
- roles: plans = every plan
- sfx: ping on markup, click-soft on plan, pop on Free
- status: animated

## Frame 6 — Close
- src: compositions/frames/06-close.html

- scene: "Your keys." and "One endpoint." in headline type on the words; then the AnyRouter lockup and anyrouter.dev
- duration: 5.983s
- transition_in: cut
- type: cta
- beat: resolve
- voiceover: "Your keys, one endpoint. Start at anyrouter.dev."
- asset_candidates: assets/anyrouter-logo-black.svg
- blueprint: logo-assemble-lockup (Adapt)
- focal: AnyRouter lockup
- roles: mark = hero
- sfx: sparkle on Start
- status: animated
