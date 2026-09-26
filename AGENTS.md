# AGENTS.md — model-drop video

This repo renders short launch films for models added to the AnyRouter catalog.
It is standalone: it does not read the AnyRouter repo, and it gets its facts
from the live catalog API.

## The one thing to understand

**The render is deterministic and never needs an LLM.**

```
fetch  →  release/release.json      (live API, diffed vs baseline)
generate → index.html + compositions/
check  →  lint + runtime + layout + motion + contrast
render →  renders/*.mp4
```

Same inputs, same mp4, every time. `npm run video` is the whole pipeline. If you
find yourself wanting a model in the render loop, you almost certainly want a
deterministic function instead.

An agent is useful for the part that is *judgment*, not mechanics: when four
models ship at once, which one leads, what the film claims, and whether the copy
is honest. That is the agent's job here. It writes a plan; the deterministic
pipeline renders it.

## Commands

```bash
npm run video                 # fetch → generate → check → render
npm run fetch                 # pull the live catalog, print what shipped
npm run fetch -- --all        # ignore the baseline
npm run fetch -- --first=8    # newest N instead of a diff (first run)
npm run accept                # promote the current catalog to the baseline

npm run gen                   # release.json → HTML
npm run gen -- --limit=1      # force the hero layout (one model)
npm run gen -- --limit=4      # force the cards layout
npm run gen -- --seconds=12   # shorter film
npm run gen -- --music=audio/other.wav

npm run check                 # the gate — must pass before a render is worth anything
npm run render                # → renders/model-drop_<timestamp>.mp4
npm run dev                   # browser preview while adjusting
```

## Layout selection

`generate.mjs` picks the layout from the model count:

| N | Layout | Shape |
|---|--------|-------|
| 1 | `hero` | one card, full frame, deep push, long hold |
| 2–4 | `cards` | that many cards, back-to-back, equal slots |
| ≥5 | `list` | ranked rows, tight stagger |

Force it with `--limit=N` when the count picks the wrong story.

## Rules this project already obeys

Each of these was a `npm run check` failure first. Do not regress them.

1. **Never tween `autoAlpha` / `opacity` / `visibility` on an element carrying
   `data-start`.** The framework owns clip visibility — animate a child instead.
2. **The root composition is built only from sub-compositions.** Scenes are
   `data-composition-src` hosts on the root, never nested elements.
3. **Asset paths are project-root-relative** (`fonts/…`, `assets/providers/…`),
   never `../`. `generate.mjs` copies marks out of `assets/providers-src/` for
   this reason.
4. **Every font family needs an `@font-face`.**
5. **No scene may outlive the next one.** The overlap guard in `generate.mjs`
   clamps each duration to `next.start` and prints a `clamped` line. It exists
   because the same bug shipped twice.
6. **Contrast is enforced** (3:1 non-text, 4.5:1 text).

## Accuracy

- `providers: 17` in `fetch.mjs` is **hard-coded** to match the literal string on
  anyrouter.dev/models ("192+ AI models across 17+ providers"). Distinct model-id
  prefixes give 41 and upstream backends a third number. Do not make it computed.
- Context is formatted in K below 1M — do not divide by 1e6 unconditionally or a
  32k window reads as "0.0M".
- Counts that reach screen come from the API response, never typed by hand.

## Editing the film

Everything visual is in `release/generate.mjs`:

- `CSS` — tokens, type sizes, card geometry
- one `push(...)` per scene — start, duration, markup, GSAP timeline
- the `#root` tweens at the bottom — the camera (slow push, per-scene punch, orbit)

Then `npm run gen && npm run render`.
