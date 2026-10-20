# Bring Your Own Key (BYOK)

> Attach your own upstream API keys so AnyRouter routes requests through your provider accounts at list price, with no AnyRouter markup.


# Bring Your Own Key (BYOK)

If you already hold provider accounts with negotiated pricing, prepaid credits, or preview-tier access, paying AnyRouter credits on top is wasted money. BYOK lets you attach your own upstream provider API keys (OpenAI, Anthropic, Google, and others) to your account: when a request matches a model served by a provider you've configured, AnyRouter forwards the call on your key. You keep every AnyRouter feature — unified API surface, logs, analytics, presets, routing, app attribution — and pay the upstream provider directly at their list price.

## Overview

AnyRouter supports two billing modes side by side, and you can mix them — BYOK for providers where you have an account, credits as a fallback for everything else:

| Mode | Who pays the upstream | Pricing | Best for |
|---|---|---|---|
| Pay-as-you-go credits | AnyRouter | List price, no AnyRouter markup, billed against your credit balance | Quickly trying many models, no upstream accounts, single invoice |
| BYOK | You, on your provider account | Upstream list price, no AnyRouter markup | Existing provider credits, negotiated rates, preview-tier access, data residency |

The dashboard exposes BYOK for every provider AnyRouter routes to. Common ones include OpenAI, Anthropic, Google AI Studio, Groq, DeepSeek, Together AI, Mistral AI, DeepInfra, xAI, OpenRouter, Z-AI (Standard), and Z-AI Coding Plan. Enterprise endpoints such as Azure OpenAI, Amazon Bedrock, and Vertex AI accept structured credentials — the dialog shows the expected format when you select the provider.

:::note
AnyRouter never proxies your key to anyone other than the upstream provider it's scoped to.
:::

## How it works

### Routing precedence: BYOK vs. managed capacity

When a request comes in, AnyRouter picks the upstream in this order:

