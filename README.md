# AnyRouter — model drop video

Renders a short launch film for models added to the [AnyRouter](https://anyrouter.dev)
catalog. One template, three layouts, driven by how many models actually shipped.

```bash
npm install
npm run release      # fetch → decide → generate → check → render → snapshot
```

Output lands in `renders/`. Takes about 30 seconds end to end. `npm run video`
is an alias for `npm run release`.

## How it decides what the film is about

It does not maintain a list. `npm run fetch` pulls the live catalog and diffs it
against `release/baseline.json` — **ids and prices both**, so a price cut on a
model that already shipped is also a release worth filming.

```bash
$ npm run fetch
mode            diff
kind            models+pricing
catalog total   201  (192 listed, 9 anyrouter/*)
providers       17+ (site claim, hard-coded on purpose)   ·   model-id orgs 41   ·   backends 41
free ($0/$0)    30

NEW — 2 models:
  + z-ai/glm-5.3-flashx    GLM-5.3-FlashX   [$0]
  + meta/muse-spark-1.3    Muse Spark 1.3

PRICING — 1 changed:
  ~ x-ai/grok-4.7           3.0/15.0@256000 → 2.25/11.25@256000  (price-cut)
```

`kind` classifies the release and decides whether a film is warranted at all:

| kind | meaning | |
|---|---|---|
| `new-model` / `new-models` | the normal case | filmed |
| `models+pricing` | both | filmed |
| `price-cut` / `price-rise` | a repricing, no new models | filmed |
| `context-change` | only the context window moved | filmed |
| `delisted` | models were removed | filmed |
| `none` | nothing shipped since the last accept | **not filmed** |
| `first-run` | no baseline yet — takes the newest 5 | filmed once, then `accept` |

Each individual change is classified on the axis that actually moved, so a wider
context window is never reported as a price rise.

| N | Layout | Shape |
|---|--------|-------|
| 1 | `hero` | one card, full frame, deep push, long hold |
| 2–4 | `cards` | that many cards, back-to-back, equal slots |
| ≥5 | `list` | ranked rows, tight stagger |

Force one with `--limit=N`.

## Renders exactly once

A release is identified by **what changed, not by when**. `release/run.mjs`
fingerprints the diff — the added ids, the pricing changes, the kind — and that
hash is the release's identity:

```
001-20260926-models+pricing-13ef7c29dc   models+pricing   +2 ~1 -0   rendered
```

The sequence number in the id is for humans only and is minted once, on first
snapshot. If the fingerprint is already in `releases/index.json`, the driver
exits without rendering. That is what makes it safe to run nightly.

```bash
$ npm run release
── fetching the live catalog
nothing shipped (kind=none) — nothing to render

$ npm run release -- --dry-run     # decide and report, render nothing
$ npm run release -- --force       # re-render a release already in the ledger
```

After a successful render the driver freezes the **source** that produced the
film into `releases/<id>/` — the generated `index.html`, `compositions/`,
`fonts/`, and the `release.json` it was built from. Regenerating the newest film
loses the old one; this does not. `npm run gen` run against a snapshot
reproduces that exact video.

If the CI agent judges a release not worth filming it writes `limit: 0` and the
driver records the **decision** without rendering. A release that was declined is
never silently re-attempted.

## Commands

| | |
|---|---|
| `npm run release` | the idempotent driver — fetch → decide → render if new |
| `npm run ledger` | list every recorded release |
| `npm run publish` | attach the film to a GitHub Release (+ YouTube) |
| `npm run fetch` | pull the catalog, print what shipped |
| `npm run accept` | promote the current catalog to the baseline |
| `npm run gen` | `release.json` → HTML |
| `npm run check` | lint + runtime + layout + motion + contrast — the gate |
| `npm run render` | → mp4 |
| `npm run dev` | browser preview while adjusting |
| `npm run inspect` | layout across the timeline |
| `npm run snapshot` | stills for visual review |

`gen` takes `--limit=N`, `--seconds=S`, `--music=path.wav`. `run` takes
`--force`, `--dry-run`, and passes `--limit` / `--seconds` through to `gen`.

## CI

`.github/workflows/render-video.yml` runs on a schedule, on `repository_dispatch`
(`model-added`, for firing from the AnyRouter repo when a model ships), on pushes
that touch `release/`, and manually.

Five jobs:

- **`facts`** — deterministic. Fetches the catalog, prints the diff. No LLM.
- **`plan`** — OpenCode reads the diff and writes `release/plan.json`: which model
  leads, what the film claims, the share copy, or `limit: 0` to decline. This is
  the part that needs judgment. It is `continue-on-error` and skipped when
  `OPENCODE_API_KEY` is unset, so a missing key, a rate limit, or a model outage
  **cannot** fail the build.
- **`render`** — deterministic. Runs the driver, `check` as a hard gate, renders,
  verifies the duration with `ffprobe`, and uploads `model-drop.mp4`. If the
  release is already in the ledger it exits green without rendering.
- **`publish`** — GitHub Release, and YouTube if configured.
- **`accept`** — promotes the catalog to the baseline, but only after a
  successful run, so a failed render cannot swallow the next release's diff.

The design point: **the artifact is a pure function of the plan plus the live
catalog.** The agent chooses the story; it never touches the render. That is what
keeps the film reproducible — re-running the same inputs gives the same mp4.

## Publishing

`npm run publish` attaches the newest rendered film to a GitHub Release: it tags
`releases/<id>`, uploads the mp4 and a poster, and generates the notes from the
ledger. The tag is the release id, so the source snapshot and the GitHub Release
are always the same thing.

- **GitHub** — needs a token with `contents: write`. Local: `export GH_TOKEN=$(gh auth token)`.
  In CI it is the built-in `GITHUB_TOKEN`, already granted.
- **YouTube** — optional, and it skips loudly rather than failing the run. It
  needs three secrets: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`,
  `YOUTUBE_REFRESH_TOKEN`. Optional vars: `YT_PRIVACY` (default `unlisted`),
  `YT_TITLE_TEMPLATE` (`{id}` is substituted).

The GitHub Release is the durable record. YouTube is a convenience mirror — the
film is never lost when it is not configured.

### One-time YouTube setup

A refresh token can only be minted by a human clicking a consent screen, so
`npm run yt:auth` walks you through it and prints the three `gh secret set`
commands at the end. It opens the browser, catches the loopback redirect, and
verifies the token against the API before telling you to paste anything.

```bash
# 1. Google Cloud → a project with "YouTube Data API v3" enabled
# 2. OAuth consent screen → External → add your own Gmail as a test user
# 3. Credentials → OAuth client ID → Application type: DESKTOP APP
YOUTUBE_CLIENT_ID=… YOUTUBE_CLIENT_SECRET=… npm run yt:auth
#    → prints the refresh token and the exact `gh secret set` lines
```

Desktop-app is the client type that matters: Google accepts any loopback
`http://127.0.0.1:<port>` as a redirect, so nothing has to be registered by URL.
The requested scope is `youtube.upload` and nothing else — no read access to your
channel, no analytics, no ability to delete anything. Revoke at
<https://myaccount.google.com/permissions>.

## Accuracy

- Every price, context window, model id and count on screen comes from
  `GET /api/v1/models?all=1`. Nothing is hand-typed.
- `totals.providers` is deliberately **not** computed — the site's literal claim
  is `17+`, distinct model-id prefixes give 41, and upstream backends a third
  number. Only the site's claim is a marketing number. See the comment in
  `release/fetch.mjs`.
- Context formats in K below 1M, so a 32k window does not read as `0.0M`.
- `plan.json` is a **story** document. It may not carry numbers that are not
  already in `release.json` — see `ci/AGENT.md`.

## Layout

```
release/fetch.mjs      live API → release.json          (diff + classify, no LLM)
release/run.mjs        the idempotent driver            (decide → render → snapshot)
release/ledger.mjs     fingerprint, snapshot, markRendered, the release index
release/generate.mjs   release.json → HTML             (all design lives here)
release/publish.mjs    GitHub Release + optional YouTube
ci/AGENT.md            what the CI agent is allowed to decide
fonts/                 the product's real woff2 faces
assets/providers-src/  141 vendored provider marks
assets/providers/      copied out at generate time (gitignored)
compositions/          generated sub-compositions (gitignored)
index.html             generated root (gitignored)
releases/index.json    the ledger: every release, by fingerprint hash
releases/<id>/         frozen source for one film, reproducible forever
renders/               the mp4s (gitignored)
```

Everything visual — tokens, type sizes, card geometry, per-scene timing, the
camera — is in `release/generate.mjs`. See `AGENTS.md` for the HyperFrames rules
this project obeys and why.
