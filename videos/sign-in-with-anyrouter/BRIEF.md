---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Add a Sign in with AnyRouter button. Your users bring their own AnyRouter account, and their AI usage is billed to them, never to you."
destination: youtube
aspect: 1920x1080
language: en
audience: "a developer building an app with AI features"
length: 33s
angle: benefit-first
voice: elevenlabs "Eric - Smooth, Trustworthy" (cjVigY5qzO86Huf0OWal)
---

## Intent

A short narrated guide film for app builders. The benefit first: you add AI to your
app and never hold your users' model bill. Then how little it takes: one button, a
consent screen your users approve on AnyRouter, a temporary key, and the same API.
Then the user's control (revoke any time). No OAuth internals on screen beyond the
token the app receives and the one call that uses it.

## Customizations

- Same look and tools as the OpenRouter film: `frame.md` links the explainer's v3
  "Monolith", `tools/kit` links the explainer's kit, `caption-skin.html` links the
  explainer's.
- The consent screen in Frame 3 is redrawn in the kit from the real page's source
  (`src/app/oauth/consent.tsx`, `src/app/-components/oauth/consent-layout.tsx`,
  `permission-picker.tsx`, `identity-card.tsx`, scope labels from
  `packages/lib/src/auth/scope-catalog.ts`). No anyrouter.dev screenshot is embedded.
- "My AI App" and `myapp.example` are the guide's own example names, so the app on
  screen is the guide's sample app, not a real product.
- The consent screen is cropped to its header, the permission list and its two buttons;
  the "Signed in as" and "This app receives" cards are left out, so no placeholder person
  is drawn.
- Keys are always redacted (`sk-ar-v1-••••`).

## Claims ledger

Product repo: `/Users/duet/project/anyrouter-dev/anyrouter` at `5771cebb6` (2026-10-19).
Live sources read 2026-10-20.

| # | Claim | Source |
|---|---|---|
| S1 | Add a "Sign in with AnyRouter" button; each user signs in with their own AnyRouter account, and usage is billed to that user's account (their credits or free tier), never to the app builder. | `src/content/docs/guides/sign-in-with-anyrouter.md` (live: anyrouter.dev/docs/guides/sign-in-with-anyrouter.md) intro; `src/app/sign-in-with-anyrouter/index.tsx` ("No AI bill for you", "Each user pays from their own credits or free tier") |
| S2 | The consent screen on AnyRouter: the app's two marks joined by an arrow, "{app} wants to access your account", "AnyRouter has not verified this application" for an app outside the first-party registry, the permission list "Run AI requests" ("Send prompts to models and bill the usage to your account.") and "View basic profile", a "Signed in as" card, "This app receives", and Cancel / Authorize. | `src/app/-components/oauth/consent-layout.tsx:200-300`, `src/app/oauth/consent.tsx:99-262`, `packages/lib/src/auth/scope-catalog.ts:50-54,145-149`, `src/app/-components/oauth/identity-card.tsx`, `src/app/-components/oauth/key-selector.tsx:359-371` |
| S3 | The app receives a temporary key: `access_token` `sk-ar-v1-…`, `scope` `"inference read:profile"`, `expires_in` 2592000 (30 days by default). It can run AI requests and read the profile, and nothing else: no key management, no usage or billing data, no account settings. | guide "Exchange the code" and "Permissions" sections; `SIGNIN_BUNDLE` `packages/lib/src/auth/management-scopes.ts:81`; `SIGNIN_KEY_TTL_SECONDS = 30 * 24 * 3600` `packages/server-core/src/oauth/provider.ts:138` |
| S4 | The token is used like any AnyRouter API key, on the OpenAI-compatible endpoint `https://anyrouter.dev/api/v1`. | guide step "Run AI requests as the user" ("Use the token like any AnyRouter API key"); the OpenRouter film's code card uses the same base URL with the OpenAI SDK (its C16) |
| S5 | Users can revoke the app any time from Connected apps in their dashboard; every token for that app then returns 401. | guide "Revocation"; `apps/dashboard/src/app/-components/mcp/connected-clients-card.tsx:58-59` ("Connected apps"), `apps/dashboard/src/app/-components/mcp/helpers.ts:40-45` (`app:*` origin = Sign in with AnyRouter) |
| S6 | The model on screen, `moonshotai/kimi-k2.6`, runs on AnyRouter credits: `pricing.billing` is not `byok`. The guide's own example, `google/gemini-3.5-flash`, is BYOK-only today, so it is not shown. | `GET https://anyrouter.dev/api/v1/models?all=1` (2026-10-20): `moonshotai/kimi-k2.6` billing null, prompt 0.4323; `google/gemini-3.5-flash` billing `byok` |
| S7 | Registration is open and returns a public `client_id`; there is no client secret (PKCE, public client). Not narrated. | guide "Before you start" and step 1; `src/app/sign-in-with-anyrouter/index.tsx:35` |

## Not claimed

- No price, no user counts, no "every model" (a user's key reaches only what their
  account can run on credits, the free tier or their own BYOK keys).
- No "verified" badge: a third-party app is never verified on the consent screen.