1. **Per-request override.** If the request sends an `X-AnyRouter-BYOK-Key` header naming a specific BYOK key alias, that key is used (and only that key). If the named key is missing, disabled, or doesn't serve the requested model, the request fails — there's no silent fallback when you've explicitly named a key.
2. **`Always use` keys.** A BYOK key with the **Always use** toggle on is tried first for matching models. How it behaves when it fails depends on its mode (see [Always use modes](#always-use-modes)).
3. **Regular BYOK keys.** With **Always use** off (or when a Prefer pin falls back), AnyRouter selects one using the configured load-balancing strategy (below). If they all fail, the request falls through to managed capacity.
4. **Managed (pay-as-you-go) capacity.** If you have no BYOK key for the provider, or every BYOK attempt failed and no Strict **Always use** pin applies, AnyRouter bills credits.

The behavior is deterministic. You can always see which path was taken by checking the `byok_key_alias` field in the request log.

### Always use modes

Turning on **Always use** for a key gives it a mode:

- **Prefer** (the default for a new pin) - the pinned key is tried first. If it fails with 401, 402, 429 or a 5xx error, AnyRouter moves on to your other keys and then managed capacity. Your other keys stay available as fallbacks.
- **Strict** - requests for matching models use only the pinned key. AnyRouter never bills platform credits and never uses the community pool for those models. If the key fails, the request fails (`byok_always_use_exhausted`). Choose this when you must never route anywhere else.

Under **Only these models** (collapsed by default) you can limit a pin to a list of model ids. Requests for other models ignore the pin. A pin is also skipped automatically for a model its provider cannot serve, so it never blocks a request it could not have answered.

**Automatic relax after repeated auth errors.** If a pinned key returns 401 or 402 three times in a row, AnyRouter relaxes the pin so a bad or empty key does not take your traffic down: a Strict pin becomes Prefer, and a Prefer pin is released. Any successful response resets the count. The key shows a notice such as "Pin relaxed to Prefer after repeated 401 errors. Re-enable to pin again." Fix the key, then save the pin again (turn Always use on, or press **Re-enable pin**) to clear the notice.

### Seeing why a request was routed

When an Always use pin applies to the requested model, the response includes `anyrouter_metadata.routingReason`:

| Value | Meaning |
|-------|---------|
| `pinned:<provider>` | The pinned key served the request. |
| `pin_fallback:<status>` | The pinned key failed with this HTTP status and another route served the request (Prefer mode). |
| `pin_skipped:unservable` | The pinned provider cannot serve this model, so the pin was skipped. |

The field is absent when no pin applies to the model.

### Load balancing multiple keys

If you have more than one key for the same provider, the provider card exposes four strategies:

- **Fallback** — Try keys in priority order, lowest number first; move on to the next key on error. This is the default.
- **Round Robin** — Cycle through enabled keys evenly. Best when all keys have the same quota.
- **Weighted** — Distribute requests proportional to each key's **Weight** (a weight-2 key receives roughly twice as many requests as a weight-1 key).
- **Random** — Pick a key at random for each request.

Disabled keys are skipped by every strategy. Keys marked **Always use** are tried before other keys, regardless of strategy.

### Auto-routing models

Once you've added one or more keys, three built-in model ids route across **all** of them without naming a specific model:

| Model id | Routes to |
|---|---|
| `anyrouter/byok` | Every model your configured keys can reach |
| `anyrouter/coding` | The coding-capable subset |
| `anyrouter/agent` | The tool / function-calling subset (built for agents) |

Use them anywhere you'd use a normal model id:

```bash
curl https://anyrouter.dev/api/v1/chat/completions \
  -H "Authorization: Bearer $ANYROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "model": "anyrouter/coding", "messages": [{ "role": "user", "content": "Refactor this function" }] }'
```

AnyRouter picks the strongest available model first and falls back through the rest if a provider is busy. Add a key for a new provider and its models join the pool automatically — no config change. The candidate list always reflects your own keys plus your privacy and Zero Data Retention settings; anything your settings hide is left out of routing. Preview exactly which models each resolves to under **Dashboard → BYOK → Auto-routing models**. Because these only use your own keys, they never spend AnyRouter credits — and calling one with no matching keys returns a clear error telling you to add a key rather than silently falling back to paid capacity.

### Failure modes

BYOK puts you on the upstream provider's account, so their failure modes become yours. AnyRouter surfaces them as cleanly as possible:

| Failure | What AnyRouter does | Where you see it |
|---|---|---|
| Invalid or revoked key | Returns the provider's `401`/`403` untouched; the key is marked **Unhealthy** after repeated auth failures. | Dashboard → BYOK → provider card, plus the request log |
| Rate-limited upstream | Returns the provider's `429` with their `Retry-After`. With more than one key and **Fallback** on, tries the next key before returning the error. | Request log, provider card status |
| Provider 5xx | Same as above — the next key in the pool is tried; if all fail, the upstream error is returned. | Request log |
| Quota exhausted | Treated as a 4xx from the provider; not retried on the same key. Round-robin and weighted strategies move on. | Request log |
| Key removed mid-request | In-flight requests already dispatched complete normally; new requests fall back per the precedence rules. | Dashboard banner on the BYOK page |

The dashboard surfaces a per-key health status (healthy / warning / unhealthy) computed from the last 24 hours of traffic. An **Unhealthy** key is automatically skipped by load balancing until it returns to healthy — it's not deleted, and you can re-test it from the dialog any time.

### Security

BYOK keys are sensitive credentials, and AnyRouter treats them that way:

- **Encrypted at rest with a per-row salt.** Each key is encrypted before storage using a salt unique to that row, so a leak of one key's ciphertext doesn't weaken any other.
- **Write-only in the UI.** After save, the dashboard shows only the alias and a masked identifier (for example `byok_01H…`). The full value can't be retrieved through the dashboard or API.
- **Never logged.** Provider keys are stripped from request and response logs; the alias and provider are preserved so you can still tell which credential served a request.
- **Live validation on save.** AnyRouter calls the provider once at save time to confirm the key is accepted, then discards the response.
- **No third-party sharing.** Your key is only ever sent to the upstream provider it's scoped to (or, where applicable, to Cloudflare AI Gateway acting as transport).

:::warning
If you suspect a key is compromised, rotate it at the upstream provider and then delete the matching key in the BYOK dashboard. Issue a separate provider key per AnyRouter account so rotations stay isolated.
:::

### The shared pool: donate a key or subscribe

The shared pool lets the community route requests through **donated** BYOK keys instead of AnyRouter's managed capacity. It's open to two groups:

- **Donors** — anyone who has flipped **Donate to pool** on at least one eligible key. Your key serves other users' requests, and you earn **up to 8% of the token cost** back as credits, automatically (8% on Pro, Pro+, and Max; 5% on Go or with no plan).
- **Paid subscribers** — anyone on the **Go ($2/mo)**, **Pro ($10/mo)**, **Pro+ ($45/mo)**, or **Max ($100/mo)** plan. This unlocks the pool for your own requests without you having to donate a key. Donating a key waives the Go subscription.

On the **Free** plan, you can't use the shared pool's free models until you donate at least one eligible key or subscribe to **Go**. Donating is opt-in per key and withdrawable instantly; your account keeps first call on its own key. See [/pool](https://anyrouter.dev/pool) and [/pool](https://anyrouter.dev/pool) for the full flow and live stats.

New to the pool? The [Share a Key to the Shared Pool](/features/shared-pool) guide walks you through creating an account and donating your first key step by step.

### Costs

- AnyRouter **charges nothing** for BYOK traffic — no markup, no per-request fee, no minimum.
- You pay the upstream provider directly, on their billing cycle, at your account's list price.
- If you've configured an external gateway (for example Cloudflare AI Gateway) in front of your provider account, any fees it charges are between you and the gateway.
- Pay-as-you-go and BYOK usage are reported separately in **Dashboard → Usage** so you can attribute spend per source.

## Configure

Adding a key takes a minute per provider. AnyRouter runs a live validation call on save; if it fails, the dialog surfaces the upstream error and the key isn't stored.

::::steps

:::step{title="Open the BYOK dashboard"}
Go to **[Dashboard → BYOK](https://anyrouter.dev/dashboard/byok)**. In the **Available** grid, click **Add key** on the provider you want. If you've already added a key for that provider, expand its card under **Configured** and use **Add key** there.
:::

:::step{title="Paste the key and options"}
Paste your provider API key into the **API key** field (write-only — never displayed again after save). Optionally set a **Key alias** (shows in logs), override the **Base URL** for regional/enterprise deployments, and set **Priority** / **Weight** if you'll run more than one key per provider. For Z-AI, pick the type matching your plan — Standard API (`https://api.z.ai/api/paas/v4`) or Coding Plan (`https://api.z.ai/api/coding/paas/v4`).
:::

:::step{title="Save and validate"}
Click **Save**. AnyRouter validates the key against the provider before storing it. Use **Add another key** in the dialog to seed a round-robin pool in one pass.
:::

::::

To scope a key to specific AnyRouter API keys (for example, isolating production from staging), open the provider card and edit the scope — requests made with keys outside that scope fall back to pay-as-you-go credits. To remove a key, expand the provider card and click the trash icon; in-flight requests finish on the old key, new requests fall back to the next key or managed capacity, and the value is purged from storage (no undo). Disabling a key first (toggle off **Enabled**) lets you watch traffic shift before deleting permanently.

:::tip
For step-by-step instructions on generating a key at each provider — dashboard URLs, key formats, and gotchas — see the [BYOK Provider Setup Guide](/features/byok-providers).
:::

## Frequently asked questions

:::details{summary="Can I use the same provider key on multiple AnyRouter accounts?"}
Yes, but we don't recommend it. Each AnyRouter account stores its own encrypted copy, so rotating the key on the provider side means rotating it on every AnyRouter account.
:::

:::details{summary="Does BYOK work with streaming responses?"}
Yes. BYOK is transparent to the response shape — streaming, tool calls, multimodal input, and structured outputs work the same as with managed capacity.
:::

:::details{summary="Can I send the BYOK key inline on every request instead of saving it?"}
No. AnyRouter only accepts BYOK keys saved to your account; this is what lets us validate them, encrypt them, and log per-key health.
:::

:::details{summary="Where can I see which BYOK key served a request?"}
Every entry in **Dashboard → Logs** shows the provider, the BYOK key alias (or `managed` if AnyRouter capacity was used), and the upstream latency.
:::


## Related

- [Pricing & Plans](/docs/features/pricing.md)
- [Free Tier](/docs/features/free-tier.md)
- [Smart Routing](/docs/features/routing.md)
- [How AnyRouter Chooses a Credential](/docs/features/credential-selection.md)
- [Get a provider API key](/docs/guides/byok-provider-keys.md)
