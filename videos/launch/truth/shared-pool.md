# Share a Key to the Shared Pool

> Donate one of your provider keys to the community shared pool, earn up to 8% of the token cost back as credits, and withdraw anytime — a step-by-step guide.


# Share a Key to the Shared Pool

The shared pool lets the community route requests through **donated** provider keys instead of AnyRouter's managed capacity. If you hold a provider account with quota you don't always use — free-tier limits, prepaid credits, a coding plan — you can donate that key to the pool and earn credits every time it serves someone else's request. This guide walks you through creating an account and sharing your first key.

## What the shared pool is

- **Community-served requests.** When you donate a key, AnyRouter can route other users' matching requests through your provider account, exactly as if you'd made the call yourself.
- **You earn credits for what your key serves.** Every request served through your donated key adds to a pending balance: **8% on Pro and Max, 5% on Go (or with no plan)** of the notional token cost. If a request costs $0.01 in tokens, a Pro donor earns $0.0008. On paid models you set a price for, you receive **what the caller paid minus a 10% platform fee** instead (see the FAQ). Credits are capped at $1 per key per UTC day; a key that hits the cap pauses until the next day.
- **Opt-in, per key.** Donating is a per-key toggle. A key you haven't flipped on is never shared.
- **Withdraw instantly.** Turn the toggle off and the key stops serving the pool immediately — there's no lock-in.
- **Your account comes first.** You always keep first call on your own key; the pool only uses spare capacity.
- **Eligibility is about routing, not your provider's terms.** A provider shows the donate option once AnyRouter has somewhere to route its traffic — that's not a claim your provider's Terms of Service permit sharing your key. You're responsible for confirming that before you donate.

## Share your first key

::::steps

:::step{title="Create an account"}
Sign up at **[anyrouter.dev](https://anyrouter.dev)**. It's free — no credit card, no credits required to get started.
:::

:::step{title="Add a provider key"}
Open **[Dashboard → BYOK](https://anyrouter.dev/dashboard/byok)**. In the **Available** grid, click **Add key** on the provider you want to donate, paste your provider API key, and save. AnyRouter validates the key against the provider before storing it. For step-by-step help generating a key at each provider, see the [BYOK Provider Setup Guide](/features/byok-providers).
:::

:::step{title="Toggle Donate to pool"}
On an eligible key, flip **Donate to pool** on. AnyRouter verifies the key is still live before enrolling it — you'll see a "Key verified" confirmation once the check passes (takes a moment). Your key joins the community pool right away and starts earning up to 8% of the token cost on every request it serves. This toggle only appears for providers AnyRouter can route to — review your provider's terms before donating.
:::

:::step{title="Track your earnings"}
Watch requests served and credits earned in your dashboard. Every served request adds to a pending balance — claim it into spendable balance whenever you like, or turn on **auto-claim** on the key to sweep it in automatically.
:::

::::

## Live pool stats

See what the pool is doing right now at **[/pool](https://anyrouter.dev/pool)**. The page shows aggregate activity — providers available, requests served, credits paid out — so you can gauge demand before donating. It's public and **aggregate-only**: no per-user data, no key details, and no request contents are ever shown.

To donate a key, visit **[/pool](https://anyrouter.dev/pool)**.

## Frequently asked questions

:::details{summary="Which providers can I donate?"}
Any provider AnyRouter has a working upstream for — that's an operational compatibility list, not a claim that your provider's Terms of Service permit sharing your key. Eligible providers show a **Donate to pool** toggle on their key in the BYOK dashboard; you're responsible for reviewing your own provider's terms before donating.
:::

:::details{summary="Can I set what callers pay?"}
On **All models** coverage every paid model your key covers is listed with its price. Each one starts at the provider's catalog price, and you have three choices per key:

- **Leave a model empty.** Callers pay the provider's catalog price for it. This is the default.
- **Type a price.** A flat USD price per 1M tokens for that model, from $0 up to 10% over its catalog price. It applies to input and output tokens alike.
- **Runtime dynamic.** Models you left empty are charged what the provider reports for each request, never more than the catalog price. If the provider reports no cost for a request, the catalog price applies.

Callers pay from their AnyRouter credits. The donate dialog shows an estimate and charges nothing. You can change or clear prices later from the same key.

What you receive depends on how the request was priced:

- **A price you typed, or runtime dynamic:** what the caller paid for that request, minus AnyRouter's 10% platform fee. At a $1.00 price you receive $0.90. A $0 price earns nothing.
- **A model left at the catalog price:** the usual reward on the catalog price (5% or 8%, by plan).

The dialog shows the price, the fee and your share for each model you price.
:::

:::details{summary="How much do I earn, and when?"}
You earn a share of the notional token cost of every request the pool routes through your key — **up to 8%**: 8% on the Pro and Max plans, 5% on Go or with no plan. The rate follows your current plan, so upgrading lifts it on your next served request. Rewards are capped at $1 per key per UTC day. On models you price, you receive what the caller paid minus a 10% platform fee instead of the percentage; that counts toward the same $1 daily cap. Every served request adds to a pending balance; claim it into spendable balance whenever you like, or turn on auto-claim to sweep it in automatically.
:::

:::details{summary="I donated before the platform fee. What changes for me?"}
Nothing until you choose. A donation made before these terms keeps the percentage reward on every model, including models you priced. To switch to receiving what callers pay minus the 10% platform fee on your priced models, open the key's pool settings in the dashboard, select **Review terms** and accept the new terms. Your key, prices and settings stay as they are.

You are not credited on requests you send through your own donated key, on failed requests, or when the caller's payment did not go through.
:::

:::details{summary="How do I stop donating?"}
Turn the **Donate to pool** toggle off. Your key leaves the pool instantly and goes back to serving only your own requests. You can re-enable it anytime.
If it was your last donated key, donation-backed Go pauses and this month's $4 credit is clawed back — re-donating in the same month restores the unspent remainder ($4 minus what you already used).
:::

:::details{summary="What happens if my donated key stops working?"}
We monitor every donated key continuously. If your key fails three consecutive upstream requests (e.g., the provider returns an auth error or your quota runs out), it's automatically paused and removed from the pool. If it was your only donated key and you were on the donation-backed Go plan, that plan is revoked on the next sync — you'll get an email with the details, and you can get it back by donating a new key or subscribing directly. Re-donating in the same month restores the unspent remainder of the $4 credit ($4 minus what you already used). As soon as the paused key works again (e.g., you top up your provider account), it's automatically re-enabled after the next validation probe.
:::

:::details{summary="Is my key safe?"}
Yes. Every key is **encrypted at rest with a per-row salt**, is write-only in the UI (shown only as an alias and masked identifier after save), and is **never logged** — it's stripped from request and response logs. Your key is only ever sent to the upstream provider it's scoped to. Pool stats are aggregate-only and never expose your key or usage.
:::

:::details{summary="Do I still get first call on my own key?"}
Always. Your own requests take priority; the pool only ever uses spare capacity on your key.
:::

:::details{summary="What does Free via Pool mean on a model?"}
The model is free because the shared pool serves it with donated keys at no charge to you. The label shows for everyone, but the pool itself is open to Go subscribers and to anyone with an active donated key. On the Free plan, a request to that model returns an error that points here. Subscribe to Go for $2 a month, or donate a working key, and the same request routes through the pool.
:::


## Related

- [Free Tier](/docs/features/free-tier.md)
- [Free-tier Aggregation](/docs/features/free-tier-aggregation.md)
