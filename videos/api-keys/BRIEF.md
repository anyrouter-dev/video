---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Give each app its own AnyRouter API key: name it, add the limits you want, save it once, and disable it in one click when you are done."
destination: youtube
aspect: 1920x1080
language: en
audience: "a developer about to put AnyRouter in an app"
length: 32s
angle: benefit-first
voice: elevenlabs "Eric - Smooth, Trustworthy" (cjVigY5qzO86Huf0OWal)
---

## Intent

A short guide film to AnyRouter API keys. One key per app, the limits a key really has,
the shown-once rule, the two values an app needs, and the one-click off switch. White, calm,
Monolith (frame.md v3). The dashboard is redrawn in the kit from its real labels.

## Customizations

- Shares the explainer's design (`frame.md` and `tools/kit` link the explainer's).
- Ships landscape (1920x1080) and portrait (1080x1920) from the same frames.
- No anyrouter.dev screenshot. Every label on a drawn dashboard surface is a real label from
  the dashboard source named below.
- Keys are always redacted (`sk-ar-v1-••••••••`). The names `web-prod`, `mobile-prod` and
  `batch-prod` are the docs' own examples.

## Claims ledger

Product repo: `/Users/duet/project/anyrouter-dev/anyrouter` (read 2026-10-20, HEAD 5771cebb6).

| # | Claim | Source |
|---|---|---|
| K1 | One key per app is the recommended practice; there is no per-account key limit. | `public/docs/features/api-keys.md` ("One key per application per environment", examples `web-prod`, `mobile-prod`, `batch-prod`; "there is no per-account limit") |
| K2 | A key has a name ("Key name", shown in the dashboard and request logs). | `apps/dashboard/src/app/keys/-components/create-key-form.tsx` (Label "Key name") |
| K3 | Optional limits on create: Expiration (Never, 7 days, 30 days, 90 days); Rate limit (requests per minute, placeholder "60 requests/minute"); Credit limit (a dollar cap with a daily, weekly or monthly reset, placeholder "10.00", summary format `$10.00 · monthly`). | `create-key-form.tsx` (`EXPIRY_OPTIONS`, `LimitRow` "Rate limit" / "Credit limit", `creditLabel`) + `api-keys.md` (Configuration fields) |
| K4 | The full key is shown once: "Your new API key", a Copy button that reads "Copied", and "This is the only time the full value is shown." Keys start `sk-ar-v1-`. | `packages/ui/src/components/dashboard/create-key-dialog/key-created-view.tsx` (`SecretKeyCard`) + `packages/lib/src/api/auth.ts:508` |
| K5 | An app uses the key with AnyRouter's base URL `https://anyrouter.dev/api/v1` (OpenAI SDK: `baseURL`, `apiKey`). | `public/docs/getting-started/quickstart.md:86` |
| K6 | The key's page has a "Disable key" button: one click, the chip reads "Disabled" and the status line "Disabled · requests are rejected"; it can be enabled again. Takes effect within seconds. | `apps/dashboard/src/app/-key/status-band.tsx` (`STATE_COPY`, button label, title "Prevent this key from being used. You can re-enable it later.") + `api-keys.md` (Revoke and delete: "Both take effect within seconds") |

Not shown: the per-key model allow-list (set on the key's page after creation, not in the create
form) and permissions; they are real but out of this film's scope.

## Notes

- Never show a real key. Never "unlimited" (the dashboard's own summary says "Unlimited" for a
  limit that is off; the film shows the switch instead).
- Voice: ElevenLabs Eric, `eleven_multilingual_v2`, stability 0.5, similarity 0.8, style 0.15,
  speaker boost. 388 characters voiced, one take each.
- Music: the explainer's bed (`assets/bgm/track.mp3`); lines padded to the beat.
