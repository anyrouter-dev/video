---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Your OpenRouter free models stop at OpenRouter's limit. Add your key to AnyRouter and share it with the pool, and you can send more requests than that limit allows."
destination: youtube
aspect: 1920x1080
language: en
audience: "someone already using OpenRouter's free models, technical or not"
length: 60s
angle: tutorial-walkthrough
voice: elevenlabs "Eric - Smooth, Trustworthy" (cjVigY5qzO86Huf0OWal)
---

## Intent

A short narrated tutorial for someone who already uses OpenRouter's free models
and keeps hitting OpenRouter's rate limit. It shows the wall, the reason (one key,
one limit), the fix in three steps, how a request moves once the fix is on, and a
close. White, calm, the same look as the sibling explainer film.

The user's words: "I have OpenRouter but free. OpenRouter has :free models but with
rate limit. By adding the OpenRouter key as a BYOK key and enabling the pool, the
user can unblock the rate limit by using the keys pool."

## Customizations

- Shares the explainer's design truth (`frame.md` is a symlink to
  `../explainer/frame.md`, v2) and its components (step header, browser frame,
  focus ring, callout, key pill, terminal, Demo badge). The step header carries
  this film's own steps: `Create a key`, `Add it to AnyRouter`,
  `Share with the pool`, `Use it in your app`.
- Ships landscape (1920x1080) and portrait (1080x1920) from the same frames; each
  frame's portrait layout sits under `@media (orientation: portrait)`.
- Dashboard screens are rebuilt in HTML from the product's UI source, labels
  exact (`tools/ui-labels.md`). Keys are always redacted.
- Does not reuse or open the repo's older films (intro, teaser, `lib/film.mjs`).

## Claims ledger

Every number or claim on screen is one of these. Sources were read 2026-10-18.

| # | Claim | Source |
|---|---|---|
| C1 | OpenRouter free models: 20 requests per minute; 50 requests per day without $10 of credits; 1000 per day with at least $10. Over it, a request gets `429 Too Many Requests`. | openrouter.ai/docs/api-reference/limits (constants) |
| C2 | Your own BYOK key is always tried first. | anyrouter.dev/docs/features/credential-selection.md ("Your own keys come first") |
| C3 | A rate limited (429) key is set aside for a short cooldown and automatically returns to rotation. | credential-selection.md, line 77 of the live doc |
| C4 | If you are eligible for the shared pool (you donated a key, or you hold a paid plan), the request can go through a donated key from another member. | credential-selection.md |
| C5 | Credits are the last fallback; BYOK requests are never charged to credits. | credential-selection.md |
| C6 | A `:free` model whose routes all fail answers through `anyrouter/free` (`x-anyrouter-fallback: anyrouter/free`). | anyrouter.dev/docs/features/free-tier.md |
| C7 | AnyRouter free models: no daily cap on any plan; 2400 requests per minute per API key. Say "no daily cap", never "unlimited". | free-tier.md (live: "There is no per-account daily cap, on any plan") |
| C8 | Create the key: openrouter.ai → Keys → Create Key → copy. Keys start `sk-or-`. | docs/guides/unblock-free-model-rate-limits-openrouter-key.md |
| C9 | Add it: Dashboard → BYOK → OpenRouter → paste into "API key". AnyRouter makes one live call to OpenRouter before it stores the key; encrypted at rest, never shown again. Base URL `https://openrouter.ai/api/v1` is the default. | same guide + docs/features/byok-providers/openrouter.md |
| C10 | Donating: per-key switch; AnyRouter verifies the key ("Key verified"); your own requests always come first; turn it off any time; earn 5% (Go or no plan) / 8% (Pro, Max) of the token cost of requests it serves, capped at $1 per key per UTC day. On the Free plan, donating an eligible key unlocks the shared pool's free models. | docs/features/shared-pool.md + the guide |
| C11 | Live pool (anyrouter.dev/pool, captured 2026-10-18): OpenRouter, Free, 74 keys, 1.2B tokens; NVIDIA NIM, 33 keys. | `assets/anyrouter-pool.png` (real screenshot) |
| C13 | The limit belongs to the account: more keys on one account do not raise it ("One account. One limit."). | openrouter.ai/docs/api-reference/limits.md (live 2026-10-19: "Making additional accounts or API keys will not affect your rate limits") |
| C14 | Shared-pool traffic on your donated key runs on your OpenRouter account and uses its quota (its 20/min and 50/day). Your own requests are tried first. | anyrouter.dev/docs/features/shared-pool.md (live 2026-10-19: "route other users' matching requests through your provider account, exactly as if you'd made the call yourself"; "You always keep first call on your own key") + the dashboard consent line "the usage appears on your OpenRouter account" (`tools/ui-labels.md`) + C13 (limit per account) |
| C15 | Check that OpenRouter's terms allow sharing before you donate; the dialog calls sharing "donating". | docs/guides/unblock-free-model-rate-limits-openrouter-key.md (live 2026-10-19: "Check that OpenRouter's terms allow sharing your key before you donate") + shared-pool.md ("You're responsible for confirming that before you donate") |
| C16 | Your app uses an AnyRouter key: Dashboard → API Keys (`anyrouter.dev/dashboard/keys`) → Create key → "Key name" → "Your new API key", shown once, Copy. Keys are `sk-ar-…`. | anyrouter.dev/docs/features/api-keys.md (live 2026-10-19) + product source `apps/dashboard/src/app/keys/-components/create-key-form.tsx`, `packages/ui/src/components/dashboard/create-key-dialog/key-created-view.tsx`, nav label "API Keys" (`packages/lib/src/navigation.ts:399`) |
| C17 | `openrouter/free` is OpenRouter's own Free Models Router: it picks a `:free` model, so the free limits (C1) apply. The same id works on OpenRouter and on AnyRouter, so the model line stays. | openrouter.ai/docs/guides/routing/routers/free-router.md (live 2026-10-19) + `GET https://openrouter.ai/api/v1/models` (`openrouter/free`, "Free Models Router") + C12 |
| C18 | Shared keys are other members' provider accounts with their own limits, so the extra room is not fixed ("more room", "can vary"; never "keeps going"). | credential-selection.md (live 2026-10-19: shared pool is paid by "A donor's provider account") + C1, C13 |
| C12 | Model ids on screen exist in `GET https://anyrouter.dev/api/v1/models?all=1` (checked 2026-10-18): `anyrouter/free`, `openrouter/free`. The live list has no `:free`-suffixed id, so none is shown. | live API |

