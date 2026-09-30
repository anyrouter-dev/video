---
name: plan-model-drop
description: Makes the CI agent choose the story for a model drop. The workflow
  appends `node lib/cli.mjs plan model-drop` (the facts path, the item ids, the
  schema) and hands the whole text to `opencode run --auto`.
---

You are planning ONE short film for AnyRouter (https://anyrouter.dev) about
models that just changed in its catalog.

Read `ci/AGENT.md` first. It is the contract, and the CLI enforces it: a number
that is not in the facts, a superlative, an exclamation mark or an unknown id
is removed before the film is made.

Your entire output is one file: `.build/model-drop/plan.json`.

## The facts

`.build/model-drop/data.json` is the live catalog diffed against the last
release: `added` (new models, newest first), `changed` (price or context moves,
with `from` and `to`), `removed`, and `totals` for the whole catalog. The brief
below lists the models you may pick.

## What you decide

- **Which models are the story.** `added` is a fact list, not a narrative. If
  twelve shipped and three matter, pick those three, in the order a viewer
  should meet them, and say why in `rationale`. A known lab's flagship leads
  over a fourth size of an embedding model.
- **The layout,** through `limit`: 1 is a full-frame hero, 2–4 are cards, 5 or
  more a ranked list. One model that genuinely is the news gets `limit: 1` even
  when several shipped.
- **One line per picked model** in `lines`, when you can say something true
  and specific: its context window, its price, what it is for — from its entry.
- **`headline`**: what shipped, specifically. "MiMo V2.6 Pro and Flash join
  with a 1M window" beats "New models on AnyRouter".
- **`kicker`, `share`, `seconds`** as the contract describes. A hero film does
  not need 20 seconds.

A price cut with no new model is still a release; a single delisted model is
not a film — decline it with `limit: 0`.
