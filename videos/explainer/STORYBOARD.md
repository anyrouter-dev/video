---
format: 1920x1080
duration: 96s
message: "One key for every AI model, and free models with no daily cap once you share a key."
arc: Mess → One door → How it works → The pool → Step 1 → Step 2 → Step 3 → Code → Pick a model → Close
audience: people who have never heard of AnyRouter, technical or not
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md`). White `bg` on every frame. `ink` for headlines and provider marks. `primary` burnt orange is the one accent per moment: the AnyRouter node, the active step number, the button being pressed. `free` green only means free / works. `danger` only on the provider that goes down in Frame 3. The terminal (Frames 8–9) is the one dark surface.
- **Type.** Geist display / h1 / h2 for spoken words, Geist Mono for anything typed (ids, URLs, keys, commands, step numbers). Sentence case. Nothing below 24px.
- **Motion grammar.** Long-tail `power3` settles, never bouncy. Every piece reveals on its spoken cue; nothing is on screen before the voice reaches it. Internal seams are velocity-matched cuts. Holds stay still; subtle jitter at most.
- **Continuity spine.** The AnyRouter mark is the one recurring object. It is born at the centre of Frame 2, becomes the strip in Frame 3, the pool's drain in Frame 4, and the closing lockup in Frame 10.
- **Step chrome.** Frames 5–7 share one step rail at the top: three numbered dots (1 · 2 · 3) with labels "Create a key", "Donate it", "Use free models". The active dot is `primary`, done dots are `free` with a check.
- **Rhythm.** Busy: 1, 3, 6. Held / breather: 7 (payoff) and 10 (close). Everything else reveals at a steady walk.
- **Redaction.** Every API key on screen is a `key-pill` with bullets. No real key ever appears.
- **Negative list.** No gradients, glows, bokeh, noise, dither, halftone, neon, emoji, stock 3D blobs. No front-load-then-freeze slides. No screensaver float. No lazy breathing, no back-half pans. No `repeat` / `yoyo`, no randomness.
- **Caption band.** Bottom 180px stays clear in every frame.

## Frame 1 — The mess
- src: compositions/frames/01-mess.html

- scene: Provider logos pile up, each dragging its own key and its own bill, until the frame is cluttered
- duration: 9.316s
- transition_in: cut
- type: problem
- beat: frustration
- voiceover: "There are dozens of AI companies. Each one has its own website, its own key, and its own bill. Using more than one gets messy, fast."
- asset_candidates: assets/provider-openai.svg — OpenAI mark; assets/provider-anthropic.svg — Anthropic mark; assets/provider-google.svg — Google mark; assets/provider-deepseek.svg — DeepSeek mark; assets/provider-mistral.svg — Mistral mark; assets/provider-xai.svg — xAI mark; assets/provider-qwen.svg — Qwen mark; assets/provider-meta.svg — Meta mark; assets/provider-moonshotai.svg — Moonshot mark; assets/provider-nvidia.svg — NVIDIA mark; assets/provider-openrouter.svg — OpenRouter mark; assets/provider-groq.svg — Groq mark
- blueprint: overwhelm-surround (Adapt)
- focal: the grid of provider tiles
- roles: every provider mark = provider-tile (ink)
- sfx: soft pop, paper rustle
- status: outline

Adapt: keep accumulation-by-surround; no avatar morph. The pain is three things per company, so each tile sprouts three small attachments.
Scene 1 (0.0–2.2s): "dozens of AI companies" — 12 provider-tiles reveal in a staggered cascade from the centre outward into a loose 4×3 grid, ~60% of frame, white ground. → center-outward-expansion
Scene 2 (2.2–5.6s): on "its own website" a tiny URL chip (Geist Mono, e.g. `openai.com`) slides out under each tile; on "its own key" a small key-pill (`sk-••••`) clips onto each; on "its own bill" a small receipt chip (`$` + bar) drops beside each. Each wave is a quick stagger across all 12, landing on its word. → dynamic-content-sequencing
Scene 3 (5.6–8.0s): "messy, fast" — the attachments jostle and overlap as the grid compresses inward a little, tiles nudged off-axis (small deterministic rotations), the eyebrow `12 accounts · 12 keys · 12 bills` types in at top-left in muted mono. Hold the clutter. → overwhelm-surround

## Frame 2 — One door
- src: compositions/frames/02-one-door.html

- scene: All the clutter is swept into a single AnyRouter node; one key, one account, 260+ models
- duration: 6.623s
- transition_in: cut
- type: product_intro
- beat: relief
- voiceover: "AnyRouter puts all of them behind one door. One account. One key. More than two hundred and sixty models."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter wordmark and monogram; assets/provider-openai.svg — OpenAI mark; assets/provider-anthropic.svg — Anthropic mark; assets/provider-google.svg — Google mark; assets/provider-deepseek.svg — DeepSeek mark; assets/provider-mistral.svg — Mistral mark; assets/provider-xai.svg — xAI mark; assets/provider-qwen.svg — Qwen mark; assets/provider-meta.svg — Meta mark
- blueprint: constellation-hub (Adapt)
- focal: AnyRouter mark
- roles: anyrouter-logo-black.svg = hero cutout; provider marks = satellites
- sfx: whoosh, soft impact
- status: outline

handoff_in: the 12 provider tiles start where Frame 1 left them (4×3 grid, ~60% of frame, centred), opacity 1, moving inward.
Adapt: keep the ring around a hub and the resolve onto the core; the ring forms by collapse from the Frame 1 grid instead of springing from nothing.
Scene 1 (0.0–2.4s): "behind one door" — all key, URL and bill chips fall away; the 12 tiles glide into an even ring; the AnyRouter monogram draws on at centre in ink, then fills `primary`. Hairline spokes connect ring → hub. → avatar-cloud-network
Scene 2 (2.4–4.6s): "One account. One key." — two chips stamp under the hub one after the other: `1 account`, then a single key-pill `sk-ar-••••••••` with an orange key glyph. → press-release-spring
Scene 3 (4.6–7.0s): "260+ models" — the number counts up 0 → 260 with a `+` beside the hub, label `models` in muted; the ring holds still. → counting-dynamic-scale

## Frame 3 — How it works (anatomy figure)
- src: compositions/frames/03-power-strip.html

- scene: An isometric power strip: apps plug in on the left, the strip is AnyRouter, providers sit on its outlets; a request travels, one provider fails, the request reroutes
- duration: 13.125s
- transition_in: crossfade
- type: key_feature
- beat: understanding
- voiceover: "Think of it like a power strip for AI. Your app, or your coding tool, plugs into AnyRouter. AnyRouter sends each request to a provider that is ready. And if one goes down, it quietly tries the next."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter monogram for the strip's badge; assets/provider-anthropic.svg — Anthropic mark; assets/provider-openai.svg — OpenAI mark; assets/provider-google.svg — Google mark; assets/provider-deepseek.svg — DeepSeek mark
- blueprint: compose (anatomy isometric figure)
- focal: the isometric strip
- roles: anyrouter mark = badge on the strip; provider marks = labels on the outlet sockets
- sfx: plug click, soft blip, error buzz soft, success chime soft
- status: outline

Built with the `/anatomy` skill: a crafted isometric SVG of a long power strip, four-tone shading on white, painter's order correct, in the frame's palette (ink edges, white/greys faces, one orange status light, the AnyRouter monogram badge).
Scene 1 (0.0–2.6s): "a power strip for AI" — the strip assembles in isometric on a white ground, ~55% of frame, slightly left of centre; its orange power light comes on. Label `AnyRouter` in h2 above. → svg-path-draw
Scene 2 (2.6–5.0s): "Your app, or your coding tool, plugs in" — two isometric plugs slide into inlet sockets on the strip's left end; their cable tags read `your app` and `Claude Code`. → svg-icon-enrichment
Scene 3 (5.0–8.0s): "a provider that is ready" — four outlet sockets on the right carry the provider marks (Anthropic, OpenAI, Google, DeepSeek), each with a small green status LED; a small orange packet runs from the inlet along the strip and into the first ready outlet. → svg-icon-enrichment
Scene 4 (8.0–12.0s): "if one goes down" — the first outlet's LED turns `danger` and a small × appears; the next packet hops past it to the next outlet, whose LED flashes green; caption chip `automatic failover` fades in under the strip. Hold. → svg-icon-enrichment

## Frame 4 — The shared pool
- src: compositions/frames/04-shared-pool.html

- scene: A plain definition of an API key, then the real Shared pool page, then donated keys filling one pool of tokens
- duration: 13.357s
- transition_in: crossfade
- type: key_feature
- beat: discovery
- voiceover: "There is also a shared pool. An API key is like a password that lets software use an AI service. Members share keys they are not using, and together those keys become a big pool of free AI usage."
- asset_candidates: assets/anyrouter-pool.png — real anyrouter.dev/pool page: OpenRouter Free 74 keys 1.2B tokens, NVIDIA NIM Free 33 keys, Donate buttons; assets/provider-openrouter.svg — OpenRouter mark; assets/provider-nvidia.svg — NVIDIA mark; assets/provider-google.svg — Google mark
- blueprint: grid-card-assemble (Adapt)
- focal: assets/anyrouter-pool.png
- roles: anyrouter-pool.png = hero screenshot in a browser-frame; provider marks = on key-pills flowing into the pool
- sfx: soft whoosh, light ticks
- status: outline

Scene 1 (0.0–2.0s): "a shared pool" — eyebrow `Shared pool` and the h1 `One pool of tokens, shared by members.` reveal per word at top-left.
Scene 2 (2.0–5.6s): "An API key is like a password" — a definition card slides up centre: a key-pill `sk-••••••••` on the left, `=` , and a small padlock-and-text label `a password that lets software use an AI service` on the right, in body-lg. Hold for reading. → dynamic-content-sequencing
Scene 3 (5.6–9.0s): "Members donate keys" — the definition card yields; the real pool screenshot rises in a browser-frame (URL pill `anyrouter.dev/pool`), ~70% width, and the OpenRouter and NVIDIA NIM rows get a soft primary-tint highlight in turn as small key-pills (with their marks) lift out of the rows. → 3d-page-scroll (gentle, no tilt)
Scene 4 (9.0–13.0s): "a big pool of tokens" — the key-pills stream down into a wide rounded pool shape under the screenshot that fills with a fine level line; label `shared by members` beside it. Hold. → stat-bars-and-fills

## Frame 5 — Step 1: create an OpenRouter key
- src: compositions/frames/05-step-1-key.html

- scene: Real openrouter.ai, then the Keys page: cursor clicks Create Key, a redacted sk-or- key appears and is copied
- duration: 13.032s
- transition_in: push-slide LEFT
- type: tutorial_step
- beat: doing
- voiceover: "Some free models work the moment you sign up. To unlock the whole pool, share one free key. Step one. Sign in at OpenRouter, and open Keys. Click Create Key, and copy it."
- asset_candidates: assets/openrouter-home.png — real openrouter.ai home, light, purple Get API Key button; assets/provider-openrouter.svg — OpenRouter mark
- blueprint: cursor-ui-demo (Adapt)
- focal: the Keys panel with the Create Key button
- roles: openrouter-home.png = screenshot in browser-frame (first half); provider-openrouter.svg = header mark of the reconstructed Keys panel
- sfx: ui click, ui click, copy blip
- status: outline

The step rail appears here for the first time (step 1 active).
Scene 1 (0.0–2.0s): "unlock free models" — step rail draws on at top; h2 `Unlock free models in three steps` at left.
Scene 2 (2.0–4.6s): "Sign in at openrouter.ai" — the real openrouter.ai screenshot in a browser-frame (URL `openrouter.ai`), ~62% width, right side; on "open Keys" the frame cross-cuts (velocity-matched slide) to a clean reconstructed Keys panel in the same browser-frame (URL `openrouter.ai/keys`): OpenRouter mark, title `API Keys`, an empty list, a button `Create Key` styled as OpenRouter's purple primary (#6D28D9 white text, labelled as OpenRouter's UI).
Scene 3 (4.6–7.2s): "click Create Key" — a cursor glides to `Create Key`, presses with a ripple; a new row appears with a key-pill `sk-or-v1-••••••••••••` and a `Copy` button. → cursor-click-ripple
Scene 4 (7.2–9.0s): "Copy it." — cursor clicks `Copy`; a small toast `Copied` in free green; the key-pill lifts slightly (it will carry into Frame 6). Hold.
handoff_out: key-pill `sk-or-v1-••••` at right-centre, scale 1, opacity 1, drifting left.

## Frame 6 — Step 2: donate it to AnyRouter
- src: compositions/frames/06-step-2-donate.html

- scene: Real anyrouter.dev/pool, Donate on OpenRouter, the real donate dialog rebuilt from product source, paste the redacted key, Donate, success
- duration: 16.375s
- transition_in: push-slide LEFT
- type: tutorial_step
- beat: doing
- voiceover: "Step two. Sign in at any router dot dev, and open the Shared pool. Click Donate next to OpenRouter, paste your key, and press Donate. Your key is stored encrypted, and you can stop sharing any time. A key from NVIDIA works the same way."
- asset_candidates: assets/anyrouter-pool.png — real anyrouter.dev/pool table with Donate buttons; assets/provider-openrouter.svg — OpenRouter mark; assets/provider-nvidia.svg — NVIDIA mark; assets/anyrouter-logo-black.svg — AnyRouter mark
- blueprint: cursor-ui-demo (Adapt)
- focal: the donate dialog
- roles: anyrouter-pool.png = screenshot in browser-frame; provider marks = dialog header icon and the NVIDIA aside
- sfx: ui click, paste blip, ui click, success chime soft
- status: outline

handoff_in: key-pill `sk-or-v1-••••` enters from the right edge, scale 1, opacity 1, moving left, parks in the top-right corner.
Step rail: step 1 done (green check), step 2 active.
Scene 1 (0.0–2.6s): "anyrouter.dev … Shared pool" — real pool screenshot in a browser-frame (URL `anyrouter.dev/pool`), ~72% width, centred; zoom-to-target onto the OpenRouter row. → coordinate-target-zoom
Scene 2 (2.6–4.6s): "Click Donate next to OpenRouter" — cursor to that row's `Donate`; press + ripple. → cursor-click-ripple
Scene 3 (4.6–8.4s): "paste your key, and press Donate" — the dialog rises over a dimmed page, rebuilt from `donate-key-dialog.tsx`: OpenRouter mark + title `Donate your OpenRouter key`; an input labelled `API key` into which the parked key-pill flies and lands as `sk-or-v1-••••••••••••`; link `Where to find it ↗`; buttons `← Providers` (ghost) and `Donate` (primary). Cursor presses `Donate`; it reads `Checking key…` briefly; then the dialog content swaps to `Thanks, your key joins the pool within a minute` with sub-line `You get Go free, $4 credit a month and 5% back`.
Scene 4 (8.4–12.0s): "A key from NVIDIA works the same way" — the dialog slides left and shrinks to a card; beside it a matching small card slides in: NVIDIA mark, `NVIDIA NIM`, `build.nvidia.com → Get API Key`, key-pill `nvapi-••••••••`. Hold.

## Frame 7 — Step 3: use free models
- src: compositions/frames/07-step-3-free.html

- scene: The payoff — three plain benefit cards: free models with no daily cap, Go plan free, $4 credit a month
- duration: 12.103s
- transition_in: crossfade
- type: benefits
- beat: payoff
- voiceover: "Step three. Use the free models. While your key is shared, you get the pool's free models with no daily cap, the Go plan at no cost, and four dollars of credit every month."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter mark
- blueprint: titlecard-reveal (Adapt)
- focal: the `Free models · no daily cap` card
- roles: anyrouter mark = small top-left signature
- sfx: soft chime, light tick, light tick
- status: outline

Step rail: steps 1 and 2 done, step 3 active then done.
Scene 1 (0.0–2.0s): "That's it." — h1 `You're in.` reveals centre-top; step 3 dot fills and checks.
Scene 2 (2.0–8.0s): three equal cards reveal left to right, each on its spoken cue: (1) `Free models` with a `$0` free-green chip and sub `no daily cap`; (2) `Go plan` with sub `free while your key is donated`; (3) `$4 credit` with sub `every month`. Then stillness. This is a held breather. → grid-card-assemble

