---
workflow: general-video
flow: automation
storyboard: no
message: "One key, every model — and you can start free by donating a key you're not using."
destination: web / social showreel
aspect: "16:9"
length: 18s
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
- Fonts from the product: Inter / Geist / JetBrains Mono (+ Instrument Serif italic accent)
- Score synthesized from scratch: `audio/make_score.py` → `audio/score.wav`

## Customizations
- Brand tokens: Accent #F38020, Ink #0A0C10, Surface #F6F7F9, UI primary oklch(0.555 0.163 49) ≈ #C2560F
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
- v2 composition archived as archive/index.v2-30s.html.txt.
