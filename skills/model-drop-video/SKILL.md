---
name: model-drop-video
description: >-
  Render a short launch film for newly added AI models on AnyRouter (one model, or
  n at once). Use when a model is added to the catalog and a release video is
  wanted, when asked to "make a video for the new model", or to re-render the
  model-drop film with different layouts, pacing, or copy. Pulls the real model
  data from the live AnyRouter catalog API — no hand-maintained list.
---

# Model drop → video

A parametric HyperFrames project at `videos/model-drop/`. One template, three
layouts, driven by how many models actually shipped.

## Run it

```bash
cd videos/model-drop

node release/fetch.mjs            # pull the live catalog, diff vs baseline
node release/fetch.mjs --accept   # after shipping: promote current → baseline
node release/fetch.mjs --all      # ignore the baseline entirely
node release/fetch.mjs --first=8  # first run: newest N as a "what's new"

node release/generate.mjs          # release.json → index.html + compositions/
node release/generate.mjs --limit=1    # force the hero layout
node release/generate.mjs --seconds=12 # shorter film

npm run check     # lint + runtime + layout + motion + contrast
npm run render    # → renders/model-drop_<timestamp>.mp4
```

`fetch` prints what is new before `generate` runs. **Always show the user the
fetch output** — it is the list of models the video will be about, and it is the
thing they most need to confirm.

## How N picks a layout

| N | Layout | Shape |
|---|--------|-------|
| 1 | `hero` | one card, full frame, deep push-in, long hold |
| 2–4 | `cards` | that many cards, back-to-back, equal slots |
| ≥5 | `list` | ranked rows, tight stagger |

## The pipeline

`fetch.mjs` → `release/release.json` → `generate.mjs` → `index.html` +
`compositions/*.html` → `npm run render`.

A composition is static HTML, so "1 model" and "7 models" are the *same
template* choosing a different scene count. To add a layout, add a branch in
`generate.mjs` and extend the `LAYOUT` selector — nothing else changes.

## Adjusting it (the knobs)

Everything visual lives in two places in `generate.mjs`:

- **`CSS`** — tokens (`--primary #E87D45`, `--gold #FFD230`, `--free #00BC7D`,
  `--bg #0A0A0A`), type sizes, card geometry.
- **the `push(...)` calls** — one per scene, with its start, duration, markup and
  GSAP timeline. Duration is clamped by the overlap guard below.

Camera is on the root: a slow push, a scale punch per scene, and a 3D orbit. Tune
`#root` tweens at the bottom of `generate.mjs`.

## HyperFrames rules this project already obeys

Each of these was a `check` failure first. Do not regress them.

1. **Never tween `autoAlpha` / `opacity` / `visibility` on an element carrying
   `data-start`.** The framework owns clip visibility. Animate a child
   (`#content`) instead → `gsap_animates_clip_element`.
2. **The root is built only from sub-compositions.** Scenes are `data-composition-src`
   hosts on the root, never nested elements → `nested_structure_needs_subcomposition`.
3. **Asset paths are project-root-relative** (`fonts/…`, `assets/providers/…`),
   never `../../` → `invalid_parent_traversal_in_asset_path`. `generate.mjs`
   copies provider marks into `assets/providers/` for this reason.
4. **Every font family needs an `@font-face`.** System fonts do not count.
5. **No scene may outlive the next one.** `generate.mjs` sorts the scenes and
   clamps each duration to `next.start`, printing a `clamped` line. This bit
   twice (the card row, then the hero) before the guard existed.
6. **Contrast is enforced** (3:1 non-text, 4.5:1 text). The ghosted rank numeral
   failed at 1.27:1 and is now `rgba(255,255,255,.38)`.

## Accuracy rules

The numbers come from the live API, which is the point — but two are pinned
deliberately and must be re-checked when the site changes:

- `providers: 17` is **hard-coded** in `fetch.mjs` to match the literal string
  on `anyrouter.dev/models` ("192+ AI models across 17+ providers"). Distinct
  model-id prefixes give 41 and upstream backends a third number; neither is the
  site's claim. Do not replace the constant with a computed one.
- No free-model *count* goes on screen. `fetch.mjs` reports
  `free ($0/$0)` from the API, and the CTA may show it, but never present it as
  a catalog tier — the product changed what counts as free (`fd6c2f9e1`) and an
  older "141" was already wrong once.

## After shipping a model

```bash
node release/fetch.mjs --accept   # so the next run diffs from here
```
