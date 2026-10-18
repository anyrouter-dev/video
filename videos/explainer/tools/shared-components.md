# Shared components — exact specs every frame uses

Every frame of this film builds these the same way so the cut between frames never
jumps. Values are in canvas px (1920×1080). Colours are `frame.md` tokens.

## Fonts

Every sub-composition declares both faces inside its `<template>` style:

```css
@font-face { font-family: "Geist"; src: url("assets/fonts/geist.woff2") format("woff2"); font-weight: 100 900; font-display: block; }
@font-face { font-family: "Geist Mono"; src: url("assets/fonts/geist-mono.woff2") format("woff2"); font-weight: 100 900; font-display: block; }
```

Fallback stack: `"Geist", ui-sans-serif, system-ui, sans-serif` and `"Geist Mono", ui-monospace, Menlo, monospace`.

## Safe area

Content lives inside x 120…1800, y 80…880. Nothing important below y 880 (captions).

## Step rail (Frames 5, 6, 7)

- Centred horizontally, top y 72, height 56.
- Three steps in a row, gap 64 between steps. Each step: a 40px circle + a label 26px Geist 500 to its right, gap 14.
- Labels: `Create a key`, `Donate it`, `Use free models`.
- Between steps: a 72px × 2px hairline in `line-strong`, vertically centred on the circles.
- Circle states. **todo**: white fill, 2px `line-strong` border, number in Geist Mono 20px `muted`. **active**: `primary` fill, white number, label `ink`. **done**: `free` fill, a white check glyph (2.5px stroke) in place of the number, label `ink-2`.
- Frame 5 starts with the rail drawing on (step 1 active). Frames 6 and 7 start with the rail already present in its incoming state (Frame 6: 1 done, 2 active; Frame 7: 1 and 2 done, 3 active) and change state on cue.

## Browser frame (Frames 4, 5, 6, 10)

- Card: white, 1.5px `line` border, radius 20, shadow `0 1px 2px rgba(10,10,10,.04), 0 24px 60px rgba(10,10,10,.08)`, overflow hidden.
- Top bar 52px, fill `surface`, bottom border 1.5px `line`. Three 12px dots in `line-strong` at left (x 22, gap 8). A URL pill centred: height 32, radius 999, fill white, 1.5px `line` border, Geist Mono 20px `muted`, padding 0 18px.
- The screenshot sits under the bar with `object-fit: cover; object-position: top center`, width 100% of the card.
- Screenshots are 3840×2160 (2x of a 1920×1080 viewport). Show them at any width; crop with the card, never stretch.

## Cursor (Frames 5, 6)

A macOS-style arrow, 34px tall, ink fill with a 2px white outline, soft shadow. Use this SVG:

```html
<svg class="cursor" width="28" height="34" viewBox="0 0 28 34"><path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill="#0A0A0A" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/></svg>
```

Its hot spot is the path's tip at (2,2). Press = scale 0.88 for 0.12s then back. Click ripple = a `primary` ring growing from 0 to 56px diameter while fading from 0.5 to 0 over 0.45s, centred on the hot spot.

## Key pill (Frames 1, 2, 4, 5, 6)

Inline-flex, height 52, padding 0 20px, radius 10, fill `surface`, 1.5px dashed `line-strong`, Geist Mono 26px `ink`. A 22px key glyph on the left in `muted` (or `primary` when it is the moving key). The text is always redacted: prefix + `•` bullets, e.g. `sk-or-v1-••••••••••••`. Never a real key.

## Terminal (Frames 8, 9)

- Card at x 290, y 190, width 1340, height 560 in Frame 8. Fill `terminal-bg`, radius 20, shadow `0 30px 80px rgba(10,10,10,.18)`.
- Title bar 56px, fill `#18181B`, three 13px dots `#3F3F46` at left, title `~/my-project` centred in Geist Mono 22px `terminal-dim`, the AnyRouter monogram 22px in `terminal-dim` at the right.
- Body padding 44px 52px. Lines in Geist Mono 34px, line-height 1.6. Prompt `$ ` in `terminal-dim`. Typed text `terminal-ink`. Model ids `#F0915A`. Success lines `#4ADE80`. Dim output `terminal-dim`.
- Caret: 18×38 block in `terminal-ink`; blink with stepped opacity tweens on the timeline (no CSS animation, no repeat — write the on/off steps explicitly).
- Frame 9 starts with the identical terminal and last line, then moves it (see Frame 9's shot).

## Motion defaults

`power3.out` for entrances (0.5–0.8s), `power2.inOut` for moves. No bounce, no `repeat`, no `yoyo`, no randomness. Entrances use `fromTo`. Animate transforms and opacity only (never `left` / `top` / `width` / `height`).
