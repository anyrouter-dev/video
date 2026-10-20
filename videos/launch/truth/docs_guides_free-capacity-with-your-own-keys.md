# Free capacity with your own keys

> Providers with a free tier you can add as BYOK keys, so free usage runs on your own quota instead of the shared free pool.


# Free capacity with your own keys

Several providers give out free API usage. Add their keys as BYOK keys and AnyRouter uses them before the shared pool or your credits. Requests served through your own key cost nothing on AnyRouter and don't use the shared free pool. See [Free Tier](/features/free-tier).

Each provider sets its own free limits and can change them at any time. Check the provider's site for current numbers.

## Providers with a free tier

| Provider | Key starts with | Create a key | Setup page |
|---|---|---|---|
| OpenRouter | `sk-or-` | [openrouter.ai/keys](https://openrouter.ai/keys) | [OpenRouter](/features/byok-providers/openrouter) |
| NVIDIA NIM | `nvapi-` | [build.nvidia.com](https://build.nvidia.com) | [NVIDIA NIM](/features/byok-providers/nvidia) |
| Google AI Studio | `AIza` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | [Google AI Studio](/features/byok-providers/google-ai-studio) |
| Groq | `gsk_` | [console.groq.com/keys](https://console.groq.com/keys) | [Groq](/features/byok-providers/groq) |
| Cerebras | `csk-` | [cloud.cerebras.ai](https://cloud.cerebras.ai) | [Cerebras](/features/byok-providers/cerebras) |
| Mistral | — | [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys) | [Mistral](/features/byok-providers/mistral) |
| Ollama Cloud | — | [ollama.com/settings/keys](https://ollama.com/settings/keys) | [Ollama Cloud](/features/byok-providers/ollama) |
| OpenCode Zen | — | [opencode.ai/auth](https://opencode.ai/auth) | [OpenCode Zen](/features/byok-providers/opencode-zen) |
| ZenMux | — | [zenmux.ai/settings/keys](https://zenmux.ai/settings/keys) | [ZenMux](/features/byok-providers/zenmux) |

For every provider, the last step is the same: open **[Dashboard → BYOK](https://anyrouter.dev/dashboard/byok)**, find the provider under **Available**, click **Add key**, paste the key, and click **Save**. AnyRouter checks the key with the provider before it saves it.

## Per-provider steps

**OpenRouter.** Create a key at [openrouter.ai/keys](https://openrouter.ai/keys). `:free` models stay free on your OpenRouter account, and paid models bill it. Full walkthrough: [Unblock free-model rate limits with your own OpenRouter key](/guides/unblock-free-model-rate-limits-openrouter-key).

**NVIDIA NIM.** Sign in at [build.nvidia.com](https://build.nvidia.com), open any model, and click **Get API Key**. Add it as **NVIDIA NIM**.

**Google AI Studio.** Sign in with a Google account, open [aistudio.google.com/apikey](https://aistudio.google.com/apikey), and click **Create API key**. Add it as **Google AI Studio**.

**Groq.** Open [console.groq.com/keys](https://console.groq.com/keys) and click **Create API Key**. Copy it right away; it's shown once.

**Cerebras.** Sign in at [cloud.cerebras.ai](https://cloud.cerebras.ai) and click **Create API Key** under **API Keys**.

**Mistral.** In the [Mistral Console](https://console.mistral.ai/api-keys), open **API keys** and click **Create new key**.

**Ollama Cloud.** Create a key at [ollama.com/settings/keys](https://ollama.com/settings/keys).

**OpenCode Zen.** Sign in at [opencode.ai/auth](https://opencode.ai/auth), open **API Keys**, and create a key.

**ZenMux.** Create a key at [zenmux.ai/settings/keys](https://zenmux.ai/settings/keys).

## Use them together

- **Call any model your keys reach** with `anyrouter/byok`. It routes across every key you've added and never spends credits. See [Auto-routing models](/features/byok#auto-routing-models).
- **Combine free tiers in one preset** so each request goes to a key that still has quota, with a cooldown when a provider rate limits you. See [Free-tier Aggregation](/features/free-tier-aggregation).
- **Share spare quota.** Turn on **Donate to pool** on a key to let others use it and earn credits back. Check the provider's terms first. See [Share a Key to the Shared Pool](/features/shared-pool).

For every provider AnyRouter supports, see [Get a provider API key](/guides/byok-provider-keys).


## Related

- [Unblock free-model rate limits with your own OpenRouter key](/docs/guides/unblock-free-model-rate-limits-openrouter-key.md)
- [Free-tier Aggregation](/docs/features/free-tier-aggregation.md)
- [Bring Your Own Key (BYOK)](/docs/features/byok.md)
- [How AnyRouter Chooses a Credential](/docs/features/credential-selection.md)
- [Share a Key to the Shared Pool](/docs/features/shared-pool.md)
