---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Share a provider key you don't fully use with the AnyRouter pool. Members' requests can run through it, and you get Go free, $4 of credit a month and 5% back. It uses your provider quota, so check your provider's terms, and you can stop any time."
destination: youtube
aspect: 1920x1080
language: en
audience: "someone with a provider API key whose quota sits idle, technical or not"
length: 38s
angle: benefit-first
voice: elevenlabs "Eric - Smooth, Trustworthy" (cjVigY5qzO86Huf0OWal)
---

## Intent

A short narrated guide film: donate an idle provider key to the shared pool. What the
owner gets, what members get, what it costs the owner, and that it stops with one
switch. Honest on the two catches: shared traffic runs on the donor's provider quota,
and the donor must check the provider's terms.

## Customizations

- Same look and tools as the OpenRouter film (`frame.md`, `tools/kit` and
  `caption-skin.html` link the explainer's).
- The Add key option row and the share switch are redrawn in the kit from the real
  dashboard source (labels below). No anyrouter.dev screenshot is embedded.
- The provider shown is generic ("Your provider", a key `sk-••••`), so the film does not
  imply any one provider's terms allow sharing.
- The usage meter in Frame 5 is drawn, not a real account, and carries the
  "Illustration" badge.

## Claims ledger

Product repo: `/Users/duet/project/anyrouter-dev/anyrouter` at `5771cebb6` (2026-10-19).
Live sources read 2026-10-20. P-claims reuse the OpenRouter film's verified C10, C14, C15
where noted.

| # | Claim | Source |
|---|---|---|
| P1 | You can donate a provider key with quota you don't always use to the community shared pool. | anyrouter.dev/docs/features/shared-pool.md (live 2026-10-20: "If you hold a provider account with quota you don't always use ... you can donate that key to the pool") |
| P2 | On the Add key form the switch is "Donate to the shared pool"; on a saved key it reads "Not shared" / "Shared". Donating is opt-in, per key. | `packages/ui/src/components/byok-add-key/add-key-options.tsx:139`; `apps/dashboard/src/app/byok/-components/key-line.tsx:213`; shared-pool.md ("Opt-in, per key") |
| P3 | Members' matching requests can be routed through a donated key. The pool is open to Go subscribers and to anyone with an active donated key. | shared-pool.md ("route other users' matching requests through your provider account"; FAQ "What does Free via Pool mean": "the pool itself is open to Go subscribers and to anyone with an active donated key"); OpenRouter film C4 |
| P4 | Your own requests always come first on your key. | shared-pool.md ("You always keep first call on your own key"); OpenRouter film C14 |
| P5 | Donating a working key gets you Go free with $4 of credit a month, and 5% back of the token cost of requests it serves (8% on Pro and Max), capped at $1 per key per UTC day. | anyrouter.dev/pool (live 2026-10-20: "You get Go free, $4 credit a month and 5% back (8% on Pro and Max)."); `packages/server-core/src/utils/donation-subscription.ts:1-31` (a working donated key auto-grants Go and its monthly credit); `packages/server-core/src/utils/byok-pool-reward.ts` (`DONOR_REWARD_RATE_BASE = 0.05`, `DONOR_REWARD_RATE_TOP = 0.08` for Pro and Max, `POOL_DAILY_REWARD_CAP_USD = 1.0`); `apps/dashboard/src/app/byok/-components/pool-panel.tsx:376-381` ("Go ($4 monthly credit)") |
| P6 | Requests the pool sends through your key run on your provider account and use its quota. | shared-pool.md ("exactly as if you'd made the call yourself"); `pool-panel.tsx:379` ("your provider account shows the usage"); OpenRouter film C14 |
| P7 | Check that your provider's terms allow sharing before you donate. | shared-pool.md ("You're responsible for confirming that before you donate"); `pool-panel.tsx:379-380` ("make sure your provider's terms allow it"); OpenRouter film C15 |
| P8 | Turn the switch off any time and the key leaves the pool at once. Turning off your last donated key pauses Go and takes back that month's credit. | shared-pool.md ("Withdraw instantly"; FAQ "How do I stop donating?"); `pool-panel.tsx:380-381` ("turning off your last donated key pauses Go and claws the month's credit back") |
| P9 | Donated keys are encrypted at rest and never shown again. Not narrated. | shared-pool.md FAQ "Is my key safe?" |

## Not claimed

- No live pool counts (they change daily).
- No provider named as allowed to share: the donor checks their own provider's terms.
- "5% back" is said with the cap and the Pro and Max rate on screen, never "earn" as income.
