#!/usr/bin/env node
/**
 * Background plate pipeline.
 *
 * Turn a high-key photograph into a dark, duotoned plate that type can sit on
 * top of. The order matters a great deal — each step exists because the naive
 * version produced mud:
 *
 *   1. cover-fit to 2560x1440   (never letterbox: the frame is 16:9)
 *   2. auto-level luminance     (2nd/98th percentile, NOT min/max — one blown
 *                                specular highlight must not flatten the rest)
 *   3. duotone through a ramp    (4 stops: indigo -> violet -> magenta -> cyan;
 *                                magenta + cyan are only reached in the
 *                                highlights so the plate stays cool overall)
 *   4. gamma ~1.7               (crushes the mids so the plate reads as a
 *                                background, not a competing image)
 *   5. scale so mean luma ~15   (the actual target — gamma alone is not
 *                                predictable across three different photos)
 *
 * Steps 2-4 fold into a single 256-entry RGB lookup, so the whole grade is one
 * pass over the pixels.
 *
 * Do NOT duotone an already-darkened plate: you throw away the range and get
 * mud. Level FIRST, duotone SECOND.
 *
 * Also emits a Gaussian-blur(28) copy of each plate, used as a slow parallax
 * underlayer so the background drifts against the foreground.
 *
 *   node tools/make-plates.mjs                 # all dark plates
 *   node tools/make-plates.mjs --mode=light    # light counterparts
 *   node tools/make-plates.mjs --only=mountain # one plate
 *   node tools/make-plates.mjs --luma=15 --gamma=1.7
 *
 * The light plates are graded from the SAME three photographs with the same
 * cover-fit crop and the same level percentiles — only the ramp direction and
 * the target luma differ. That is deliberate: the light film is the same film
 * on paper, not a different film. A light plate built from the pastel source
 * set (Hero 2, image 940-950) has no headroom left for type.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = process.env.PLATE_SRC || '/Users/duet/Documents/ASCII';
const OUT = path.join(ROOT, 'assets/plates');

const argv = process.argv.slice(2);
const val = (k, d) => (argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];

const W = 2560;
const H = 1440;
const MODE = val('mode', 'dark');

const PRESET = {
  // Dark plate. The first pass targeted mean luma 15, which is what the
  // pipeline brief asked for — and it rendered as flat black. These sources
  // are low-key to begin with, so after a 1.7 gamma plus a flat lerp to 15 the
  // BRIGHTEST pixel in the whole plate was luma 46/255: invisible against the
  // #0A0A0A page. 32 keeps the photograph readable while leaving a huge gap to
  // #FAFAFA type; the centre scrim in index.html protects the type field.
  dark: { gamma: 1.5, luma: 32, blurLift: 1.3 },
  // Light plate: open the mids, land near paper but not ON paper — a pure-white
  // plate has no texture, and dark type needs somewhere to sit.
  light: { gamma: 0.62, luma: 226, blurLift: 0.98 },
};
if (!PRESET[MODE]) {
  console.error(`FAIL: --mode must be one of ${Object.keys(PRESET).join('|')}`);
  process.exit(1);
}
const GAMMA = parseFloat(val('gamma', PRESET[MODE].gamma));
const TARGET_LUMA = parseFloat(val('luma', PRESET[MODE].luma));
const BLUR = parseFloat(val('blur', '28'));

// The duotone ramps. Magenta and cyan only enter at the top of the dark range
// so shadows stay indigo/violet and the plate never turns pink.
const RAMPS = {
  dark: [
    { at: 0.0, rgb: [10, 12, 38] },
    { at: 0.35, rgb: [58, 40, 120] },
    { at: 0.68, rgb: [150, 46, 132] },
    { at: 1.0, rgb: [96, 210, 224] },
  ],
  light: [
    { at: 0.0, rgb: [122, 132, 172] },   // soft cool ink (never black)
    { at: 0.32, rgb: [186, 186, 214] },  // pale lavender
    { at: 0.66, rgb: [242, 224, 212] },  // pale peach
    { at: 1.0, rgb: [255, 252, 246] },  // warm paper
  ],
};
const RAMP = RAMPS[MODE];

// The flat colour the graded plate is lerped onto in step 5. Black for the
// dark plates, warm paper for the light ones.
const ANCHOR = MODE === 'dark' ? [0, 0, 0] : [255, 252, 246];

/**
 * Which photograph becomes which plate. Only genuinely dark source frames are
 * listed — the pastel / high-key set (Hero 2, image 940/941/942/943/950)
 * destroys type contrast no matter how it is graded.
 */
