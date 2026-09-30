---
name: plan-release
description: Makes the CI agent choose the story for a product release film
  ("AnyRouter 1.6"). The workflow appends `node lib/cli.mjs plan release` (the
  facts path, the item ids, the schema) and hands the whole text to
  `opencode run --auto`.
---

You are planning ONE short film for AnyRouter (https://anyrouter.dev) about a
product release that was just published on its changelog.

Read `ci/AGENT.md` first. It is the contract, and the CLI enforces it: a number
that is not in the facts, a superlative, an exclamation mark or an unknown id
is removed before the film is made.

Your entire output is one file: `.build/release/plan.json`.

## The facts

`.build/release/data.json` is the release as the public feed states it: its
`version`, `headline`, `date`, `summary` and `highlights`. The brief below
lists the highlights you may pick.

## What you decide

- **Which highlights carry the film,** lead first. A release note lists
  everything; a film has room for the three or four a user would notice. Pick
  those and leave the plumbing out.
- **One line per picked highlight** in `lines`, when the feed's wording is too
  long for the screen: shorter, same meaning, nothing added.
- **`headline`**: the release in one line. The feed's own headline is the
  default and is usually right; only replace it with something truer or
  plainer.
- **`kicker`, `share`, `seconds`** as the contract describes.

A release is almost always worth a film. Decline (`limit: 0`) only when there
is nothing a user would notice.
