---
workflow: product-launch-video
flow: automation
storyboard: no
message: "One key for every AI model, and free models with no daily cap once you share a key."
destination: youtube
aspect: 1920x1080
language: en
audience: "people who have never heard of AnyRouter, technical or not"
length: 90s
angle: explainer-walkthrough
---

## Intent

A quick, calm explainer that introduces AnyRouter to someone who has never heard
of it. English voiceover. White, simple, professional motion design. A newcomer,
technical or not, must understand it on one watch.

The user's words: "quick explain and introduce what anyrouter is for person who
didn't know", "using white style and simple", "capture real resource, artifacts,
icons", "a unified gateway with a big pool of tokens", "make the video
professional", "review to make sure if I am the new one, tech or non-tech still
understand".

Three things the viewer actually wants, in this order:

1. What it is: one gateway in front of every AI provider, one key, plus a big
   shared pool of tokens.
2. Free models, step by step: create a key on OpenRouter (or NVIDIA NIM), donate
   it to the AnyRouter pool, use free models with no daily cap.
3. Coding with Claude Code: `anyr login`, then
   `anyr claude --model anyrouter/free` with the model id rotating through
   `anyrouter/free`, `anyrouter/auto`, `anyrouter/coding`.

## Customizations

- Anatomy-style diagram for the gateway: apps on one side, providers on the
  other, AnyRouter in the middle, with the shared pool under it.
- Step-by-step walkthrough beats with numbered steps and a cursor on real UI.
- Terminal beat that types the real commands; the model id rotates in place.

## Notes

- Do NOT reuse or imitate the existing intro or teaser films (their print/dither
  look, neon plates, scenes or score). Start from a blank page.
- Every claim traces to a live public source (verified 2026-10-18):
  - "one OpenAI- and Anthropic-compatible gateway", "260+ models across 17+
    providers", "automatic failover", "anyrouter/free … no daily cap",
    "donate a key, earn credits" — https://anyrouter.dev/llms.txt
  - Donating a key: "You get Go free, $4 credit a month and 5% back" —
    https://anyrouter.dev/donate
  - Free plan + donated eligible key unlocks the shared pool's free models;
    OpenRouter keys start `sk-or-`, created at openrouter.ai/keys → Create Key;
    added at Dashboard → BYOK → OpenRouter → Add key → Save; then "Donate to
    pool" — docs/guides/unblock-free-model-rate-limits-openrouter-key.md
  - NVIDIA NIM: build.nvidia.com → open a model → Get API Key (`nvapi-`) —
    docs/guides/free-capacity-with-your-own-keys.md
  - `anyrouter/free`: curated $0 models plus the donated free pool, never
    credits, no daily request limit. `anyrouter/auto`: top models with
    health-aware fallback. `anyrouter/coding`: tool-calling models your own keys
    reach, best for coding first — GET /api/v1/models?all=1
  - `anyr login`, `anyr claude --model <id>` — anyrouter-dev/cli README and
    `src/help.rs`; install `curl -fsSL https://anyrouter.dev/setup.sh | bash`.
- Say "no daily cap", not "unlimited": free models are capped at 2400 requests
  per minute per key (agents.md). The honest word is no daily cap.
- Do not show anyone's real API key. Keys on screen are visibly redacted.
- Music bed: `assets/bgm/track.mp3`, retrieved once from the HeyGen music library on
  2026-10-18 for "calm minimal modern tech underscore". It is declared as host audio in
  `audio_meta.json` (`"source": "host"`) and the storyboard says `music: none`, so a
  re-voice never re-runs the lookup (which needs HeyGen and dropped the bed once).
