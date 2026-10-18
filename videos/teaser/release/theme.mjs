/**
 * Theme tokens for the AnyRouter intro film.
 *
 * THE ONE RULE: a theme is a TOKEN SWAP, never a second film. The beats, the
 * timings, the copy, the motion and the layout are byte-identical between
 * `dark` and `light` — `generate.mjs` reads the same code paths and only the
 * values in this file differ. If a theme needs its own scene, its own timing
 * or its own copy, that is a bug in the film, not a feature of the theme.
 *
 * Dark values are lifted verbatim from the product's own `.dark` theme in
 * packages/ui/src/styles/globals.css. Light values are NOT a mechanical
 * inversion: on white the dark theme's greys and its three accents all fail
 * (see `verify()` at the bottom of this file, which throws on a bad pair).
 *
 *   node -e "import('./release/theme.mjs').then(m=>console.log(m.THEMES.light.muted))"
 */

const hex = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};

/** WCAG 2.1 relative luminance. */
const luminance = (h) => {
  const [r, g, b] = hex(h).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio, 1..21. */
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const dark = {
  name: 'dark',
  // ── surfaces ────────────────────────────────────────────────────────────
  bg: '#0A0A0A',
  card: '#171717',
  cardEdge: '#262626',
  raised: '#1F1F1F',
  fg: '#FAFAFA',
  muted: '#A1A1A1',
  // `line` is a purely decorative card edge (1px, low alpha) and is exempt from
  // 1.4.11. `lineSolid` is the STRUCTURAL outline — chip borders, dividers, the
  // ring around a live value — and it does clear 3:1 on both surfaces.
  line: 'rgba(255,255,255,0.13)',
  lineSolid: '#6B6B6B', // 3.37:1 on card, 3.72:1 on bg
  // The plates average luma 15. A vignette keeps type off the busiest areas
  // without hiding the photograph.
  // The plate is a photograph, not a fill: it reads at the frame edges while
  // `scrim` holds the centre — where every headline in the film sits — as a
  // clean field. Without this the type competes with the busiest part of the
  // image, and the plate's own highlights break 4.5:1 under the muted greys.
  vignette: 'rgba(10,10,10,0.30)',
  scrim: 'rgba(10,10,10,0.66)',
  glow: 'rgba(232,125,69,0.42)',
  glowSoft: 'rgba(255,210,48,0.22)',
  // The pool beat's focal node. On near-black it can be brighter than its
  // surround and read as a glow. On paper it cannot — a gold-to-orange
  // gradient there renders as a muddy brown smudge, so the light theme uses a
  // solid vivid burnt amber instead. #C2560B is 4.54:1 on white, comfortably
  // clear of the 3:1 bar for a non-text graphic.
  node: 'radial-gradient(circle,rgba(255,244,196,1) 0%,#FFD230 24%,#E87D45 56%,rgba(232,125,69,0) 76%)',
  // ── accents (verbatim from the product's dark theme) ────────────────────
  primary: '#E87D45',
  gold: '#FFD230',
  free: '#00BC7D',
  // Decorative duotone ramp for the pool beat's flow-lines. The darkest stop
  // sits at 2.79:1 on `bg` — fine for a light trail, NOT fine for a data
  // mark, so nothing that has to be *read* uses this ramp.
  chart: ['#FFD230', '#FE9A00', '#E17100', '#BB4D00', '#973C00'],
  // ── assets ──────────────────────────────────────────────────────────────
  // Most of the 141 provider marks are `fill="currentColor"`, i.e. black on a
  // black plate. They are re-inked at generate time to these values.
  markInk: '#F2F2F2',
  markPlate: 'rgba(255,255,255,0.055)',
  monogram: 'assets/anyrouter-logo-white.svg',
  // Dark plates are unsuffixed; the light ones carry a `-light` suffix.
  plates: { mountain: 'mountain', band: 'band', nebula: 'nebula' },
  plateOpacity: 0.9,
  // The real anyrouter.dev/models screenshot is a dark-mode capture. Inverted
  // it would look like a bug, so the light theme shows it inside a dark frame.
  shotFrame: '#111111',
  shotFrameEdge: 'rgba(0,0,0,0.18)',
};

const light = {
  name: 'light',
  // ── surfaces ────────────────────────────────────────────────────────────
  // The dark theme's #A1A1A1 is 2.58:1 on white — unusable as body text. Every
  // grey below is re-picked to clear 4.5:1 against its own surface.
  bg: '#FFFFFF',
  card: '#FFFFFF',
  cardEdge: '#E3E1DC',
  raised: '#F6F5F1',
  fg: '#0B0B0C',
  muted: '#5C5B58',
  line: 'rgba(11,11,12,0.16)',
  lineSolid: '#8A8A8A',
  vignette: 'rgba(255,255,255,0.24)',
  scrim: 'rgba(255,255,255,0.72)',
  // The amber glow has to be a burnt tone on white; the product's #E87D45 is
  // 2.82:1 there and washes out entirely as a halo.
  glow: 'rgba(180,83,31,0.26)',
  glowSoft: 'rgba(138,90,0,0.16)',
  node: 'radial-gradient(circle,#D96A1B 0%,#C2560B 46%,rgba(194,86,11,0) 76%)',
  // ── accents, each re-picked for ≥4.5:1 on white ─────────────────────────
  primary: '#B4531F', // from #E87D45, 2.82:1 → 5.00:1
  gold: '#8A5A00', //    from #FFD230, 1.45:1 → 5.93:1
  free: '#046B47', //    from #00BC7D, 2.47:1 → 6.56:1
  // The light ramp runs light→dark so the flow-lines still read as a gradient
  // travelling *into* the node instead of glowing on white.
  chart: ['#8A5A00', '#B4531F', '#E17100', '#C2560B', '#973C00'],
  // ── assets ──────────────────────────────────────────────────────────────
  markInk: '#17171A',
  markPlate: 'rgba(11,11,12,0.05)',
  monogram: 'assets/anyrouter-logo-black.svg',
  plates: {
    mountain: 'mountain-light',
    band: 'band-light',
    nebula: 'nebula-light',
  },
  plateOpacity: 0.85,
  shotFrame: '#141416',
  shotFrameEdge: 'rgba(0,0,0,0.14)',
};

export const THEMES = { dark, light };

/**
 * Every text/background pair the film actually renders, checked against WCAG
 * 2.1. This runs on import, so a bad edit to the tokens above fails the
 * generator immediately instead of failing `npm run check` three minutes later
 * inside a headless browser.
 *
 * 4.5:1 is for body text; 3:1 is for non-text (rules, chip borders, the
 * luminous flow-lines that carry the pool beat's structure).
 */
const PAIRS = [
  // [label, foreground, background, minimum, kind]
  ['fg on bg', 'fg', 'bg', 4.5, 'text'],
  ['muted on bg', 'muted', 'bg', 4.5, 'text'],
  ['primary on bg', 'primary', 'bg', 4.5, 'text'],
  ['gold on bg', 'gold', 'bg', 4.5, 'text'],
  ['free on bg', 'free', 'bg', 4.5, 'text'],
  ['fg on card', 'fg', 'card', 4.5, 'text'],
  ['muted on card', 'muted', 'card', 4.5, 'text'],
  ['primary on card', 'primary', 'card', 4.5, 'text'],
  ['gold on card', 'gold', 'card', 4.5, 'text'],
  ['free on card', 'free', 'card', 4.5, 'text'],
  ['fg on raised', 'fg', 'raised', 4.5, 'text'],
  ['muted on raised', 'muted', 'raised', 4.5, 'text'],
  ['line on bg', 'lineSolid', 'bg', 3, 'non-text'],
  ['line on card', 'lineSolid', 'card', 3, 'non-text'],
  ['gold on card edge', 'gold', 'cardEdge', 3, 'non-text'],
];

/** Throws with a table of every failing pair. Called on import. */
export function verify(only) {
  const names = only ? [only] : Object.keys(THEMES);
  const rows = [];
  for (const name of names) {
    const t = THEMES[name];
    if (!t) throw new Error(`unknown theme "${name}". known: ${names.join(', ')}`);
    for (const [label, fgKey, bgKey, min, kind] of PAIRS) {
      const ratio = contrast(t[fgKey], t[bgKey]);
      rows.push({ theme: name, pair: label, fg: t[fgKey], bg: t[bgKey], ratio, min, kind, ok: ratio >= min });
    }
  }
  const bad = rows.filter((r) => !r.ok);
  if (bad.length) {
    const lines = bad.map(
      (r) => `  ${r.theme.padEnd(6)} ${r.pair.padEnd(18)} ${r.fg} on ${r.bg} = ${r.ratio.toFixed(2)}:1 (need ${r.min})`
    );
    throw new Error(`theme contrast FAILED:\n${lines.join('\n')}`);
  }
  return rows;
}

verify();

/** `--theme=<name>` resolution, shared by the generator and the check script. */
export function resolveTheme(name) {
  const t = THEMES[name];
  if (!t) {
    throw new Error(`--theme must be one of ${Object.keys(THEMES).join('|')} (got "${name}")`);
  }
  return t;
}
