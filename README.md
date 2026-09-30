# AnyRouter — video

Renders the films for [AnyRouter](https://anyrouter.dev): the introduction, a
film for each product release, one for each batch of new models, and one for
each day of changelog entries.

```bash
npm install
npm run kinds                  # what can be made
npm run video -- model-drop    # collect → decide → generate → check → render → cover → record
```

Output lands in `renders/`.

## Kinds

| Kind | Film | Facts from | Runs |
|------|------|------------|------|
| `intro` | the 60-second introduction, hand-authored | `videos/intro/` | on demand |
| `release` | one product release, e.g. "AnyRouter 1.6" | [`/changelog/rss.xml`](https://anyrouter.dev/changelog/rss.xml) | nightly |
| `model-drop` | models added to the catalog, and price moves | [`/api/v1/models`](https://anyrouter.dev/api/v1/models?all=1), diffed against a baseline | nightly |
| `changelog` | one day of changelog entries | the *Model releases* section of [`/llms.txt`](https://anyrouter.dev/llms.txt) | nightly |

Every kind is a folder under `videos/` with a `kind.mjs`. Adding a fifth means
adding a folder — nothing in the engine changes. The contract is the header of
`lib/kinds.mjs`.

A **generated** kind turns facts into scenes; the engine writes the HyperFrames
project. An **authored** kind (`intro`) is a HyperFrames project you edit by
hand; the engine renders and releases it.

## How a film gets made

```
collect  →  .build/<kind>/data.json     the facts, from a public endpoint
gen      →  .build/<kind>/film/          a HyperFrames project
check    →  lint + runtime + layout + motion + contrast — a hard gate
render   →  renders/<kind>-<id>.mp4      + a cover, + the generated source
publish  →  a GitHub Release tagged <kind>-<id>
```

No step needs an LLM. The same facts give the same mp4.

## Renders exactly once

A release is identified by **what it is about, not by when it ran**. `collect`
returns the strings that identify a release — the added model ids and prices, a
version number, a day's changelog slugs — and their hash is the release:

```
$ npm run ledger
model-drop  [5 releases]
  005-20261001-new-models-13ef7c29dc             published  3 new models: …
```

If that hash is already in `releases/<kind>/index.json` the driver exits without
rendering. That is what makes it safe to run every night.

```bash
npm run video -- release --dry-run     # decide and report, render nothing
npm run video -- release --force       # render a release that is already in the ledger
npm run pending                        # which nightly kinds have something unreleased
```

After a render the driver records the **inputs** of the film under
`releases/<kind>/<id>/` — `data.json` (the facts), `plan.json` (the story, if an
agent wrote one) and `manifest.json` (the ledger row, with the commit it was
built at). The generator is deterministic, so those rebuild the film.

That is also how an old film picks up a new look. `regen` re-renders a release
that is already out from its record — same id, same tag — and with `--publish`
replaces the assets of its GitHub Release in place:

```bash
npm run regen -- model-drop --all --dry-run        # build every release, render nothing
npm run regen -- release 001-20260930-v1.6.0-8209ec52de --publish
npm run regen -- changelog <id> --plan=my-plan.json  # re-plan it, then re-render
```

A regen never uploads to YouTube: a video there cannot be replaced, only
duplicated.

## Plans

A plan is the one place judgment enters a film: which items are the story, in
what order, and a few words of copy. Every kind takes the same shape:

```json
{ "seconds": 20, "limit": 3, "picks": ["<item id>"], "lines": { "<item id>": "short line" },
  "headline": "one true line", "kicker": "2-4 words", "share": "1-3 sentences", "rationale": "why" }
```

`npm run plan -- <kind>` prints the brief: where the facts are, the item ids a
plan may pick, and the schema. The CLI checks every plan against the facts
before the film is built (`lib/plan.mjs`): an unknown id, a number the facts do
not contain, a superlative, an exclamation mark — each is dropped with a
warning, and the film falls back to the kind's default for that part. A bad
plan never fails a build. `"limit": 0` declines a release. The contract is
`ci/AGENT.md`.

## Where the videos are stored

On **GitHub Releases**. Each film is a release tagged `<kind>-<id>` with three
assets named after what the film is about — `anyrouter-release-v1.6.0.mp4`,
`anyrouter-model-drop-2026-09-30.mp4` — with the same stem for the cover
(`.png`) and the generated composition (`-source.tar.gz`). Nothing rendered is committed to git.

```bash
GH_TOKEN=$(gh auth token) GITHUB_REPOSITORY=anyrouter-dev/video npm run publish -- intro
```

YouTube is an optional mirror. It needs `YOUTUBE_CLIENT_ID`,
`YOUTUBE_CLIENT_SECRET` and `YOUTUBE_REFRESH_TOKEN`; without them it says so and
skips. Optional: `YT_PRIVACY` (default `unlisted`), `YT_TITLE_TEMPLATE`
(`{id}` and `{title}` are substituted).

### One-time YouTube setup

A refresh token can only be minted by a human clicking a consent screen, so
`npm run yt:auth` walks you through it and prints the three `gh secret set`
commands at the end.

```bash
# 1. Google Cloud → a project with "YouTube Data API v3" enabled
# 2. OAuth consent screen → External → add your own Gmail as a test user
# 3. Credentials → OAuth client ID → Application type: DESKTOP APP
cp .env.example .env.local      # fill in YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET
npm run yt:auth
```

The requested scope is `youtube.upload` and nothing else. `.env.local` is
gitignored; CI uses repository secrets.

## Commands

| | |
|---|---|
| `npm run video -- <kind>` | the idempotent driver |
| `npm run kinds` | list the kinds |
| `npm run pending` | which nightly kinds have something unreleased |
| `npm run collect -- <kind>` | fetch the facts, print what they are |
| `npm run gen -- <kind>` | facts → HyperFrames project |
| `npm run check -- <kind>` | the gate |
| `npm run dev -- <kind>` | browser preview while adjusting |
| `npm run publish -- <kind> [id]` | GitHub Release (+ YouTube); `--replace` swaps the assets of one that exists |
| `npm run plan -- <kind> [id]` | the brief for a plan: facts, item ids, schema |
| `npm run regen -- <kind> <id>\|--all` | re-render released films from their records; `--publish`, `--plan=FILE`, `--dry-run` |
| `npm run accept -- model-drop` | promote the collected catalog to the baseline |
| `npm run ledger` | every recorded release |
| `npm test` | unit tests |

Flags after the kind go to the kind: `--limit=N`, `--seconds=N`, `--from=FILE`
(build from a saved response instead of the network). `model-drop` adds `--all`,
`--first=N`, `--baseline=FILE`; `release` adds `--version=X.Y.Z`; `changelog`
adds `--date=YYYY-MM-DD`. `run` adds `--quality=draft|looks|delivery` and
`--workers=N`.

## model-drop

It does not maintain a list. `collect` diffs the live catalog against
`videos/model-drop/baseline.json` — **ids and prices both**, so a price cut on a
model that already shipped is also a release.

| Label | Meaning | |
|---|---|---|
| `new-model` / `new-models` | the normal case | filmed |
| `models+pricing` | both | filmed |
| `price-cut` / `price-rise` | a repricing, no new models | filmed |
| `context-change` | only the context window moved | filmed |
| `delisted` | models were removed | filmed |
| `none` | nothing shipped since the last accept | **not filmed** |
| `first-run` | no baseline yet — takes the newest 5 | filmed once, then `accept` |

| N | Layout | Shape |
|---|--------|-------|
| 1 | `hero` | one card, full frame, deep push, long hold |
| 2–4 | `cards` | that many cards, back-to-back, equal slots |
| ≥5 | `list` | ranked rows, six to a page, capped at what can be read |

## CI

**`render-video.yml`** — nightly, on `repository_dispatch` from the AnyRouter
repo, and by hand (pick a kind, optionally force). One job:

1. **decide** — asks each kind what is unreleased. Node only: no install, no
   browser. On a quiet night the run ends here, in seconds.
2. **tools** — `node_modules` and the render browser come from a cache.
3. **plan** — optional. For each pending kind with a prompt in `ci/prompts/`,
   OpenCode reads the facts and the brief and writes `.build/<kind>/plan.json`:
   which items lead, the copy, or `limit: 0` to decline. Skipped without
   `OPENCODE_API_KEY`, and it can never fail the build.
4. **render → publish → accept**, one kind at a time. One kind failing does not
   stop the others.
5. **record** — one commit with the ledger and the baseline.

Releases and commits only happen on `main`. A run on a branch renders and keeps
the mp4 as a workflow artifact.

By hand, the `regen` input (a release id, or `all`, with a kind) re-renders
released films instead and replaces their Release assets.

**`ci.yml`** — on pull requests and pushes that touch the code: the unit tests,
then the HyperFrames checker on each kind built from its committed fixture.

## Accuracy

- Every word and number on screen comes from the collected facts. Nothing is
  hand-typed.
- `totals.providers` is deliberately **not** computed — the site's literal claim
  is `17+`, distinct model-id prefixes give 41, and upstream backends a third
  number. See `PROVIDER_CLAIM` in `videos/model-drop/catalog.mjs`.
- Context formats in K below 1M, so a 32k window does not read as `0.0M`.
- `plan.json` is a **story** document. It may not carry numbers that are not
  already in the facts — `lib/plan.mjs` drops any that do. See `ci/AGENT.md`.

## Layout

```
lib/               the engine: cli, kinds, film, ledger, hyperframes, publish
shared/            fonts, scores, brand marks, 141 vendored provider marks
videos/<kind>/     kind.mjs, fixtures/, kind.test.mjs
ci/                what the CI agent may decide, and its prompt
.build/<kind>/     scratch (gitignored)
renders/           output (gitignored — it ships on the GitHub Release)
releases/<kind>/   the ledger and each film's inputs
```

The shared look — tokens, type, the backdrop, the camera, the opening flare and
the closing card — is in `lib/film.mjs`. Each kind's own scenes and CSS are in
its `kind.mjs`. See `AGENTS.md` for the HyperFrames rules every film obeys.
