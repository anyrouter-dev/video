---
version: 2
name: AnyRouter Clear — Frame (video / frame layer)
description: >
  Bespoke frame system for the AnyRouter newcomer explainer, built from anyrouter.dev's own
  tokens (captured 2026-10-18): a true white canvas, near-black ink, one burnt-orange accent
  (the site's --primary), the site's success green for "free", hairline greys, and the site's
  own faces, Geist and Geist Mono. Quiet, product-grade, readable by anyone. It deliberately
  shares nothing with the repo's older print / dither films.
unit: the frame — 1920×1080
principle: white space does the work · one accent per frame · every word on screen is real

colors:
  bg: "#FFFFFF"
  surface: "#FAFAFA"
  surface-2: "#F5F5F5"
  ink: "#0A0A0A"
  ink-2: "#3F3F46"
  muted: "#636363"
  line: "#E5E5E5"
  line-strong: "#D4D4D8"
  primary: "#BB4D00"
  primary-tint: "#FFF4EC"
  free: "#007E55"
  free-tint: "#ECFDF5"
  info: "#1761D3"
  danger: "#C0262D"
  terminal-bg: "#0A0A0A"
  terminal-ink: "#F4F4F5"
  terminal-dim: "#A1A1AA"

radii:
  card: "24px"
  ui: "16px"
  badge: "12px"
  chip: "999px"
  key: "12px"

# The frame is a 2x shadcn page: one CSS px on anyrouter.dev = 2 film px.
# shadcn's text-sm (14px) would be 28px here, which is unreadable on a phone,
# so the type scale below is phone-first, not 2x.
typography:
  display:  { fontFamily: "Geist", px: 140, weight: 600, lineHeight: 1.0, tracking: "-0.04em", color: "ink" }
  h1:       { fontFamily: "Geist", px: 104, weight: 600, lineHeight: 1.02, tracking: "-0.035em", color: "ink" }
  h2:       { fontFamily: "Geist", px: 76, weight: 600, lineHeight: 1.08, tracking: "-0.03em", color: "ink" }
  title:    { fontFamily: "Geist", px: 56, weight: 600, lineHeight: 1.1, tracking: "-0.025em", color: "ink" }
  body:     { fontFamily: "Geist", px: 44, weight: 400, lineHeight: 1.3, color: "muted" }
  label:    { fontFamily: "Geist", px: 40, weight: 500, lineHeight: 1.2, color: "ink" }
  small:    { fontFamily: "Geist", px: 36, weight: 500, lineHeight: 1.2, color: "muted" }
  badge:    { fontFamily: "Geist", px: 34, weight: 500, lineHeight: 1.0, color: "ink" }
  code:     { fontFamily: "Geist Mono", px: 48, weight: 400, lineHeight: 1.45, color: "terminal-ink" }
  code-sm:  { fontFamily: "Geist Mono", px: 40, weight: 400, lineHeight: 1.45, color: "ink" }
  stat:     { fontFamily: "Geist", px: 200, weight: 600, lineHeight: 1.0, tracking: "-0.05em", color: "ink", numeric: "tabular-nums" }
  floor:    "36px for any word a viewer must read, 32px for incidental mono metadata (URL pills). Enforced by shared/authoring/type-audit.mjs on the rendered frame, transforms included."

spacing:
  pad-x: "96px"
  pad-top: "88px"
  gap: "32px"
  caption-band: "bottom 200px kept clear"

components:
  card:
    backgroundColor: "{colors.bg}"
    border: "2px solid {colors.line}"
    rounded: "{radii.card}"
    shadow: "0 2px 4px rgba(0,0,0,.05)"
    description: "shadcn Card at 2x: hairline border, shadow-sm, padding 48px. Header = title (title type) + description (body type, muted). No big soft drop shadows."
  browser-frame:
    backgroundColor: "{colors.bg}"
    border: "2px solid {colors.line}"
    rounded: "{radii.card}"
    description: "Wraps a real screenshot. Top bar 56px, surface fill, URL pill in Geist Mono 32px muted. The screenshot inside is cropped to the region the voice names and shown at >= 0.9 of its captured pixels, never the whole page shrunk."
  button:
    backgroundColor: "{colors.ink}"
    textColor: "#FFFFFF"
    rounded: "{radii.ui}"
    description: "shadcn default Button: ink fill, label type in white, height 88px, padding 0 40px. Use the orange variant only when it mirrors a real orange button on anyrouter.dev."
  button-outline:
    backgroundColor: "{colors.bg}"
    border: "2px solid {colors.line}"
    rounded: "{radii.ui}"
  badge:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{radii.badge}"
    description: "shadcn Badge: height 56px, padding 0 20px, badge type. Variants: secondary (surface-2), outline (2px line border, bg), free (free-tint / free), accent (primary-tint / primary)."
  step-header:
    description: "Replaces the tiny four-dot rail. Top-left: an outline Badge 'Step 2 of 4', then the step name in h2 under it. One step on screen, big."
  callout:
    description: "shadcn Alert: card with a 40px icon left, a label-type title and body-type text. Use for one side note at a time; never a floating 26px annotation."
  focus-ring:
    description: "shadcn focus ring at 2x: 6px ring in primary at 35% alpha around the control the voice names, plus a 2px primary border. The way the film points at things."
  demo-badge:
    description: "Outline Badge reading 'Demo' pinned top-right of every frame that shows a third-party site (openrouter.ai, build.nvidia.com). Third-party screens are shown for demonstration only."
  terminal:
    backgroundColor: "{colors.terminal-bg}"
    textColor: "{colors.terminal-ink}"
    rounded: "{radii.card}"
    description: "The only dark surface. code type (48px). At most 6 lines and 52 characters visible: crop long logs, never shrink them. Prompt `$` in terminal-dim, model ids in #F0915A."
  key-pill:
    backgroundColor: "{colors.surface}"
    border: "2px dashed {colors.line-strong}"
    rounded: "{radii.key}"
    typography: "{typography.code-sm}"
    description: "An API key, always redacted: prefix + bullets, e.g. sk-or-v1-••••••••. Never a real key."
---

## Overview

A calm, white explainer for people who have never heard of AnyRouter. The canvas is
the site's own white page; everything else is ink, hairlines and one accent. The film
should feel like the product: clean, exact, unhurried.

## The Frame

1920×1080, white. Content sits in the top ~81%; the bottom 200px stays clear for
captions. Margins 96px. One idea per frame, one focal element per moment.

**Phone first.** Most viewers watch on a phone, where the frame is 390 to 844px
wide: a 1920px frame shrinks 2.3 to 5 times. So the focal element fills the frame
(at least 55% of the safe width), text is never below the floor, and a frame
says one thing in at most 12 on-screen words besides the caption. If a detail
cannot be read at 640px wide, enlarge it, crop to it, or cut it; the caption
already carries the words.

## Colors

- `bg` white is the ground for every frame. Never a gradient, never a tint field.
- `ink` for headlines and marks. `ink-2` / `muted` for supporting copy.
- `primary` (burnt orange, 5.0:1 on white) is the single accent: the AnyRouter node,
  the active step, the button being pressed, the key being moved. One use per moment.
- `free` (green, 5.1:1) only ever means "free" / "$0" / "works".
- `danger` only for a provider going down in the failover beat.
- The terminal is the one dark surface.

## Typography

Geist for everything spoken as words; Geist Mono for anything typed: ids, URLs, keys,
commands. Sentence case everywhere; no uppercase eyebrows (shadcn uses none, and
caps tracking reads as noise when small). Two weights only: 600 for headings and
titles, 400/500 for the rest. Numbers use `font-variant-numeric: tabular-nums`.
Every text element sets `-webkit-font-smoothing: antialiased` and
`text-rendering: geometricPrecision`. Nothing a viewer must read below 36px.

## Depth & Surface

Flat white, shadcn surfaces: 2px hairline borders and shadow-sm, nothing deeper. No glow, no blur fields, no bokeh, no
noise, no dither, no halftone, no 3D tilt of real screenshots beyond a gentle push.

## Approved Entities

AnyRouter mark (`anyrouter-logo-black.svg`), official provider marks (`provider-*.svg`),
real screenshots of anyrouter.dev and openrouter.ai, Geist faces. Say and caption
"OpenRouter", never the domain "openrouter.ai". Every third-party screen carries
the Demo badge.

## Numerals & Claims (hard rule)

Only numbers from BRIEF.md's claims ledger: 260+ models, 17+ providers, $4 credit a
month, the live pool table as captured. Never "unlimited": say "no daily cap".
API keys on screen are always redacted.

## Pre-Render Self-Audit

- Is there exactly one accent-colored thing per moment?
- Could a non-technical viewer read every word on screen in the time it holds?
- Is anything in the bottom 200px?
- Does `node ../../shared/authoring/type-audit.mjs` pass?
- Does the phone sheet (frames scaled to 640px wide) read without zooming?
