# AGENTS.md — AnyRouter video

This repo renders AnyRouter films. It is standalone: it does not read the
AnyRouter repo, and every fact on screen comes from a public AnyRouter endpoint.

## The one thing to understand

**The render is deterministic and never needs an LLM.**

```
collect  →  .build/<kind>/data.json     (the facts, from a live public source)
gen      →  .build/<kind>/film/          (a HyperFrames project, 1920x1080)
check    →  lint + runtime + layout + motion + contrast, for every rendition
render   →  films/<day>/<kind>/<kind>-<id>.mp4      (+ -portrait.mp4, a cover each, + source tarball)
publish  →  a GitHub Release tagged <kind>-<id>, and one YouTube video per rendition
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
  sound.mjs        the score and sound effects, synthesized per film (Node only)
  marks.mjs        provider name / model id / sentence → the provider's logo
  plan.mjs         the plan contract and its honesty gate
  ledger.mjs       what has been released, per kind
  renditions.mjs   the shapes a film ships in: landscape and portrait
  hyperframes.mjs  check / render / cover
  publish.mjs      GitHub Release + YouTube
shared/            fonts, brand marks, provider marks
videos/<kind>/     kind.mjs, its inputs, fixtures/, kind.test.mjs
.build/<kind>/     scratch — never committed
films/<day>/<kind>/ output, one folder per day — never committed, it ships on the GitHub Release
releases/<kind>/   the ledger, and the facts each film was cut from (committed)
```

## Kinds

| Kind | Film | Facts from | Runs |
|------|------|------------|------|
| `model-drop` | models added to the catalog, price moves | `/api/v1/models`, diffed against `videos/model-drop/baseline.json` | nightly |
| `release` | one product release, e.g. "AnyRouter 1.6" | `/changelog/rss.xml` | nightly |
| `changelog` | one day of changelog entries | the `## Model releases` section of `/llms.txt` | nightly |
| `intro` | the 60s introduction — hand-authored in `videos/intro/` | its own files | on demand |
| `teaser` | the 20s brand film, two themes — its own generator in `videos/teaser/release/` | its own files | on demand |
| `explainer` | the narrated newcomer explainer, built with the HyperFrames product-launch workflow; tools in `shared/authoring/` | its own files | on demand |
| `openrouter-unblock` | the narrated OpenRouter rate-limit tutorial, same series look and tools | its own files | on demand |
| `sign-in-with-anyrouter` | the narrated guide for app builders: a Sign in with AnyRouter button, usage billed to each user | its own files | on demand |
| `pool-donation` | the narrated guide to donating an idle provider key to the shared pool | its own files | on demand |
| `sign-in-with-agentid` | the narrated announcement: an agent signs in to AnyRouter with AgentID from its own AgentMail inbox | its own files | on demand |
| `cli-agents`, `cli-everyday` | the narrated `anyr` CLI guides (any agent on any model; models, credits and keys), same series look and tools | their own files | on demand |
| `why-gateway` | the narrated short on why a unified LLM gateway, same series look and tools | its own files | on demand |
| `byok-upstreams` | the narrated short on bringing your own provider keys, same series look and tools | its own files | on demand |
| `use-case` | one short narrated film per use case, embedded on its anyrouter.dev/use-cases page: what it is, the problem, the page's steps with its command typed, the result, the short link, with a voice, captions and licensed music of its own. Each use case is its own release | `/use-cases.json`, the ids a preset rolls through from `/api/v1/models?all=1`, and its script in `videos/use-case/narration.json` | on demand |

A **generated** kind has a `film()` and is built into `.build/<kind>/film/`.
An **authored** kind has none: `videos/<kind>/index.html` is rendered as it is,
and its `collect` is `collectAuthored` from `lib/authored.mjs`.

A kind whose facts hold several films (`use-case`: one per page) has a `split`.
`pending use-case` then lists each unreleased slug, `run use-case` renders each
one, and `--slug=SLUG` collects just one for `gen`, `check` and `run`.

To add a kind: create `videos/<name>/kind.mjs` following the contract in
`lib/kinds.mjs`, add a fixture and a `kind.test.mjs`, and add it to the `check`
matrix in `.github/workflows/ci.yml`. Nothing in `lib/` changes.

## Renditions

Every film ships twice, from one source. `lib/renditions.mjs` is the table:

| Rendition | Size | For | File |
|-----------|------|-----|------|
| `landscape` | 1920×1080 | YouTube and the web | `<stem>.mp4` |
| `portrait` | 1080×1920 | YouTube Shorts; posted by hand on Instagram Reels and TikTok | `<stem>-portrait.mp4` |

A film is authored at 1920×1080. Its frames carry their portrait layout under
`@media (orientation: portrait)`, and `shared/authoring/portrait.mjs` writes the
portrait project from the landscape one, failing on any 1920 or 1080 the frames
left behind. A vertical upload under three minutes becomes a YouTube Short (its
title ends in `#Shorts`). Reels and TikTok have no upload here: the portrait mp4
on the GitHub Release is the file to post, and the release notes say so.

