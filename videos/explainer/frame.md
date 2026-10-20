---
version: 3
name: AnyRouter Monolith (video / frame layer)
description: >
  The shared frame system for every AnyRouter film, v3 "Monolith". Pure white, near-black ink,
  oversized Geist, and one object in focus at a time: a sentence, a line of code, a dialog, a
  list, a set of cards with the one that matters inked. Motion is slow and weighty, like a
  keynote: a headline settles from a push, cards arrive under a camera that eases out of a
  close-up, and a scene leaves before the next one speaks. Built from anyrouter.dev's own
  tokens (Geist, Geist Mono, the site's burnt orange). Replaces v2 "Clear", whose small cards
  sat in a large empty frame.
unit: the frame, 1920x1080 (portrait 1080x1920 from the same source)
principle: one object in focus · fill the frame · one accent, on the thing that just changed · every word on screen is real

colors:
  bg: "#FFFFFF"
  ink: "#0A0A0A"
  ink-2: "#27272A"
  muted: "#6B6B6B"
  hairline: "#E7E7E7"
  surface: "#F5F5F5"
  accent: "#BB4D00"
  on-ink: "#FFFFFF"
  on-ink-muted: "#A3A3A3"
  accent-on-ink: "#F0915A"

radii:
  card: "32px"
  card-portrait: "28px"
  control: "20px"
  pill: "999px"

typography:
  display:  { fontFamily: "Geist", px: 184, portraitPx: 148, weight: 600, lineHeight: 0.98, tracking: "-0.055em", color: "ink" }
  headline: { fontFamily: "Geist", px: 120, portraitPx: 104, weight: 600, lineHeight: 1.0, tracking: "-0.05em", color: "ink" }
  title:    { fontFamily: "Geist", px: 64, portraitPx: 56, weight: 600, lineHeight: 1.1, tracking: "-0.035em", color: "ink" }
  body:     { fontFamily: "Geist", px: 56, portraitPx: 48, weight: 500, lineHeight: 1.1, tracking: "-0.035em", color: "ink-2" }
  label:    { fontFamily: "Geist", px: 40, weight: 600, lineHeight: 1.2, tracking: "-0.025em", color: "ink" }
  small:    { fontFamily: "Geist", px: 36, weight: 500, lineHeight: 1.1, color: "muted" }
  stat:     { fontFamily: "Geist", px: 52, weight: 600, lineHeight: 1.0, tracking: "-0.04em", numeric: "tabular-nums" }
  stat-hero: { fontFamily: "Geist", px: 360, portraitPx: 280, weight: 600, lineHeight: 0.9, tracking: "-0.06em", numeric: "tabular-nums" }
  code:     { fontFamily: "Geist Mono", px: 60, portraitPx: 52, weight: 400, lineHeight: 1.4, tracking: "-0.02em", color: "ink" }
  code-tight: { fontFamily: "Geist Mono", px: 52, portraitPx: 40, description: "only where a real line would overflow at code size: a 30-plus-character URL or id on the 900px portrait width" }
  caption:  { fontFamily: "Geist", px: 52, portraitPx: 46, weight: 500, lineHeight: 1.2, tracking: "-0.02em", color: "ink" }
  floor:    "36px for any word a viewer must read. Enforced by shared/authoring/type-audit.mjs --floor=36 on the rendered frame, transforms included."

spacing:
  pad-x: "96px"
  pad-top: "88px"
  gap: "40px"
  gap-portrait: "28px"
  caption-band: "landscape y 900-1080; portrait y 1240-1480"

components:
  card:
    backgroundColor: "{colors.bg}"
    border: "2px solid {colors.hairline}"
    rounded: "{radii.card}"
    shadow: none
    description: "Padding 52px (portrait 40px 44px). No shadow, ever. A card is big: in a row of three it is a third of the safe width and at least half the safe height."
  ink-card:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    description: "The focused item. Exactly one per moment. Its secondary text is on-ink-muted, its marks turn white. A card becomes the ink card by tweening its fill, border and text together, 0.6s power2.inOut."
  ring:
    description: "Monolith points by inking, not by ringing. Use the ring (4px accent line, 12px off the target, radius of the target + 12) only where inking would lie about the UI, such as a real button that keeps its own fill."
  badge:
    description: "A quiet label: 64px tall pill, 2px hairline, label type in ink-2. Variants: ink (ink fill, white text: the one that matters), outline (default), muted (surface fill, muted text: a thing that stopped)."
  button:
    description: "Real product buttons keep the site's look: ink fill and white text, or the site's orange where the site's button is orange. Disabled: hairline border, muted text."
  code:
    description: "A code card: hairline card, a 72px tab bar with the file name in small mono, code type inside. A line the voice names is the only ink line; the others are muted. The value that rolls in takes the accent."
  terminal:
    description: "The terminal is an ink card: on-ink text, the prompt in on-ink-muted, the arriving id in accent-on-ink."
  brand:
    description: "The AnyRouter mark and word, 40px and 36px, top-left at x 96 y 88 (portrait x 60 y 110). Frame chrome: it carries data-outside-safe-area. On every frame except the close, where the lockup is the subject."
  caption:
    description: "Ink on white, Geist 500, one line, centred in the caption band. No chip, no outline, no word highlight. Each phrase rises 12px and fades in over 0.3s expo.out; the next replaces it with no gap."
---

## Overview

Monolith is quiet and expensive-looking because it shows less. Each beat has one object
on stage, set very large, and nothing else competes with it. White does the framing; the
frame itself is never empty, because the object fills it.

## The frame

1920x1080, white. Content sits in x 96-1824, y 88-880; the bottom band (y 900-1080) belongs
to the captions. One object in focus per beat. "Object" means a headline, one line of code,
one card set, one dialog, one list. Two objects share a frame only as a lockup with a clear
lead (a title over a terminal, a headline beside its list), and the lead is at least twice
the size of the other.

**Fill the frame.** The focal object spans at least 70% of the safe width, or 70% of the
safe height when it is a column. A row of three cards fills the safe width with 40px gaps.
A dialog is at least 1100px wide. If an object looks small, it is: enlarge it, cut what is
around it, or split the beat.

**Phone first.** Most viewers watch on a phone, where the frame shrinks 2.3 to 5 times. The
type scale starts at 36px and the body sits at 56px, so every word survives the shrink.
At most 12 words on screen besides the caption.

## Two renditions: landscape and portrait

Every film ships twice from one source: landscape 1920x1080 and portrait 1080x1920. Same
timeline, same voice, same captions; only layout changes.

- Author at 1920x1080. Each frame's portrait layout lives under
  `@media (orientation: portrait) { ... }` in the same file. Tweens move transforms and
  opacity, so one timeline drives both.
- Never write a stage size outside the root declarations. `shared/authoring/portrait.mjs`
  writes the portrait project and fails on a leftover literal 1920 or 1080.
- Portrait safe area: content in x 60-960, y 200-1220. The platforms draw buttons on the
  right and over the bottom quarter. Captions sit in y 1240-1480. The brand sits above the
  safe area at y 110, as chrome.
- Portrait stacks what landscape sets side by side. The focal object takes the full 900px
  width; a row of three cards becomes a column of three, each a third of the safe height.
- Type steps down to the portrait sizes in the frontmatter (display 148, body 48, code 52).
  A code line that still overflows uses code-tight, never a size under 36px.

## Colors

- `bg` white is the ground of every frame. No gradient, no tint field, no texture.
- `ink` for type and for the one focused card. `ink-2` for body copy, `muted` for labels
  and for lines the voice is not naming. `hairline` for card borders and rules.
- `accent` (#BB4D00, 5.0:1 on white) is the only colour. It goes on the model id that just
  arrived, or the one value that just changed, and nowhere else. On the ink card use
  `accent-on-ink` (#F0915A, 8:1 on ink).
- Monolith has no green and no red. "Free", "$0" and "works" are said in words and shown
  by inking; a thing that fails turns `surface` with muted text.
- Every pair passes 4.5:1. Muted on white is 5.3:1; on-ink-muted on ink is 7.9:1.

## Typography

Geist for words, Geist Mono for anything typed (ids, URLs, keys, commands). Sentence case;
no uppercase eyebrows. Two weights: 600 for display, headlines, titles and stats; 500 for
body, labels and captions. Mono stays 400. Tight tracking scales with size (-0.055em at
display, -0.02em on captions). Numbers use `tabular-nums`. Every text element sets
`-webkit-font-smoothing: antialiased` and `text-rendering: geometricPrecision`.

## Depth and surface

Flat. Cards are 2px hairline with a 32px radius and no shadow. Depth comes from motion, not
from shading: a camera that eases out of a close-up, a headline that settles from 1.08,
cards that rise 120px in a stagger. No glow, blur, noise, dither, bokeh or 3D tilt.

## Motion

The film moves like a keynote: few moves, each slow and certain, with one hero move per beat.

| Move | From | Ease | Duration |
| --- | --- | --- | --- |
| Headline push-out | scale 1.08 | expo.out | 2.2s |
| Headline lines | y 60, opacity 0, stagger 0.14 | expo.out | 1.4s |
| Card camera (the group) | scale 1.1 | power4.inOut | 2.1s |
| Cards | y 120, opacity 0, stagger 0.14 | expo.out | 1.3s |
| Code or a single object in | y 50, opacity 0, scale 1.04 | expo.out | 1.0s |
| Roll (a value changes in place) | yPercent 100 | power4.inOut | 0.7s, or 0.45s when the next comes sooner |
| Inking a card | white to ink | power2.inOut | 0.6s |
| Exit | to y -80, opacity 0 | power4.inOut | 0.7-0.8s |

- A beat leaves before the next one arrives; two objects never cross at full opacity.
- Reveals land on the spoken word (`audio_meta.json`), 0.05s ahead of it.
- No bounce, no back or elastic ease, no spring, no `repeat` or `yoyo`, no randomness.
- No still span over 1.5s outside the closing card (`pace-audit.mjs`). A long beat earns its
  motion from a slow camera drift (`K.push`, scale +0.03 over the beat), never from a wiggle.

## Approved entities

The AnyRouter mark (`assets/providers/anyrouter.svg`), official provider marks
(`provider-*.svg`, `assets/providers/*.svg`), Geist faces. Product UI is redrawn from real
values, never shown as a screenshot. Say and caption "OpenRouter", never the domain.

## Numerals and claims (hard rule)

Only numbers from BRIEF.md's claims ledger and values captured from the product (the
playground run, the catalog). Never "unlimited": say "no daily cap". API keys on screen are
always redacted or read from `process.env`.

## Pre-render self-audit

- Is there one object in focus in every beat, and does it fill the frame?
- Is there at most one accent-coloured thing and one ink card per moment?
- Does every move use the eases above, with no bounce?
- Is anything in the caption band?
- Does `type-audit.mjs --floor=36` pass on both renditions?
- Do the contact sheets of both renditions read at phone size without zooming?
