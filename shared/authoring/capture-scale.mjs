// How large a captured screen renders on stage. Captures under assets/captures/ are taken at
// device scale 2, so a capture's CSS width is half its natural width, and its stage scale is the
// size one page CSS pixel draws at. Page body text is about 14 CSS px; below scale 2 it renders
// under 28 px and can't be read in the film.

export const CAPTURE_DENSITY = 2;
export const MIN_CAPTURE_SCALE = 2;
export const MAX_SMALL_S = 0.8;

export const isCapture = src => /(^|\/)assets\/captures\//.test(src);

/** Page CSS px to stage px, from the rendered box and the capture's natural size. */
export function captureScale({ width, height }, { naturalWidth, naturalHeight }, density = CAPTURE_DENSITY) {
  return Math.min(width / (naturalWidth / density), height / (naturalHeight / density));
}

/**
 * The longest run of consecutive visible samples a capture spends below `minScale`.
 * `samples` are { t, scale } at the audit's step; a gap in t (the capture was hidden) ends a run.
 */
export function longestSmallRun(samples, step, minScale = MIN_CAPTURE_SCALE) {
  let best = null, run = null;
  for (const s of [...samples].sort((a, b) => a.t - b.t)) {
    const small = s.scale < minScale;
    if (small && run && s.t - run.last <= step * 1.5) Object.assign(run, { last: s.t, n: run.n + 1, min: Math.min(run.min, s.scale) });
    else run = small ? { start: s.t, last: s.t, n: 1, min: s.scale } : null;
    if (run && !(best?.n >= run.n)) best = { ...run };
  }
  return best && { start: best.start, seconds: +(best.n * step).toFixed(3), minScale: best.min };
}

/** A capture fails when it settles below the readable scale for longer than `maxSmall`, unless it is an establishing shot. */
export function judgeCapture({ samples, context }, step, { minScale = MIN_CAPTURE_SCALE, maxSmall = MAX_SMALL_S } = {}) {
  const run = longestSmallRun(samples, step, minScale);
  return { run, ok: context || !run || run.seconds <= maxSmall };
}
