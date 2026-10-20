---
format: 1920x1080
duration: 32.296s
message: "AnyRouter now supports sign-in with AgentID. Your agent signs in from its own AgentMail inbox and gets its own AnyRouter account, with no form and no password."
arc: The sign-up → The button → One call → Signed in → First response → Close
audience: a developer who runs agents
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md` v3 "Monolith", shared with the explainer). White `bg` on every frame, `ink` and `muted` only. The `accent` burnt orange goes only on what just changed: the key being handed over, the AgentID button, the 202 line, the agent's own address, the agent's first words. One ink card or ink line per moment. No green, no red.
- **Type.** Geist for spoken words, Geist Mono for anything typed (commands, ids, URLs, JSON). Nothing a viewer must read below 36px. Kit: `tools/kit/` (the explainer's, linked), pasted by `node ../explainer/tools/kit.mjs .`.
- **Camera.** Every frame sits in a `.k-cam` that drifts, so no frame holds still for more than 1.5s.
- **Cuts.** Every cut lands on a beat of the music (120 bpm, first beat 0.059s): `pad-voices.mjs --beat=0.5 --phase=0.059`. Reveals land on the spoken word (ElevenLabs alignment in `audio_meta.json`).
- **Continuity.** The agent is the recurring object: its address `duyetbot@agentmail.to` is the inbox in the command (Frame 3), the account in the menu (Frame 4) and the owner of the key (Frame 5). The AgentID mark links Frames 2, 3 and 6.
- **Honesty.** Only claims from BRIEF.md. Every UI is redrawn in the kit from captured values. The auth token is truncated, keys are redacted. The first call shows `anyrouter/free` because that is what ran on the Free plan.
- **Negative list.** No gradients, glows, blur, noise, emoji, OAuth step diagrams. No `repeat` / `yoyo`, no randomness.
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait (1080x1920): content in y 200 to 1220 and x 60 to 960; captions own 1240 to 1480.
- **Two renditions.** Each frame carries its portrait layout under `@media (orientation: portrait)`.

## Frame 1 — The sign-up
- src: compositions/frames/01-signup.html

- scene: The headline "Your agent needs an account." Under it the usual way: a "You" chip beside a sign-up card (Email, Password ••••••••). On "person" You inks; on "password" the password dots take the accent. Frame 4 answers it with "No password".
- duration: 5.559s
- transition_in: cut
- type: problem
- beat: friction
- voiceover: "Your agent needs model access. Usually, a person signs up for it, with a password."
- asset_candidates: none, type only
- blueprint: kinetic-type-beats (Adapt)
- focal: the headline, then the password field
- roles: You = a person, the card = any sign-up form (generic, no product named)
- sfx: pop on access, click-soft on password
- status: animated

## Frame 2 — The button
- src: compositions/frames/02-button.html

- scene: AnyRouter's sign-in card redrawn from the live page: the AnyRouter mark, "Continue to AnyRouter", the AgentID button (with its mark) and the GitHub button, "or", "Email address or username", Continue. On "AgentID" the AgentID button is ringed and inks
- duration: 4s
- transition_in: cut
- type: how_it_works
- beat: relief
- voiceover: "Now agents can sign in to AnyRouter with AgentID."
- asset_candidates: assets/anyrouter-logo-black.svg, assets/agentid-mark.svg
- blueprint: ui-callout (Adapt)
- focal: the AgentID button
- roles: card = anyrouter.dev/sign-in, redrawn
- sfx: click on AgentID
- status: animated

## Frame 3 — One call
- src: compositions/frames/03-authorize.html

- scene: AgentID's waiting card redrawn: the AgentID mark → the AnyRouter mark, "Sign in to AnyRouter", "Waiting for your agent to authorize an inbox…", and "Expires in 4:56" counting down in real seconds. On "authorizes" the agent's terminal (ink card) rises with the real curl to `api.agentmail.to/v0/inboxes/…/authorize` and the truncated `auth_token`; on "inbox" the inbox resolves to `duyetbot@agentmail.to`, then the response `202` and "Authorization complete. Return to browser." types in
- duration: 5.5s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "The agent authorizes with one call, from its own AgentMail inbox."
- asset_candidates: assets/agentid-mark.svg, assets/anyrouter-logo-black.svg
- blueprint: ui-callout (Adapt)
- focal: the waiting card, then the terminal
- roles: card = auth.agentid.com, redrawn; terminal = the agent
- sfx: click-soft on authorizes, pop on inbox
- status: animated

## Frame 4 — Signed in
- src: compositions/frames/04-signed-in.html

- scene: The AnyRouter account menu redrawn: the avatar, "AgentMail", `duyetbot@agentmail.to` (accent as it arrives), the "Free" badge; under it a settings row "Password · No password (OAuth only)" inks on "no password"
- duration: 5s
- transition_in: cut
- type: key_feature
- beat: trust
- voiceover: "Seconds later, it is signed in to its own account, with no password."
- asset_candidates: none
- blueprint: ui-callout (Adapt)
- focal: the account, then the password row
- roles: menu = the agent's own account
- sfx: chime on signed, click-soft on password
- status: animated

## Frame 5 — First response
- src: compositions/frames/05-first-call.html

- scene: A code card, the agent's first call: key `sk-ar-v1-••••` ("agentid-film"), `"model": "anyrouter/free"`; on "first request" the reply "Hello! I'm here and ready to help." types in, in the accent; on "free" a `"cost": 0` line inks
- duration: 4.5s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "With its own key, its first request runs on the free tier."
- asset_candidates: none, typed JSON only
- blueprint: kinetic-type-beats (Adapt)
- focal: the reply
- roles: code card = the real request and response
- sfx: pop on first, click-soft on free
- status: animated

## Frame 6 — Close
- src: compositions/frames/06-close.html

- scene: The AgentID mark, an arrow, the AnyRouter mark (as on AgentID's own page), then "Sign in with AgentID" in display type; then anyrouter.dev
- duration: 7.737s
- transition_in: cut
- type: cta
- beat: resolve
- voiceover: "Give your agent its own AnyRouter account. Start at anyrouter.dev."
- asset_candidates: assets/agentid-mark.svg, assets/anyrouter-logo-black.svg
- blueprint: logo-assemble-lockup (Adapt)
- focal: the lockup
- roles: marks = hero
- sfx: chime on Give, sparkle on Start
- status: animated
