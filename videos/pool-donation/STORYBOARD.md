---
format: 1920x1080
duration: 35.17s
message: "Share a provider key you don't fully use with the AnyRouter pool. Members' requests can run through it, and you get Go free, $4 of credit a month and 5% back. It uses your provider quota, so check your provider's terms, and you can stop any time."
arc: The idle key → Donate → What members get → What you get → What it costs → Stop → Close
audience: someone with a provider API key whose quota sits idle
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md` v3 "Monolith", shared with the explainer). White `bg` on every frame, `ink` and `muted` only. The `accent` burnt orange goes only on what just changed: the unused quota, the switch turning on, the value the voice names, "Not shared". One ink card per moment. No green, no red.
- **Type.** Geist for spoken words, Geist Mono for anything typed (keys). Nothing a viewer must read below 36px. Kit: `tools/kit/` (the explainer's, linked), pasted by `node ../explainer/tools/kit.mjs .`.
- **Camera.** Every frame sits in a `.k-cam` that drifts, so no frame holds still for more than 1.5s.
- **Cuts.** Every cut lands on a beat of the music (120 bpm, first beat 0.059s): `pad-voices.mjs --beat=0.5 --phase=0.059`. Reveals land on the spoken word.
- **Continuity.** The redacted key pill `sk-••••••••` is the recurring object (Frames 1, 2, 3, 5). The provider is generic ("Your provider"), never a named one.
- **Honesty.** Only claims from BRIEF.md. The Add key option rows and the share switch are redrawn from the dashboard source with their real labels. The quota meters are drawn and carry the "Illustration" badge. The Go caveat (turning off your last shared key pauses Go) is on screen where the voice says you can stop.
- **Negative list.** No gradients, glows, blur, noise, emoji, step-by-step setup. No `repeat` / `yoyo`, no randomness.
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait (1080x1920): content in y 200 to 1220 and x 60 to 960; captions own 1240 to 1480.
- **Two renditions.** Each frame carries its portrait layout under `@media (orientation: portrait)`.

## Frame 1 — The idle key
- src: compositions/frames/01-idle.html

- scene: A card "Your provider" with the key pill `sk-••••••••` and a quota bar labelled "Quota used today": a short ink fill, the long unused rest outlined in the accent on "don't use"; on "Share" the card slides left and an ink "AnyRouter pool" card arrives on the right, joined by an arrow
- duration: 5.059s
- transition_in: cut
- type: problem
- beat: friction
- voiceover: "Have a provider key with quota you don't use? Share it with the AnyRouter pool."
- asset_candidates: assets/anyrouter-logo-black.svg
- blueprint: ui-callout (Adapt)
- focal: the unused quota, then the pool card
- roles: provider card = your key
- sfx: pop on key, whoosh-short on Share
- status: animated

## Frame 2 — Donate
- src: compositions/frames/02-donate.html

- scene: The Add key form's options redrawn from the dashboard: the API key field holding `sk-••••••••`, the "Enabled" row (on), and the "Donate to the shared pool" row with its hint "Earn 5% credits back when others route through this key."; its switch turns on on "Donate"
- duration: 4s
- transition_in: cut
- type: how_it_works
- beat: relief
- voiceover: "Add the key, and turn on Donate to the shared pool."
- asset_candidates: none
- blueprint: ui-callout (Adapt)
- focal: the donate switch
- roles: form = the real one, redrawn
- sfx: pop on key, click on Donate
- status: animated

## Frame 3 — What members get
- src: compositions/frames/03-members.html

- scene: Your key card in the middle; requests from three pool members arrive and run through it ("Pool members"); on "yours" your own request takes the lead and the card marks it "First"
- duration: 5s
- transition_in: cut
- type: how_it_works
- beat: relief
- voiceover: "Pool members' requests can then run through it, and yours always come first."
- asset_candidates: none
- blueprint: ui-callout (Adapt)
- focal: the key card and the lanes into it
- roles: lanes = who uses the key
- sfx: ping on run, click-soft on first
- status: animated

## Frame 4 — What you get
- src: compositions/frames/04-rewards.html

- scene: Three cards in a row: "Go plan" / "Free"; "$4" / "credit a month"; "5% back" / "8% on Pro and Max". Each turns ink on its word; "Up to $1 per key a day" sits under the row
- duration: 6.5s
- transition_in: cut
- type: key_feature
- beat: reward
- voiceover: "You get the Go plan free, with four dollars of credit a month, and five percent back on what your key serves."
- asset_candidates: none
- blueprint: stat-cards (Adapt)
- focal: the card being named
- roles: cards = what the owner gets
- sfx: pop on Go, pop on four, pop on five
- status: animated

## Frame 5 — What it costs
- src: compositions/frames/05-cost.html

- scene: Two beats. "Your provider quota" bar filled by your requests (muted) and members' requests (ink), with the "Illustration" badge; then "Check that your provider's terms allow sharing." alone, large
- duration: 6s
- transition_in: cut
- type: key_feature
- beat: trust
- voiceover: "Those requests use your provider quota. Check that your provider's terms allow sharing."
- asset_candidates: none
- blueprint: ui-callout (Adapt)
- focal: the members' share of the quota, then the terms line
- roles: quota bar = what sharing uses
- sfx: click-soft on quota, pop on Check
- status: animated

## Frame 6 — Stop
- src: compositions/frames/06-stop.html

- scene: The saved key's switch, large: "Shared" turns off on "off" and reads "Not shared" in the accent; under it, muted, "Turning off your last shared key pauses Go."
- duration: 3s
- transition_in: cut
- type: key_feature
- beat: trust
- voiceover: "You can turn it off any time."
- asset_candidates: none
- blueprint: ui-callout (Adapt)
- focal: the switch
- roles: switch = you stay in control
- sfx: click on off
- status: animated

## Frame 7 — Close
- src: compositions/frames/07-close.html

- scene: "Share a spare key." in display type, alone; then the AnyRouter lockup and anyrouter.dev
- duration: 5.611s
- transition_in: cut
- type: cta
- beat: resolve
- voiceover: "Share a spare key. Start at anyrouter.dev."
- asset_candidates: none, the AnyRouter mark is the logo file
- blueprint: logo-assemble-lockup (Adapt)
- focal: AnyRouter lockup
- roles: mark = hero
- sfx: chime on Share, sparkle on Start
- status: animated
