# CI agent instructions

The contract for whoever writes a film's plan — an LLM in CI or a human at a
terminal. The deterministic pipeline has already collected the facts; the job
here is judgment, not mechanics. The per-kind prompts in `ci/prompts/` point
here.

## What a plan is

Every kind (`model-drop`, `release`, `changelog`) takes the same plan. You
choose **which facts are the story, in what order, and the few words around
them**. You never choose the pixels: layout, type, colour, timing, camera and
sound are fixed by the kind's `film()` and `lib/film.mjs`.

`node lib/cli.mjs plan <kind>` prints your brief: where the facts are, the item
ids you may pick (each with a one-line description), and this schema.

```json
{
  "seconds": 20,
  "limit": 3,
  "picks": ["<item id>", "..."],
  "lines": { "<item id>": "short line" },
  "headline": "one true line",
  "kicker": "2-4 words",
  "share": "1-3 sentences",
  "rationale": "why this story"
}
```

| Key | What it does | Rule |
|-----|--------------|------|
| `picks` | the items the film is about, lead first | ids from the brief only |
| `limit` | how many items to show; with model-drop it also picks the layout (1 hero, 2–4 cards, ≥5 list) | whole number ≥ 0 |
| `lines` | a short line shown with an item | ≤ 120 chars, ids from the brief only |
| `headline` | the one line the film and its Release lead with | ≤ 90 chars |
| `kicker` | the small label over the closing card | ≤ 32 chars |
| `share` | copy for a social post and the Release notes | ≤ 400 chars |
| `seconds` | film length | 8–60 |
| `rationale` | why this story; goes in the Release notes | — |

Every key is optional. Leave one out and the kind's default is used — the
defaults are good; only override what you can improve.

**`"limit": 0` declines the release.** Still write the file, say why in
`rationale`. The pipeline records the decision and renders nothing. A single
delisted model is not a drop; two models at the same price is not news.

## Honesty gate — enforced

The CLI checks every plan before it reaches the film (`lib/plan.mjs`). It does
not fail the build; it **drops** whatever breaks a rule and warns in the log,
so a bad plan quietly becomes the default film. The rules:

- **Every number in your copy must be in the facts.** Prices, context windows,
  counts, versions, dates. `128K` may stand for 128000 or 131072 (the way the
  film prints it), `$0.16` for 0.155, `5 new models` for a list of five. A number
  you worked out yourself — a percentage, a sum, a "2x" — is not in the facts
  and is dropped.
- **No superlatives the API cannot back**: best, fastest, smartest,
  revolutionary, game-changing, blazing, unleash, supercharge, cutting-edge,
  next-gen, and the like. The API has no such field.
- **No exclamation marks, no emoji.**
- **Unknown keys and unknown ids are dropped.** Do not invent a model, a
  highlight or an entry.

Beyond what a machine can check:

- Do not imply a model is free unless `free: true` on that exact entry.
- Do not promise availability ("now live") for something that was not added. A
  price change is not a launch; a disabled entry is a retirement.
- If the best honest claim is boring, write the boring claim. A film that
  overclaims is worse than no film.

## What you must not do

- **Do not render**, and do not run `gen`, `check`, `run` or `regen`. The
  pipeline renders after you; a render that depends on a model is not
  reproducible.
- **Do not edit anything under `.build/<kind>/film/`** or any `kind.mjs`.
- **Do not change a baseline** (`videos/model-drop/baseline.json`) except via
  `npm run accept -- model-drop`.
- **Do not fetch anything.** The facts on disk are the facts.

## Output

Write exactly one file, `.build/<kind>/plan.json`, and nothing else. It is
frozen next to the facts in `releases/<kind>/<id>/plan.json` once the film
renders — after the CLI has removed anything that broke a rule, so the record
is the plan the film was actually cut from.

A human re-planning a release that is already out prints its brief with
`node lib/cli.mjs plan <kind> <id>` (it shows the current plan too), writes the
new plan to any file, and runs `node lib/cli.mjs regen <kind> <id> --plan=FILE`.