const PLATES = [
  { id: 'mountain', file: 'Group 4.jpg', note: 'neon rim-lit wireframe mountain' },
  { id: 'band', file: 'image 977.jpg', note: 'gold band' },
  { id: 'nebula', file: 'image 952.jpg', note: 'nebula' },
];

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** 256 x 3 LUT: input gray -> (normalize -> gamma -> ramp) -> RGB. */
function gradeLut(lo, hi) {
  const lut = Buffer.alloc(256 * 3);
  const span = Math.max(1e-6, hi - lo);
  for (let i = 0; i < 256; i++) {
    const norm = Math.min(1, Math.max(0, (i - lo) / span));
    const v = Math.pow(norm, GAMMA);
    let a = RAMP[0];
    let b = RAMP[RAMP.length - 1];
    for (let s = 0; s < RAMP.length - 1; s++) {
      if (v >= RAMP[s].at && v <= RAMP[s + 1].at) {
        a = RAMP[s];
        b = RAMP[s + 1];
        break;
      }
    }
    const t = b.at === a.at ? 0 : (v - a.at) / (b.at - a.at);
    for (let c = 0; c < 3; c++) {
      lut[i * 3 + c] = Math.round(a.rgb[c] + (b.rgb[c] - a.rgb[c]) * t);
    }
  }
  return lut;
}

const only = val('only', '');
const list = only ? PLATES.filter((p) => p.id === only) : PLATES;
if (!list.length) {
  console.error(`FAIL: no plate "${only}". known: ${PLATES.map((p) => p.id).join(', ')}`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

for (const plate of list) {
  const src = path.join(SRC, plate.file);
  if (!fs.existsSync(src)) {
    console.error(`SKIP ${plate.id}: missing ${src}`);
    continue;
  }

  // 1. cover-fit. `position: 'attention'` picks the most interesting crop for
  //     wildly different source aspect ratios; the frame is always exactly
  //     16:9 after this.
  const base = await sharp(src)
    .resize(W, H, { fit: 'cover', position: 'attention' })
    .flatten({ background: '#000000' })
    .removeAlpha()
    .toBuffer();

  // 2. auto-level from luminance percentiles.
  const { data, info } = await sharp(base).greyscale().raw().toBuffer({ resolveWithObject: true });
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i++) hist[data[i]]++;
  const total = data.length;
  const pct = (p) => {
    const want = total * p;
    let acc = 0;
    for (let i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= want) return i;
    }
    return 255;
  };
  const lo = pct(0.02);
  const hi = pct(0.98);

  // 3+4. duotone + gamma in one pass.
  const lut = gradeLut(lo, hi);
  const gray = await sharp(base).greyscale().toColourspace('b-w').raw().toBuffer();
  const rgb = Buffer.alloc(gray.length * 3);
  for (let i = 0; i < gray.length; i++) {
    const o = gray[i] * 3;
    rgb[i * 3] = lut[o];
    rgb[i * 3 + 1] = lut[o + 1];
    rgb[i * 3 + 2] = lut[o + 2];
  }
  const raw = { raw: { width: info.width, height: info.height, channels: 3 } };
  const buf = Buffer.from(rgb);

  // 5. Measure, then land exactly on the mean-luma target.
  //
  //    Gamma output is not predictable enough across three different photos to
  //    trust the math, and a plain multiply is wrong for the light plates —
  //    their target is ABOVE the graded mean, so a gain > 1 would blow the
  //    highlights and flatten the texture the ramp just built. So: lerp toward
  //    a flat anchor instead. A lerp is exactly linear in the mean, so one
  //    solve hits the target, and it can never clip.
  const st0 = await sharp(buf, raw).stats();
  const meanOf = (st) =>
    0.2126 * st.channels[0].mean + 0.7152 * st.channels[1].mean + 0.0722 * st.channels[2].mean;
  const mean0 = meanOf(st0);
  const anchorLuma = luma(...ANCHOR);
  const t = (TARGET_LUMA - mean0) / (anchorLuma - mean0 || 1e-6);
  const k = 1 - t;
  const scaled = await sharp(buf, raw)
    .linear([k, k, k], ANCHOR.map((c) => c * t))
    .toBuffer();
  const mean1 = meanOf(await sharp(scaled, raw).stats());

  const tag = MODE === 'dark' ? '' : '-light';
  await sharp(scaled, raw)
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toFile(path.join(OUT, `${plate.id}${tag}.jpg`));

  // Parallax underlayer: same plate, heavily blurred, nudged off the anchor so
  // it reads as an out-of-focus depth layer rather than a duplicate.
  await sharp(scaled, raw)
    .blur(BLUR)
    .linear(PRESET[MODE].blurLift)
    .jpeg({ quality: 82, chromaSubsampling: '4:4:4' })
    .toFile(path.join(OUT, `${plate.id}${tag}-blur.jpg`));

  console.log(
    `${(MODE + '/' + plate.id).padEnd(16)} ${plate.note.padEnd(32)} ` +
      `level[${String(lo).padStart(3)}..${String(hi).padStart(3)}] ` +
      `luma ${mean0.toFixed(1)} →${t.toFixed(3)}→ ${mean1.toFixed(1)} (target ${TARGET_LUMA})`
  );
}

console.log(
  `\nplates → assets/plates/  (${MODE})   --only=<${PLATES.map((p) => p.id).join('|')}>` +
    `  --mode=<dark|light>`
);
