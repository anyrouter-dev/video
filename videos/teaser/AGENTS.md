# AGENTS.md — AnyRouter intro video

A 20-second brand film for [anyrouter.dev](https://anyrouter.dev), rendered in
two themes from one source. Read this before editing anything: every rule below
is either a hard `check` failure that already happened, or an accuracy
trap that already put a wrong number on screen.

**Edit `release/generate.mjs`, `release/theme.mjs` and `release/facts.mjs`.
Never edit `index.html` or `compositions/`** — they are generated and wiped on
the next `release/generate.mjs` run.

## The six HyperFrames rules

Each of these was a `check` failure first. Do not regress them.

1. **Never tween `autoAlpha` / `opacity` / `visibility` on an element carrying
   `data-start`.** The framework owns clip visibility. Every scene here animates
   `#punch` and its children, never the clip host.

2. **The root composition is built only from sub-compositions** (`data-composition-src`
   hosts). Scenes are never nested elements. The plate layers are decorative
   *siblings* of the clips, not wrappers around them.

3. **Asset paths are project-root-relative** (`fonts/…`, `assets/…`), never
   `../`. This is why the provider marks are copied out of
   `shared/assets/providers/` into `assets/providers/` at generate time, and why
   every sub-composition carries its own `@font-face` block.

4. **Every font family needs an `@font-face`** — in the root *and* in every
   sub-composition, because each is a standalone document.

5. **No scene may outlive the next one.** The overlap guard in `generate.mjs`
   derives each duration as `next.start - this.start` and re-clamps it. The
   tolerance is 0.0005s, the rounding granularity — not an epsilon, or an exact
   hand-off reads as `3.7500000000000004 > 3.75` and every beat "clamps".

6. **Contrast is enforced** (4.5:1 text, 3:1 non-text). `theme.mjs` throws on
   import, and `check` measures real rendered pixels.

## Four more that are not obvious

7. **Never tween `left` / `top`.** Layout properties snap to integer device
   pixels and stutter under the seek-by-frame capture engine. Animate
   `x` / `y` / `scale` / `rotation`. The estab orbit lays every tile out once at
   the frame centre and moves them with `x`/`y` for exactly this reason.

8. **A number interpolated into a GSAP value must be a quoted string.**
   JavaScript has no numeric unit literals, so `left:960px` *and* `left:960.0px`
   are both syntax errors ("Identifier directly after number"). Use the `g()`
   helper, which emits `left:"960.0px"`. For CSS, `u()` is enough.

9. **A sub-composition's `body` must have no background.** Each scene is its
   own document and the framework composites it over the root, so an opaque
   `body` on all 15 clips hides the plate layers completely. Symptom: every
   pixel of every frame is the page background, even though the plates are
   generating fine and are on disk. The root's `html, body` carries the
   background; scene bodies stay transparent.

10. **Anything carrying text gets a solid surface, not a translucent tint.** A
    tint over a photographic plate makes the backdrop a function of whatever
    happens to be behind it — the end card's amber `curl` measured 2.32:1
    where the nebula plate brightened behind it. `--mark-plate` is for the
    decorative tiles that hold a provider mark and no text.

## Camera

One continuous slow push on `#root`, **capped at 1.06** — past that the catalog
card and the 280px numerals clip the frame edge. The per-beat zoom punch, the
pool push-away and the three drops' 3D flips live on each scene's `#punch`, so
no two tweens ever fight over one element's transform. The three flips are
**0.20s**; longer and the flip smears across the beat's payload.

The pool beat starts its push-away at exactly 1.0, not 1.06 — the retreat *is*
that beat's camera move, so an incoming punch on top of it is redundant motion
and a 1.06 start makes the 1920×1080 box overflow the stage on the way in.

## Type

40px is the floor; nothing in the film sets below it. Mono line-heights are
generous on purpose: JetBrains Mono's em box is about 1.39em tall, so a
line-height under that makes glyphs spill out of their own box and collide with
whatever sits below (`content_overlap`, or a silently clipped chip).

The board grid is sized from the longest id, not guessed. JetBrains Mono advances
0.656em, so the longest model part (14 chars) at 42px needs 386px; 4 cells ×
(386 + 2×20) + 3 × 20 gap = 1764px, leaving 78px margins. There is deliberately
no `overflow` / `text-overflow` on those chips — **a silently truncated model id
would be a false claim.**

## Accuracy — every number is verified

Run `tools/verify-facts.mjs` before you trust anything. It reads production and asserts
the traps rather than trusting them.

- **`192+` models / `17+` providers** is the site's literal copy, read back out
  of `/models` HTML. `/api/v1/models?all=1` returns **201** (192 listed + 9
  virtual aliases) and distinct model-id prefixes give **42**. Three different
  numbers for three different questions. Show 192 and 17. Never let the two on
  screen disagree.
- **`122+` is a stale literal** still present in the AnyRouter repo. Never use it.
- **`x-ai/grok-4.5` is not in the catalog** — 4.7 is. A stale `grok-4.5`
  reference survives in `routing.md`'s `anyrouter/latest` fallback list; that is
  a docs bug, not a listing. Do not put it on screen.
- **Pool stats: 92 active keys, 42 donors, 3052 requests_total.** The label says
  "all time" because `requests_total` is *lifetime*. `requests_today` is 7 and
  would be a terrible advert.
- **The 8 donor brands** are the real top 8 by pooled key count, in the API's
  own order. `bytedance` has **zero** donated keys and is absent from the
  response entirely — do not add it. `baseten` / `cohere` / `openai` are tied at
  2 keys; the first two take the slots.
- **No free-model count on screen, ever.** "141" counted SVG files in
  `public/providers`, came from a rule the product deleted (commit `fd6c2f9e1`),
  and the `Free N` UI badge is a lazy-loaded subset. The verifiable claim is the
  per-card `$0 in / $0 out` and the 10/day-free · 1000/day-paid request rate.
- **No health or latency claim.** `/api/v1/health` reports `partial` at ~8s
  average latency, so any "99.9% uptime" or "120ms TTFT" line would be a lie.
- **`@preset/fast` is user-defined.** Presets are workspace-defined and never
  appear in the catalog, so the copy says "your", not "ours" — nothing is
  claimed to ship.
- Anthropic ids use a **dot**: `claude-opus-4.8`, not `claude-opus-4-8`. The
  dashed form was a typo that `verify-facts.mjs` caught.
- Mark **filenames** do not match model-id prefixes: the file is `xai.svg` for
  the `x-ai/` prefix, `moonshotai.svg` for `moonshotai/`. Neither is guessable.

## A theme is a token swap

Never fork the film for a second theme. If a theme needs its own scene, its own
timing or its own copy, that is a bug in the film, not a feature of the theme.

The light theme's greys and all three of its accents fail on white, so each was
re-picked to clear WCAG AA — see the table in `README.md`. `verify()` throws on
import, so a bad token edit fails the generator immediately.

One consequence worth knowing: **a glow cannot be brighter than paper.** The
pool beat's focal node is a bright gold halo on near-black; the same gradient on
white renders as a muddy brown smudge, so the light theme gives it a solid
vivid burnt amber (`#C2560B`, 4.54:1) instead.

## Before you claim it is done

```bash
node videos/teaser/tools/build.mjs          # BOTH themes: gen → check → render → poster → ffprobe
node videos/teaser/tools/stills.mjs         # one frame per beat, per theme
node videos/teaser/tools/verify-facts.mjs   # every on-screen number, against production
```

Then **look at the stills.** `check` verifies contrast against real pixels and
layout against real boxes; it cannot tell you that a background is invisible.
Both of the worst bugs in this film's history — the opaque scene bodies and the
over-crushed plates — passed a clean `check` and were only caught by opening the
frames.

`tools/build.mjs` prints frame count and duration from `ffprobe` and fails if they
are not 600 / 20.000s / 1920×1080. Do not report a check as passing for one
theme when you only ran the other.
