# AGENTS.md — AnyRouter video

This repo renders AnyRouter films. It is standalone: it does not read the
AnyRouter repo, and every fact on screen comes from a public AnyRouter endpoint.

## The one thing to understand

**The render is deterministic and never needs an LLM.**

```
collect  →  .build/<kind>/data.json     (the facts, from a live public source)
gen      →  .build/<kind>/film/          (a HyperFrames project)
check    →  lint + runtime + layout + motion + contrast
render   →  renders/<kind>-<id>.mp4      (+ cover, + source tarball)
publish  →  a GitHub Release tagged <kind>-<id>
```

Same inputs, same mp4, every time. `npm run video -- <kind>` is the whole
pipeline. If you find yourself wanting a model in the render loop, you almost
certainly want a deterministic function instead.

An agent is useful for the part that is *judgment*, not mechanics: which model
leads, what the film claims, whether the copy is honest. It writes
`.build/<kind>/plan.json`; the deterministic pipeline renders it. See `ci/AGENT.md`.

## Layout

```
lib/               the engine — no kind knows about another
  cli.mjs          the only entry point
  kinds.mjs        the kind contract (read its header before adding a kind)
  film.mjs         scenes → HyperFrames project; the shared look; the overlap guard
  ledger.mjs       what has been released, per kind
  hyperframes.mjs  check / render / cover
  publish.mjs      GitHub Release + YouTube
shared/            fonts, scores, brand marks, provider marks
videos/<kind>/     kind.mjs, its inputs, fixtures/, kind.test.mjs
.build/<kind>/     scratch — never committed
renders/           output — never committed, it ships on the GitHub Release
releases/<kind>/   the ledger, and the facts each film was cut from (committed)
```

## Kinds

| Kind | Film | Facts from | Runs |
|------|------|------------|------|
| `model-drop` | models added to the catalog, price moves | `/api/v1/models`, diffed against `videos/model-drop/baseline.json` | nightly |
| `release` | one product release, e.g. "AnyRouter 1.6" | `/changelog/rss.xml` | nightly |
| `changelog` | one day of changelog entries | the `## Model releases` section of `/llms.txt` | nightly |
| `intro` | the 60s introduction — hand-authored in `videos/intro/` | its own files | on demand |

A **generated** kind has a `film()` and is built into `.build/<kind>/film/`.
An **authored** kind has none: `videos/<kind>/index.html` is rendered as it is.

To add a kind: create `videos/<name>/kind.mjs` following the contract in
`lib/kinds.mjs`, add a fixture and a `kind.test.mjs`, and add it to the `check`
matrix in `.github/workflows/ci.yml`. Nothing in `lib/` changes.

## Commands

```bash
npm run kinds                          # what kinds exist
npm run video -- <kind>                # collect → gen → check → render → cover → record
npm run video -- <kind> --force        # render even if this release is in the ledger
npm run video -- <kind> --dry-run      # decide and report, render nothing
npm run pending                        # which nightly kinds have something unreleased

npm run collect -- <kind>              # the facts only
npm run gen -- <kind> --limit=1        # facts → HyperFrames project (flags go to the kind)
npm run check -- <kind>                # the gate — must pass before a render is worth anything
npm run dev -- <kind>                  # browser preview while adjusting
npm run publish -- <kind> [id]         # GitHub Release (+ YouTube when configured)
npm run accept -- model-drop           # promote the collected catalog to the baseline
npm run ledger                         # what has been released
npm test                               # unit tests — Node builtins only, no install needed
```

Kind flags: `--limit=N`, `--seconds=N`, `--from=FILE` (build from a saved
response instead of the network). `model-drop` also takes `--all`, `--first=N`,
`--baseline=FILE`; `release` takes `--version=X.Y.Z`; `changelog` takes
`--date=YYYY-MM-DD`.

## model-drop layouts

| N | Layout | Shape |
|---|--------|-------|
| 1 | `hero` | one card, full frame, deep push, long hold |
| 2–4 | `cards` | that many cards, back-to-back, equal slots |
| ≥5 | `list` | ranked rows, six to a page, capped at what can be read |

Force it with `--limit=N` when the count picks the wrong story.

## Rules every generated film obeys

Each of these was an `npm run check` failure first. `lib/film.mjs` enforces
them for every kind — do not work around it.

1. **Never tween `autoAlpha` / `opacity` / `visibility` on an element carrying
   `data-start`.** The framework owns clip visibility — scenes animate `#content`.
2. **The root composition is built only from sub-compositions.** Scenes are
   `data-composition-src` hosts on the root, never nested elements.
3. **Asset paths are project-root-relative** (`fonts/…`, `assets/providers/…`),
   never `../`. `writeFilm` copies fonts, the score and any marks into the project.
4. **Every font family needs an `@font-face`.**
5. **No scene may outlive the next one.** `clampScenes` clamps each duration to
   `next.start` and prints a `clamped` line. It exists because the same bug
   shipped twice. A kind should never need it — its test asserts exact back-to-back.
6. **Contrast is enforced** (3:1 non-text, 4.5:1 text).
7. **A film is never longer than its score.** `score.wav` is 20s, `score-30s.wav` 30s.

## Accuracy

- `PROVIDER_CLAIM = 17` in `videos/model-drop/catalog.mjs` is **hard-coded** to
  match the literal string on anyrouter.dev/models ("192+ AI models across 17+
  providers"). Distinct model-id prefixes give 41 and upstream backends a third
  number. Do not make it computed.
- Context is formatted in K below 1M — do not divide by 1e6 unconditionally or a
  32k window reads as "0.0M".
- Words and counts that reach screen come from the collected facts, never typed
  by hand. Escape them with `esc()`.

## Releases and CI

- A release is identified by **what it is about** (a hash of its facts), not by
  when it ran. A hash already in `releases/<kind>/index.json` is never rendered
  twice — that is what lets the workflow run every night.
- The mp4, the cover and the generated source are **GitHub Release assets**, not
  git objects. Git holds only the ledger row and the inputs.
- `render-video.yml` is one job: decide (Node only) → render → publish → one
  commit. On a quiet night it stops after the decide step.
- `ci.yml` runs `npm test` and `check` on each kind's fixture for every change
  to `lib/`, `videos/` or `shared/`.