## Frame 8 — Coding with Claude
- src: compositions/frames/08-code-terminal.html

- scene: A clean terminal types the install, then anyr login (browser sign-in confirms), then anyr claude --model
- duration: 10.942s
- transition_in: zoom-through
- type: key_feature
- beat: doing
- voiceover: "If you write code, here is how to use it with Claude. Install the AnyRouter command line tool, and run: any R login. Then run: any R claude, with a model."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter mark
- blueprint: prompt-type-submit-generate (Adapt)
- focal: the terminal
- roles: anyrouter mark = small badge on the terminal title bar
- sfx: keyboard typing soft, enter key, soft blip
- status: outline

Terminal: frame component `terminal`, ~70% width, centred, title bar `~/my-project`.
Scene 1 (0.0–2.2s): "coding with Claude" — eyebrow `Code with Claude` and the terminal rise into place.
Scene 2 (2.2–4.6s): "Install the command line tool" — types `curl -fsSL https://anyrouter.dev/setup.sh | bash`; on enter, one dim output line `✓ installed anyr`. → discrete-text-sequence
Scene 3 (4.6–7.4s): "any R login" — types `anyr login`; output `Opening browser to sign in…` then `✓ Signed in` in free green. → discrete-text-sequence
Scene 4 (7.4–10.0s): "any R claude, with a model" — types `anyr claude --model anyrouter/free` with the model id in the terminal orange; the caret holds at the end. Hold.
handoff_out: terminal at centre, ~70% width, still; the line `anyr claude --model anyrouter/free` is the last line.