A kind ships every rendition unless its `kind.mjs` says `renditions: ['landscape']`.
The CLI prints a warning for each such kind on every run, so the gap stays in
view. Today every kind but `explainer`, `openrouter-unblock`, `cli-agents`, `cli-everyday` and `use-case` says it:
view. Today every kind but `explainer`, `openrouter-unblock`, `why-gateway`, `byok-upstreams` and `use-case` says it:

| Kind | Why it is landscape only |
|------|--------------------------|
| `model-drop`, `release`, `changelog` | `lib/film.mjs` has no portrait layout yet: its backdrop and frame chrome are drawn at 1920×1080 |
| `intro` | `index.html` draws its camera and two SVG layers at 1920×1080 |
| `teaser` | its generator lays out 1920×1080 only |

## Commands

```bash
npm run kinds                          # what kinds exist
npm run video -- <kind>                # collect → gen → check → render → cover → record
npm run video -- <kind> --force        # render even if this release is in the ledger
npm run video -- <kind> --dry-run      # decide and report, render nothing
npm run pending                        # which nightly kinds have something unreleased

npm run collect -- <kind>              # the facts only
npm run gen -- <kind> --limit=1        # facts → HyperFrames project (flags go to the kind)
npm run check -- <kind>                # the gate, for every rendition — must pass before a render is worth anything
npm run check -- <kind> --rendition=portrait   # one rendition, also for a kind that does not ship it yet
npm run dev -- <kind>                  # browser preview while adjusting (--rendition=portrait previews a copy)
npm run video -- <kind> --rendition=portrait   # a dev run: render that one film, record and publish nothing
npm run publish -- <kind> [id]         # GitHub Release (+ YouTube when configured)
npm run plan -- <kind> [id]            # the brief for a plan: facts path, item ids, schema
npm run regen -- <kind> <id>|--all     # re-render released films from their frozen facts
npm run regen -- <kind> <id> --publish # …and replace the assets of their GitHub Release
npm run regen -- <kind> <id> --plan=FILE --dry-run   # freeze a new plan; build, render nothing
npm run accept -- model-drop           # promote the collected catalog to the baseline
npm run ledger                         # what has been released
npm test                               # unit tests — Node builtins only, no install needed
```

Kind flags: `--limit=N`, `--seconds=N`, `--from=FILE` (build from a saved
response instead of the network). `model-drop` also takes `--all`, `--first=N`,
`--baseline=FILE`; `release` takes `--version=X.Y.Z`; `changelog` takes
`--date=YYYY-MM-DD`; `use-case` takes `--slug=SLUG` and `--models-from=FILE`
(a saved `/api/v1/models?all=1` response, so a fixture build needs no network).

## model-drop layouts

| N | Layout | Shape |
|---|--------|-------|
| 1 | `hero` | the name huge with its mark, then a spec sheet with prices |
| 2–4 | `cards` | one editorial card each, sides alternate, prices shown |
| ≥5 | `list` | spotlight → "who shipped" wall of marks → ranked ledger → the drop in numbers. **No prices** |

Force it with `--limit=N` when the count picks the wrong story.

## The look

anyrouter.dev's print style: paper `#F7F4EC`, ink `#0A0A0A`, one signal tone per
kind (model-drop orange, release indigo, changelog teal), and texture made only of
dots — ordered (Bayer) dither and halftone. `lib/film.mjs` gives every generated
film the dithered brand-mark opening, the breathing dither backdrop, a dither wipe
on every cut, the frame chrome and the closing card; kinds compose scenes from its
classes and helpers (read its header). No gradients, glows, blur or emoji. Every
logo comes from `lib/marks.mjs`; a provider with no vendored mark gets a monogram,
never a borrowed logo.

`use-case` is the exception. It brings its own `write` (`videos/use-case/project.mjs`)
in the Monolith look of `videos/explainer/frame.md` (v3): white, near-black ink,
display-size Geist, flat hairline cards, the terminal as the ink surface, and one
accent, on what is being said or changed. A film is five full-frame panels on a board
tilted back from the viewer: what this is, the problem, the steps, the result, and an
end card with the page's short link `anyrouter.dev/u/<slug>`. The camera cranes from
panel to panel and squares up to each, so text reads flat at 1:1; each page's `group`
lays the board out its own way (`BOARDS` in `videos/use-case/scenes.mjs`). The problem
and the result are the voice's own words set as kinetic type over a diagram (the
problem's picture, and the route through AnyRouter that removes it). The steps are
numbered cards that tilt in and settle flat, with the code window on the step that
shows it. `videos/use-case/MOTION.md` is the motion and sound guide, with its sources.
Every line of code sits on one row and the window shows whole code
(`videos/use-case/reflow.mjs`). Where the page's command names an `anyrouter/*`
preset, the request keeps it, and a line under the window rolls through a few
hand-picked ids (`ROLL_IDS` in its `kind.mjs`) the same key runs.
An id rolls only while `/api/v1/models?all=1` lists it as a chat model whose
`pricing.billing` is not `"byok"`: a byok id needs the user's own provider key,
so under a preset it would read as included. `anyrouter/free` rolls only ids
priced 0, and no credit id rolls under a page that promises "$0" or "free".
No film shows a screenshot of anyrouter.dev: any UI on screen is drawn in the
film's kit from real facts.

