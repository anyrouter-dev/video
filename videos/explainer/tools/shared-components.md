# Shared components (frame.md v2) — the exact CSS and helpers every frame uses

`frame.md` is the spec; this file is its implementation. Every frame pastes the kit
below into its `<template>` style, with `F` replaced by the frame's scope
`[data-composition-id="NN-name"]`, so the cut between frames never jumps. Values are
canvas px. Landscape is 1920×1080; the portrait rendition (1080×1920) is the same file
with its layout under `@media (orientation: portrait)`.

## Rules

- **Safe areas.** Landscape: x 96…1824, y 88…880 (captions own 900…1080).
  Portrait: x 60…960, y 200…1220 (captions own 1240…1480; platform buttons cover the
  right edge and the bottom quarter).
- **Type floor.** 36px for any word a viewer reads, badges included; URL pills 34px (the type audit gates at 32px by default and reads an exact 32px as just under it; `--floor=36` flags only the URL pills). Use the
  `k-` text classes; never set a smaller `font-size`.
- **No stage literals.** Never write 1920 or 1080 outside the root's `width: 1920px;
  height: 1080px`. `shared/authoring/portrait.mjs` refuses them. Positions that must be
  known in script (a cursor target, a crop) are read from the laid-out DOM with `box()`,
  which follows whichever layout the rendition uses.
- **One timeline, two layouts.** Tweens animate transforms and opacity, relative to the
  element's laid-out position (`y: 40 → 0`, `scale`, `xPercent`). A move between two
  places reads both places with `box()`. Build the timeline inside
  `document.fonts.ready.then(...)` so text boxes are measured in Geist, and register it
  at the end of that callback.
- **Sentence case.** No uppercase eyebrows, no letter-spaced caps.
- **One accent per moment.** `primary` marks the one thing the voice names.

## Kit CSS

```css
@font-face { font-family: "Geist"; src: url("assets/fonts/geist.woff2") format("woff2"); font-weight: 100 900; font-display: block; }
@font-face { font-family: "Geist Mono"; src: url("assets/fonts/geist-mono.woff2") format("woff2"); font-weight: 100 900; font-display: block; }

