---
workflow: general-video
flow: automation
storyboard: no
message: "One key, every model — and you can start free by donating a key you're not using."
destination: web / social showreel
aspect: "16:9"
length: 60s
language: en
audience: developers building their next AI app
---

## Intent
A 15–20s showreel-grade motion piece introducing anyrouter.dev. The user asked
that it "shows what an incredible motion designer you are", that it be light-themed,
match the product design, use real product UI/logo/assets (from the codebase and /brand),
and have music with the motion cut to it.

Must communicate: what AnyRouter is (one OpenAI-compatible gateway), how it works
(one base URL → every provider), the donated-free-keys → shared-pool → free-models loop,
the cheap way to start the next AI app, and free millions of tokens.

## Assets
- Real captures of anyrouter.dev (light mode, 2x) → `assets/shots/` (capture/capture.mjs)
- Brand marks from `public/brand/`, provider logos from `public/providers/`
- Fonts: Inter + JetBrains Mono (the site's and lib/film.mjs's; same files as shared/fonts)
- Score: lib/sound.mjs palette `intro`, cues in `audio/make-score.mjs` → `audio/score.wav`

## Customizations
- Tokens (v4, same as lib/film.mjs): paper #F7F4EC, ink #0A0A0A, ink2 #545454, signal #C2560F (text #A84600), free green #33692B
- Every on-screen number traced to live API or repo source (see Notes)

## Notes — claims ledger (verified 2026-09-29)
- 215 models — GET /api/v1/models?all=1 → 215 entries (site copy says "206+"); video says "200+ models"
- 92 keys pooled · 42 donors · 21 providers — GET /api/v1/pool/analytics
- Go $2/mo or donate 1 key (free); $4 credits/mo ≈ ~16M tokens on fast models — packages/ui/src/components/pricing/tiers.ts
- Pro $10/mo, $20 credits ≈ ~84M tokens — tiers.ts
- BYOK at no markup — hero-copy.tsx
- Rotating model ids — hero-code-card.tsx ROTATING_MODELS (grok-4.5 dropped: not in public catalog)

## v2 (2026-09-29) — user revision
- "bg is AI slop → dither style", redraw components clearer, extend to 30s, clearer pool donation,
  more motion (zoom, 3D), no need to follow the landing design, add charts from /data pages.
- New look: 1-bit print — live ordered-dither canvas (Bayer 8×8) + dither-dissolve transitions,
  Geist + JetBrains Mono, ink rules, dithered hard shadows, timecode frame chrome.
- Pool told in 5 steps (429 wall → donate toggle → failover → rides free → donors earn).
- Charts (live 2026-09-29): /api/v1/analytics/leaderboards-speed (top 5 tok/s),
  /api/v1/analytics/network (2.36B tokens · 54,951 req · 83% prompt cache · daily by model),
  /api/v1/pool/analytics (92 keys · 42 donors · 3,052 requests). Raw JSON in data/.
- Earnings table + "one working key makes Go free" from /byok/pool and /donate copy.

## v3 (2026-09-29) — user revision: 60s, readable, more 3D, new music
- "too much info, can't read that fast" → 60s (30 bars @ 120 BPM); every headline holds ≥1.5s after
  its entrance, charts hold ≥2s after building. Same scenes, same numbers (ledger above unchanged).
- Timing: intro 0–4 · unify 4–8 · one key 8–12 · one line 12–18 · 200+/speed 18–24 · pool 1–5 at
  24/28/32/36/40 · live data 44–50 · pricing 50–54 · drop 54–56.5 · end 56.5–60.
- "zoom in maxxing" → zoom-throughs (hub 24x → key tile 34x → pull back out of the ink code card;
  toggle 40x; pool sphere; "$0" 16x), whips (x/y), tilted 3D planes + slow orbits on every hold.
- "change the music, invent the catchy rhythm" → new score: 2-step garage groove + a 3-3-4-2 clave
  hook that follows I–vi–IV–V, formant vox chops, woodblock clave. v2 score kept as audio/score_30s.wav.
- v2 composition archived as archive/index.v2-30s.html.txt (removed in v4; it is in git history).

## v4 (2026-10-01) — one brand with the generated films, new sound, claims re-verified
Why: the nightly films (model-drop, release, changelog) now share the print look of lib/film.mjs; the intro
is the channel trailer and must read as the same brand. Same story, same 14 scenes, same 60s.
- Tokens: cool paper #F1F2F4 + #F38020 → the site's warm paper #F7F4EC, ink #0A0A0A, ink2 #545454, one
  signal #C2560F (text-safe #A84600). Errors (429) print in the signal tone instead of a second red; "it
  worked" is the site's dither-green. Code-card syntax cut to grey / white + the signal lifted for ink.
