---
format: 1920x1080
duration: 39.714s
message: "OpenRouter's free models stop at 50 requests a day. Share your OpenRouter key with AnyRouter's pool and your requests can go on through keys other members share."
arc: The wall → Add and share → What it does → Your app → What sharing means → Close
audience: a developer whose app or agent keeps hitting OpenRouter's free-model limit (HTTP 429)
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md`, shared with the explainer v2). White `bg` on every frame. `ink` for headlines and marks. `primary` burnt orange is the one accent per moment: your key, the value that just rolled in, the row the voice names. `free` green only means works / unchanged. `danger` only on the 429 and the spent quota.
- **Type.** Geist for spoken words, Geist Mono for anything typed (ids, URLs, keys). Nothing a viewer must read below 36px (URL pills 34px). Kit: `tools/kit/` (the explainer's, linked) pasted into each frame by `tools/kit.mjs`.
- **Camera.** Every frame sits in a `.k-cam` that pushes in slowly, so no frame holds still for more than 1.5s. The real pool page is punched in to its OpenRouter row, about 800 CSS px of page across the frame.
- **Cuts.** Every cut lands on a beat of the music (120 bpm, first beat 0.059s): `pad-voices.mjs --beat=0.5 --phase=0.059`. Reveals land on the spoken word (ElevenLabs alignment in `audio_meta.json`).
- **Continuity.** The redacted OpenRouter key pill `sk-or-v1-••••••••` is the recurring object (Frames 2, 3, 5). Frame 4 is the explainer's code card with its orange roll.
- **Honesty.** Only claims from BRIEF.md. No dashboard screen is faked: signed-in screens were never captured, so drawn app UI carries the "Illustration" badge. The pool table is the real capture of anyrouter.dev/pool. Never "unlimited", never "keeps going".
- **Negative list.** No gradients, glows, blur, noise, emoji, step-by-step setup. No `repeat` / `yoyo`, no randomness.
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait (1080x1920): content in y 200 to 1220 and x 60 to 960; captions own 1240 to 1480.
- **Two renditions.** Each frame carries its portrait layout under `@media (orientation: portrait)`; `shared/authoring/portrait.mjs` writes the 1080x1920 project.

## Frame 1 — The wall
- src: compositions/frames/01-wall.html

- scene: The OpenRouter mark and "Free models"; a daily meter counts requests up to 50, fills, turns red, and a "429 Too Many Requests" badge lands; "1,000 a day with $10 of credits" sits under it
- duration: 6.059s
- transition_in: cut
- type: problem
- beat: friction
- voiceover: "OpenRouter's free models stop you at 50 requests a day, until you buy ten dollars of credits."
- asset_candidates: assets/provider-openrouter.svg — OpenRouter mark
- blueprint: stat-hit (Adapt)
- focal: the 50 a day meter
- roles: 429 badge = the wall; credits line = the honest exception
- sfx: click-soft ticks, error on day
- status: animated

## Frame 2 — Add and share
- src: compositions/frames/02-add-share.html

- scene: The redacted OpenRouter key pill drops into an AnyRouter card; then the real anyrouter.dev/pool page, punched in to the OpenRouter row (74 keys), with a focus ring
- duration: 4s
- transition_in: cut
- type: how_it_works
- beat: relief
- voiceover: "Add your OpenRouter key to AnyRouter, and share it with the pool."
- asset_candidates: assets/anyrouter-pool.png — the real /pool page, captured 2026-10-18
- blueprint: ui-callout (Adapt)
- focal: the key, then the OpenRouter pool row
- roles: pool page = proof that members share keys
- sfx: pop on key, whoosh-short on share
- status: animated

## Frame 3 — What it does
- src: compositions/frames/03-reroute.html

- scene: A request goes to your key, which shows "Limit reached"; the same request takes another path to one of the keys other members share and comes back "200 OK"
- duration: 5.5s
- transition_in: cut
- type: how_it_works
- beat: relief
- voiceover: "When your account hits its limit, AnyRouter can send your requests through keys other members share."
- asset_candidates: assets/provider-openrouter.svg
- blueprint: ui-callout (Adapt)
- focal: the request moving to a shared key
- roles: your key = the wall; shared keys = the pool
- sfx: error on limit, ping on keys
- status: animated

## Frame 4 — Your app
- src: compositions/frames/04-your-app.html

- scene: The explainer's code card; the base URL and the key roll to AnyRouter's, and the model line `openrouter/free` gets an "Unchanged" badge
- duration: 7.5s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "In your app, use AnyRouter's address and an AnyRouter API key. Keep the model, openrouter/free."
- asset_candidates: none, typed code only
- blueprint: kinetic-type-beats (Adapt)
- focal: the two changing values, then the model id
- roles: code card = the developer's own file
- sfx: click on address and key, pop on model
- status: animated

## Frame 5 — What sharing means
- src: compositions/frames/05-sharing.html

- scene: Your OpenRouter account's daily quota; your requests and members' requests fill it side by side; the terms note lands; the "Share with pool" switch turns off, reads "Not shared", and members' share stops growing
- duration: 9s
- transition_in: cut
- type: key_feature
- beat: trust
- voiceover: "Sharing means members' requests run on your OpenRouter account and use its quota. Check that OpenRouter's terms allow it. You can stop any time."
- asset_candidates: assets/provider-openrouter.svg
- blueprint: ui-callout (Adapt)
- focal: the shared quota, then the switch
- roles: switch = you stay in control
- sfx: click on stop
- status: animated

## Frame 6 — Close
- src: compositions/frames/06-close.html

- scene: "Past 50 a day" and "when shared keys have room", then the AnyRouter lockup and anyrouter.dev
- duration: 7.655s
- transition_in: cut
- type: cta
- beat: resolve
- voiceover: "Free models, past 50 a day when shared keys have room. Start at anyrouter.dev."
- asset_candidates: none, the AnyRouter mark is inline SVG
- blueprint: logo-assemble-lockup (Adapt)
- focal: AnyRouter lockup
- roles: mark = hero
- sfx: sparkle on Start
- status: animated
