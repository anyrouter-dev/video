// Writes the 9:16 rendition of a film project. A film is authored once at 1920x1080;
// its frames carry their portrait layout under `@media (orientation: portrait)`.
// HyperFrames renders a project only at its own aspect ratio, so the portrait
// rendition is a copy whose stage sizes are swapped to 1080x1920.
//
//   node shared/authoring/portrait.mjs <project-dir> <out-dir>
//
// Only the declarations below are rewritten. Any other literal 1920 or 1080 left in
// a page is an error: it is a landscape-only size the frame forgot to make relative.
import fs from 'node:fs';
import path from 'node:path';

export const PORTRAIT = { width: 1080, height: 1920 };

// Reels, Shorts and TikTok draw their own buttons over the bottom ~25% and the
// right edge, so captions sit higher than in the landscape film.
export const PORTRAIT_CAPTION_BAND = { top: 1240, height: 240 };

const SKIP = new Set(['renders', 'snapshots', 'capture', 'capture-extra', 'tools', 'node_modules', '.git']);

const RULES = [
  [/data-width="1920"/g, `data-width="${PORTRAIT.width}"`],
  [/data-height="1080"/g, `data-height="${PORTRAIT.height}"`],
  [/content="width=1920, height=1080"/g, `content="width=${PORTRAIT.width}, height=${PORTRAIT.height}"`],
  [/\bwidth: 1920px/g, `width: ${PORTRAIT.width}px`],
  [/\bheight: 1080px/g, `height: ${PORTRAIT.height}px`],
  // the push transitions between frames move a full stage width
  [/\bx: (-?)1920\b/g, `x: $11080`],
  [/--cap-band-top: \d+px/g, `--cap-band-top: ${PORTRAIT_CAPTION_BAND.top}px`],
  [/--cap-band-height: \d+px/g, `--cap-band-height: ${PORTRAIT_CAPTION_BAND.height}px`],
];

/** The portrait text of one page, or the leftover landscape sizes that make it unsafe. */
export function toPortrait(html) {
  let out = html;
  for (const [re, to] of RULES) out = out.replace(re, to);
  const swapped = new Set([`width: ${PORTRAIT.width}px`, `height: ${PORTRAIT.height}px`]);
  // long lines are inline SVG path data or data URIs, never stage sizes
  const leftovers = out.split('\n')
    .filter(line => line.length < 400 && /\b(1920|1080)\b/.test(line))
    .map(line => line.trim())
    .filter(line => ![...swapped].some(s => line.includes(s)) && !/data-(width|height)=|content="width=|x: -?1080\b/.test(line));
  return { html: out, leftovers };
}

export function writePortrait(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  const problems = [];
  const walk = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const a = path.join(from, e.name);
      const b = path.join(to, e.name);
      // follow symlinks: a sibling film's shared files must land as real files
      const stat = fs.statSync(a);
      if (stat.isDirectory()) walk(a, b);
      else if (e.name.endsWith('.html')) {
        const { html, leftovers } = toPortrait(fs.readFileSync(a, 'utf8'));
        for (const l of leftovers) problems.push(`${path.relative(src, a)}: ${l.slice(0, 160)}`);
        fs.writeFileSync(b, html);
      } else fs.copyFileSync(a, b);
    }
  };
  walk(src, dest);
  if (problems.length) {
    throw new Error(`landscape-only sizes left in the portrait rendition (make them relative or move them under @media (orientation: portrait)):\n  ${problems.join('\n  ')}`);
  }
  return dest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [src, dest] = process.argv.slice(2);
  if (!src || !dest) { console.error('usage: portrait.mjs <project-dir> <out-dir>'); process.exit(2); }
  writePortrait(path.resolve(src), path.resolve(dest));
  console.log(`portrait rendition → ${dest}`);
}