## UI label source

Live dashboard code (`apps/dashboard/src/app/byok/` in the product repo), traced
in `tools/ui-labels.md`. The public docs still describe an older dashboard
("Available" grid, "Save", "Donate to pool"). The screens follow the code; the
narration uses plain words true for both ("pick OpenRouter", "paste your key",
"share it with the pool").

## Notes

- Do not show anyone's real API key. Keys on screen are `sk-or-v1-••••••••••••`.
- Never "unlimited". Never a number outside the ledger.
- Voice: ElevenLabs "Eric - Smooth, Trustworthy" (`cjVigY5qzO86Huf0OWal`), model
  `eleven_multilingual_v2`, stability 0.5, similarity_boost 0.8, style 0.15, speaker
  boost on, the same for every line. Each mp3 is converted to 24 kHz mono wav.
- Music bed: `assets/bgm/track-108s.mp3`, made from the explainer's 68s `track.mp3` (60 BPM) for the 106.6s film.
  A plain loop let the track's outro fade to silence at 68s and restart mid-film. The bed
  instead jumps back twice on the bar, each with a 3s crossfade: 16s (4 bars), then 24s
  (6 bars). 0–40s, then 21–56s, then 29s to the real outro, 108s in all, so the bed runs
  1.4s past the film's end and the film closes inside the real outro:
  `ffmpeg -i track.mp3 -filter_complex "[0:a]asplit=3[a][b][c];[a]atrim=0:40,asetpts=PTS-STARTPTS[x];[b]atrim=21:56,asetpts=PTS-STARTPTS[y];[c]atrim=29:68,asetpts=PTS-STARTPTS[z];[x][y]acrossfade=d=3:c1=tri:c2=tri[xy];[xy][z]acrossfade=d=3:c1=tri:c2=tri" -b:a 192k track-108s.mp3`