- Type: Geist → Inter (800, negative tracking) + JetBrains Mono. Geist and the serif font removed.
- Frame chrome matches the engine fx layer: 2px crop marks, brand, `INTRO` label + timecode, chapter,
  one progress cell per chapter (v3 had a fixed 15 × 4s grid that did not match the cuts).
- Backdrop and cuts match the engine: clean paper ellipse in the centre, ink that breathes on the beat,
  a signal band, a dither ring on every cut; wipes alternate ink / signal (v3's paper wipes were invisible).
- Hard dotted shadows: 14px offset, animatable (`--sh`) so a stamp grows its shadow.
- S1: a rule prints under the lockup before the slate types, as in the engine opening.
- S3 (one key) was a small key card and a dead right half, and its second headline held under 1s before
  the zoom. Now the 12 chips collapse INTO a larger key card, three pills stamp (one key · one bill ·
  200+ models), and the right half counts what was replaced: "8 keys · 4 SDKs" struck → "1 key." — the
  counts are the chips on screen. The collapse moved to 9.2s, so "AnyRouter gives you one." holds 1.6s.
- P1: the log box no longer collides with the second headline line. P2 lowered to fill the frame.
  P4 stat labels tightened to their numbers.
- P4 free models: v3's chips said `deepseek/*`, `qwen/*`, `z-ai/*`, `meta/*`, `gemini/*` "$0 · FREE" —
  wildcards the catalog does not support (z-ai and meta have no $0 model). Now five real $0 models:
  deepseek-v3.1, qwen3.5-plus, minimax/m2, command-a-plus, grok-4.1-fast (x-ai/grok-4.1-fast-reasoning).
- Drop: "Millions of tokens. Zero dollars." lands at ~54.8 and holds to 56.3 (v3: 1.1s).
- Sound: the python scores are gone; `audio/make-score.mjs` renders lib/sound.mjs palette `intro` with
  87 cues — a cut on every scene change, hits on the big moments (hub, key, 200+, the 429 stamp, the
  toggle, 200 OK, 2.34B, $0, the drop), ticks on rows / chips / routes, rises into every zoom-through,
  the end cue at 57.0. Re-run it after any timing change in index.html, or after lib/sound.mjs changes.
- Clean-up: archive/, assets/shots/, assets/brand/, 17 unused provider marks, two unused data files, the
  Geist and serif fonts and the python scores removed (70 tracked files, 22.7 MB).

### Claims re-verified 2026-10-01 (GET, public endpoints; raw JSON refreshed in data/)
| On screen | v3 | v4 | Source |
|---|---|---|---|
| 200+ models | 215 | 235 entries (still "200+") | /api/v1/models?all=1 |
| keys donated · donors · providers · requests | 92 · 42 · 21 · 3,052 | unchanged | /api/v1/pool/analytics |
| fastest routes, median output tok/s, 30d | Dots3 1113.6 · Gemini 2.5 Flash-Lite 1079.4 · Space Bunny 207.5 · Ling-3.0-flash 198.7 · Qwen3.8-27B 169.8 | Gemini 2.5 Flash-Lite 1079.4 · Dots3 1022.3 · Space Bunny 202.8 · Ling-3.0-flash 198.7 · Union Alpha 134.4 | /api/v1/analytics/leaderboards-speed |
| tokens routed in 30 days | 2.36B | 2.34B (2,339,889,061) | /api/v1/analytics/network `totals` |
| requests · 30 days | 54,951 | 55,371 | same |
| prompt tokens from cache | 83% | 84% (1,929,904,572 / 2,302,446,104) | same |
| top models by tokens | 37.1 · 29.0 · 9.0% | Laguna S 2.1 37.6 · anyrouter/auto 29.3 · stealth/union-alpha 9.0% | same, `top_models[].share` |
| daily tokens by model | Aug 31 – Sep 29 | Sep 1 – Sep 30 | same, `trend.30d` + `model_trend` |
| free models | wildcards | five real $0 ids | /api/v1/models?all=1 (34 models at $0 / $0) |
| Go $2 or 1 donated key · $4/mo · ~16M tokens · 1000 req/day | | unchanged | anyrouter.dev/pricing |
| Pro $10 · $20 · ~84M · 1200 req/min · ZDR; Pro+ $45 · $100 · ~420M · 1800 req/min | | unchanged | anyrouter.dev/pricing |
| donors earn 5–8%; $100 → +$5–8 … $1,000 → +$50–80 | | unchanged — note /donate also caps rewards at $1 per key per UTC day, which the /byok/pool table does not show | anyrouter.dev/byok/pool, /donate |
| 3 straight 429s auto-pause a key; opt-in per key, explicit consent, opt out anytime | | unchanged | anyrouter.dev/donate, /byok/pool |
| model ids in the code card | | all four still in the catalog | /api/v1/models?all=1 |
