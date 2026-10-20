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

- **Palette system** (from `frame.md` v3 "Monolith", shared with the explainer). White `bg` on every frame, `ink` and `muted` only. The `accent` burnt orange goes only on what just changed: the key that rolls in, the value that just rolled, the moving request, "Not shared". One ink card per moment for the focused thing. No green, no red: "Limit reached" and 429 are said in words, the spent thing turns muted and the 429 is inked.
- **Type.** Geist for spoken words, Geist Mono for anything typed (ids, URLs, keys). Nothing a viewer must read below 36px (URL pills 34px). Kit: `tools/kit/` (the explainer's, linked) pasted into each frame by the explainer's `tools/kit.mjs` (`node ../explainer/tools/kit.mjs .`).
- **Camera.** Every frame sits in a `.k-cam` that pushes in slowly, so no frame holds still for more than 1.5s. 
- **Cuts.** Every cut lands on a beat of the music (120 bpm, first beat 0.059s): `pad-voices.mjs --beat=0.5 --phase=0.059`. Reveals land on the spoken word (ElevenLabs alignment in `audio_meta.json`).
- **Continuity.** The redacted OpenRouter key pill `sk-or-v1-••••••••` is the recurring object (Frames 2, 3, 5). Frame 4 is the explainer's code card with its orange roll.
- **Honesty.** Only claims from BRIEF.md. No dashboard screen is faked: signed-in screens were never captured, so drawn app UI carries the "Illustration" badge. anyrouter.dev UI is redrawn in the kit from real values (the signed-in captures are reference only); no site screenshot is embedded. Never "unlimited", never "keeps going".
- **Negative list.** No gradients, glows, blur, noise, emoji, step-by-step setup. No `repeat` / `yoyo`, no randomness.
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait (1080x1920): content in y 200 to 1220 and x 60 to 960; captions own 1240 to 1480.
- **Two renditions.** Each frame carries its portrait layout under `@media (orientation: portrait)`; `shared/authoring/portrait.mjs` writes the 1080x1920 project.

## Frame 1 — The wall
- src: compositions/frames/01-wall.html

- scene: The OpenRouter mark and "Free models"; a daily meter counts requests up to 50 and fills; on "day" the count and the meter go muted and an ink "429 Too Many Requests" badge lands; "1,000 a day once you buy $10 of credits" sits under it
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

- scene: The Add key dialog redrawn from the real one: OpenRouter, the sk-or-... field takes a redacted key, "Keys are encrypted at rest", key routing "Free models only" (32 routed) picked over "All models" (198 routed, paid SKUs bill your OpenRouter account), "Donate to the shared pool" turns on, Add key
- duration: 4s
- transition_in: cut
- type: how_it_works
- beat: relief
- voiceover: "Add your OpenRouter key to AnyRouter, and share it with the pool."
- asset_candidates: assets/provider-openrouter.svg; reference only: shared/captures/2026-10-19/screens/signed-in/byok-add-openrouter-key.png, byok-openrouter-key-routing.png
- blueprint: ui-callout (Adapt)
- focal: the key field, then the share switch
- roles: dialog = the real form, redrawn in the kit
- sfx: pop on key, click on AnyRouter, whoosh-short on share, click-soft on pool
- status: animated

## Frame 3 — What it does
- src: compositions/frames/03-reroute.html

- scene: Your app and AnyRouter on top, your account and the keys members share below, joined by wires. The request travels on the wires, under the cards, to your account, which goes muted and says "Limit reached"; AnyRouter is inked and sends it to a key another member shares, which is inked; it comes back to your app, "200 OK"
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

- scene: Three beats. Your OpenRouter account's daily quota, filled by your requests (muted) and members' requests (ink); then "Check that OpenRouter's terms allow sharing." on its own, with the Free plan note; then the "Share with pool" switch, large, turns off and reads "Not shared"
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

- scene: "Free models", "Past 50 a day" in display type and "when shared keys have room", alone; then the AnyRouter lockup and anyrouter.dev
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