A use-case film is narrated. `videos/use-case/narration.json` holds each film's
lines (what it is, the problem, each step and a line that explains it, the result,
the short link), the two diagrams, and a claims ledger naming the source of every
spoken or shown claim; `node videos/use-case/voice.mjs --budget=N` voices a line
with ElevenLabs only when its spoken text changes, into `videos/use-case/voice/`, so
the render never calls a voice service. A film with no script fails to build. The
voice sets the timing (33 to 62 s); lines not already on screen are captioned in a
band under the picture. The soundtrack is one file per film (`videos/use-case/mix.mjs`):
a licensed music bed of its own (`audio/music.json`, ledger and credit lines in
`audio/LICENSES.md`, built by `music-ledger.mjs`) ducked under the voice, the voice,
and one sound effect per motion event, normalised to -14 LUFS with a true peak
under -1 dBTP. **Put each film's credit lines in its YouTube description.**
`node videos/use-case/audit-all.mjs` puts every film, both renditions, through
the stage audit; `node videos/use-case/sound-check.mjs` fails when two films share
or sound like the same track.

## Rules every generated film obeys

Each of these was an `npm run check` failure first. `lib/film.mjs` enforces
them for every kind — do not work around it.

1. **Never tween `autoAlpha` / `opacity` / `visibility` on an element carrying
   `data-start`.** The framework owns clip visibility — scenes animate their children.
2. **The root composition is built only from sub-compositions**: the backdrop,
   one host per scene, the wipe layer. Sub-compositions carry their style and
   script inside `<template>` — the runtime drops everything outside it.
3. **Asset paths are project-root-relative** (`fonts/…`, `assets/providers/…`),
   never `../`. `writeFilm` copies fonts and every mark a scene references into
   the project, and writes the film's own `audio/mix.wav`.
4. **Every font family needs an `@font-face`.**
5. **No scene may outlive the next one.** `clampScenes` clamps each duration to
   `next.start` and prints a `clamped` line. It exists because the same bug
   shipped twice. A kind should never need it — its test asserts exact back-to-back.
6. **Contrast is enforced** (3:1 non-text, 4.5:1 text).
7. **Selectors are scoped to their scene** (`Q()` and the helpers). Scene ids
   repeat across sub-compositions, so a bare `#id` hits the wrong scene.

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
- Renditions are not part of a release's identity. A ledger row lists its films
  under `renditions`: `{ landscape: { artifact, cover, youtube? }, portrait: {…} }`.
  A release is rendered whole, so its films come from one build. `run` on a
  release that lacks a rendition its kind now makes renders it again, keeping its
  id and its YouTube links.
- An mp4 and a cover per rendition, and the generated source, are **GitHub
  Release assets**, not git objects. Git holds only the ledger row and the inputs.
- `publish` uploads each film that has no YouTube link yet, and records the link
  on that film as soon as it lands, so a re-run never uploads a second copy.
- A **plan** (`.build/<kind>/plan.json`) is the only judgment in a film: which
  items, in what order, and a little copy. One schema for every kind;
  `lib/plan.mjs` drops anything that breaks the contract in `ci/AGENT.md` (an
  unknown id, a number not in the facts, hype) and warns — it never fails a
  build. The cleaned plan is what gets frozen.
- **`regen`** re-renders a release that is out from `releases/<kind>/<id>/`
  (`data.json` + `plan.json`), keeping its id, hash, tag and `createdAt`, in
  every rendition the kind makes, and with `--publish` replaces its Release
  assets and refreshes title and notes. It never uploads to YouTube — a video
  there cannot be replaced, only duplicated — and keeps the links it has. A
  rendition it adds stays without one until `youtube.yml` uploads it. It builds
  in `.build/<kind>/regen-<id>/`, so regens run side by side. This is how every
  past film picks up a new look, and how a past film gets its portrait one.
- The score is generated at the film's length by `lib/sound.mjs`; there is no
  fixed-length score to outlast.
- `render-video.yml` is one job: decide (Node only) → plan (optional agent, one
  prompt per kind in `ci/prompts/`) → render → publish → one commit. On a quiet
  night it stops after the decide step. Its `regen` input re-renders released
  films of one kind (an id, or `all`). Its timeout is 90 minutes: a release
  renders once per rendition, and a portrait frame costs what a landscape one does.
- `youtube.yml` uploads the films of a release that are already out but not on
  YouTube: after the render-video upload failed (an expired token), or after a
  regen added a rendition. Dispatch it with the kind and the release id; it
  fetches each film without a link from the Release, runs `publish`, commits the
  links, and fails unless every rendition has one.
- `ci.yml` runs `npm test` (including: every recorded release can be rebuilt
  from its record) and `check` on each kind's fixture for every change to
  `lib/`, `videos/`, `shared/` or `releases/`.
