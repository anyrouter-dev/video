/**
 * Provider-mark inking.
 *
 * 89 of AnyRouter's 141 provider marks are `fill="currentColor"` — black on a
 * black plate, i.e. invisible. The other 49 carry real brand colour, and 3 have
 * no fill at all (SVG's default, also black).
 *
 * The marks are rendered through `<img>`, which cannot inherit page CSS, so the
 * ink has to be baked into the file. The rule:
 *
 *   currentColor / #000 / #000000 / black / no-fill / low-luminance  -> ink
 *   everything else, including `none` and real brand colours        -> keep
 *
 * `none` is deliberately preserved: marks that use it rely on it for knockouts
 * and counters, and rewriting it to a solid ink fills in the holes.
 *
 * The same routine runs for both themes — only `ink` differs, because the light
 * theme has the mirror-image problem (a near-black mark vanishing into white is
 * far less of a problem, but the brand-coloured ones can be too *light*).
 */

const NAMED = { black: 0, white: 1 };

/** Relative luminance of a #rrggbb / rgb() / named colour, or null if unknown. */
function luminanceOf(value) {
  const v = value.trim().toLowerCase();
  if (v in NAMED) return NAMED[v];
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) {
    const [r, g, b] = m[1].split('').map((c) => parseInt(c + c, 16));
    return lum(r, g, b);
  }
  m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) {
    const n = parseInt(m[1], 16);
    return lum((n >> 16) & 255, (n >> 8) & 255, n & 255);
  }
  m = /^rgba?\(([^)]+)\)$/.exec(v);
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
    return lum(r, g, b);
  }
  return null;
}

const lum = (r, g, b) => {
  const c = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

// Anything darker than this is indistinguishable from the dark plate, so it is
// re-inked. Light enough to be legible is left alone if it is a real colour.
const DARK_LUM = 0.14;
// …and on the light plate, a mark this light disappears into paper.
const LIGHT_LUM = 0.62;

/**
 * @param {string} svg     raw file contents
 * @param {string} ink     replacement colour
 * @param {'dark'|'light'} mode
 * @returns {{out: string, rewritten: number, kept: number}}
 */
export function inkMark(svg, ink, mode) {
  let rewritten = 0;
  let kept = 0;

  const decide = (value) => {
    const v = value.trim().toLowerCase();
    // A knockout: never touch it.
    if (v === 'none' || v === 'transparent') return { keep: true };
    if (v === 'currentcolor') return { keep: false };
    const L = luminanceOf(v);
    if (L === null) return { keep: true }; // url(#grad) and friends
    if (mode === 'dark') return { keep: L >= DARK_LUM };
    // Light plate: keep a real brand colour, ink anything near-white.
    return { keep: L <= LIGHT_LUM };
  };

  // 1. fill="" attributes and fill: inside style="".
  let out = svg.replace(
    /\bfill\s*=\s*"([^"]*)"|\bfill\s*=\s*'([^']*)'|\bfill\s*:\s*([^;"']+)/gi,
    (match, dq, sq, css) => {
      const value = dq ?? sq ?? css;
      const { keep } = decide(value);
      if (keep) {
        kept++;
        return match;
      }
      rewritten++;
      if (css) return `fill:${ink}`;
      return `fill="${ink}"`;
    }
  );

  // 2. Shapes that carry no fill at all inherit black from the SVG default.
  //    Give them an explicit ink so they do not vanish.
  out = out.replace(/<(path|circle|rect|polygon|polyline|ellipse|line)\b([^>]*?)(\/?)>/gi, (m0, tag, attrs, slash) => {
    if (/\bfill\s*[:=]/i.test(attrs)) return m0;
    // Only ink genuinely colourless geometry — a shape inside a <defs> or a
    // mask/stencil is a clip, and colouring it has no effect but is confusing.
    rewritten++;
    return `<${tag}${attrs} fill="${ink}"${slash}>`;
  });

  // 3. The root <svg> often carries the default fill for the whole mark.
  out = out.replace(/<svg\b([^>]*)>/i, (m0, attrs) => {
    if (!/\bfill\s*=\s*"currentColor"/i.test(attrs)) return m0;
    rewritten++;
    return `<svg${attrs.replace(/\bfill\s*=\s*"currentColor"/i, `fill="${ink}"`)}>`;
  });

  return { out, rewritten, kept };
}
