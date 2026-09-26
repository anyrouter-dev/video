# CI agent instructions

OpenCode is given this file. The deterministic pipeline has already run
`release/fetch.mjs`, so the new models are known — the job here is judgment,
not mechanics.

## What you are doing

A model drop just landed on AnyRouter. `release/release.json` holds the live
catalog and the list of what shipped since the last accepted baseline. You decide
**what the film is about** and write `release/plan.json`. A deterministic
pipeline then renders it.

## What you must not do

- **Do not render.** `npm run render` is not yours to run. The pipeline renders
  after you, and a render that depends on a model is not reproducible.
- **Do not edit `index.html` or anything in `compositions/`.** They are
  generated from `release/generate.mjs` and are wiped on the next `npm run gen`.
  If the film needs to look different, change `generate.mjs` — or better, set a
  flag in your plan.
- **Do not hand-write a model, a price, a context window, or a count.** If it is
  not in `release/release.json`, it does not go on screen. The one number that is
  deliberately not from the API is `totals.providers`, and it is already
  computed for you.
- **Do not change `release/fetch.mjs` logic or the baseline** except via
  `npm run accept`.

## What you decide

Read `release/release.json`. You are choosing a *story*, and you may disagree
with the default pick.

1. **Which models are the story.** `incoming` is everything new, ordered by
   `created`. That is a fact list, not a narrative. If six models shipped but
   three are noise, use `plan.limit` to feature the ones that matter and say why
   in `plan.rationale`.

2. **The layout.** `plan.limit` also picks the layout (1 → hero, 2–4 → cards,
   ≥5 → list). If a single model genuinely is the story, set `limit: 1` for the
   hero treatment even when several shipped.

3. **The claim.** `plan.headline` is the one line on the end card. It must be
   true of the *catalog*, not of one model — the end card sits next to the
   catalog totals. If a model is new but has an unremarkable price or window, do
   not claim otherwise.

4. **The share copy.** `plan.share` is 1–3 sentences for posting. Same rule:
   verifiable only.

5. **Length.** `plan.seconds`, 8–30. A single hero model does not need 20 seconds.

## Honesty gate

Before you write the file, check your own claims against `release/release.json`:

- Any price, context window, or count you mention must exist in that file.
- Do not imply a model is free unless `free: true` on that exact entry.
- Do not imply a model is "the fastest" / "best" / "newest ever" — the API has
  no such field, so you would be inventing it.
- If the best honest claim is boring, write the boring claim.

A film that overclaims is worse than no film.

## Output

Write exactly this file, nothing else:

```json
{
  "limit": 1,
  "seconds": 14,
  "headline": "one true line about the catalog",
  "share": "1-3 verifiable sentences",
  "rationale": "why this story and these models — one or two sentences"
}
```

`limit`, `seconds` and `headline` are the only keys the pipeline reads. `share`
and `rationale` are kept for the humans and the commit message.

If the release genuinely warrants nothing — no new models, or nothing worth
filming — still write the file, set `"limit": 0`, and explain in `rationale`.
That is a valid, useful outcome and the pipeline will skip the render.
