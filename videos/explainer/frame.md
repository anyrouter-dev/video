---
version: 1
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
  card: "20px"
  ui: "12px"
  chip: "999px"
  key: "10px"

typography:
  display:  { fontFamily: "Geist", px: 112, weight: 600, lineHeight: 1.0, tracking: "-0.035em", color: "ink" }
  h1:       { fontFamily: "Geist", px: 84, weight: 600, lineHeight: 1.04, tracking: "-0.03em", color: "ink" }
  h2:       { fontFamily: "Geist", px: 60, weight: 600, lineHeight: 1.1, tracking: "-0.025em", color: "ink" }
  body-lg:  { fontFamily: "Geist", px: 40, weight: 400, lineHeight: 1.35, color: "ink-2" }
  label:    { fontFamily: "Geist", px: 30, weight: 500, lineHeight: 1.2, color: "ink" }
  eyebrow:  { fontFamily: "Geist Mono", px: 24, weight: 500, tracking: "0.08em", upper: true, color: "muted" }
  step-num: { fontFamily: "Geist Mono", px: 28, weight: 500, color: "primary" }
  code:     { fontFamily: "Geist Mono", px: 44, weight: 400, lineHeight: 1.5, color: "terminal-ink" }
  code-sm:  { fontFamily: "Geist Mono", px: 30, weight: 400, lineHeight: 1.5, color: "ink" }
  stat:     { fontFamily: "Geist", px: 140, weight: 600, lineHeight: 1.0, tracking: "-0.04em", color: "ink" }

spacing:
  pad-x: "120px"
  pad-top: "110px"
  gap: "28px"
  caption-band: "bottom 180px kept clear"

components:
  card:
    backgroundColor: "{colors.bg}"
    border: "1.5px solid {colors.line}"
    rounded: "{radii.card}"
    shadow: "0 1px 2px rgba(10,10,10,.04), 0 12px 40px rgba(10,10,10,.06)"
    description: "The one elevated surface. Holds a UI panel, a provider tile, a step card."
  browser-frame:
    backgroundColor: "{colors.bg}"
    border: "1.5px solid {colors.line}"
    rounded: "{radii.card}"
    description: "Wraps a real screenshot. Thin top bar (surface fill) with three line-strong dots and a URL pill in Geist Mono muted. No fake browser chrome beyond that."
  provider-tile:
    backgroundColor: "{colors.bg}"
    border: "1.5px solid {colors.line}"
    rounded: "{radii.ui}"
    description: "Square tile with one official provider mark in ink, never recolored to the accent."
  chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{radii.chip}"
    description: "Small label. Free variant: free-tint fill, free text. Accent variant: primary-tint fill, primary text."
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{radii.ui}"
    description: "Matches the site's 'Get API key' / 'Donate a key' button."
  terminal:
    backgroundColor: "{colors.terminal-bg}"
    textColor: "{colors.terminal-ink}"
    rounded: "{radii.card}"
    description: "The only dark surface in the film. Prompt glyph `$` in terminal-dim, model ids in a lighter orange #F0915A (7.1:1 on terminal-bg)."
  key-pill:
    backgroundColor: "{colors.surface}"
    border: "1.5px dashed {colors.line-strong}"
    rounded: "{radii.key}"
    typography: "{typography.code-sm}"
    description: "An API key, always redacted: prefix + bullets, e.g. sk-or-v1-••••••••. Never a real key."
---

## Overview

A calm, white explainer for people who have never heard of AnyRouter. The canvas is
the site's own white page; everything else is ink, hairlines and one accent. The film
should feel like the product: clean, exact, unhurried.

## The Frame

1920×1080, white. Content sits in the top ~83%; the bottom 180px stays clear for
captions. Margins 120px. One idea per frame, one focal element per moment.

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
commands, step numbers. Nothing below 24px. Headlines are sentence case.

## Depth & Surface

Flat white with one soft shadow level on cards. No glow, no blur fields, no bokeh, no
noise, no dither, no halftone, no 3D tilt of real screenshots beyond a gentle push.

## Approved Entities

AnyRouter mark (`anyrouter-logo-black.svg`), official provider marks (`provider-*.svg`),
real screenshots of anyrouter.dev and openrouter.ai, Geist faces.

## Numerals & Claims (hard rule)

Only numbers from BRIEF.md's claims ledger: 260+ models, 17+ providers, $4 credit a
month, the live pool table as captured. Never "unlimited": say "no daily cap".
API keys on screen are always redacted.

## Pre-Render Self-Audit

- Is there exactly one accent-colored thing per moment?
- Could a non-technical viewer read every word on screen in the time it holds?
- Is anything in the bottom 180px?
