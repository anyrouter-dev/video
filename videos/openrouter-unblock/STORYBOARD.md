---
format: 1920x1080
duration: 62s
message: "Your OpenRouter free models stop at OpenRouter's limit. Add the same key to AnyRouter and turn on the pool, and your requests keep going."
arc: The wall → Why → The fix → Step 1 → Step 2 → Step 3 → How it works → Close
audience: someone already using OpenRouter's free models, technical or not
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md`, shared with the explainer). White `bg` on every frame. `ink` for headlines and marks. `primary` burnt orange is the one accent per moment: your key, the active step, the button being pressed. `free` green only means works / 200 OK / free. `danger` only on `429 Too Many Requests` and the limit tick. The request log in Frame 1 is the one dark surface (the shared `terminal` component).
- **Type.** Geist for spoken words, Geist Mono for anything typed (ids, URLs, keys, status codes, step numbers). Sentence case. Nothing below 24px, including inside rebuilt UI: show a zoomed crop of the UI region, never a whole page shrunk.
- **Rebuilt UI.** AnyRouter dashboard screens are rebuilt in HTML from the product source with exact labels (`tools/ui-labels.md` is the source; the packet repeats every label a frame needs). OpenRouter's Keys page is a clean reconstruction labelled as OpenRouter's UI. Real screenshots (`openrouter-home.png`, `anyrouter-pool.png`) sit in the shared browser frame.
- **Browser frame geometry (Frames 4, 5, 6).** One card at x 384, y 164, width 1152, height 700 (top bar 52, content 1152×648). Identical in all three so cuts between steps do not jump.
- **Step rail (Frames 3–6).** The shared component, labels `Create a key`, `Add it to AnyRouter`, `Share with the pool`. Each frame starts in the previous frame's end state and changes on its own cue.
- **Motion grammar.** `power3.out` entrances, `power2.inOut` moves. Every piece reveals on its spoken word (each worker has its word times). Holds stay still. No bounce, no `repeat` / `yoyo`, no randomness, no CSS animation.
- **Continuity spine.** The redacted key pill `sk-or-v1-••••••••••••` is the recurring object: born in Frame 2 as "one key", carried into AnyRouter in Frame 3, created in Frame 4, pasted in Frame 5, shared in Frame 6, and the first stop of every request in Frame 7.
- **Rhythm.** Busy: 1 (errors stack), 7 (fan-out). Breather: 2 and 8. Steps 4–6 walk at a steady cursor pace.
- **Redaction.** Every key on screen is a key pill with bullets. Never a real key.
- **Claims.** Every number on screen is in BRIEF.md's claims ledger (20 / minute, 50 / day, 1000 / day with $10 of credits, 429, 200, 74 keys, 2400 / minute, 5% / 8%). No other numbers, no counters, no model counts on provider chips. Never "unlimited".
- **Negative list.** No gradients, glows, bokeh, noise, dither, halftone, neon, emoji. No front-load-then-freeze. No screensaver float. Do not imitate the repo's older films.
- **Caption band.** Nothing below y 880 in any frame.

## Frame 1 — The wall
- src: compositions/frames/01-wall.html

- scene: A request log to an OpenRouter free model: 200 OK lines, then 429 Too Many Requests stacks up; a plain definition of rate limit; OpenRouter's 20 a minute, 50 a day
- duration: 11.728s
- transition_in: cut
- type: problem
- beat: frustration
- voiceover: "You're using OpenRouter's free models. Then the errors start. Too many requests. That's a rate limit: a cap on how many requests one key can send. Twenty a minute. Fifty a day."
- asset_candidates: assets/provider-openrouter.svg — OpenRouter mark for the log's title bar
- blueprint: overwhelm-surround (Adapt)
- focal: the request log
- roles: provider-openrouter.svg = small mark in the terminal title bar
- sfx: error ×3 on the first 429 lines
- status: outline

Adapt: the overwhelm is a log filling with red lines, not a crowd of objects.
Scene 1 (0.0–2.4s): "OpenRouter's free models" — the shared `terminal` card rises into place centred (x 290, y 150, 1340×600), title `~/my-app` with the OpenRouter mark at right. Request lines print one by one, each `POST /api/v1/chat/completions  openrouter/free  → 200 OK` with `200 OK` in success green. Four lines.
Scene 2 (2.4–4.6s): "the errors start. Too many requests." — the next lines print faster and read `→ 429 Too Many Requests` in a light red (`#F87171`, legible on the dark card); on "Too many requests" the 429 lines stack until the log scrolls (older lines push up and out of the body). → dynamic-content-sequencing
Scene 3 (4.6–8.0s): "That's a rate limit" — the terminal glides left and scales to ~0.62 (left edge stays inside x 120); on the right a white `card` rises: eyebrow `Rate limit`, body-lg `A cap on how many requests one key can send.` → anchored-layout-expand
Scene 4 (8.0–end): "Twenty a minute. Fifty a day." — under the definition, two stats land on their words: `20` + `requests a minute`, then `50` + `requests a day` (stat type, ink). Below them in muted 24px: `OpenRouter's free-model limits · 1000 a day with $10 of credits`. Hold. → counting-dynamic-scale (no count-up; a clean scale-in to the final value)