## Frame 9 — Pick a model
- src: compositions/frames/09-pick-model.html

- scene: The same terminal line; the model id rotates free → auto → coding, each with a one-line meaning beside it, then Claude Code starts
- duration: 10.338s
- transition_in: cut
- type: key_feature
- beat: choice
- voiceover: "Change the model whenever you like. Free, for free models only. Auto, to let AnyRouter pick the best one. Or coding, for the best coding model from the keys you added."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter mark
- blueprint: kinetic-type-beats (Adapt)
- focal: the rotating model id
- roles: anyrouter mark = terminal title-bar badge
- sfx: soft tick, soft tick, soft tick
- status: outline

handoff_in: identical terminal and last line as Frame 8's handoff_out.
Adapt: the in-place token cycle runs inside the terminal line, not as bare type.
Scene 1 (0.0–2.4s): "Change the model" — the terminal slides up to the upper half; under it a three-row legend draws in, rows dimmed.
Scene 2 (2.4–4.6s): "Free" — the id stays `anyrouter/free`; legend row 1 lights: `anyrouter/free` → `free models, $0` (free green). → discrete-text-sequence
Scene 3 (4.6–6.8s): "Auto" — backspace-and-retype the id to `anyrouter/auto`; row 2 lights: `anyrouter/auto` → `AnyRouter picks for you`. → discrete-text-sequence
Scene 4 (6.8–10.0s): "coding" — retype to `anyrouter/coding`; row 3 lights: `anyrouter/coding` → `best coding models your keys reach`. Hold on all three rows lit, the current one emphasised.

## Frame 10 — Close
- src: compositions/frames/10-close.html

- scene: AnyRouter lockup; three short lines; anyrouter.dev
- duration: 7.469s
- transition_in: crossfade
- type: cta
- beat: resolve
- voiceover: "One key. Every model. And a shared pool that keeps it free. Start at any router dot dev."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter wordmark and monogram; assets/anyrouter-home.png — real anyrouter.dev home page
- blueprint: logo-assemble-lockup (Adapt)
- focal: AnyRouter lockup
- roles: anyrouter-logo-black.svg = hero; anyrouter-home.png = supporting, small browser-frame under the URL
- sfx: soft impact, soft shimmer
- status: outline

Scene 1 (0.0–3.2s): "One key. Every model. And a shared pool" — three short lines slam in one at a time centre: `One key.` `Every model.` `A shared pool that keeps it free.` (the last with `free` in free green). → kinetic-beat-slam (smooth, no bounce)
Scene 2 (3.2–7.0s): "Start at anyrouter.dev" — lines clear upward; the AnyRouter lockup assembles centre (monogram draws, wordmark resolves), `anyrouter.dev` in Geist Mono under it in primary, and a small real homepage screenshot in a browser-frame rises beneath. Final hold, then a gentle fade to white at the very end.
