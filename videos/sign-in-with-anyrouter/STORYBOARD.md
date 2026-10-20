---
format: 1920x1080
duration: 33.356s
message: "Add a Sign in with AnyRouter button. Your users bring their own AnyRouter account, and their AI usage is billed to them, never to you."
arc: The bill → The button → Consent → The key → The call → Control → Close
audience: a developer building an app with AI features
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md` v3 "Monolith", shared with the explainer). White `bg` on every frame, `ink` and `muted` only. The `accent` burnt orange goes only on what just changed: "your bill", the billing line on the consent screen, the token's limits, the token that rolls into the code. One ink card or ink line per moment. No green, no red.
- **Type.** Geist for spoken words, Geist Mono for anything typed (ids, URLs, keys, JSON). Nothing a viewer must read below 36px. Kit: `tools/kit/` (the explainer's, linked), pasted by `node ../explainer/tools/kit.mjs .`.
- **Camera.** Every frame sits in a `.k-cam` that drifts, so no frame holds still for more than 1.5s.
- **Cuts.** Every cut lands on a beat of the music (120 bpm, first beat 0.059s): `pad-voices.mjs --beat=0.5 --phase=0.059`. Reveals land on the spoken word (ElevenLabs alignment in `audio_meta.json`).
- **Continuity.** The guide's sample app "My AI App" is the recurring object: its sign-in card (Frame 2), its name on the consent screen (Frame 3), its row in Connected apps (Frame 6). The redacted token `sk-ar-v1-••••` links Frames 4 and 5.
- **Honesty.** Only claims from BRIEF.md. The consent screen and Connected apps are redrawn in the kit from the product source, with real labels. The signed-in person is a placeholder, marked "Illustration". The model in the code runs on AnyRouter credits.
- **Negative list.** No gradients, glows, blur, noise, emoji, OAuth step diagrams. No `repeat` / `yoyo`, no randomness.
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait (1080x1920): content in y 200 to 1220 and x 60 to 960; captions own 1240 to 1480.
- **Two renditions.** Each frame carries its portrait layout under `@media (orientation: portrait)`.

## Frame 1 — The bill
- src: compositions/frames/01-bill.html

- scene: A row of five user avatars rises; under it the headline "Every user's requests," then "on your bill?", with "your bill" in the accent on "paying"
- duration: 4.059s
- transition_in: cut
- type: problem
- beat: friction
- voiceover: "Want AI in your app, without paying for every user's requests?"
- asset_candidates: none, type only
- blueprint: kinetic-type-beats (Adapt)
- focal: the headline
- roles: avatars = your users
- sfx: pop on AI, click-soft on every
- status: animated

## Frame 2 — The button
- src: compositions/frames/02-button.html

- scene: The guide's sample app, "My AI App", as a sign-in card; the "Sign in with AnyRouter" button (ink, AnyRouter mark) is the focal object; a pointer arrives and presses it
- duration: 3.5s
- transition_in: cut
- type: how_it_works
- beat: relief
- voiceover: "Add a Sign in with AnyRouter button."
- asset_candidates: assets/anyrouter-logo-black.svg
- blueprint: ui-callout (Adapt)
- focal: the button
- roles: card = your app
- sfx: whoosh-short on Sign, click on button
- status: animated

## Frame 3 — Consent
- src: compositions/frames/03-consent.html

- scene: The AnyRouter consent screen redrawn: My AI App's monogram joined to the AnyRouter mark, "My AI App wants to access your account", the permissions "Run AI requests" (with "Send prompts to models and bill the usage to your account.") and "View basic profile", both checked, then Cancel and Authorize. The billing line takes the accent on "billed"; Authorize is ringed and pressed at the end
- duration: 6.5s
- transition_in: cut
- type: how_it_works
- beat: trust
- voiceover: "Users approve on AnyRouter, and their usage is billed to their own credits or free tier."
- asset_candidates: assets/anyrouter-logo-black.svg
- blueprint: ui-callout (Adapt)
- focal: the billing permission, then Authorize
- roles: consent card = the real page, redrawn
- sfx: pop on approve, click on Authorize
- status: animated

## Frame 4 — The key
- src: compositions/frames/04-key.html

- scene: A code card, the token response: `access_token` "sk-ar-v1-••••", `scope` "inference read:profile", `expires_in` 2592000. On "temporary" the expiry line inks and a "30 days" badge lands; on "limited" the scope line inks and its two scopes take the accent
- duration: 5.5s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "Your app gets a temporary key, limited to AI requests and their profile."
- asset_candidates: none, typed JSON only
- blueprint: kinetic-type-beats (Adapt)
- focal: the expiry, then the scope
- roles: code card = what your callback receives
- sfx: pop on key, click-soft on limited
- status: animated

## Frame 5 — The call
- src: compositions/frames/05-call.html

- scene: The app's code card: `new OpenAI({ baseURL: "https://anyrouter.dev/api/v1", apiKey: … })`; the apiKey value rolls from `process.env.ANYROUTER_API_KEY` to `user.token`; the model line `moonshotai/kimi-k2.6` stays
- duration: 4s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "Use it like any AnyRouter API key."
- asset_candidates: none, typed code only
- blueprint: kinetic-type-beats (Adapt)
- focal: the apiKey value
- roles: code card = the developer's own file
- sfx: click on AnyRouter
- status: animated

## Frame 6 — Control
- src: compositions/frames/06-control.html

- scene: Connected apps redrawn from the dashboard: a row "My AI App" with the "Sign in" badge and "Disconnect"; on "revoke" Disconnect is pressed, the row leaves and "No apps connected yet." remains
- duration: 4s
- transition_in: cut
- type: key_feature
- beat: trust
- voiceover: "Users can revoke your app any time, from Connected apps."
- asset_candidates: none
- blueprint: ui-callout (Adapt)
- focal: the app row, then Disconnect
- roles: table = the user's own dashboard
- sfx: click on revoke
- status: animated

## Frame 7 — Close
- src: compositions/frames/07-close.html

- scene: "Their usage," and "their bill." in display type, alone; then the AnyRouter lockup and anyrouter.dev
- duration: 5.797s
- transition_in: cut
- type: cta
- beat: resolve
- voiceover: "Their usage, their bill. Start at anyrouter.dev."
- asset_candidates: none, the AnyRouter mark is the logo file
- blueprint: logo-assemble-lockup (Adapt)
- focal: AnyRouter lockup
- roles: mark = hero
- sfx: chime on Their, sparkle on Start
- status: animated
