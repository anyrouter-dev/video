---
name: anyrouter-video
description: >-
  Render an AnyRouter film: the introduction, a product release, newly added
  models (one, or n at once), or a day of changelog entries. Use when a model or a
  release ships and a video is wanted, when asked to "make a video for the new
  model / the release / the changelog", or to re-render a film with a different
  layout, length or copy. Facts come from live public AnyRouter endpoints — no
  hand-maintained list.
---

# AnyRouter → video

One engine (`lib/`), one folder per kind of film (`videos/<kind>/`). Read
`AGENTS.md` first — it has the layout, the commands and the rules.

## Run it

```bash
npm run kinds                          # intro, release, model-drop, changelog
npm run collect -- model-drop          # the facts: what shipped
npm run gen -- model-drop --limit=1    # facts → HyperFrames project in .build/model-drop/film
npm run check -- model-drop            # lint + runtime + layout + motion + contrast
npm run video -- model-drop            # the whole pipeline, idempotent
```

`collect` prints what the film will be about before anything is generated.
**Always show the user the collect output** — it is the thing they most need to
confirm.

## Picking the kind

| They say | Kind |
|---|---|
| "new model", "model drop", "price cut" | `model-drop` |
| "the 1.6 release", "release video" | `release` (`--version=1.6.0`) |
| "changelog", "what changed today" | `changelog` (`--date=YYYY-MM-DD`) |
| "intro", "introduction", "what is AnyRouter" | `intro` — hand-authored, edit `videos/intro/index.html` |

## Adjusting a generated film

- **The shared look** (tokens `--primary #E87D45`, `--gold #FFD230`,
  `--free #00BC7D`, `--bg #0A0A0A`; type; the backdrop; the camera on `#root`;
  the opening flare; the closing card) lives in `lib/film.mjs`.
- **A kind's scenes** — markup, CSS and GSAP timeline per scene — live in
  `videos/<kind>/kind.mjs`, in its `film()` function.
- Length and layout are flags: `--seconds=N`, `--limit=N`.

After any change: `npm test`, then `npm run gen -- <kind> && npm run check -- <kind>`.

## Adding a kind

1. `videos/<name>/kind.mjs` — `collect()` returns the facts plus `notable`,
   `label` and `parts`; `film()` returns scenes; `headline()` and `notes()` write
   the release copy. The contract is the header of `lib/kinds.mjs`.
2. `videos/<name>/fixtures/` and `kind.test.mjs` — `collect --from=<fixture>`.
3. Add it to the `check` matrix in `.github/workflows/ci.yml`.

## Rules

The HyperFrames rules (never tween opacity on a clip host, root built only from
sub-compositions, root-relative asset paths, an `@font-face` per family, no
scene outlives the next, contrast, a film never longer than its score) and the
accuracy rules (nothing on screen that is not in the collected facts;
`PROVIDER_CLAIM` stays hard-coded) are in `AGENTS.md`. Each was a failure first.

## After shipping a model drop

```bash
npm run accept -- model-drop   # so the next run diffs from here
```

CI does this itself after a successful release.
