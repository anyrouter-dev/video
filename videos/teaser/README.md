# AnyRouter — intro film

A 20-second introduction to [anyrouter.dev](https://anyrouter.dev): one
OpenAI-compatible endpoint, one key, 192+ models across 17+ providers, a free
tier, and a shared key pool.

It ships as **two films from one source**. The beats, the copy, the timings and
the motion are byte-identical between the dark and light renders; only the
token values in `release/theme.mjs` differ. There is no second script, no
second layout table and no per-theme copy.

It lives in the video repo as the authored kind `teaser`. From the repo root:

```
npm ci
node videos/teaser/tools/build.mjs     # generate → check → render → poster, both themes
node lib/cli.mjs run teaser            # the driver: renders the committed light theme, records a release
```

| Artifact | What it is |
|---|---|
| `renders/intro-dark.mp4` | 600 frames, 20.000s, 1920×1080 @ 30fps, AAC 48kHz stereo |
| `renders/intro-light.mp4` | same film, light tokens |
| `renders/intro-<theme>-poster.jpg` | frame at 18.6s (the end card) |
| `renders/stills/<theme>/*.jpg` | one frame per beat, for visual review |

## Commands

```bash
# from the repo root
node videos/teaser/tools/build.mjs                 # both themes: gen → check → render → poster → ffprobe
node videos/teaser/tools/build.mjs --theme=dark    # one theme

node videos/teaser/release/generate.mjs --theme=light   # write index.html + compositions/ (no render)
node lib/cli.mjs check teaser                      # the gate — lint, runtime, layout, motion, contrast
node lib/cli.mjs dev teaser                        # preview in the browser

npm i --no-save sharp && node videos/teaser/tools/make-plates.mjs   # rebuild the plates (needs the source photos)
node videos/teaser/tools/verify-facts.mjs          # re-verify every on-screen number against the live API
node videos/teaser/tools/stills.mjs                # cut one still per beat from the rendered mp4s
```

Commit `index.html` and `compositions/` generated with `--theme=light`. That is
what `lib/cli.mjs run teaser` renders, and `kind.test.mjs` asserts it.

The check is the thing that must pass before a render is worth anything.
It runs with `--at-transitions --samples=31`, i.e. it samples every tween
boundary as well as a uniform grid — the default 9 midpoints miss transient
overlaps entirely.

## Where the knobs are

Everything visual is in `release/generate.mjs`. Nothing under `compositions/`
or `index.html` should ever be hand-edited; they are wiped and rebuilt.

| Thing | Where |
|---|---|
| **Beat table** (start seconds, plate, drop / push-away flags) | `BEATS` |
| **Camera** (slow push cap, per-beat punch, 3D flip, pool push-away) | `camera()`, the `#root` tween at the bottom |
| **Type scale** — 40px is the floor, nothing goes below it | the `CSS` block |
| **Per-beat layout** (split, chips, grid, stat row) | the `push(...)` calls + the root `<style>` |
| **Colours, fonts, plate filenames, monogram variant** | `release/theme.mjs` |
| **Every number and every string on screen** | `release/facts.mjs` |
| **Background plate grade** | `tools/make-plates.mjs` |
| **Provider-mark inking** | `release/ink-marks.mjs` |

### The beat table

128 BPM, so a beat is 0.46875s and an 8th is 0.234375s. The starts ride a
16-note grid but are deliberately **uneven** — 1.88 / 0.92 / 0.95 / 1.55 / 1.26
— because a uniform grid is the tell of a film cut to a metronome rather than
to the score. The three drop times (1.88 / 10.50 / 17.20) are the score's own
drop times. Each scene's duration is derived as `next.start - this.start` and
re-clamped by an overlap guard, so a scene can never outlive its successor.

## How a theme is a token swap

`release/theme.mjs` exports `{ dark, light }`. `generate.mjs --theme=X` reads
one of them and interpolates the values into the same CSS, the same markup and
the same GSAP timeline. The light theme is **not** an inversion — every accent
had to be re-picked to clear WCAG AA on white:

| Token | dark | light | why |
|---|---|---|---|
| `muted` | `#A1A1A1` (7.66:1) | `#5C5B58` (6.79:1) | the dark grey is 2.58:1 on white |
| `primary` | `#E87D45` (7.02:1) | `#B4531F` (5.00:1) | 2.82:1 on white |
| `gold` | `#FFD230` (13.68:1) | `#8A5A00` (5.93:1) | 1.45:1 on white |
| `free` | `#00BC7D` (8.00:1) | `#046B47` (6.56:1) | 2.47:1 on white |
| `lineSolid` | `#6B6B6B` (3.36:1) | `#8A8A8A` (3.45:1) | the hairline must clear 3:1 |
| `monogram` | `…-logo-white.svg` | `…-logo-black.svg` | the ink flips |
| `plates` | `mountain` … | `mountain-light` … | see below |

`verify()` runs on import and **throws** on any pair under 4.5:1 (text) or 3:1
(non-text), so a bad token edit fails the generator immediately rather than
three minutes later inside a headless browser. Fifteen pairs per theme.

## Backgrounds

`tools/make-plates.mjs` turns three photographs into six plates — one set per
theme. The order matters and each step exists because the naive version
produced mud:

1. cover-fit to 2560×1440 (`position: 'attention'`)
2. auto-level luminance on the **2nd/98th percentile**, not min/max — one blown
   specular must not flatten the rest
3. duotone through a 4-stop cool ramp (indigo → violet → magenta → cyan, with
   magenta and cyan only in the highlights)
4. gamma
5. lerp onto the target mean luma

Steps 2–4 fold into one 256-entry RGB lookup, so the grade is a single pass.
Do **not** duotone an already-darkened plate: you throw away the range and get
mud. Level first, duotone second.

A Gaussian-blur(28) copy of each plate ships alongside as a slow parallax
underlayer.

**On the mean-luma target.** The pipeline brief asked for ~15. That renders as
flat black: these sources are low-key to begin with, so after a 1.7 gamma plus a
flat lerp the *brightest pixel in the whole plate* was luma 46/255 — invisible
against the `#0A0A0A` page. The dark plates now target **32** (max ~93–143) and
the light plates **226**. A centre-weighted scrim holds the middle of the frame
— where every headline sits — as a clean field while the plate reads in the
outer third.

The pastel source set (`Hero 2`, `image 940/941/942/943/950`) is deliberately
unused: it has no headroom left for type. The light plates are graded from the
**same three dark photographs** with the same crop and the same level
percentiles, so the light film is the same film on paper rather than a
different film.

## Provider marks

`shared/assets/providers/` (repo root) holds all 141 AnyRouter provider SVGs, vendored so the
render never depends on a live site. **89 of them are `fill="currentColor"`** —
black, i.e. invisible on a dark plate. `release/ink-marks.mjs` re-inks them per
theme at generate time, into `assets/providers/`:

- `currentColor` / `#000` / `black` / no-fill / low-luminance → the theme ink
- real brand colours, and `none` → preserved

`none` is preserved on purpose: marks that use it rely on it for knockouts and
counters, and filling it in closes the holes. Because the marks render through
`<img>`, the ink has to be baked into the file — CSS cannot reach in.

The light theme has the mirror-image problem (a near-white brand mark vanishing
into paper), which the same routine handles by taking the ink as a parameter.

## Accuracy

`tools/verify-facts.mjs` re-verifies every on-screen claim against production. It
asserts the two traps rather than trusting them:

- **192+ models / 17+ providers** is the site's literal copy, read back out of
  `/models` HTML on every run. `/api/v1/models?all=1` returns 201 (192 listed +
  9 virtual aliases) and distinct model-id prefixes give 42 — three different
  numbers for three different questions. The film shows 192 and 17 and they
  never disagree on screen.
- **`x-ai/grok-4.5` is not in the catalog** (4.7 is). A stale `grok-4.5`
  reference still lives in `routing.md`'s `anyrouter/latest` fallback list,
  which is a docs bug, not a listing. The board ships `grok-4.7`.
- **The 8 donor brands** are the real top 8 by pooled key count from
  `/api/v1/pool/analytics`, in the API's own order. `bytedance` has zero donated
  keys and is absent from the response entirely.
- **Pool stats** are 92 active keys, 42 donors, 3052 requests_total. The label
  says "all time" because `requests_total` is lifetime; `requests_today` is 7
  and would be a terrible advert.
- **No free-model count appears anywhere.** "141" counted SVG files, came from
  a rule the product deleted (commit `fd6c2f9e1`), and the `Free N` UI badge is
  a lazy-loaded subset. The free beat claims what is verifiable — `$0 in /
  $0 out` and the 10/day-free · 1000/day-paid request rate from the live model
  description.
- **No health or latency claim.** `/api/v1/health` currently reports `partial`
  at ~8s average latency.
- `@preset/fast` is a *user-defined* preset (presets are workspace-defined and
  never appear in the catalog), so the copy says "your", not "ours".

Full reasoning lives in `AGENTS.md`.

## Layout of the repo

```
release/
  theme.mjs        token sets + the contrast gate (throws on import)
  facts.mjs        every number and string on screen, with its endpoint
  generate.mjs     beats → index.html + compositions/   ← edit this
  ink-marks.mjs    per-theme provider-mark inking
tools/
  build.mjs        gen → check → render → poster → ffprobe, per theme
  make-plates.mjs  the background plate pipeline
  verify-facts.mjs the accuracy gate
  stills.mjs       one frame per beat from the rendered mp4s
assets/
  providers/       the subset used, re-inked for the current theme (generated)
  plates/          6 plates + 6 blurred underlayers
fonts/             inter.woff2, mono.woff2 (the product's real faces)
audio/score.wav    20s, 128 BPM, three drops at 1.88 / 10.50 / 17.20
compositions/      15 sub-compositions (generated — do not edit)
index.html         the root: plates, clip hosts, camera, audio (generated)
renders/           rendered mp4s, posters and stills/ (gitignored)
```

`index.html` at the project root is whichever theme was generated last. It is a
preview target, not an artifact.

## Assets, and where they came from

| Asset | Source |
|---|---|
| Background photographs | `~/Documents/ASCII` — `Group 4.jpg` (neon rim-lit wireframe mountain), `image 977.jpg` (gold band), `image 952.jpg` (nebula) |
| 141 provider marks | `anyrouter/public/providers/*.svg` |
| Monogram | `anyrouter/public/brand/anyrouter-logo-{white,black}.svg` |
| Catalog screenshot | `anyrouter/brag-output/work/shots/catalog.png` (3200×1850, a real dark-mode capture of `/models`) |
| Fonts | the product's own `inter.woff2` / `mono.woff2` |
| Score | `anyrouter-dev/video/audio/score.wav` — synthesized from scratch, 11.2 dB arc |