## Frame 2 — Why
- src: compositions/frames/02-one-key.html

- scene: One redacted key, one meter that fills to its limit and turns red; "One key. One limit."
- duration: 3.237s
- transition_in: crossfade
- type: problem
- beat: understanding
- voiceover: "The reason is simple. One key means one limit."
- asset_candidates: assets/provider-openrouter.svg — OpenRouter mark on the key pill
- blueprint: titlecard-reveal (Adapt)
- focal: the key pill and its meter
- roles: provider-openrouter.svg = key pill glyph
- sfx: none
- status: outline

Scene 1 (0.0–1.4s): "The reason is simple" — the key pill `sk-or-v1-••••••••••••` (shared component, glyph = OpenRouter mark in `muted`) fades up centred at (960, 430). Under it a 640×14 meter track (radius 7, `surface-2`) whose fill grows `ink-2` from 0 to full; a `danger` limit tick sits at its right end with a label `limit` (24px, danger). The fill reaching the tick turns `danger`. → stat-bars-and-fills
Scene 2 (1.4–end): "One key means one limit." — h1 `One key. One limit.` reveals above the pill in two phrases on "One key" and "one limit". Hold.
handoff_out: key pill centred at (960, 430), scale 1, opacity 1, still. The meter and headline fade out over the last 0.3s; the pill does not.

## Frame 3 — The fix
- src: compositions/frames/03-the-fix.html

- scene: The same key moves into AnyRouter; a shared pool of keys from other members gathers behind it; the real pool page shows 74 OpenRouter keys; the step rail appears
- duration: 6.416s
- transition_in: cut
- type: product_intro
- beat: relief
- voiceover: "AnyRouter takes that same key, and backs it with a shared pool of keys from other members. Three steps."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter monogram and wordmark; assets/anyrouter-pool.png — real anyrouter.dev/pool page: OpenRouter Free 74 keys 1.2B tokens, NVIDIA NIM 33 keys; assets/provider-openrouter.svg — OpenRouter mark
- blueprint: constellation-hub (Adapt)
- focal: your key inside AnyRouter, backed by the pool
- roles: anyrouter-logo-black.svg = card header; anyrouter-pool.png = evidence in a small browser frame; provider-openrouter.svg = key glyphs
- sfx: whoosh-short on the key move, pop on the pool fill
- status: outline

