---
format: 1920x1080
duration: 47.5s
message: "One API for every model. Your code barely changes, and free models work on every plan."
arc: Every company bills you → One API → Two lines change → Call by name → Your own keys → Or auto → It keeps answering → Free → Claude Code → Close
audience: people who land on anyrouter.dev and press play, developers or not
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md`). White `bg` on every frame. `ink` for headlines and marks. `primary` burnt orange is the one accent per moment: the focus ring, the id that just rolled in (the orange wash from v1 frame 09). `free` green only means free, $0 or "it worked". `danger` only on the provider that goes down in Frame 7. The terminal (Frame 9) is the one dark surface.
- **Type.** Geist for spoken words, Geist Mono for anything typed (ids, URLs, code). Phone first: nothing a viewer must read below 36px (URL pills and the terminal bar 32 to 34px). Kit: `tools/kit/` pasted into each frame by `tools/kit.mjs`.
- **Camera.** Every frame sits in a `.k-cam` that pushes in slowly and eases toward the part the voice names, so no frame holds still for more than 1.5s. No anyrouter.dev screenshot is on screen: the product UI (the playground result, the Add a provider key dialog, the free list) is redrawn in the kit from real values, with the signed-in captures in `shared/captures/2026-10-19/screens/signed-in/` as reference only.
- **Cuts.** Every cut lands on a beat of the music (120 bpm, first beat 0.059s): `pad-voices.mjs --beat=0.5 --phase=0.059 --hold=4:1` stretches each breath (frame 4 holds 1s more for its result cards) so the next line starts on the grid. Reveals land on the spoken word (times from `audio_meta.json`, ElevenLabs alignment).
- **Continuity.** Frames 3, 4 and 6 share one code card (same chrome, same place). Frames 4 and 9 roll the model id the way v1 frame 09 did.
- **Honesty.** Ids on screen in Frames 3, 4, 6, 7 and 9 are ones AnyRouter routes itself: `pricing.billing` is not `"byok"` in `GET /api/v1/models?all=1` (`model-ids.test.mjs` checks every frame against `model-billing.json`). Claude and OpenAI appear only in Frame 5, as providers in the Add a provider key dialog. No /models tab counts on screen. No key on screen: code reads it from `process.env`.
- **Negative list.** No gradients, glows, blur, noise, emoji, routing diagrams, step-by-step setup. No `repeat` / `yoyo`, no randomness.
- **Caption band.** Landscape: the bottom 200px stays clear. Portrait (1080x1920): content in y 200 to 1220 and x 60 to 960; captions own 1240 to 1480.
- **Two renditions.** Each frame carries its portrait layout under `@media (orientation: portrait)`; `shared/authoring/portrait.mjs` writes the 1080x1920 project.

## Frame 1 — Every company bills you
- src: compositions/frames/01-every-bill.html

- scene: Four AI company cards (DeepSeek, Kimi, MiniMax, Nemotron, each with its company); each grows an account row, a key row and a bill row as the voice names them
- duration: 4.559s
- transition_in: cut
- type: problem
- beat: friction
- voiceover: "Every AI company has its own account, its own key and its own bill."
- asset_candidates: assets/providers/deepseek.svg — DeepSeek mark; assets/providers/moonshotai.svg — Moonshot AI mark; assets/providers/minimax.svg — MiniMax mark; assets/providers/nvidia.svg — NVIDIA mark
- blueprint: overwhelm-surround (Adapt)
- focal: the four company cards
- roles: provider marks = card heads
- sfx: pop, click-soft on account, key, bill
- status: animated

Scene 1 (0.0–1.4s): "Every AI company" — four cards rise in a stagger (landscape one row, portrait 2x2), marks and names only.
Scene 2 (1.4–4.5s): "account", "key", "bill" — each word drops its row into all four cards in a quick stagger. The camera pushes in the whole time.

## Frame 2 — One API
- src: compositions/frames/02-one-api.html

- scene: "270+" counts up beside a scrolling list of real model ids from GET /api/v1/models; the API base URL lands as one pill
- duration: 4.5s
- transition_in: cut
- type: product_intro
- beat: relief
- voiceover: "AnyRouter puts more than 270 models behind one API."
- asset_candidates: real ids from GET /api/v1/models, as a list
- blueprint: stat-hit (Adapt)
- focal: the 270+ stat
- roles: id list = proof; URL pill = "one API"
- sfx: whoosh-short, ping on 270
- status: animated

Scene 1 (0.0–1.2s): the AnyRouter lockup and the id list slide in; the list scrolls.
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

- scene: The same code card, now the call; the model id rolls through four real ids as the voice names each company, then three of them answer the same prompt
- duration: 6s
- transition_in: cut
- type: key_feature
- beat: choice
- voiceover: "Call a model by its name. DeepSeek, Kimi, MiniMax, Nemotron. Switching is one word."
- asset_candidates: assets/providers/deepseek.svg; assets/providers/moonshotai.svg; assets/providers/minimax.svg; assets/providers/nvidia.svg
- blueprint: kinetic-type-beats (Adapt)
- focal: the model id
- roles: company chips = what each id means; answer cards = proof that switching is one word
- sfx: click-soft on each name
- status: animated

Scene 1 (0.0–1.1s): the call block and the chip row rise.
Scene 2 (1.1–3.35s): each name — its chip takes the ring and the id rolls to it (deepseek/deepseek-v4-flash, moonshotai/kimi-k3, minimax/minimax-m3.1-flash, nvidia/nemotron-3-super-120b-a12b).
Scene 3 (3.35–6s): "Switching is one word" — the chips and their ring make way, the code card moves up, every other line dims, the ring comes back on the id and it washes once more; under it a neutral "Say hello in five words." bubble and three answer cards from the real playground run (2026-10-19): DeepSeek-V4-Flash "Hello! How can I help you today?" 5.81s TTFT, 96.9 t/s; MiniMax M3.1 Flash "Hello! How are you today?" 4.35s, 142.9 t/s; Nemotron-3 Super 120B "Hello, how are you today?" 13.95s, 42.4 t/s; each $0. No token counts (anyrouter #5802). Kimi is not shown answering: its platform route failed in that run.

## Frame 5 — Your own keys
- src: compositions/frames/05-your-keys.html

- scene: anyrouter.dev's Add a provider key dialog, redrawn: the provider list, a search that finds OpenAI, then OpenAI's key form with Add key
- duration: 5s
- transition_in: cut
- type: key_feature
- beat: trust
- voiceover: "Already pay for Claude or OpenAI? Add your own key and use them here too, at no markup."
- asset_candidates: assets/providers/anthropic.svg; assets/providers/openai.svg; assets/providers/aimlapi.svg (reference: byok-add-provider-list.png, byok-add-openrouter-key.png)
- blueprint: ui-callout (Adapt)
- focal: the Add key button, then the $0 markup badge
- roles: dialog = how you bring a key
- sfx: click on Add, pop on markup
- status: animated

Scene 1 (0.0–1.9s): "Claude" — the Anthropic row lights; "OpenAI" — the search types OpenAI and finds it.
Scene 2 (1.9–3.7s): "Add your own key" — the list leaves, then OpenAI's key form comes in (sk-... placeholder, "Keys are encrypted at rest"); Add key goes from its disabled tint to solid as the focus ring lands on it.
Scene 3 (3.7–5.0s): "no markup" — a "Your own API key, $0 markup" badge lands.

## Frame 6 — Or let AnyRouter pick
- src: compositions/frames/06-auto.html

- scene: Back on the code card; the id rolls to anyrouter/auto with a "One more option" badge
- duration: 2.5s
- transition_in: cut
- type: key_feature
- beat: aside
- voiceover: "Or let AnyRouter pick one for you."
- asset_candidates: none — typed code only
- blueprint: kinetic-type-beats (Adapt)
- focal: anyrouter/auto
- roles: badge = it is a choice, not a must
- sfx: click-soft on pick
- status: animated

Scene 1 (0.0–2.5s): Frame 4's last state; on "pick" the id rolls to `anyrouter/auto`, the ring follows it, and an outline "One more option" badge appears.

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

- scene: A list of free models, redrawn from the catalog (not "byok", $0 in and out in every fetch), stepping up a row on "every" and on "no"; "Every plan" and "No daily cap" land beside it
- duration: 3.5s
- transition_in: cut
- type: key_feature
- beat: delight
- voiceover: "Free models work on every plan, with no daily cap."
- asset_candidates: none — rows from model-billing.json `free`
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
- asset_candidates: none — the AnyRouter mark is inline SVG
- blueprint: logo-assemble-lockup (Adapt)
- focal: AnyRouter lockup
- roles: mark = hero
- sfx: sparkle on Start
- status: animated