F {
  --bg: #FFFFFF; --surface: #FAFAFA; --surface-2: #F5F5F5;
  --ink: #0A0A0A; --ink-2: #3F3F46; --muted: #636363;
  --line: #E5E5E5; --line-strong: #D4D4D8;
  --primary: #BB4D00; --primary-tint: #FFF4EC; --free: #007E55; --free-tint: #ECFDF5; --danger: #C0262D;
  --term-bg: #0A0A0A; --term-bar: #18181B; --term-ink: #F4F4F5; --term-dim: #A1A1AA; --term-id: #F0915A; --term-ok: #4ADE80;
  --sans: "Geist", ui-sans-serif, system-ui, sans-serif;
  --mono: "Geist Mono", ui-monospace, Menlo, monospace;
  font-family: var(--sans);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
F .k-bg { position: absolute; inset: 0; background: var(--bg); }
F .k-stage { position: absolute; inset: 0; }

/* type scale (frame.md typography) */
F .k-display { font-size: 140px; font-weight: 600; line-height: 1; letter-spacing: -0.04em; }
F .k-h1 { font-size: 104px; font-weight: 600; line-height: 1.02; letter-spacing: -0.035em; }
F .k-h2 { font-size: 76px; font-weight: 600; line-height: 1.08; letter-spacing: -0.03em; }
F .k-title { font-size: 56px; font-weight: 600; line-height: 1.1; letter-spacing: -0.025em; }
F .k-body { font-size: 44px; font-weight: 400; line-height: 1.3; color: var(--muted); }
F .k-label { font-size: 40px; font-weight: 500; line-height: 1.2; }
F .k-small { font-size: 36px; font-weight: 500; line-height: 1.2; color: var(--muted); }
F .k-code { font-family: var(--mono); font-size: 48px; line-height: 1.45; }
F .k-code-sm { font-family: var(--mono); font-size: 40px; line-height: 1.45; }
F .k-stat { font-size: 200px; font-weight: 600; line-height: 1; letter-spacing: -0.05em; font-variant-numeric: tabular-nums; }
F .k-mono { font-family: var(--mono); }

/* card: shadcn Card at 2x */
F .k-card { box-sizing: border-box; background: var(--bg); border: 2px solid var(--line); border-radius: 24px; box-shadow: 0 2px 4px rgba(0,0,0,.05); padding: 48px; }

/* badge: shadcn Badge */
F .k-badge { display: inline-flex; align-items: center; gap: 12px; height: 56px; box-sizing: border-box; padding: 0 20px; border-radius: 12px; background: var(--surface-2); color: var(--ink); font-size: 36px; font-weight: 500; line-height: 1; white-space: nowrap; }
F .k-badge.is-outline { background: var(--bg); border: 2px solid var(--line); }
F .k-badge.is-free { background: var(--free-tint); color: var(--free); }
F .k-badge.is-accent { background: var(--primary-tint); color: var(--primary); }
F .k-badge.is-danger { background: #FEF2F2; color: var(--danger); }
F .k-badge svg { width: 32px; height: 32px; flex: none; }

/* button: shadcn Button */
F .k-btn { display: inline-flex; align-items: center; justify-content: center; gap: 16px; height: 88px; box-sizing: border-box; padding: 0 40px; border-radius: 16px; background: var(--ink); color: #FFFFFF; font-size: 40px; font-weight: 500; line-height: 1; white-space: nowrap; }
F .k-btn.is-outline { background: var(--bg); color: var(--ink); border: 2px solid var(--line); }
F .k-btn.is-primary { background: var(--primary); }  /* only where it mirrors a real orange button on anyrouter.dev */
F .k-btn svg { width: 36px; height: 36px; flex: none; }

/* focus ring: wrap the named control; animate the ring's opacity */
F .k-ring { position: absolute; inset: -10px; border-radius: inherit; border: 2px solid var(--primary); box-shadow: 0 0 0 6px rgba(187,77,0,.35); pointer-events: none; opacity: 0; }

/* step header: replaces the old four-dot rail */
F .k-step { position: absolute; left: 96px; top: 88px; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }

/* demo badge: every frame that shows a third-party site */
F .k-demo { position: absolute; right: 96px; top: 88px; }

/* callout: shadcn Alert, one side note at a time */
F .k-callout { display: flex; align-items: flex-start; gap: 28px; box-sizing: border-box; background: var(--bg); border: 2px solid var(--line); border-radius: 24px; box-shadow: 0 2px 4px rgba(0,0,0,.05); padding: 36px 44px; }
F .k-callout > svg, F .k-callout > img { width: 40px; height: 40px; flex: none; margin-top: 4px; }
F .k-callout-text { display: flex; flex-direction: column; gap: 8px; }

/* browser frame: wraps a real screenshot, cropped to what the voice names */
F .k-browser { position: absolute; box-sizing: border-box; background: var(--bg); border: 2px solid var(--line); border-radius: 24px; box-shadow: 0 2px 4px rgba(0,0,0,.05); overflow: hidden; }
F .k-browser-bar { position: relative; height: 56px; box-sizing: border-box; background: var(--surface); border-bottom: 2px solid var(--line); display: flex; align-items: center; justify-content: center; }
F .k-browser-dots { position: absolute; left: 24px; top: 22px; display: flex; gap: 10px; }
F .k-browser-dots i { width: 12px; height: 12px; border-radius: 50%; background: var(--line-strong); }
F .k-url { display: inline-flex; align-items: center; height: 44px; box-sizing: border-box; padding: 0 20px; border-radius: 999px; background: var(--bg); border: 2px solid var(--line); font-family: var(--mono); font-size: 34px; line-height: 1; color: var(--muted); white-space: nowrap; }
F .k-view { position: absolute; left: 0; right: 0; top: 56px; bottom: 0; overflow: hidden; }
F .k-view > img { position: absolute; left: 0; top: 0; display: block; max-width: none; transform-origin: 0 0; }

/* key pill: an API key, always redacted (prefix + bullets) */
F .k-key { display: inline-flex; align-items: center; gap: 16px; height: 72px; box-sizing: border-box; padding: 0 24px; border-radius: 12px; background: var(--surface); border: 2px dashed var(--line-strong); font-family: var(--mono); font-size: 40px; line-height: 1; color: var(--ink); white-space: nowrap; }
F .k-key svg { width: 36px; height: 36px; flex: none; }

/* terminal: the one dark surface */
F .k-term { position: absolute; box-sizing: border-box; background: var(--term-bg); border-radius: 24px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,.05); }
F .k-term-bar { position: relative; height: 56px; background: var(--term-bar); display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: 34px; color: var(--term-dim); }
F .k-term-dots { position: absolute; left: 24px; top: 22px; display: flex; gap: 10px; }
F .k-term-dots i { width: 12px; height: 12px; border-radius: 50%; background: #3F3F46; }
F .k-term-body { padding: 40px 48px; font-family: var(--mono); font-size: 48px; line-height: 1.45; color: var(--term-ink); white-space: pre; }
F .k-term-body .p { color: var(--term-dim); }     /* the $ prompt */
F .k-term-body .dim { color: var(--term-dim); }   /* output */
F .k-term-body .id { color: var(--term-id); }     /* a model id */
F .k-term-body .ok { color: var(--term-ok); }     /* success */
F .k-caret { display: inline-block; width: 26px; height: 52px; vertical-align: -8px; background: var(--term-ink); }

/* cursor: macOS arrow at 2x so it reads on a phone */
F .k-cursor { position: absolute; left: 0; top: 0; width: 44px; height: 54px; filter: drop-shadow(0 2px 4px rgba(10,10,10,.25)); pointer-events: none; transform-origin: 3px 3px; }

@media (orientation: portrait) {
  F .k-step { left: 60px; top: 200px; }
  F .k-demo { right: 120px; top: 200px; }
  F .k-term-body { font-size: 40px; white-space: pre-wrap; word-break: normal; overflow-wrap: anywhere; padding: 32px 36px; }
}
```

A long command wraps in portrait. With `word-break: normal; overflow-wrap: anywhere` a
line breaks at a space, so a model id stays whole on its own line. A URL has no space and
the browser never starts a line with `/`, so put a zero-width space (`&#8203;`, or `\u200b`
in typed text) after the host: `https://anyrouter.dev&#8203;/setup.sh`. Landscape lines
are `pre`, so the mark changes nothing there.

Measure with `box()` after the script has built all of its own text (typed characters
split into spans, a model id written in), or a wrapped line comes out one row short.

## Markup

```html
<!-- step header -->
<div class="k-step"><span class="k-badge is-outline">Step 1 of 3</span><h2 class="k-h2" style="margin:0">Create an OpenRouter key</h2></div>

<!-- demo badge (third-party screens only) -->
<span class="k-badge is-outline k-demo">Demo</span>

<!-- browser frame -->
<div class="k-browser"><div class="k-browser-bar"><div class="k-browser-dots"><i></i><i></i><i></i></div><span class="k-url">openrouter.ai</span></div>
  <div class="k-view"><img src="assets/openrouter-home.png" alt=""></div></div>

<!-- key pill -->
<span class="k-key"><svg viewBox="0 0 24 24" fill="none" stroke="#636363" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L20 3M16 7l3 3M18.5 4.5l2 2"/></svg>sk-or-v1-••••••••</span>

<!-- cursor (hot spot at the path tip, 3px 3px of the box) -->
<svg class="k-cursor" viewBox="0 0 28 34"><path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill="#0A0A0A" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/></svg>
```

## Helpers

```js
// Layout box of an element relative to the frame root. Ignores transforms, so it is
// the same before and after any tween, and follows the portrait layout in portrait.
const box = (el) => {
  let x = 0, y = 0;
  for (let n = el; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight, cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2 };
};

// Crop a screenshot inside a .k-view: show captured region (sx, sy) at `scale`
// (film px per captured px; frame.md asks >= 0.9). Screenshots are 3840x2160 captures.
const crop = (img, sx, sy, scale) => gsap.set(img, { width: 3840 * scale, x: -sx * scale, y: -sy * scale });
```

Screenshots are 2x captures of a 1920-wide viewport: 14px of site text is 28 captured
px, so it reads at 36px only from a scale of about 1.3. Crop to the region the voice
names and scale it up; never show a whole page shrunk.

Cursor press: scale 0.88 for 0.06s, back over 0.08s. Click ripple: a `primary` ring
growing from 0 to 72px while fading 0.5 → 0 over 0.45s, centred on the hot spot.

## Motion

`power3.out` entrances (0.5–0.8s), `power2.inOut` moves. Entrances use `fromTo`. No
bounce, `repeat`, `yoyo` or randomness. Each reveal lands on its spoken word, read from
`.hyperframes/frame-packets/<frame>.words.json` (seconds from the frame's start).