handoff_in: key pill centred at (960, 430), scale 1, opacity 1, still (Frame 2's end).
Adapt: the hub is a card, the satellites are key pills that gather behind your key.
Scene 1 (0.0–2.2s): "AnyRouter takes that same key" — an AnyRouter card (white `card`, AnyRouter logo at top, ~620×420, centred at x 600, y 520) rises; the key pill glides into its top slot, its glyph turns `primary`, label `Your key` (24px, primary) beside it. → card-morph-anchor
Scene 2 (2.2–5.4s): "backs it with a shared pool of keys from other members" — inside the card under your key, a row label `Shared pool` (eyebrow) and a 3×4 grid of small muted key pills (`sk-or-v1-••••`, 0.7 scale) cascade in. On "other members" a browser frame (URL `anyrouter.dev/pool`, 760 wide) slides in on the right showing `anyrouter-pool.png` cropped to the table; the OpenRouter row gets a soft `primary-tint` highlight and a callout chip `OpenRouter · 74 keys in the pool` points at it. → waterfall-entry
Scene 3 (5.4–end): "Three steps." — the card and browser frame ease down ~40px; the step rail draws on at top (shared component, all three steps `todo`). Hold.
handoff_out: step rail at its shared position (centred, top y 72), all three steps todo, opacity 1, still. Everything else holds.

## Frame 4 — Step 1: create the key on OpenRouter
- src: compositions/frames/04-step-1-key.html

- scene: Real openrouter.ai, then OpenRouter's Keys page: cursor clicks Create Key, a redacted sk-or- key appears and is copied
- duration: 5.392s
- transition_in: cut
- type: tutorial_step
- beat: doing
- voiceover: "Step one. On open router dot A. I., open Keys, click Create Key, and copy it."
- asset_candidates: assets/openrouter-home.png — real openrouter.ai home, light, purple Get API Key button; assets/provider-openrouter.svg — OpenRouter mark
- blueprint: cursor-ui-demo (Adapt)
- focal: the Create Key button, then the new key row
- roles: openrouter-home.png = screenshot in the browser frame; provider-openrouter.svg = Keys panel header mark
- sfx: click on Create Key, click on Copy
- status: outline

handoff_in: step rail centred top y 72, all todo, opacity 1, still.
Step rail: at 0.2s step 1 becomes active.
Scene 1 (0.0–1.6s): "On openrouter.ai" — the browser frame (shared geometry, URL `openrouter.ai`) rises with the real home screenshot.
Scene 2 (1.6–2.8s): "open Keys" — velocity-matched slide to a clean reconstructed Keys panel in the same frame (URL `openrouter.ai/keys`), shown zoomed so text is ≥24px: OpenRouter mark, title `API Keys`, an empty list, a button `Create Key` (OpenRouter purple `#6D28D9`, white text). Small muted note under the frame top-right: `OpenRouter's site`.
Scene 3 (2.8–4.2s): "click Create Key" — the cursor glides to `Create Key`, press + ripple; a new row appears with the key pill `sk-or-v1-••••••••••••` and a `Copy` button. → cursor-click-ripple
Scene 4 (4.2–end): "copy it" — cursor clicks `Copy`; a small toast `Copied` in free green; the key pill lifts out of the row to a parked spot at centre (960, 790), scale 1, small shadow. Hold.
handoff_out: step rail with step 1 active; browser frame at shared geometry; key pill centred at (960, 790), scale 1, opacity 1, still.

## Frame 5 — Step 2: add it to AnyRouter
- src: compositions/frames/05-step-2-add.html

- scene: The rebuilt AnyRouter BYOK page: Add a provider → OpenRouter → paste the key into API key → Test key → Key valid → Add key → Key verified and saved
- duration: 9.232s
- transition_in: cut
- type: tutorial_step
- beat: doing
- voiceover: "Step two. In AnyRouter, open B. Y. O. K., pick OpenRouter, and paste your key. AnyRouter checks it with one live call, then adds it."
- asset_candidates: assets/provider-openrouter.svg — OpenRouter mark; assets/anyrouter-logo-black.svg — AnyRouter mark
- blueprint: cursor-ui-demo (Adapt)
- focal: the API key field, then the Key verified and saved dialog
- roles: provider-openrouter.svg = provider chip and form header logo
- sfx: click on the OpenRouter chip, click on Test key, click on Add key, chime on "Key verified and saved"
- status: outline

handoff_in: step rail with step 1 active; browser frame at shared geometry; key pill centred at (960, 790), scale 1, opacity 1, still.
Step rail: at 0.2s step 1 becomes done and step 2 active.
Scene 1 (0.0–1.8s): "In AnyRouter, open BYOK" — the browser frame content swaps to the rebuilt dashboard (URL `anyrouter.dev/dashboard/byok`), zoomed: H1 `BYOK & Shared Pool`, then the `Add a provider` panel with a 2-column chip grid showing `OpenRouter` (sparkle in primary = free tier) and `NVIDIA NIM`, no model counts. The key pill drifts to a parked spot at the frame's lower right (inside the card, clear of the chips).
Scene 2 (1.8–3.4s): "pick OpenRouter" — cursor clicks the `OpenRouter` chip; the panel swaps to the add-key form: header logo + `OpenRouter` + grey badge `Free tier`, under it `https://openrouter.ai/api/v1` (mono, muted); section `Source details`; field label `API key` with placeholder `sk-or-...`; status chip `Not tested` (outline). → cursor-click-ripple
Scene 3 (3.4–5.0s): "paste your key" — the parked key pill flies into the `API key` field and lands as its value `sk-or-v1-••••••••••••`.
Scene 4 (5.0–end): "checks it with one live call, then adds it" — action bar at the bottom of the form: ghost `Cancel`, outline `Test key`, primary (ink) `Add key`. Cursor clicks `Test key` → it reads `Checking with OpenRouter…` with a spinner → chip turns `Key valid` (grey filled) and the bar text reads `Key valid. Ready to add.` On "adds it" cursor clicks `Add key` → a dialog rises: OpenRouter logo + title `Key verified and saved`, description `Your OpenRouter key passed a live check and is ready to route requests.`, button `Continue`. Hold. Footer line in the rail area of the form, muted: `Keys are encrypted at rest`.
handoff_out: step rail with step 1 done, step 2 active; browser frame at shared geometry; dialog open.

## Frame 6 — Step 3: share it with the pool
- src: compositions/frames/06-step-3-share.html

- scene: The OpenRouter key's panel: flip Share with pool → consent dialog → Donate key → Key verified
- duration: 5.008s
- transition_in: cut
- type: tutorial_step
- beat: payoff
- voiceover: "Step three. Share your key with the pool, and confirm. That's what lets you draw from it."
- asset_candidates: assets/provider-openrouter.svg — OpenRouter mark; assets/anyrouter-logo-black.svg — AnyRouter mark
- blueprint: cursor-ui-demo (Adapt)
- focal: the Share with pool switch, then the Key verified dialog
- roles: provider-openrouter.svg = panel header and dialog logo
- sfx: click on the switch, click on the checkbox, click on Donate key, chime on "Key verified"
- status: outline

handoff_in: step rail with step 1 done, step 2 active; browser frame at shared geometry (URL `anyrouter.dev/dashboard/byok`).
Step rail: at 0.2s step 2 becomes done and step 3 active; on "draw from it" step 3 becomes done.
Scene 1 (0.0–1.8s): "Share your key with the pool" — the frame shows the OpenRouter provider panel, zoomed: header logo + `OpenRouter` + chip `Healthy`; setting rows `Use my key` (switch on), `Only my key` (switch off), `Share with pool` with hint `Earn credits back when others route through this key` (switch off); under `Keys · 1/1 active` one key line with a green dot, `sk-or-v1-••••••••••••`, badge `validated` (green tint). Cursor clicks the `Share with pool` switch. → cursor-click-ripple
Scene 2 (1.8–3.6s): "and confirm" — a consent dialog rises over a dimmed panel: logo + title `Donate your OpenRouter key`, description `Choose what the shared pool may run on this OpenRouter key. Optional.`, an `In short` list showing two lines (`Other users' requests run on your key, and the usage appears on your OpenRouter account.` and `You are responsible for your provider's terms. You may withdraw at any time.`), the checkbox `I have read this and authorize AnyRouter to use my key to serve other users' requests.` Cursor ticks the box, then clicks primary `Donate key`, which reads `Verifying key…` with a spinner.
Scene 3 (3.6–end): "That's what lets you draw from it" — the dialog becomes the result: logo + title `Key verified`, inset `Key is live and working`, button `Got it`. The `Share with pool` switch behind reads on. A chip under the frame top area (inside the safe area): `Your own requests always come first`. Step 3 checks. Hold.
handoff_out: none (clean cut to Frame 7).

## Frame 7 — How it works
- src: compositions/frames/07-how-it-works.html

- scene: Requests flow from your app through AnyRouter to your key; your key hits 429 and rests; donated pool keys answer with 200 OK; requests keep going; your key comes back
- duration: 8.613s
- transition_in: crossfade
- type: key_feature
- beat: understanding
- voiceover: "Now your key goes first. When it hits its limit, it rests for a moment, and a key from the pool answers instead. Your requests keep going."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter monogram for the hub; assets/provider-openrouter.svg — OpenRouter mark on the key pills
- blueprint: constellation-hub (Adapt)
- focal: the request path
- roles: anyrouter mark = hub node; OpenRouter mark = key glyphs
- sfx: ping on the first 200, error on the 429, ping ×3 on the pool answers, chime when your key returns
- status: outline

Layout: left node `Your app` (card, x 160–460, centred y 470); hub AnyRouter card (monogram, x 760–1060); right column at x 1300–1780: your key pill (primary glyph, label `Your key`) at top, then a group labelled `Shared pool` holding five muted key pills stacked with 18px gaps. Hairline paths connect app → hub → each key. Headline area top-left y 90.
Scene 1 (0.0–2.2s): "your key goes first" — nodes and paths draw on (svg-path-draw); a small orange packet runs app → hub → your key and returns a `200 OK` chip (free green) beside your key. → svg-path-draw
Scene 2 (2.2–4.4s): "When it hits its limit" — the next packet reaches your key and bounces: a `429` chip in `danger` pops beside it; your key dims to 40% and a thin ring around its glyph starts drawing clockwise (the cooldown), label `resting` (24px muted).
Scene 3 (4.4–7.4s): "it rests for a moment, and a key from the pool answers instead" — the next packet goes app → hub → pool key 1 → `200 OK`; then three more packets fan out to pool keys 2, 3, 4 in a quick stagger, each answering `200 OK`. → multi-cursor-choreography (packets, not cursors)
Scene 4 (7.4–end): "Your requests keep going." — headline `Your requests keep going.` (h2) reveals top-left; the cooldown ring completes, your key returns to full opacity with its `primary` glyph, and the next packet goes to it again with `200 OK`. Small muted footnote under the right column: `Credits are the last fallback. Requests on your own key never use credits.` Hold.

## Frame 8 — Close
- src: compositions/frames/08-close.html

- scene: No daily cap on free models; your key earns credits when it helps; AnyRouter lockup and anyrouter.dev
- duration: 10.671s
- transition_in: crossfade
- type: cta
- beat: resolve
- voiceover: "Same free models, with no daily cap on AnyRouter. And your key earns credits when it helps someone else. Start at any router dot dev."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter wordmark and monogram
- blueprint: logo-assemble-lockup (Adapt)
- focal: the AnyRouter lockup
- roles: anyrouter-logo-black.svg = hero lockup
- sfx: sparkle on the lockup
- status: outline

Scene 1 (0.0–3.4s): "Same free models, with no daily cap" — h1 `No daily cap on free models.` reveals centre-top, `free` in free green; under it a chip `anyrouter/free` (mono, free-tint) and a muted line `2400 requests a minute per key`. → kinetic-type-beats
Scene 2 (3.4–6.4s): "your key earns credits when it helps someone else" — a second line card fades up under: key pill (primary glyph) + `earns 5% back in credits when it serves the pool` + muted `8% on Pro and Max`.
Scene 3 (6.4–end): "Start at anyrouter.dev" — the lines clear upward; the AnyRouter logo assembles centre (from `anyrouter-logo-black.svg`), `anyrouter.dev` in Geist Mono `primary` under it. Final hold to the end.
