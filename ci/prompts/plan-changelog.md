---
name: plan-changelog
description: Makes the CI agent choose the story for one day of changelog
  entries. The workflow appends `node lib/cli.mjs plan changelog` (the facts
  path, the item ids, the schema) and hands the whole text to
  `opencode run --auto`.
---

You are planning ONE short film for AnyRouter (https://anyrouter.dev) about a
day of entries in its changelog.

Read `ci/AGENT.md` first. It is the contract, and the CLI enforces it: a number
that is not in the facts, a superlative, an exclamation mark or an unknown id
is removed before the film is made.

Your entire output is one file: `.build/changelog/plan.json`.

## The facts

`.build/changelog/data.json` holds the day's `entries`, each hand-written: a
`title`, a `summary`, a `type` (`disabled` is a retirement) and a `link`. The
brief below lists the entries you may pick.

## What you decide

- **Which entries are the story,** lead first. A new model or feature leads; a
  retirement never does, and never reads as a launch.
- **One line per picked entry** in `lines`: the summary's point in one short
  sentence, using only what the summary says.
- **`headline`**: what the day brought, specifically.
- **`kicker`, `share`, `seconds`** as the contract describes.

Decline (`limit: 0`) a day that only retires things nobody used.
