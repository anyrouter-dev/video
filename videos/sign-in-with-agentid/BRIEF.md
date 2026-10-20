---
workflow: product-launch-video
flow: automation
storyboard: no
message: "AnyRouter now supports sign-in with AgentID. Your agent signs in from its own AgentMail inbox and gets its own AnyRouter account, with no form and no password."
destination: youtube
aspect: 1920x1080
language: en
audience: "a developer who runs agents"
length: 30-40s
angle: benefit-first
voice: elevenlabs "Eric - Smooth, Trustworthy" (cjVigY5qzO86Huf0OWal)
---

## Intent

A short narrated announcement for developers who run agents. The benefit first: an agent
can get its own AnyRouter account, under its own address, without a person signing up and
pasting it a key. Then how short the path is: AgentID on the sign-in screen, one call from
the agent's AgentMail inbox, signed in seconds later. Then the payoff: the agent's first real
response, from its own key. No OAuth or key-exchange internals.

AgentID is the sign-in. AgentMail is the inbox the identity lives in. The film never says
more about AgentID than the captures and AgentMail's docs show.

## Customizations

- Same look and tools as the sign-in-with-anyrouter film: `frame.md` links the explainer's
  v3 "Monolith", `tools/kit` links the explainer's kit, `caption-skin.html` links the
  explainer's.
- Every value on screen comes from a capture made for this film on 2026-10-20, under
  `shared/captures/2026-10-20/agentid/` (`manifest.json` says where each came from). The
  AnyRouter sign-in widget, the AgentID waiting page, the account menu and the agent's
  first call are redrawn in the kit from those values. No screenshot is embedded.
- The AgentID mark is the one brand mark taken from a page: `assets/agentid-mark.svg` is
  the `<svg data-agentid-logo>` from `auth.agentid.com`'s waiting page with its blur glow
  layer dropped (no glows in Monolith).
- The agent on screen is the real test agent `duyetbot@agentmail.to`, the only AnyRouter
  account the film shows.
- Secrets: the AgentID auth token is shown truncated (`EHCa…`), the AgentMail key only as
  the page's own `$AGENTMAIL_API_KEY`, the AnyRouter key as `sk-ar-v1-••••`. The
  `agentid-film` key used for the first call was deleted after the capture; the same call
  then returned 401 (`key-revoked-check.txt`).
- The waiting page's labels are uppercase on the page ("SIGN IN TO ANYROUTER"); the film
  sets them in sentence case per Monolith, same words.

## Claims ledger

Captures: `shared/captures/2026-10-20/agentid/` (C/ below), made 2026-10-20 14:53 to 15:00 UTC
with `agent-browser` (headless) and `curl`. AnyRouter's product repo has no AgentID code, so
AgentID behavior is sourced to the live captures and AgentMail's docs only.

| # | Claim | Source |
|---|---|---|
| A1 | AnyRouter's sign-in screen, "Continue to AnyRouter", offers AgentID first, then GitHub, then "Email address or username" and Continue. | C/`sign-in.txt` (live https://anyrouter.dev/sign-in, accessibility tree) |
| A2 | AgentID lets agents sign in to apps with an AgentMail inbox as their identity. ("Now agents can sign in to AnyRouter with AgentID.") | C/`agentmail-docs-agentid-sign-in.md` line 1 of the body ("AgentID lets agents sign in to apps using an AgentMail inbox as their identity."); A1 |
| A3 | AgentID's page reads "Sign in to AnyRouter", "Waiting for your agent to authorize an inbox…", and "Run this with your agent" over a curl to `POST https://api.agentmail.to/v0/inboxes/$AGENTMAIL_INBOX_ID/authorize` with an `auth_token`. It shows "Expires in 4:56". | C/`wait-page.txt` (live auth.agentid.com/v0/authorize/wait) |
| A4 | The agent authorizes with one call from its own inbox: that curl, run as `duyetbot@agentmail.to`, answered HTTP 202 `{"api_key_id":"…","instructions":"Authorization complete. Return to browser."}`. | C/`authorize-response.txt`; docs: "Nothing further is required from the agent" |
| A5 | Seconds later the waiting browser was on anyrouter.dev, signed in: the authorize call was at 14:54:23Z, the browser was signed in by 14:54:38Z. ("Seconds later") | C/`signed-in.txt` |
| A6 | Its own account: the account menu reads AgentMail, `duyetbot@agentmail.to`, Free. | C/`signed-in.txt`, C/`account-menu.png` |
| A7 | No password: Settings reads "No password (OAuth only)", and Connected accounts lists AgentID with `duyetbot@agentmail.to`. | C/`settings.txt` |
| A8 | With its own key, the agent's first request ran on the free tier: a key `agentid-film` created on that account, then `POST /api/v1/chat/completions` with `model: "anyrouter/free"` answered "Hello! I'm here and ready to help." with `usage.cost` 0. The code bar names the key's owner and name, `duyetbot@agentmail.to · agentid-film`. | C/`keys-after-call.txt`, C/`chat-request.json`, C/`chat-response.txt` |
| A9 | `anyrouter/free` runs on every plan, Free included, and deducts no credits; it is not BYOK. (Why the film's call uses it: named free models such as `minimax/minimax-m3.1-flash` returned 402 on the Free plan at $0.00.) | https://anyrouter.dev/llms.txt line 11 (read 2026-10-20); C/`models-subset.json` (pricing 0, no `billing: "byok"`); C/`manifest.json` entry for `chat-response.txt` |
| A10 | Close: "Give your agent its own AnyRouter account. Start at anyrouter.dev." The sign-in is at anyrouter.dev/sign-in. | A1, A6 |
| F1 | Framing, not a product claim: "Usually, a person signs up for it, with a password." The contrast the film proves is A7: the agent's account has no password. The film does not claim AgentID removes making a key: the agent's key was made in its own signed-in account. | A7; C/`keys-before.png` ("No API keys yet"), C/`keys-after-call.txt` |

## Not claimed

- Nothing about AnyRouter being in AgentMail's app catalog (it is not listed there yet).
- No "by itself" for the whole flow: in this capture the sign-in started from a browser click
  on AgentID; the agent's part was the one authorize call. `agentmail apps connect` can start
  it from the agent's side (docs), but this film did not capture it, so it does not show it.
- No claim that the agent's key reaches every model: on the Free plan at $0.00, paid and
  Pool models answered 402, so the film shows the free tier only.
- No prices, no counts, no "unlimited", no "verified".
- No time beyond what was measured: "seconds later" (15 s measured), "Expires in 4:56" as shown.
