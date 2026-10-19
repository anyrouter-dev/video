---
workflow: product-launch-video
flow: automation
storyboard: no
message: "One API for every model. Your code barely changes, and free models work on every plan."
destination: youtube
aspect: 1920x1080
language: en
audience: "a developer or a curious non-developer who lands on anyrouter.dev and presses play"
length: 45s
angle: benefit-first explainer
---

## Intent

Version 2 of the explainer. The owner's verdict on v1 (108s): too slow, too much
step-by-step setup and internal mechanics, and its model-picker frame made viewers think
only `anyrouter/*` presets work. v2 shows the benefit and how easy it is, in 40 to 50
seconds: clean, simple, smooth, nothing that confuses or biases.

The ten beats, in order: every AI company bills you separately; AnyRouter puts more than
270 models behind one API; your code changes by two lines; you call a model by its name;
bring your own Claude or OpenAI key at no markup; or let AnyRouter pick; if a provider goes
down AnyRouter retries and your app still answers; free models on every plan with no daily
cap; `anyr claude` runs Claude Code with any model; one API for every model, start free.

## Customizations

- Real anyrouter.dev screens (captured 2026-10-19, `shared/captures/2026-10-19/`) in a
  browser frame, moved by their crop toward what the voice names.
- One code card shared by frames 3, 4 and 6; the model id rolls with v1's orange wash.
- Two renditions, landscape and portrait, from one source.

## Claims ledger (verified 2026-10-19)

- "270+ models across 17+ providers", "One API key reaches hundreds of models",
  "OpenAI SDK base URL https://anyrouter.dev/api/v1", "Change the base URL and key in an
  existing SDK", "bring-your-own-key at $0 markup", "a 401, 429, or 5xx from one upstream
  retries on the next upstream", "`anyrouter/free` and `:free` models work on every plan,
  Free included, with no daily cap" — https://anyrouter.dev/llms.txt
- Which ids one AnyRouter key runs: `pricing.billing` in
  `curl -s 'https://anyrouter.dev/api/v1/models?all=1'`. Of 299 models, 266 are
  `"billing": "byok"` (they need your own provider key or pool access) and 33 are routed
  by AnyRouter itself. The default list without `?all` is not that list. An id shown as
  working on one AnyRouter key (frames 3, 4, 6, 7 and 9) must not be `byok`:
  `deepseek/deepseek-v4-flash`, `moonshotai/kimi-k3`, `minimax/minimax-m3.1-flash`,
  `nvidia/nemotron-3-super-120b-a12b`, `anyrouter/auto`. Frame 2's list may show any
  catalog id, AnyRouter-routed ones first. `x-ai/grok-4.7`, `z-ai/glm-5.3`,
  `deepseek/deepseek-v4.1-flash` and every Anthropic, OpenAI GPT-5.x and Google Gemini id
  are `byok`. The saved catalog is `model-billing.json` (refresh with
  `node tools/model-ids.mjs --refresh`), and `model-ids.test.mjs` fails on any byok id a
  frame shows. Claude and OpenAI appear only in frame 5, as bring your own key, on their
  real model pages ("AnyRouter has no platform route for … Requests use your key and bill
  your provider account. AnyRouter adds no fee.").
- `anyr claude --model <id>` — the real `anyr --help` and `anyr models` output
  (`shared/captures/2026-10-19/terminal/`).
- Say "no daily cap", never "unlimited". The /models tab counts ("All 89") are never on
  screen; the narration says "more than 270 models".
- No key on screen: the code reads `process.env.ANYROUTER_API_KEY`, and key rows are bullets.
- The chat in frame 7 ("Say hi in 3 words." → "Hello there, friend.") is drawn, not a
  transcript; the prompt is the one in anyrouter.dev's own Quick start example. The
  providers there are numbered, not named.

## Notes

- Do NOT reuse or imitate the intro or teaser films (their print/dither look).
- Voice: ElevenLabs Eric, voiced by `shared/authoring/eleven-voice.mjs`, word times from
  ElevenLabs' alignment. Breaths are stretched so every cut lands on a beat of the music
  (`pad-voices.mjs --beat=0.5 --phase=0.059`, the grid `hyperframes beats` found).
- Music bed: `assets/bgm/track.mp3`, retrieved once from the HeyGen music library on
  2026-10-18 for "calm minimal modern tech underscore". It is host audio in
  `audio_meta.json` (`"source": "host"`), and the storyboard says `music: none`.
- v1 (releases 001 to 003) explained the shared pool and a step-by-step donate flow; its
  frames and assets are in git history.
