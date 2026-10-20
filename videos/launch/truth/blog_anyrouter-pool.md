# Introducing the AnyRouter Pool

> The AnyRouter Pool is a set of provider keys that members donate and the gateway shares, so free models keep answering for paid-plan members and donors when a single key runs dry. Here is who can donate, how a key is protected, how requests are spread across keys, what happens when a key fails, and how to stop.

- Date: October 16, 2026
- Category: product
- HTML: https://blog.anyrouter.dev/anyrouter-pool

## What the pool is

Free models run on someone's quota. When that quota is one provider key, a burst of traffic ends in 429 errors and the model looks broken. The AnyRouter Pool spreads that load. Members donate spare provider keys, and the gateway sends matching requests through whichever donated key is ready.

A donated key keeps belonging to its owner. You flip a switch on a key you already added under BYOK, and you can flip it back at any time. In return, every request your key serves adds to a pending credit balance. The rate is 5% of the request's notional token cost, or 8% on Pro, Pro+, Max and Enterprise, capped at $1 per key per UTC day. Donors who price a paid model themselves receive what the caller paid minus a 10% platform fee instead.

## Who can donate, and how

Any signed-in member can donate a key for a provider AnyRouter can route to. Claude on Bedrock, Vertex and Foundry is the exception, because those credentials open a whole cloud account rather than one inference key.

1. Open [Dashboard, BYOK](https://anyrouter.dev/dashboard/byok) and add the provider key. AnyRouter checks it against the provider first.
2. Turn on Donate to pool for that key and confirm the one-time consent. The text says other members' requests will use your key, that usage appears on your provider account, and that you are responsible for your provider's terms.
3. Choose the coverage. Free coverage serves only free models. Paid coverage also serves paid models at prices you set, from $0 up to 10% over the provider's list price.

The live [pool page](https://anyrouter.dev/pool) shows aggregate activity. The step-by-step version is in the [shared pool guide](https://docs.anyrouter.dev/features/shared-pool).

## Who can draw from it

The pool runs on reciprocity. A member can use it with at least one active donated key, or on a paid plan: Go, Pro, Pro+, Max or Enterprise. Decisions models are the exception, because they are free to every signed-in member.

Models marked Free via Pool in the catalog are served by donated keys, and they need Go or a donated key of your own. A Free-plan member who calls one gets a message that offers both ways to unlock it, either subscribe to Go or donate a key. Free models that do not say via Pool run through AnyRouter's own routes and stay open to everyone. The [free models list](https://anyrouter.dev/models?free=true) shows both kinds, so check the label before you plan around a model, and see [Pricing](https://anyrouter.dev/pricing) for plan details.

## How a donated key is protected

Your key is encrypted before it is stored, with a separate random salt for each key, and the encryption is tied to your workspace so a copied value cannot be decrypted as someone else's key. The secret that unlocks it sits in the platform's secret store, not in the database. After you save, the dashboard shows an alias and a masked identifier, never the key. Server logs mask credential fields, and your key goes only to the provider it belongs to.

| Who | What they can see |
| --- | --- |
| You, the donor | Totals for requests served, tokens and credits earned. In AnyRouter you never see the prompts or who sent them. |
| Members using the pool | The answer, like any other request. AnyRouter does not show them which donor served it. |
| Anyone on the pool page | Aggregate activity only. No keys, no members, no request contents. |
| Your provider | The requests, as usage on your account. Its own terms and logging apply. |

## How requests are routed and spread

When a request qualifies, the gateway adds donated keys to the list of routes it can try. It picks the key that has been idle the longest, with some randomness among the less recently used keys so that a burst of simultaneous requests does not pile onto one key. The pool never hands you your own donated key. Your key still serves you as a normal BYOK key.

A free-coverage key serves only free models. A paid model needs a key donated with paid coverage. If no donated key can serve a request, the gateway moves to the next route and the caller sees one response.

## When a key fails or runs out

A donated key leaves the pool when it stops being healthy, and the cause decides how it comes back.

| What happened | What the pool does |
| --- | --- |
| Three failures in a row, such as rejected credentials or provider errors | Pauses the key. A later health check resumes it once it passes. |
| Three rate-limit errors in a row | Pauses the key. A daily check turns it back on. |
| Out of credit at the provider | Pauses on the first failure. You top up, then resume or donate again. |
| A spend limit on the key itself (OpenRouter) | Pauses on the first failure, and you raise the limit before resuming. |
| The $1 daily reward cap is reached | Pauses until the next UTC day. |

OpenRouter keys with a zero balance are the one case that keeps serving, because free models there cost nothing. If your only donated key pauses, Go that came from donating pauses with it, this month's $4 credit is clawed back, and you get an email. Donate a working key again in the same month and the unspent remainder, $4 minus what you already used, is restored.

## Privacy and zero data retention

Zero data retention is the one privacy routing setting. It is off by default, so a pooled request can reach a host that keeps or trains on prompts. Turn on Always enforce ZDR in [Privacy settings](https://docs.anyrouter.dev/features/privacy-controls) and a donated key serves your request only on routes that declare zero data retention. A donated Vercel key never carries ZDR traffic.

If you donate, remember that the prompts of other members pass through your provider account. Read your provider's data and sharing terms before you switch it on.

## Stopping at any time

Turn off Donate to pool on the key. It leaves the pool right away and serves only your own requests again. You can turn it back on later.

```bash
curl https://anyrouter.dev/api/v1/chat/completions \
  -H "Authorization: Bearer $ANYROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"anyrouter/free","messages":[{"role":"user","content":"Hi"}]}'
```

_A free model through the gateway. Same URL for every member._

Donate an idle provider key from the pool page.

[Open the pool](https://anyrouter.dev/pool)
