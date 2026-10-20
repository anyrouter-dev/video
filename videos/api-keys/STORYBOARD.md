---
format: 1920x1080
duration: 31.799s
message: "Give each app its own AnyRouter API key: name it, add the limits you want, save it once, and disable it in one click when you are done."
arc: One key per app → Name and limits → Shown once → Your app → Turn it off → Close
audience: a developer about to put AnyRouter in an app
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md` v3 "Monolith"). White `bg`, `ink` and `muted` only. The `accent` goes only on what just changed: a limit's value as it turns on, "Copied", the base URL, the new status. One ink card per moment.
- **Type.** Geist for words, Geist Mono for keys, URLs and code. Nothing a viewer must read below 36px.
- **Camera.** Every frame sits in a `.k-cam` that drifts in, so no frame holds still more than 1.5s.
- **Cuts.** Every cut lands on a beat (120 bpm, first beat 0.059s). Reveals land on the spoken word.
- **Continuity.** The key `web-prod` is the recurring object: named in Frame 2, revealed in 3, used in 4, disabled in 5.
- **Honesty.** Only claims from BRIEF.md. Dashboard surfaces are redrawn with their real labels; keys are redacted.
- **Negative list.** No gradients, glows, blur, emoji, step-by-step clicks, no "unlimited".
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait: content in y 200 to 1220; captions own 1240 to 1480.

## Frame 1 — One key per app
- src: compositions/frames/01-per-app.html

- scene: Three key cards rise, web-prod, mobile-prod, batch-prod, each with its redacted key; web-prod is the ink card
- duration: 3.559s
- transition_in: cut
- type: hook
- beat: promise
- voiceover: "Give each app its own AnyRouter API key."
- asset_candidates: none
- blueprint: kinetic-type-beats (Adapt)
- focal: the three keys
- roles: cards = one key per app
- sfx: pop on app, click-soft on key
- status: animated

## Frame 2 — Name and limits
- src: compositions/frames/02-limits.html

- scene: The create form redrawn: Key name web-prod; Expiration rolls from Never to 30 days; the Rate limit switch turns on with 60 requests/minute; the Credit limit switch turns on with $10.00 · monthly
- duration: 6.5s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "Name it, then add any limits you want: an expiry date, a rate limit, a spending cap."
- asset_candidates: none
- blueprint: ui-callout (Adapt)
- focal: each limit as it is named
- roles: form = the real create form, redrawn
- sfx: click on expiry, rate and cap
- status: animated

## Frame 3 — Shown once
- src: compositions/frames/03-shown-once.html

- scene: "Your new API key", the redacted key, Copy rolls to Copied, the shown-once line
- duration: 4.5s
- transition_in: cut
- type: how_it_works
- beat: trust
- voiceover: "The full key is shown once. Copy it and store it somewhere safe."
- asset_candidates: none
- blueprint: ui-callout (Adapt)
- focal: the key and its Copy button
- roles: card = the real reveal
- sfx: click on Copy
- status: animated

## Frame 4 — Your app
- src: compositions/frames/04-your-app.html

- scene: The code card app.ts; the apiKey line is inked, then the baseURL line with AnyRouter's address in the accent
- duration: 5.5s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "In your app, set it as your API key, with AnyRouter's address."
- asset_candidates: none
- blueprint: kinetic-type-beats (Adapt)
- focal: the two lines that matter
- roles: code card = the developer's own file
- sfx: click on key, click on address
- status: animated

## Frame 5 — Turn it off
- src: compositions/frames/05-disable.html

- scene: The key's status band: web-prod, Enabled, "Active · accepting requests", Disable key; the button is pressed and the chip rolls to Disabled, the line to "Disabled · requests are rejected"
- duration: 6.5s
- transition_in: cut
- type: key_feature
- beat: control
- voiceover: "If a key leaks or you stop using it, disable it in one click. Its requests are then rejected."
- asset_candidates: none
- blueprint: ui-callout (Adapt)
- focal: the Disable key button, then the status
- roles: band = the real key page, redrawn
- sfx: click on click
- status: animated

## Frame 6 — Close
- src: compositions/frames/06-close.html

- scene: "One key per app." in display type, alone; then the AnyRouter lockup and anyrouter.dev
- duration: 5.24s
- transition_in: cut
- type: cta
- beat: resolve
- voiceover: "One key per app. Start at anyrouter.dev."
- asset_candidates: none
- blueprint: logo-assemble-lockup (Adapt)
- focal: AnyRouter lockup
- roles: mark = hero
- sfx: chime on One, sparkle on Start
- status: animated
