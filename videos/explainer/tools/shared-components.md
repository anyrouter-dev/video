# Shared film kit (frame.md v3, Monolith)

The kit is the CSS and motion every AnyRouter film shares. `frame.md` (next to this folder)
is the design system; this page is the parts list and how to reuse it.

## How a film uses it

- `tools/kit/kit.css` and `tools/kit/kit.js` are the source. A frame carries an empty
  `/* kit:css */ /* /kit:css */` pair in its `<style>` and a `// kit:js // /kit:js` pair in
  its script; `node tools/kit.mjs [film-dir]` pastes the kit between them, with `%F` scoped to
  the frame's `data-composition-id`. A sub-composition keeps only what is inside its
  `<template>`, so each frame holds its own copy. Re-run the tool after any kit edit.
- Another film links the kit and the system rather than copying them:
  `tools/kit -> ../../explainer/tools/kit`, `frame.md -> ../explainer/frame.md`,
  `caption-skin.html -> ../explainer/caption-skin.html`, then runs
  `node ../explainer/tools/kit.mjs .` from its own folder. The OpenRouter film does this.
- Assets the kit names: `assets/fonts/geist.woff2`, `assets/fonts/geist-mono.woff2`, and
  `assets/providers/anyrouter.svg` for the brand. Copy them into the film's `assets/`.

## Parts

| Class | What it is |
| --- | --- |
| `.k-bg`, `.k-stage`, `.k-cam` | white ground, the clipped stage, and the camera everything sits in |
| `.k-brand` | mark and word, top-left frame chrome; give it `data-outside-safe-area` |
| `.k-display` `.k-headline` `.k-h2` `.k-title` `.k-body` `.k-label` `.k-small` | the type scale (184/120/88/64/56/40/36; portrait steps down) |
| `.k-stat`, `.k-num` | a hero number (360) and a stat (52), tabular |
| `.k-line` | one line of a headline, revealed on its own by `K.headline` |
| `.k-muted` | muted text; on the ink card it turns on-ink-muted |
| `.k-card`, `.k-card.is-ink` | hairline card, radius 32, no shadow; the ink card is the one in focus |
| `.k-mark` | a provider or brand mark `<img>`, a black silhouette, white on the ink card |
| `.k-badge` + `is-ink` / `is-muted` / `is-big` | a quiet pill label. `is-free` and `is-danger` are kept for older frames and draw as `is-ink` and `is-muted`: Monolith has no green or red |
| `.k-btn` | a product button: ink, or the site's orange set by the frame |
| `.k-ring` | a 4px accent ring, only where inking would misdraw a real control |
| `.k-chip` | a company chip: mark and name in a hairline pill |
| `.k-code`, `.k-code-bar`, `.k-code-body`, `.k-ln` | a code card with a file tab, code at 60/52px |
| `.k-term`, `.k-term-bar`, `.k-term-body`, `.k-caret` | the terminal, an ink card |
| `.k-browser`, `.k-browser-bar`, `.k-browser-dots`, `.k-url`, `.k-view`, `.k-shot` | a window around redrawn product UI |
| `.k-roll` (+ `is-arriving`) | a value that rolls in place; each value after the first takes the accent, `is-arriving` accents the first too |
| `.k-pbr`, `.k-lbr` | a line break shown only in portrait, a space shown only in landscape |

## Motion (`K`)

| Call | Move |
| --- | --- |
| `K.rise(tl, el, t, { y, d, scale })` | one object in: y 50, from 1.04, expo.out 1.0s |
| `K.headline(tl, el, t)` | push-out from 1.08, expo.out 2.2s, its `.k-line`s rise in a 0.14 stagger, expo.out 1.4s |
| `K.cards(tl, group, cards, t)` | the group eases out of a 1.1 close-up, power4.inOut 2.1s; the cards rise 120px, expo.out 1.3s, stagger 0.14 |
| `K.exit(tl, el, t, { y, d })` | up and out, power4.inOut 0.75s |
| `K.ink(tl, card, t, on, d)` | a card becomes (or stops being) the ink card, power2.inOut 0.6s |
| `K.roll(tl, slot, at)` | a `.k-roll` steps to its next value at each time, power4.inOut 0.7s or shorter |
| `K.wash(tl, el, t, span)` | the accent on a value for `span` seconds, then its own colour |
| `K.push(tl, cam, dur, { to, at })` | a slow camera drift so a long beat never holds still; half as far in portrait |
| `K.box`, `K.fit`, `K.scaleFor` | layout helpers: a ring's box around an element, a crop's transform and scale |

Rules that keep it Monolith: one object in focus per beat, one ink card and one accent per
moment, no `back` or elastic eases, a beat leaves before the next arrives. `frame.md` has the
full system, including the portrait safe area and the caption skin.
