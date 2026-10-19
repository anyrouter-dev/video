---
format: 1920x1080
duration: 47s
message: "One API for every model. Your code barely changes, and free models work on every plan."
arc: Every company bills you → One API → Two lines change → Call by name → Your own keys → Or auto → It keeps answering → Free → Claude Code → Close
audience: people who land on anyrouter.dev and press play, developers or not
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md`). White `bg` on every frame. `ink` for headlines and marks. `primary` burnt orange is the one accent per moment: the focus ring, the id that just rolled in (the orange wash from v1 frame 09). `free` green only means free, $0 or "it worked". `danger` only on the provider that goes down in Frame 7. The terminal (Frame 9) is the one dark surface.
- **Type.** Geist for spoken words, Geist Mono for anything typed (ids, URLs, code). Phone first: nothing a viewer must read below 36px (URL pills and the terminal bar 32 to 34px). Kit: `tools/kit/` pasted into each frame by `tools/kit.mjs`.
- **Camera.** Every frame sits in a `.k-cam` that pushes in slowly and eases toward the part the voice names, so no frame holds still for more than 1.5s. Real screens move by their own crop: the camera fits a named rectangle of the capture into the browser view.
- **Cuts.** Every cut lands on a beat of the music (120 bpm, first beat 0.059s): `pad-voices.mjs --beat=0.5 --phase=0.059` stretches each breath so the next line starts on the grid. Reveals land on the spoken word (times from `audio_meta.json`, ElevenLabs alignment).
- **Continuity.** Frames 3, 4 and 6 share one code card (same chrome, same place). Frames 4 and 9 roll the model id the way v1 frame 09 did.
- **Honesty.** Ids on screen in Frames 4, 6, 7 and 9 come from `GET /api/v1/models` (what one AnyRouter key runs on credit). Claude and OpenAI appear only in Frame 5, on their real model pages, which say "bring your own key". No /models tab counts on screen. No key on screen: code reads it from `process.env`.
- **Negative list.** No gradients, glows, blur, noise, emoji, routing diagrams, step-by-step setup. No `repeat` / `yoyo`, no randomness.
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait (1080x1920): content in y 200 to 1220 and x 60 to 960; captions own 1240 to 1480.
- **Two renditions.** Each frame carries its portrait layout under `@media (orientation: portrait)`; `shared/authoring/portrait.mjs` writes the 1080x1920 project.

## Frame 1 — Every company bills you
- src: compositions/frames/01-every-bill.html

- scene: Four AI company cards; each grows an account row, a key row and a bill row as the voice names them
- duration: 4.559s
- transition_in: cut
- type: problem
- beat: friction
- voiceover: "Every AI company has its own account, its own key and its own bill."
- asset_candidates: assets/providers/deepseek.svg — DeepSeek mark; assets/providers/moonshotai.svg — Moonshot AI mark; assets/providers/xai.svg — xAI mark; assets/providers/z-ai.svg — Z.ai mark
- blueprint: overwhelm-surround (Adapt)
- focal: the four company cards
- roles: provider marks = card heads
- sfx: pop, click-soft on account, key, bill
- status: animated

Scene 1 (0.0–1.4s): "Every AI company" — four cards rise in a stagger (landscape one row, portrait 2x2), marks and names only.
Scene 2 (1.4–4.5s): "account", "key", "bill" — each word drops its row into all four cards in a quick stagger; on "bill" the cards nudge off-axis a little. The camera pushes in the whole time.

## Frame 2 — One API
- src: compositions/frames/02-one-api.html

- scene: "270+" counts up beside the real /models catalog, scrolling in a browser frame; the API base URL lands as one pill
- duration: 4.5s
- transition_in: cut
- type: product_intro
- beat: relief
- voiceover: "AnyRouter puts more than 270 models behind one API."
- asset_candidates: assets/captures/models.png — the real /models catalog, cropped below the tab bar
- blueprint: stat-hit (Adapt)
- focal: the 270+ stat
- roles: catalog scroll = proof; URL pill = "one API"
- sfx: whoosh-short, ping on 270
- status: animated

Scene 1 (0.0–1.2s): the AnyRouter lockup and the browser frame slide in; the catalog scrolls by its crop.
Scene 2 (1.2–2.4s): "more than 270" — the stat counts up to 270+, "models" under it.
Scene 3 (2.4–4.5s): "behind one API" — the pill `anyrouter.dev/api/v1` rises with a focus ring.

## Frame 3 — Two lines change
- src: compositions/frames/03-swap-two-lines.html

- scene: A code card with an OpenAI client; the base URL and the key roll to AnyRouter's, the rest stays
- duration: 5s
- transition_in: cut
- type: how_it_works
- beat: ease
- voiceover: "Your code barely changes. Swap the base URL and the key, and keep the rest."
- asset_candidates: none — typed code only
- blueprint: kinetic-type-beats (Adapt)
- focal: the two changing values
- roles: code card = the developer's own file
- sfx: click on Swap and key
- status: animated

Scene 1 (0.0–1.7s): the code card rises; camera settles on the client block.
Scene 2 (1.7–3.6s): "base URL", "key" — each value rolls to the AnyRouter one with the orange wash.
Scene 3 (3.6–5.0s): "keep the rest" — the comment line gets an "Unchanged" badge; camera drifts down.

## Frame 4 — Call a model by name
- src: compositions/frames/04-call-by-name.html

- scene: The same code card, now the call; the model id rolls through four real ids as the voice names each company
- duration: 5.5s
- transition_in: cut
- type: key_feature
- beat: choice
- voiceover: "Call a model by its name. DeepSeek, Kimi, Grok, GLM. Switching is one word."
- asset_candidates: assets/providers/deepseek.svg; assets/providers/moonshotai.svg; assets/providers/xai.svg; assets/providers/z-ai.svg
- blueprint: kinetic-type-beats (Adapt)
- focal: the model id
- roles: company chips = what each id means
- sfx: click-soft on each name
- status: animated

Scene 1 (0.0–1.3s): the call block and the chip row rise.
Scene 2 (1.3–3.8s): each name — its chip takes the ring and the id rolls to it (deepseek/deepseek-v4.1-flash, moonshotai/kimi-k3, x-ai/grok-4.7, z-ai/glm-5.3).
Scene 3 (3.8–5.5s): "Switching is one word" — every other line dims; the id washes once more.

## Frame 5 — Your own keys
- src: compositions/frames/05-your-keys.html

- scene: The real Claude Opus 5.5 and GPT-5.5 pages on anyrouter.dev; the camera lands on "Add your key" and on "AnyRouter adds no fee"
- duration: 5s
- transition_in: cut
- type: key_feature
- beat: trust
- voiceover: "Already pay for Claude or OpenAI? Add your own key and use them here too, at no markup."
- asset_candidates: assets/captures/model-claude-opus-5-5.png — the real model page; assets/captures/model-gpt-5-5.png — the real model page
- blueprint: ui-callout (Adapt)
- focal: the Add your key button, then the no-fee sentence
- roles: model pages = proof
- sfx: click on Add, pop on markup
- status: animated

Scene 1 (0.0–1.9s): "Claude", "OpenAI" — the Claude page, then the GPT-5.5 page deals in front of it.
Scene 2 (1.9–3.4s): "Add your own key" — the camera fits the button; focus ring.
Scene 3 (3.4–5.0s): "no markup" — the camera fits "AnyRouter adds no fee."; a "$0 markup" badge lands.

## Frame 6 — Or let AnyRouter pick
- src: compositions/frames/06-auto.html

- scene: Back on the code card; the id rolls to anyrouter/auto with an "Optional" badge
- duration: 2.5s
- transition_in: cut
- type: key_feature
- beat: aside
- voiceover: "Or let AnyRouter pick one for you."
- asset_candidates: assets/providers/anyrouter.svg — AnyRouter mark
- blueprint: kinetic-type-beats (Adapt)
- focal: anyrouter/auto
- roles: badge = it is a choice, not a must
- sfx: pop on pick
- status: animated

Scene 1 (0.0–2.5s): Frame 4's last state; on "pick" the id rolls to `anyrouter/auto`, an AnyRouter chip joins the row and an outline "Optional" badge appears.

## Frame 7 — It keeps answering
- src: compositions/frames/07-failover.html

- scene: An app asks a question; provider 1 goes down and greys out, provider 2 takes it, the answer lands
- duration: 6s
- transition_in: cut
- type: key_feature
- beat: relief
- voiceover: "If a provider goes down, AnyRouter retries on another, and your app still gets its answer."
- asset_candidates: none — app window and provider tiles are drawn
- blueprint: ui-callout (Adapt)
- focal: the answer arriving
- roles: tiles = providers; app window = the benefit
- sfx: error on down, ping on another, chime on answer
- status: animated

Scene 1 (0.0–1.5s): the app window with a question and a waiting indicator; three provider tiles.
Scene 2 (1.0–3.4s): "goes down" — tile 1 turns grey with a red "Down" badge; "another" — tile 2 lights green.
Scene 3 (3.5–6.0s): "still gets its answer" — the answer bubble lands with an "Answered" check.

## Frame 8 — Free models
- src: compositions/frames/08-free.html

- scene: The real /models list with the free filter on, scrolling slowly; "Every plan" and "No daily cap" land beside it
- duration: 3.5s
- transition_in: cut
- type: key_feature
- beat: delight
- voiceover: "Free models work on every plan, with no daily cap."
- asset_candidates: assets/captures/models-free.png — /models?free=true, cropped below the tab bar
- blueprint: ui-callout (Adapt)
- focal: the two free badges
- roles: list = proof
- sfx: chime on Free
- status: animated

## Frame 9 — Claude Code
- src: compositions/frames/09-claude-code.html

- scene: A terminal types `anyr claude --model …` and the id rolls through real ids
- duration: 4.5s
- transition_in: cut
- type: key_feature
- beat: practical
- voiceover: "Using Claude Code? Run anyr claude, with any model you like."
- asset_candidates: none — the command is from the real `anyr --help`
- blueprint: kinetic-type-beats (Adapt)
- focal: the model id in the command
- roles: terminal = the one dark surface
- sfx: typing on Run, click-soft on each roll
- status: animated

## Frame 10 — Close
- src: compositions/frames/10-close.html

- scene: "One API for every model." then the AnyRouter lockup with anyrouter.dev and "Start free"
- duration: 5.937s
- transition_in: crossfade
- type: cta
- beat: resolve
- voiceover: "One API for every model. Start free at anyrouter.dev."
- asset_candidates: assets/providers/anyrouter.svg — AnyRouter mark
- blueprint: logo-assemble-lockup (Adapt)
- focal: AnyRouter lockup
- roles: mark = hero
- sfx: sparkle on Start
- status: animated
